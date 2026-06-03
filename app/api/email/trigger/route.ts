import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  emailSupabaseAdmin,
  recordEmailEventSent,
  sendEmailEvent,
} from "@/lib/email/sendEmail";

type EmailTriggerType =
  | "landlord_signup"
  | "tenant_signup"
  | "tenant_invite_created"
  | "tenant_invite_accepted"
  | "property_created";

type TriggerRequestBody = {
  trigger?: EmailTriggerType;
  propertyId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  tenantAccessId?: string | null;
};

type ProfileRow = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
};

type PropertyRow = {
  id: string;
  property_label: string | null;
  owner_profile_id: string | null;
};

type LeaseRow = {
  id: string;
  property_id: string | null;
};

type LeaseTenantRow = {
  id: string;
  lease_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string;
  property_id: string;
  lease_id: string;
};

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const allowedTriggers = new Set<EmailTriggerType>([
  "landlord_signup",
  "tenant_signup",
  "tenant_invite_created",
  "tenant_invite_accepted",
  "property_created",
]);

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Tenant";
}

function inviteLink(token?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tenant/accept-invite${token ? `?token=${token}` : ""}`;
}

async function getAuthedProfile(request: Request) {
  const token = getBearerToken(request);

  if (!token) return { profile: null, error: "Unauthorized" };

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) return { profile: null, error: "Unauthorized" };

  const { data: profile, error: profileError } = await emailSupabaseAdmin
    .from("profiles")
    .select("id, user_id, email, display_name")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    return { profile: null, error: "Profile not found" };
  }

  return { profile: profile as ProfileRow, error: null };
}

async function getOwnedProperty(profileId: string, propertyId?: string | null) {
  if (!propertyId) return null;

  const { data } = await emailSupabaseAdmin
    .from("properties")
    .select("id, property_label, owner_profile_id")
    .eq("id", propertyId)
    .eq("owner_profile_id", profileId)
    .single();

  return (data || null) as PropertyRow | null;
}

async function getLeaseForProperty(leaseId?: string | null, propertyId?: string | null) {
  if (!leaseId || !propertyId) return null;

  const { data } = await emailSupabaseAdmin
    .from("leases")
    .select("id, property_id")
    .eq("id", leaseId)
    .eq("property_id", propertyId)
    .single();

  return (data || null) as LeaseRow | null;
}

async function getTenantForLease(tenantId?: string | null, leaseId?: string | null) {
  if (!tenantId || !leaseId) return null;

  const { data } = await emailSupabaseAdmin
    .from("lease_tenants")
    .select("id, lease_id, email, first_name, last_name, invite_token")
    .eq("id", tenantId)
    .eq("lease_id", leaseId)
    .single();

  return (data || null) as (LeaseTenantRow & { invite_token?: string | null }) | null;
}

async function getTenantAcceptedContext(
  profile: ProfileRow,
  tenantId?: string | null,
  tenantAccessId?: string | null,
  propertyId?: string | null,
  leaseId?: string | null
) {
  let accessQuery = emailSupabaseAdmin
    .from("tenant_access")
    .select("id, tenant_profile_id, property_id, lease_id")
    .eq("tenant_profile_id", profile.id);

  if (tenantAccessId) accessQuery = accessQuery.eq("id", tenantAccessId);
  if (propertyId) accessQuery = accessQuery.eq("property_id", propertyId);
  if (leaseId) accessQuery = accessQuery.eq("lease_id", leaseId);

  const { data: accessRows } = await accessQuery.limit(10);
  const access = ((accessRows || []) as TenantAccessRow[])[0] || null;

  if (!access) return null;

  const [{ data: propertyData }, { data: leaseData }, { data: tenantData }] =
    await Promise.all([
      emailSupabaseAdmin
        .from("properties")
        .select("id, property_label, owner_profile_id")
        .eq("id", access.property_id)
        .single(),
      emailSupabaseAdmin
        .from("leases")
        .select("id, property_id")
        .eq("id", access.lease_id)
        .single(),
      tenantId
        ? emailSupabaseAdmin
            .from("lease_tenants")
            .select("id, lease_id, email, first_name, last_name")
            .eq("id", tenantId)
            .eq("lease_id", access.lease_id)
            .maybeSingle()
        : emailSupabaseAdmin
            .from("lease_tenants")
            .select("id, lease_id, email, first_name, last_name")
            .eq("lease_id", access.lease_id)
            .ilike("email", profile.email || "")
            .maybeSingle(),
    ]);

  const property = propertyData as PropertyRow | null;
  const lease = leaseData as LeaseRow | null;
  const tenant = tenantData as LeaseTenantRow | null;

  if (!property || !lease || lease.property_id !== property.id) return null;

  const { data: landlordData } = await emailSupabaseAdmin
    .from("profiles")
    .select("id, user_id, email, display_name")
    .eq("id", property.owner_profile_id || "")
    .single();

  return {
    access,
    property,
    lease,
    tenant,
    landlord: landlordData as ProfileRow | null,
  };
}

async function handleSignup(profile: ProfileRow, trigger: EmailTriggerType) {
  if (!profile.email) return { ok: true, skipped: true };

  const result = await sendEmailEvent({
    eventType: trigger === "landlord_signup" ? "landlord_welcome" : "tenant_welcome",
    recipientEmail: profile.email,
    recipientProfileId: profile.id,
    payload: {
      landlordName: profile.display_name || "there",
      tenantName: profile.display_name || "there",
    },
  });

  return result;
}

async function handleTenantInviteCreated(profile: ProfileRow, body: TriggerRequestBody) {
  const property = await getOwnedProperty(profile.id, body.propertyId);
  const lease = await getLeaseForProperty(body.leaseId, property?.id);
  const tenant = await getTenantForLease(body.tenantId, lease?.id);

  if (!property || !lease || !tenant?.email) {
    return { ok: false, error: "Invite context not found" };
  }

  const event = await recordEmailEventSent({
    eventType: "tenant_invitation",
    recipientEmail: tenant.email,
    relatedPropertyId: property.id,
    relatedLeaseId: lease.id,
    payload: {
      tenantName: fullName(tenant.first_name, tenant.last_name),
      propertyName: property.property_label || "your property",
      inviteLink: inviteLink(tenant.invite_token),
    },
  });

  return { ok: true, event };
}

async function handleTenantInviteAccepted(profile: ProfileRow, body: TriggerRequestBody) {
  const context = await getTenantAcceptedContext(
    profile,
    body.tenantId,
    body.tenantAccessId,
    body.propertyId,
    body.leaseId
  );

  if (!context || !profile.email) {
    return { ok: false, error: "Accepted invite context not found" };
  }

  const tenantName = context.tenant
    ? fullName(context.tenant.first_name, context.tenant.last_name)
    : profile.display_name || "Tenant";
  const propertyName = context.property.property_label || "your property";

  const results = await Promise.all([
    sendEmailEvent({
      eventType: "tenant_welcome",
      recipientEmail: profile.email,
      recipientProfileId: profile.id,
      payload: {
        tenantName: profile.display_name || tenantName,
        propertyName,
      },
    }),
    sendEmailEvent({
      eventType: "lease_activated",
      recipientEmail: profile.email,
      recipientProfileId: profile.id,
      relatedPropertyId: context.property.id,
      relatedLeaseId: context.lease.id,
      relatedTenantAccessId: context.access.id,
      payload: {
        tenantName: profile.display_name || tenantName,
        propertyName,
      },
    }),
    context.landlord?.email
      ? sendEmailEvent({
          eventType: "tenant_accepted_landlord_notification",
          recipientEmail: context.landlord.email,
          recipientProfileId: context.landlord.id,
          relatedPropertyId: context.property.id,
          relatedLeaseId: context.lease.id,
          relatedTenantAccessId: context.access.id,
          payload: {
            tenantName,
            landlordName: context.landlord.display_name || "there",
            propertyName,
          },
        })
      : Promise.resolve({ ok: true, skipped: true }),
  ]);

  return { ok: results.every((result) => result.ok), results };
}

async function handlePropertyCreated(profile: ProfileRow, body: TriggerRequestBody) {
  const property = await getOwnedProperty(profile.id, body.propertyId);

  if (!property) return { ok: false, error: "Property not found" };

  const { error } = await emailSupabaseAdmin
    .from("email_events")
    .update({
      status: "skipped",
      error_message: "Landlord created first property before reminder was sent.",
      updated_at: new Date().toISOString(),
    })
    .eq("event_type", "add_first_property_reminder")
    .eq("recipient_profile_id", profile.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function POST(request: Request) {
  const { profile, error } = await getAuthedProfile(request);

  if (error || !profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
  }

  let body: TriggerRequestBody;

  try {
    body = (await request.json()) as TriggerRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.trigger || !allowedTriggers.has(body.trigger)) {
    return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  }

  const result =
    body.trigger === "landlord_signup" || body.trigger === "tenant_signup"
      ? await handleSignup(profile, body.trigger)
      : body.trigger === "tenant_invite_created"
      ? await handleTenantInviteCreated(profile, body)
      : body.trigger === "tenant_invite_accepted"
      ? await handleTenantInviteAccepted(profile, body)
      : await handlePropertyCreated(profile, body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
