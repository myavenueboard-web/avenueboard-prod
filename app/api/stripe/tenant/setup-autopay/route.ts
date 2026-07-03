import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  getTenantAutopayContext,
  TenantPaymentError,
  tenantStripeSupabaseAdmin,
} from "@/lib/stripe/tenantPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await getTenantAutopayContext(request, body);
    const appUrl = getAppUrl();
    const stripeCustomerId = await getOrCreateStripeCustomerId(context);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      client_reference_id: context.tenantAccessId,
      metadata: {
        source: "tenant_autopay_setup",
        user_id: context.userId,
        profile_id: context.profileId,
        tenant_access_id: context.tenantAccessId,
        property_id: context.propertyId,
        lease_id: context.leaseId,
        stripe_customer_id: stripeCustomerId,
      },
      success_url: `${appUrl}/api/stripe/tenant/setup-autopay/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/tenant?autopay=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Tenant AutoPay setup error:", error);
    const status = error instanceof TenantPaymentError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start AutoPay setup.";

    return NextResponse.json({ error: message }, { status });
  }
}

async function getOrCreateStripeCustomerId(
  context: Awaited<ReturnType<typeof getTenantAutopayContext>>
) {
  const { data: existingMethods, error } = await tenantStripeSupabaseAdmin
    .from("payment_methods")
    .select("stripe_customer_id")
    .eq("tenant_profile_id", context.profileId)
    .eq("lease_id", context.leaseId)
    .not("stripe_customer_id", "is", null)
    .limit(1);

  if (!error) {
    const existingCustomerId = existingMethods?.[0]?.stripe_customer_id;
    if (existingCustomerId) return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: context.userEmail || undefined,
    metadata: {
      source: "tenant_autopay_setup",
      user_id: context.userId,
      profile_id: context.profileId,
      tenant_access_id: context.tenantAccessId,
      property_id: context.propertyId,
      lease_id: context.leaseId,
    },
  });

  return customer.id;
}
