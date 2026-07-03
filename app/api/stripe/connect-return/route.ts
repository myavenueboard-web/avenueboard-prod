import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmailEvent } from "@/lib/email/sendEmail";
import {
  STRIPE_CONNECT_STATE_COOKIE,
  verifyStripeConnectState,
} from "@/lib/stripe/connectState";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PropertyRow = {
  id: string;
  property_label: string | null;
  owner_profile_id: string | null;
  stripe_account_id: string | null;
};

type LeaseRow = {
  id: string;
};

type LeaseTenantRow = {
  id: string;
  lease_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  invite_status: string | null;
  invite_token: string | null;
};

function fullName(firstName?: string | null, lastName?: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Resident";
}

function inviteLink(token?: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tenant/accept-invite${token ? `?token=${token}` : ""}`;
}

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function redirectToDashboard(
  request: Request,
  path = "/dashboard",
  params?: Record<string, string>
) {
  const url = new URL(path, getAppUrl(request));

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(STRIPE_CONNECT_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/stripe/connect-return",
    maxAge: 0,
  });
  return response;
}

function isStripeAccountReady(account: Stripe.Account) {
  return (
    account.details_submitted === true &&
    account.charges_enabled === true &&
    account.payouts_enabled === true
  );
}

async function createActivityOnce({
  profileId,
  propertyId,
  leaseId,
  activityType,
  title,
  description,
}: {
  profileId: string;
  propertyId: string;
  leaseId?: string | null;
  activityType: string;
  title: string;
  description: string;
}) {
  const { data: existing } = await supabaseAdmin
    .from("activity_logs")
    .select("id")
    .eq("property_id", propertyId)
    .eq("activity_type", activityType)
    .limit(1);

  if (existing?.length) return;

  await supabaseAdmin.from("activity_logs").insert({
    profile_id: profileId,
    property_id: propertyId,
    lease_id: leaseId || null,
    activity_type: activityType,
    title,
    description,
  });
}

async function sendPendingPrimaryResidentInvite(property: PropertyRow) {
  const { data: leases } = await supabaseAdmin
    .from("leases")
    .select("id")
    .eq("property_id", property.id)
    .order("created_at", { ascending: true });

  const leaseRows = (leases || []) as LeaseRow[];
  const leaseIds = leaseRows.map((lease) => lease.id);
  const primaryLeaseId = leaseIds[0] || null;

  if (property.owner_profile_id) {
    await createActivityOnce({
      profileId: property.owner_profile_id,
      propertyId: property.id,
      leaseId: primaryLeaseId,
      activityType: "bank_connected",
      title: "Bank account connected",
      description: "Your bank account is connected and ready for rent collection.",
    });
  }

  if (!leaseIds.length) return;

  const { data: tenants } = await supabaseAdmin
    .from("lease_tenants")
    .select("id, lease_id, email, first_name, last_name, invite_status, invite_token")
    .in("lease_id", leaseIds)
    .eq("tenant_role", "primary")
    .order("created_at", { ascending: true });

  const pendingTenants = ((tenants || []) as LeaseTenantRow[]).filter(
    (tenant) =>
      tenant.email &&
      tenant.invite_status !== "accepted" &&
      tenant.invite_status !== "sent"
  );

  for (const tenant of pendingTenants) {
    const result = await sendEmailEvent({
      eventType: "tenant_invitation",
      recipientEmail: tenant.email as string,
      relatedPropertyId: property.id,
      relatedLeaseId: tenant.lease_id,
      payload: {
        tenantName: fullName(tenant.first_name, tenant.last_name),
        propertyName: property.property_label || "your property",
        inviteLink: inviteLink(tenant.invite_token),
      },
    });

    if (!result.ok) {
      console.warn("Resident invite send after bank setup failed:", {
        propertyId: property.id,
        tenantId: tenant.id,
        error: result.error,
      });
      continue;
    }

    await supabaseAdmin
      .from("lease_tenants")
      .update({
        invite_status: "sent",
        invite_sent_at: new Date().toISOString(),
      })
      .eq("id", tenant.id);

    if (property.owner_profile_id) {
      await createActivityOnce({
        profileId: property.owner_profile_id,
        propertyId: property.id,
        leaseId: tenant.lease_id,
        activityType: "tenant_invite_sent",
        title: "Resident invite sent",
        description: `Invite sent to ${tenant.email}`,
      });
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const cookieState = request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${STRIPE_CONNECT_STATE_COOKIE}=`))
      ?.split("=")[1];

    if (!state || !cookieState || state !== decodeURIComponent(cookieState)) {
      return redirectToDashboard(request, "/dashboard", {
        stripe_setup: "invalid_state",
      });
    }

    const verifiedState = verifyStripeConnectState(state);
    const propertyId = verifiedState.propertyId;

    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("id, property_label, owner_profile_id, stripe_account_id")
      .eq("id", propertyId)
      .single();

    if (
      !property ||
      property.owner_profile_id !== verifiedState.ownerProfileId ||
      property.stripe_account_id !== verifiedState.stripeAccountId
    ) {
      return redirectToDashboard(request, "/dashboard", {
        stripe_setup: "invalid_state",
      });
    }

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("id", verifiedState.ownerProfileId)
      .eq("user_id", verifiedState.userId)
      .single();

    if (!ownerProfile) {
      return redirectToDashboard(request, "/dashboard", {
        stripe_setup: "invalid_state",
      });
    }

    const account = await stripe.accounts.retrieve(
      verifiedState.stripeAccountId
    );

    const onboardingComplete = isStripeAccountReady(account);

    await supabaseAdmin
      .from("properties")
      .update({
        stripe_onboarding_complete: onboardingComplete,
        bank_status: onboardingComplete ? "connected" : "pending",
      })
      .eq("id", propertyId)
      .eq("owner_profile_id", verifiedState.ownerProfileId)
      .eq("stripe_account_id", verifiedState.stripeAccountId);

    if (onboardingComplete) {
      await sendPendingPrimaryResidentInvite(property as PropertyRow);

      return redirectToDashboard(
        request,
        `/dashboard/properties/${propertyId}`,
        { stripe_setup: "connected" }
      );
    }

    return redirectToDashboard(
      request,
      `/dashboard/properties/${propertyId}`,
      { stripe_setup: "pending" }
    );
  } catch (error) {
    console.warn("Stripe return rejected:", error);

    return redirectToDashboard(request, "/dashboard", {
      stripe_setup: "invalid_state",
    });
  }
}
