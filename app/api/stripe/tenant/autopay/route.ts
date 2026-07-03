import { NextResponse } from "next/server";
import {
  getTenantAutopayContext,
  TenantPaymentError,
  tenantStripeSupabaseAdmin,
} from "@/lib/stripe/tenantPayments";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const context = await getTenantAutopayContext(request, body);

    const { error } = await tenantStripeSupabaseAdmin
      .from("payment_methods")
      .update({
        autopay_status: "disabled",
        autopay_enrolled: false,
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_profile_id", context.profileId)
      .eq("tenant_access_id", context.tenantAccessId)
      .eq("property_id", context.propertyId)
      .eq("lease_id", context.leaseId);

    if (error) {
      console.error("Tenant AutoPay disable error:", {
        message: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to disable AutoPay right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tenant AutoPay update error:", error);
    const status = error instanceof TenantPaymentError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unable to update AutoPay.";

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
