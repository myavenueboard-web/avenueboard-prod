import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  tenantStripeSupabaseAdmin,
} from "@/lib/stripe/tenantPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type PaymentMethodPayload = {
  tenant_profile_id: string;
  lease_id: string;
  brand: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
  tenant_access_id?: string;
  property_id?: string;
  stripe_customer_id?: string;
  stripe_payment_method_id?: string;
  autopay_status?: string;
  autopay_enrolled?: boolean;
  updated_at?: string;
};

export async function GET(request: Request) {
  const appUrl = getAppUrl();

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.redirect(`${appUrl}/tenant?autopay=cancelled`);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent", "setup_intent.payment_method"],
    });

    if (session.status !== "complete") {
      return NextResponse.redirect(`${appUrl}/tenant?autopay=cancelled`);
    }

    const setupIntent = await resolveSetupIntent(session);
    const paymentMethod = await resolvePaymentMethod(setupIntent);
    const card = paymentMethod?.card;
    const metadata = session.metadata || {};
    const stripeCustomerId =
      metadata.stripe_customer_id ||
      (typeof session.customer === "string" ? session.customer : session.customer?.id) ||
      (typeof setupIntent?.customer === "string"
        ? setupIntent.customer
        : setupIntent?.customer?.id) ||
      "";

    const tenantAccessId = metadata.tenant_access_id;
    const propertyId = metadata.property_id;
    const leaseId = metadata.lease_id;
    const profileId = metadata.profile_id;

    if (
      !tenantAccessId ||
      !propertyId ||
      !leaseId ||
      !profileId ||
      !paymentMethod ||
      !card ||
      !stripeCustomerId
    ) {
      console.error("Tenant AutoPay return missing required setup data");
      return NextResponse.redirect(`${appUrl}/tenant?autopay=error`);
    }

    const accessOk = await validateTenantAccess({
      tenantAccessId,
      propertyId,
      leaseId,
      profileId,
    });

    if (!accessOk) {
      return NextResponse.redirect(`${appUrl}/tenant?autopay=error`);
    }

    const leaseAcceptsPayments = await validateLeaseAcceptsPayments(leaseId);

    if (!leaseAcceptsPayments) {
      return NextResponse.redirect(`${appUrl}/tenant?autopay=lease_ended`);
    }

    const saved = await saveTenantPaymentMethod({
      profileId,
      leaseId,
      tenantAccessId,
      propertyId,
      stripeCustomerId,
      paymentMethod,
      card,
    });

    if (!saved) {
      return NextResponse.redirect(`${appUrl}/tenant?autopay=error`);
    }

    return NextResponse.redirect(`${appUrl}/tenant?autopay=success`);
  } catch (error) {
    console.error("Tenant AutoPay return error:", error);
    return NextResponse.redirect(`${appUrl}/tenant?autopay=error`);
  }
}

async function resolveSetupIntent(session: Stripe.Checkout.Session) {
  if (!session.setup_intent) return null;

  if (typeof session.setup_intent !== "string") {
    return session.setup_intent;
  }

  return stripe.setupIntents.retrieve(session.setup_intent, {
    expand: ["payment_method"],
  });
}

async function resolvePaymentMethod(setupIntent: Stripe.SetupIntent | null) {
  const paymentMethod = setupIntent?.payment_method;

  if (!paymentMethod) return null;

  if (typeof paymentMethod !== "string") {
    return paymentMethod;
  }

  return stripe.paymentMethods.retrieve(paymentMethod);
}

async function validateTenantAccess({
  tenantAccessId,
  propertyId,
  leaseId,
  profileId,
}: {
  tenantAccessId: string;
  propertyId: string;
  leaseId: string;
  profileId: string;
}) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("tenant_access")
    .select("id, invite_status")
    .eq("id", tenantAccessId)
    .eq("tenant_profile_id", profileId)
    .eq("property_id", propertyId)
    .eq("lease_id", leaseId)
    .maybeSingle();

  if (error || !data) return false;

  return String(data.invite_status || "").toLowerCase() === "accepted";
}

async function validateLeaseAcceptsPayments(leaseId: string) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("leases")
    .select("id, lease_status, ended_at")
    .eq("id", leaseId)
    .maybeSingle();

  if (error || !data) return false;

  return !(
    data.ended_at ||
    ["ended", "inactive", "terminated"].includes(
      String(data.lease_status || "").toLowerCase()
    )
  );
}

