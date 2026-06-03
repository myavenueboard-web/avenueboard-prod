import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/email/templates";
import type {
  EmailEventInput,
  EmailEventRecord,
  SendEmailResult,
} from "@/lib/email/types";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type ResendSendResponse = {
  data?: {
    id?: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function eventSelect() {
  return `
    id,
    event_type,
    recipient_email,
    recipient_profile_id,
    related_property_id,
    related_lease_id,
    related_tenant_access_id,
    payload,
    status,
    scheduled_for,
    sent_at,
    failed_at,
    error_message,
    provider_message_id,
    created_at,
    updated_at
  `;
}

async function findExistingEvent(input: EmailEventInput) {
  let query = supabaseAdmin
    .from("email_events")
    .select(eventSelect())
    .eq("event_type", input.eventType)
    .eq("recipient_email", normalizeEmail(input.recipientEmail));

  if (input.relatedPropertyId) {
    query = query.eq("related_property_id", input.relatedPropertyId);
  } else {
    query = query.is("related_property_id", null);
  }

  if (input.relatedLeaseId) {
    query = query.eq("related_lease_id", input.relatedLeaseId);
  } else {
    query = query.is("related_lease_id", null);
  }

  if (input.relatedTenantAccessId) {
    query = query.eq("related_tenant_access_id", input.relatedTenantAccessId);
  } else {
    query = query.is("related_tenant_access_id", null);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data || null) as EmailEventRecord | null;
}

export async function createEmailEvent(input: EmailEventInput) {
  const normalizedEmail = normalizeEmail(input.recipientEmail);
  const scheduledFor = input.scheduledFor || new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("email_events")
    .insert({
      event_type: input.eventType,
      recipient_email: normalizedEmail,
      recipient_profile_id: input.recipientProfileId || null,
      related_property_id: input.relatedPropertyId || null,
      related_lease_id: input.relatedLeaseId || null,
      related_tenant_access_id: input.relatedTenantAccessId || null,
      payload: input.payload || {},
      scheduled_for: scheduledFor,
    })
    .select(eventSelect())
    .single();

  if (error) {
    const typedError = error as SupabaseErrorLike;

    if (typedError.code === "23505") {
      const existing = await findExistingEvent({
        ...input,
        recipientEmail: normalizedEmail,
      });

      if (existing) return existing;
    }

    throw new Error(typedError.message || "Unable to create email event");
  }

  return data as unknown as EmailEventRecord;
}

export async function updateEmailEvent(
  id: string,
  values: Partial<
    Pick<
      EmailEventRecord,
      "status" | "sent_at" | "failed_at" | "error_message" | "provider_message_id"
    >
  >
) {
  const { data, error } = await supabaseAdmin
    .from("email_events")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(eventSelect())
    .single();

  if (error) {
    throw new Error(error.message || "Unable to update email event");
  }

  return data as unknown as EmailEventRecord;
}

export async function recordEmailEventSent(
  input: EmailEventInput,
  providerMessageId?: string | null
) {
  const event = await createEmailEvent(input);

  if (event.status === "sent") return event;

  return updateEmailEvent(event.id, {
    status: "sent",
    sent_at: event.sent_at || new Date().toISOString(),
    failed_at: null,
    error_message: null,
    provider_message_id: providerMessageId || event.provider_message_id || null,
  });
}

export async function sendEmailEvent(input: EmailEventInput): Promise<SendEmailResult> {
  let event: EmailEventRecord;

  try {
    event = await createEmailEvent(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create email event",
    };
  }

  if (event.status === "sent") {
    return {
      ok: true,
      event,
      providerMessageId: event.provider_message_id,
      skipped: true,
    };
  }

  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;

  if (!from) {
    const failedEvent = await updateEmailEvent(event.id, {
      status: "failed",
      failed_at: new Date().toISOString(),
      error_message: "EMAIL_FROM is not configured",
    });

    return {
      ok: false,
      event: failedEvent,
      error: "EMAIL_FROM is not configured",
    };
  }

  try {
    const template = renderEmailTemplate(event.event_type, event.payload || {});
    const resend = getResendClient();
    const response = (await resend.emails.send({
      from,
      to: event.recipient_email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: replyTo || undefined,
    })) as ResendSendResponse;

    if (response.error) {
      throw new Error(response.error.message || "Resend email failed");
    }

    const sentEvent = await updateEmailEvent(event.id, {
      status: "sent",
      sent_at: new Date().toISOString(),
      failed_at: null,
      error_message: null,
      provider_message_id: response.data?.id || null,
    });

    return {
      ok: true,
      event: sentEvent,
      providerMessageId: response.data?.id || null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send email";
    const failedEvent = await updateEmailEvent(event.id, {
      status: "failed",
      failed_at: new Date().toISOString(),
      error_message: message,
    });

    return {
      ok: false,
      event: failedEvent,
      error: message,
    };
  }
}

export { supabaseAdmin as emailSupabaseAdmin };
