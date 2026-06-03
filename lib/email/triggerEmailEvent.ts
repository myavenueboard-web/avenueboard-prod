import { supabase } from "@/lib/supabase";

export type EmailTriggerType =
  | "landlord_signup"
  | "tenant_signup"
  | "tenant_invite_created"
  | "tenant_invite_accepted"
  | "property_created";

type TriggerEmailEventInput = {
  trigger: EmailTriggerType;
  propertyId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  tenantAccessId?: string | null;
};

export async function triggerEmailEvent(input: TriggerEmailEventInput) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) return;

    const response = await fetch("/api/email/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      console.warn("Email trigger warning:", input.trigger, body || response.status);
    }
  } catch (error) {
    console.warn("Email trigger warning:", input.trigger, error);
  }
}