async function saveTenantPaymentMethod({
  profileId,
  leaseId,
  tenantAccessId,
  propertyId,
  stripeCustomerId,
  paymentMethod,
  card,
}: {
  profileId: string;
  leaseId: string;
  tenantAccessId: string;
  propertyId: string;
  stripeCustomerId: string;
  paymentMethod: Stripe.PaymentMethod;
  card: Stripe.PaymentMethod.Card;
}) {
  if (!profileId) {
    console.error("Tenant AutoPay save blocked: missing profileId");
    return false;
  }

  const now = new Date().toISOString();
  const richPayload: PaymentMethodPayload = {
    tenant_profile_id: profileId,
    lease_id: leaseId,
    tenant_access_id: tenantAccessId,
    property_id: propertyId,
    stripe_customer_id: stripeCustomerId,
    stripe_payment_method_id: paymentMethod.id,
    brand: card.brand,
    last4: card.last4,
    exp_month: String(card.exp_month),
    exp_year: String(card.exp_year),
    is_default: true,
    autopay_status: "enrolled",
    autopay_enrolled: true,
    updated_at: now,
  };

  const basePayload: PaymentMethodPayload = {
    tenant_profile_id: profileId,
    lease_id: leaseId,
    brand: card.brand,
    last4: card.last4,
    exp_month: String(card.exp_month),
    exp_year: String(card.exp_year),
    is_default: true,
  };

  const { error: resetDefaultError } = await tenantStripeSupabaseAdmin
    .from("payment_methods")
    .update({ is_default: false })
    .eq("tenant_profile_id", profileId)
    .eq("lease_id", leaseId);

  if (resetDefaultError) {
    console.error("Tenant AutoPay default reset error:", {
      leaseId,
      profileId,
      error: formatSupabaseError(resetDefaultError),
    });
  }

  const existingByStripe = await findExistingPaymentMethodByStripeId(
    paymentMethod.id,
    profileId
  );
  const existingByCard =
    existingByStripe ||
    (await findExistingPaymentMethodByCard({
      profileId,
      leaseId,
      card,
    }));
  const existingId = existingByCard?.id || null;

  const saveResult = existingId
    ? await tenantStripeSupabaseAdmin
        .from("payment_methods")
        .update(richPayload)
        .eq("id", existingId)
        .select("id")
        .maybeSingle()
    : await tenantStripeSupabaseAdmin
        .from("payment_methods")
        .insert(richPayload)
        .select("id")
        .maybeSingle();

  if (!saveResult.error && saveResult.data?.id) {
    return true;
  }

  if (saveResult.error && !isMissingColumnError(saveResult.error)) {
    return false;
  }

  const fallbackResult = existingId
    ? await tenantStripeSupabaseAdmin
        .from("payment_methods")
        .update(basePayload)
        .eq("id", existingId)
        .select("id")
        .maybeSingle()
    : await tenantStripeSupabaseAdmin
        .from("payment_methods")
        .insert(basePayload)
        .select("id")
        .maybeSingle();

  return Boolean(!fallbackResult.error && fallbackResult.data?.id);
}

async function findExistingPaymentMethodByStripeId(
  stripePaymentMethodId: string,
  profileId: string
) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("payment_methods")
    .select("id")
    .eq("tenant_profile_id", profileId)
    .eq("stripe_payment_method_id", stripePaymentMethodId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function findExistingPaymentMethodByCard({
  profileId,
  leaseId,
  card,
}: {
  profileId: string;
  leaseId: string;
  card: Stripe.PaymentMethod.Card;
}) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("payment_methods")
    .select("id")
    .eq("tenant_profile_id", profileId)
    .eq("lease_id", leaseId)
    .eq("brand", card.brand)
    .eq("last4", card.last4)
    .eq("exp_month", String(card.exp_month))
    .eq("exp_year", String(card.exp_year))
    .maybeSingle();

  if (error) {
    console.error("Tenant AutoPay card lookup error:", formatSupabaseError(error));
    return null;
  }

  return data;
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    String(error.message || "").toLowerCase().includes("column")
  );
}

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}) {
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}
