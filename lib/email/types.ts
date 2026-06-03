export type EmailEventType =
  | "landlord_welcome"
  | "tenant_welcome"
  | "add_first_property_reminder"
  | "tenant_invitation"
  | "tenant_invite_reminder_24h"
  | "tenant_invite_reminder_48h"
  | "tenant_invite_reminder_72h"
  | "lease_activated"
  | "tenant_accepted_landlord_notification";

export type EmailEventStatus = "pending" | "sent" | "failed" | "skipped";

export type EmailPayload = Record<string, string | number | boolean | null | undefined>;

export type EmailEventInput = {
  eventType: EmailEventType;
  recipientEmail: string;
  recipientProfileId?: string | null;
  relatedPropertyId?: string | null;
  relatedLeaseId?: string | null;
  relatedTenantAccessId?: string | null;
  payload?: EmailPayload;
  scheduledFor?: string | null;
};

export type EmailEventRecord = {
  id: string;
  event_type: EmailEventType;
  recipient_email: string;
  recipient_profile_id: string | null;
  related_property_id: string | null;
  related_lease_id: string | null;
  related_tenant_access_id: string | null;
  payload: EmailPayload | null;
  status: EmailEventStatus;
  scheduled_for: string;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | {
      ok: true;
      event: EmailEventRecord;
      providerMessageId?: string | null;
      skipped?: boolean;
    }
  | {
      ok: false;
      event?: EmailEventRecord;
      error: string;
    };
