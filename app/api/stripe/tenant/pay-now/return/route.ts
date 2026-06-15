import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  tenantStripeSupabaseAdmin,
} from "@/lib/stripe/tenantPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  const appUrl = getAppUrl();

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.redirect(`${appUrl}/tenant?payment=cancelled`);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    const metadata = session.metadata || {};

    console.log("Tenant Pay Now return Stripe session", {
      sessionId,
      paymentStatus: session.payment_status,
      paymentIntent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      metadata,
    });

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(`${appUrl}/tenant?payment=cancelled`);
    }

    const profileId = metadata.profile_id;
    const tenantAccessId = metadata.tenant_access_id;
    const propertyId = metadata.property_id;
    const leaseId = metadata.lease_id;
    const rentCycleKey = metadata.rent_cycle_key;
    const periodLabel = metadata.rent_cycle_month_label || metadata.period_label;
    const rentAmountCents = Number(metadata.rent_amount_cents || 0);
    const tenantServiceFeeCents = Number(metadata.tenant_service_fee_cents || 0);
    const totalAmountCents = Number(metadata.total_amount_cents || 0);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    if (
      !profileId ||
      !tenantAccessId ||
      !propertyId ||
      !leaseId ||
      !rentCycleKey ||
      !periodLabel ||
      rentAmountCents <= 0
    ) {
      console.error("Tenant Pay Now return missing metadata", {
        profileId,
        tenantAccessId,
        propertyId,
        leaseId,
        rentCycleKey,
        periodLabel,
        rentAmountCents,
      });
      return NextResponse.redirect(`${appUrl}/tenant?payment=error`);
    }

    const accessOk = await validateTenantAccess({
      profileId,
      tenantAccessId,
      propertyId,
      leaseId,
    });

    if (!accessOk) {
      return NextResponse.redirect(`${appUrl}/tenant?payment=error`);
    }

    const now = new Date().toISOString();
    const payload = {
      profile_id: profileId,
      tenant_access_id: tenantAccessId,
      property_id: propertyId,
      lease_id: leaseId,
      payment_method_id: null,
      amount: rentAmountCents / 100,
      period_label: periodLabel,
      rent_cycle_key: rentCycleKey,
      rent_cycle_month_label: periodLabel,
      rent_amount_cents: rentAmountCents,
      tenant_service_fee_cents: tenantServiceFeeCents,
      total_amount_cents: totalAmountCents || rentAmountCents + tenantServiceFeeCents,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      source: "manual",
      status: "paid",
      receipt_url: null,
      paid_at: now,
      updated_at: now,
    };

    const { data: existingPayment, error: existingError } =
      await tenantStripeSupabaseAdmin
        .from("rent_payments")
        .select("id, status")
        .eq("lease_id", leaseId)
        .eq("tenant_access_id", tenantAccessId)
        .eq("rent_cycle_key", rentCycleKey)
        .maybeSingle();

    if (existingError) {
      console.error("Tenant Pay Now return existing payment lookup error:", existingError);
      return NextResponse.redirect(`${appUrl}/tenant?payment=error`);
    }

    const saveResult = existingPayment
      ? await tenantStripeSupabaseAdmin
          .from("rent_payments")
          .update(payload)
          .eq("id", existingPayment.id)
          .select("id")
          .maybeSingle()
      : await tenantStripeSupabaseAdmin
          .from("rent_payments")
          .insert(payload)
          .select("id")
          .maybeSingle();

    console.log("Tenant Pay Now return payment save result", {
      rentCycleKey,
      periodLabel,
      existingPaymentId: existingPayment?.id || null,
      savedPaymentId: saveResult.data?.id || null,
      error: saveResult.error || null,
    });

    if (saveResult.error || !saveResult.data?.id) {
      return NextResponse.redirect(`${appUrl}/tenant?payment=error`);
    }

    return NextResponse.redirect(
      `${appUrl}/tenant?payment=success&cycle=${encodeURIComponent(periodLabel)}`
    );
  } catch (error) {
    console.error("Tenant Pay Now return error:", error);
    return NextResponse.redirect(`${appUrl}/tenant?payment=error`);
  }
}

async function validateTenantAccess({
  profileId,
  tenantAccessId,
  propertyId,
  leaseId,
}: {
  profileId: string;
  tenantAccessId: string;
  propertyId: string;
  leaseId: string;
}) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("tenant_access")
    .select("id, invite_status")
    .eq("id", tenantAccessId)
    .eq("tenant_profile_id", profileId)
    .eq("property_id", propertyId)
    .eq("lease_id", leaseId)
    .maybeSingle();

  if (error || !data) {
    console.error("Tenant Pay Now return tenant access validation failed", {
      profileId,
      tenantAccessId,
      propertyId,
      leaseId,
      error,
    });
    return false;
  }

  return String(data.invite_status || "").toLowerCase() === "accepted";
}
