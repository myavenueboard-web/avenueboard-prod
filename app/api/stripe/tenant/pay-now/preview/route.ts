import { NextResponse } from "next/server";
import {
  getTenantPaymentContext,
  TenantPaymentError,
} from "@/lib/stripe/tenantPayments";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await getTenantPaymentContext(request, body);

    console.info("Tenant Pay Now preview guardrail:", {
      rentPaymentsFound: context.guardrailDebug.rentPaymentsFound,
      paidCycleKeys: context.guardrailDebug.paidCycleKeys,
      currentCycleKey: context.guardrailDebug.currentCycleKey,
      allowedCycleKeys: context.guardrailDebug.allowedCycleKeys,
      unpaidCycleKeys: context.guardrailDebug.unpaidCycleKeys,
      nextUnpaidCycleKey: context.guardrailDebug.nextUnpaidCycleKey,
      isEligible: context.guardrailDebug.isEligible,
      selectedRentCycleKey: context.rentCycleKey,
    });

    return NextResponse.json({
      ok: true,
      cycle: {
        rentCycleKey: context.rentCycleKey,
        monthLabel: context.periodLabel,
        rentAmountCents: context.rentAmountCents,
        tenantServiceFeeCents: context.tenantServiceFeeCents,
        totalAmountCents: context.totalAmountCents,
        isFutureCycle: context.isFutureCycle,
      },
    });
  } catch (error) {
    console.error("Tenant Pay Now preview error:", error);
    const status = error instanceof TenantPaymentError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to preview rent payment.";

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
