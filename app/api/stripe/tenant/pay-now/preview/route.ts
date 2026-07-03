import { NextResponse } from "next/server";
import {
  getTenantPaymentContext,
  logTenantPaymentFeeDebug,
  TenantPaymentError,
} from "@/lib/stripe/tenantPayments";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (process.env.NODE_ENV === "development") {
      console.info("Tenant Pay Now preview request", {
        propertyId: body?.propertyId,
        leaseId: body?.leaseId,
        tenantAccessId: body?.tenantAccessId,
      });
    }

    const context = await getTenantPaymentContext(request, body);

    logTenantPaymentFeeDebug("Tenant Pay Now preview fee context", context);

    return NextResponse.json({
      ok: true,
      cycle: {
        tenantAccessId: context.tenantAccessId,
        rentCycleKey: context.rentCycleKey,
        monthLabel: context.periodLabel,
        rentAmountCents: context.rentAmountCents,
        landlordAbsorbsFee: context.landlordAbsorbsFee,
        tenantServiceFeeCents: context.tenantServiceFeeCents,
        applicationFeeCents: context.applicationFeeCents,
        totalAmountCents: context.totalAmountCents,
        feePayer: context.landlordAbsorbsFee ? "landlord" : "resident",
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
