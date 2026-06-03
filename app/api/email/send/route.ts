import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailEvent } from "@/lib/email/sendEmail";
import type { EmailEventInput, EmailEventType } from "@/lib/email/types";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const allowedEventTypes = new Set<EmailEventType>([
  "landlord_welcome",
  "tenant_welcome",
  "add_first_property_reminder",
  "tenant_invitation",
  "tenant_invite_reminder_24h",
  "tenant_invite_reminder_48h",
  "tenant_invite_reminder_72h",
  "lease_activated",
  "tenant_accepted_landlord_notification",
]);

type SendEmailRequestBody = Partial<EmailEventInput>;

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendEmailRequestBody;

  try {
    body = (await request.json()) as SendEmailRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.eventType || !allowedEventTypes.has(body.eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  if (!body.recipientEmail) {
    return NextResponse.json(
      { error: "recipientEmail is required" },
      { status: 400 }
    );
  }

  const result = await sendEmailEvent({
    eventType: body.eventType,
    recipientEmail: body.recipientEmail,
    recipientProfileId: body.recipientProfileId || null,
    relatedPropertyId: body.relatedPropertyId || null,
    relatedLeaseId: body.relatedLeaseId || null,
    relatedTenantAccessId: body.relatedTenantAccessId || null,
    payload: body.payload || {},
    scheduledFor: body.scheduledFor || null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, event: result.event || null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    event: result.event,
    providerMessageId: result.providerMessageId || null,
    skipped: !!result.skipped,
  });
}
