import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  getTenantPaymentContext,
  TenantPaymentError,
} from "@/lib/stripe/tenantPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await getTenantPaymentContext(request, body);
    const appUrl = getAppUrl();
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

    console.log("Tenant AutoPay setup customer/session requested", {
      userId: context.userId,
      profileId: context.profileId,
      tenantAccessId: context.tenantAccessId,
      propertyId: context.propertyId,
      leaseId: context.leaseId,
      stripeCustomerId: customer.id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer: customer.id,
      client_reference_id: context.tenantAccessId,
      metadata: {
        source: "tenant_autopay_setup",
        user_id: context.userId,
        profile_id: context.profileId,
        tenant_access_id: context.tenantAccessId,
        property_id: context.propertyId,
        lease_id: context.leaseId,
        stripe_customer_id: customer.id,
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
