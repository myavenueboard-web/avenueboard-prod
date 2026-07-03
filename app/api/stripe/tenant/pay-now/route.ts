import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAppUrl,
  getTenantPaymentContext,
  logTenantPaymentFeeDebug,
  TenantPaymentError,
  tenantStripeSupabaseAdmin,
} from "@/lib/stripe/tenantPayments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await getTenantPaymentContext(request, body);
    const appUrl = getAppUrl();

    const duplicate = await getExistingCyclePayment({
      leaseId: context.leaseId,
      tenantAccessId: context.tenantAccessId,
      rentCycleKey: context.rentCycleKey,
      periodLabel: context.periodLabel,
    });

    if (duplicate?.paid) {
      return NextResponse.json(
        { error: "This rent cycle has already been paid." },
        { status: 409 }
      );
    }

    if (duplicate?.processing) {
      return NextResponse.json(
        { error: "Payment is already in progress for this rent cycle." },
        { status: 409 }
      );
    }

    const account = await stripe.accounts.retrieve(context.stripeAccountId);

    if (!isStripeAccountPaymentReady(account)) {
      return NextResponse.json(
        { error: "This property is not ready for online payments yet." },
        { status: 409 }
      );
    }

    logTenantPaymentFeeDebug("Tenant Pay Now checkout fee context", context);

    const rentDescription = [
      context.propertyLabel,
      context.unitName ? `Unit ${context.unitName}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Rent payment — ${context.periodLabel}`,
            description: rentDescription,
          },
          unit_amount: context.rentAmountCents,
        },
        quantity: 1,
      },
    ];

    if (context.tenantServiceFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "AvenueBoard Platform Fee",
            description: "Resident monthly platform fee",
          },
          unit_amount: context.tenantServiceFeeCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: context.userEmail || undefined,
      client_reference_id: context.tenantAccessId,
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: context.applicationFeeCents,
        transfer_data: {
          destination: context.stripeAccountId,
        },
        metadata: {
          source: "tenant_pay_now",
          property_id: context.propertyId,
          lease_id: context.leaseId,
          tenant_access_id: context.tenantAccessId,
          rent_cycle_key: context.rentCycleKey,
          fee_payer: context.landlordAbsorbsFee ? "landlord" : "resident",
        },
      },
      metadata: {
        source: "tenant_pay_now",
        user_id: context.userId,
        profile_id: context.profileId,
        tenant_access_id: context.tenantAccessId,
        property_id: context.propertyId,
        lease_id: context.leaseId,
        rent_cycle_key: context.rentCycleKey,
        rent_cycle_month_label: context.periodLabel,
        period_label: context.periodLabel,
        due_date: context.dueDate,
        rent_amount_cents: String(context.rentAmountCents),
        tenant_service_fee_cents: String(context.tenantServiceFeeCents),
        application_fee_cents: String(context.applicationFeeCents),
        total_amount_cents: String(context.totalAmountCents),
        landlord_absorbs_fee: String(context.landlordAbsorbsFee),
        fee_payer: context.landlordAbsorbsFee ? "landlord" : "resident",
        stripe_connected_account_id: context.stripeAccountId,
        payment_method_mode: "card_only",
      },
      success_url: `${appUrl}/api/stripe/tenant/pay-now/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/tenant?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Tenant Pay Now checkout error:", error);
    const status = error instanceof TenantPaymentError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start rent payment.";

    return NextResponse.json({ error: message }, { status });
  }
}

function isStripeAccountPaymentReady(account: Stripe.Account) {
  return account.charges_enabled === true && account.payouts_enabled === true;
}

async function getExistingCyclePayment({
  leaseId,
  tenantAccessId,
  rentCycleKey,
  periodLabel,
}: {
  leaseId: string;
  tenantAccessId: string;
  rentCycleKey: string;
  periodLabel: string;
}) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("rent_payments")
    .select("id, status")
    .eq("lease_id", leaseId)
    .eq("tenant_access_id", tenantAccessId)
    .or(`rent_cycle_key.eq.${rentCycleKey},period_label.eq.${periodLabel}`);

  if (error) {
    console.error("Tenant Pay Now duplicate lookup error:", {
      rentCycleKey,
      message: error.message,
      code: error.code,
    });
    return null;
  }

  const rows = data || [];
  const statuses = rows.map((row) => String(row.status || "").toLowerCase());

  return {
    paid: statuses.some((status) =>
      ["paid", "succeeded", "complete", "completed"].includes(status)
    ),
    processing: statuses.some((status) =>
      ["processing", "pending"].includes(status)
    ),
  };
}
