import { NextResponse } from "next/server";
import { emailSupabaseAdmin, sendEmailEvent } from "@/lib/email/sendEmail";
import type { EmailEventType, EmailPayload } from "@/lib/email/types";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
};

type UserRoleRow = {
  profile_id: string;
};

type PropertyRow = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
};

type LeaseTenantRow = {
  id: string;
  lease_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  invite_status: string | null;
  invite_sent_at: string | null;
  invite_token: string | null;
  leases?:
    | {
        id: string;
        property_id: string | null;
        properties?:
          | {
              id: string;
              property_label: string | null;
              owner_profile_id: string | null;
            }
          | Array<{
              id: string;
              property_label: string | null;
              owner_profile_id: string | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        property_id: string | null;
        properties?:
          | {
              id: string;
              property_label: string | null;
              owner_profile_id: string | null;
            }
          | Array<{
              id: string;
              property_label: string | null;
              owner_profile_id: string | null;
            }>
          | null;
      }>
    | null;
};

const reminderDefinitions: Array<{
  hours: number;
  eventType: EmailEventType;
}> = [
  { hours: 72, eventType: "tenant_invite_reminder_72h" },
  { hours: 48, eventType: "tenant_invite_reminder_48h" },
  { hours: 24, eventType: "tenant_invite_reminder_24h" },
];

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || "";

  if (!secret) return false;
  return header === `Bearer ${secret}`;
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function tenantName(tenant: LeaseTenantRow) {
  return `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Tenant";
}

function inviteLink(token: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tenant/accept-invite${token ? `?token=${token}` : ""}`;
}

function firstItem<T>(item: T | T[] | null | undefined) {
  if (Array.isArray(item)) return item[0] || null;
  return item || null;
}

async function sendAddFirstPropertyReminders() {
  const { data: roleData, error: roleError } = await emailSupabaseAdmin
    .from("user_roles")
    .select("profile_id")
    .eq("role", "landlord");

  if (roleError) throw new Error(roleError.message);

  const roleRows = (roleData || []) as UserRoleRow[];
  const profileIds = Array.from(new Set(roleRows.map((row) => row.profile_id)));

  if (profileIds.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  const [
    { data: profileData, error: profileError },
    { data: propertyData, error: propertyError },
  ] = await Promise.all([
    emailSupabaseAdmin
      .from("profiles")
      .select("id, email, display_name, created_at")
      .in("id", profileIds)
      .lte("created_at", hoursAgo(24)),
    emailSupabaseAdmin
      .from("properties")
      .select("id, owner_profile_id, property_label")
      .in("owner_profile_id", profileIds),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (propertyError) throw new Error(propertyError.message);

  const propertyRows = (propertyData || []) as PropertyRow[];
  const ownersWithProperties = new Set(
    propertyRows
      .map((property) => property.owner_profile_id)
      .filter((id): id is string => Boolean(id))
  );
  const profiles = ((profileData || []) as ProfileRow[]).filter(
    (profile) => profile.email && !ownersWithProperties.has(profile.id)
  );

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    const result = await sendEmailEvent({
      eventType: "add_first_property_reminder",
      recipientEmail: profile.email as string,
      recipientProfileId: profile.id,
      payload: {
        landlordName: profile.display_name || "there",
      },
    });

    if (result.ok) sent += result.skipped ? 0 : 1;
    else failed += 1;
  }

  return { attempted: profiles.length, sent, failed };
}

async function sendTenantInviteReminders() {
  const { data, error } = await emailSupabaseAdmin
    .from("lease_tenants")
    .select(
      `
      id,
      lease_id,
      email,
      first_name,
      last_name,
      invite_status,
      invite_sent_at,
      invite_token,
      leases (
        id,
        property_id,
        properties (
          id,
          property_label,
          owner_profile_id
        )
      )
    `
    )
    .not("email", "is", null)
    .not("invite_sent_at", "is", null)
    .or("invite_status.is.null,invite_status.neq.accepted")
    .lte("invite_sent_at", hoursAgo(24));

  if (error) throw new Error(error.message);

  const tenants = (data || []) as unknown as LeaseTenantRow[];
  let attempted = 0;
  let sent = 0;
  let failed = 0;

  for (const tenant of tenants) {
    if (!tenant.email || !tenant.invite_sent_at) continue;

    const sentAt = new Date(tenant.invite_sent_at).getTime();
    const ageHours = (Date.now() - sentAt) / (60 * 60 * 1000);
    const lease = firstItem(tenant.leases);
    const property = firstItem(lease?.properties);
    const payload: EmailPayload = {
      tenantName: tenantName(tenant),
      propertyName: property?.property_label || "your property",
      inviteLink: inviteLink(tenant.invite_token),
    };

    const reminder = reminderDefinitions.find((item) => ageHours >= item.hours);

    if (!reminder) continue;

    attempted += 1;

    const result = await sendEmailEvent({
      eventType: reminder.eventType,
      recipientEmail: tenant.email,
      relatedPropertyId: property?.id || lease?.property_id || null,
      relatedLeaseId: tenant.lease_id,
      relatedTenantAccessId: null,
      payload,
    });

    if (result.ok) sent += result.skipped ? 0 : 1;
    else failed += 1;
  }

  return { attempted, sent, failed };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [propertyReminderResult, inviteReminderResult] = await Promise.all([
      sendAddFirstPropertyReminders(),
      sendTenantInviteReminders(),
    ]);

    return NextResponse.json({
      ok: true,
      addFirstPropertyReminders: propertyReminderResult,
      tenantInviteReminders: inviteReminderResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process email reminders",
      },
      { status: 500 }
    );
  }
}
