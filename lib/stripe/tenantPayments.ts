import { createClient } from "@supabase/supabase-js";
import {
  AVENUEBOARD_PLATFORM_FEE_CENTS,
  calculateResidentPlatformFee,
  parseLandlordAbsorbsResidentPlatformFee,
} from "@/lib/fees/residentPlatformFee";
import {
  getLeaseFirstPaymentCycleDate,
  getLeasePaymentAmountForCycle,
  type LeaseAmountLike,
} from "@/lib/leasePaymentAmounts";

export const TENANT_SERVICE_FEE_CENTS = AVENUEBOARD_PLATFORM_FEE_CENTS;

type TenantPaymentRequest = {
  tenantAccessId?: string;
  propertyId?: string;
  leaseId?: string;
};

type RentPaymentRow = {
  rent_cycle_key?: string | null;
  period_label: string | null;
  status: string | null;
};

type RentCycleDecision = {
  rentCycleKey: string;
  periodLabel: string;
  isFutureCycle: boolean;
  dueDate: string;
  debug: RentCycleDecisionDebug;
};

type LeasePreferenceDebugRow = {
  id: string | null;
  lease_id: string | null;
  landlord_absorbs_fee: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  authorized_agreed_at?: string | null;
  terms_agreed_at?: string | null;
};

export type RentCycleDecisionDebug = {
  rentPaymentsFound: RentPaymentRow[];
  paidCycleKeys: string[];
  currentCycleKey: string;
  allowedCycleKeys: string[];
  unpaidCycleKeys: string[];
  nextUnpaidCycleKey: string | null;
  isEligible: boolean;
};

export type TenantPaymentContext = {
  userId: string;
  userEmail: string;
  profileId: string;
  tenantAccessId: string;
  propertyId: string;
  leaseId: string;
  propertyLabel: string;
  unitName: string | null;
  stripeAccountId: string;
  monthlyRent: number;
  rentAmountCents: number;
  leasePreferenceId: string | null;
  rawLandlordAbsorbsFee: unknown;
  leasePreferenceRows: LeasePreferenceDebugRow[];
  landlordAbsorbsFee: boolean;
  applicationFeeCents: number;
  tenantServiceFeeCents: number;
  totalAmountCents: number;
  rentCycleKey: string;
  isFutureCycle: boolean;
  periodLabel: string;
  dueDate: string;
  guardrailDebug: RentCycleDecisionDebug;
};

export type TenantAutopayContext = {
  userId: string;
  userEmail: string;
  profileId: string;
  tenantAccessId: string;
  propertyId: string;
  leaseId: string;
  propertyLabel: string;
  unitName: string | null;
  stripeAccountId: string;
  monthlyRent: number;
};

export const tenantStripeSupabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function logTenantPaymentFeeDebug(
  label: string,
  context: Pick<
    TenantPaymentContext,
    | "landlordAbsorbsFee"
    | "rentAmountCents"
    | "tenantServiceFeeCents"
    | "applicationFeeCents"
    | "totalAmountCents"
    | "stripeAccountId"
    | "propertyId"
    | "leaseId"
    | "tenantAccessId"
    | "leasePreferenceId"
    | "rawLandlordAbsorbsFee"
    | "leasePreferenceRows"
  >
) {
  if (process.env.NODE_ENV !== "development") return;

  console.info(label, {
    property_id: context.propertyId,
    tenant_access_id: context.tenantAccessId,
    lease_id: context.leaseId,
    lease_preferences_row_id: context.leasePreferenceId,
    lease_preferences_rows: context.leasePreferenceRows,
    raw_landlord_absorbs_fee: context.rawLandlordAbsorbsFee,
    parsed_landlord_absorbs_fee: context.landlordAbsorbsFee,
    rent_cents: context.rentAmountCents,
    avenueBoardPlatformFeeResidentCents: context.tenantServiceFeeCents,
    applicationFeeCents: context.applicationFeeCents,
    total_checkout_cents: context.totalAmountCents,
    destination_account: context.stripeAccountId,
  });
}

export async function getTenantPaymentContext(
  request: Request,
  payload: TenantPaymentRequest
): Promise<TenantPaymentContext> {
  const baseContext = await getTenantAutopayContext(request, payload);

  if (!Number.isFinite(baseContext.monthlyRent) || baseContext.monthlyRent <= 0) {
    throw new TenantPaymentError("Rent amount is unavailable", 400);
  }

  const { data: lease, error: leaseError } = await tenantStripeSupabaseAdmin
    .from("leases")
    .select(
      `
      id,
      start_date,
      end_date,
      monthly_rent,
      payment_tracking_start_date,
      lease_setup_type,
      lease_amounts (
        amount_type,
        amount
      )
    `
    )
    .eq("id", baseContext.leaseId)
    .maybeSingle();

  if (leaseError || !lease) {
    throw new TenantPaymentError(leaseError?.message || "Lease not found", 404);
  }

  const { data: payments } = await tenantStripeSupabaseAdmin
    .from("rent_payments")
    .select("rent_cycle_key, period_label, status")
    .eq("lease_id", baseContext.leaseId)
    .eq("tenant_access_id", baseContext.tenantAccessId);

  const rentPayments = (payments || []) as RentPaymentRow[];

  const rentPeriod = getCurrentRentPeriod({
    startDate: lease.payment_tracking_start_date || lease.start_date,
    leaseStartDate: lease.start_date,
    endDate: lease.end_date,
    paymentTrackingStartDate: lease.payment_tracking_start_date,
    leaseSetupType: lease.lease_setup_type,
    leaseAmounts: lease.lease_amounts || [],
    payments: rentPayments,
  });
  const firstCycleDate =
    getLeaseFirstPaymentCycleDate({
      startDate: lease.start_date,
      paymentTrackingStartDate: lease.payment_tracking_start_date,
      leaseSetupType: lease.lease_setup_type,
      leaseAmounts: lease.lease_amounts || [],
    }) || getFirstRentDueDate(lease.payment_tracking_start_date || lease.start_date);
  const rentAmount = getLeasePaymentAmountForCycle({
    cycleDate: parsePeriodLabel(rentPeriod.periodLabel) || parseLocalDate(rentPeriod.dueDate) || firstCycleDate,
    firstCycleDate,
    monthlyRent: baseContext.monthlyRent,
    leaseSetupType: lease.lease_setup_type,
    leaseAmounts: lease.lease_amounts || [],
  });
  const rentAmountCents = Math.round(rentAmount * 100);
  const feePreference = await getLandlordFeePreference(baseContext.leaseId);
  const landlordAbsorbsFee = feePreference.landlordAbsorbsFee;
  const feeCalculation = calculateResidentPlatformFee({
    rentAmountCents,
    landlordAbsorbsFee,
  });
  const tenantServiceFeeCents = feeCalculation.residentPlatformFeeCents;
  const applicationFeeCents = feeCalculation.applicationFeeCents;

  if (process.env.NODE_ENV === "development") {
    console.info("Tenant Pay Now shared fee calculation", {
      input_landlordAbsorbsFee: landlordAbsorbsFee,
      output_residentPlatformFee: tenantServiceFeeCents,
      output_applicationFeeCents: applicationFeeCents,
      output_totalCents: feeCalculation.totalAmountCents,
    });
  }

  if (landlordAbsorbsFee && rentAmountCents <= applicationFeeCents) {
    throw new TenantPaymentError(
      "Rent amount must be greater than the AvenueBoard Platform Fee.",
      400
    );
  }

  return {
    ...baseContext,
    rentAmountCents,
    leasePreferenceId: feePreference.id,
    rawLandlordAbsorbsFee: feePreference.rawLandlordAbsorbsFee,
    leasePreferenceRows: feePreference.rows,
    landlordAbsorbsFee,
    applicationFeeCents,
    tenantServiceFeeCents,
    totalAmountCents: feeCalculation.totalAmountCents,
    rentCycleKey: rentPeriod.rentCycleKey,
    isFutureCycle: rentPeriod.isFutureCycle,
    periodLabel: rentPeriod.periodLabel,
    dueDate: rentPeriod.dueDate,
    guardrailDebug: rentPeriod.debug,
  };
}

export async function getTenantAutopayContext(
  request: Request,
  payload: TenantPaymentRequest
): Promise<TenantAutopayContext> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new TenantPaymentError("Unauthorized", 401);
  }

  const {
    data: { user },
    error: userError,
  } = await tenantStripeSupabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    throw new TenantPaymentError("Unauthorized", 401);
  }

  const tenantAccessId = payload.tenantAccessId?.trim();
  const propertyId = payload.propertyId?.trim();
  const leaseId = payload.leaseId?.trim();

  if (!tenantAccessId || !propertyId || !leaseId) {
    throw new TenantPaymentError("Missing tenant payment context", 400);
  }

  const { data: profile, error: profileError } = await tenantStripeSupabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.id) {
    throw new TenantPaymentError("Profile not found", 404);
  }

  const { data: access, error: accessError } = await tenantStripeSupabaseAdmin
    .from("tenant_access")
    .select("id, property_id, lease_id, tenant_profile_id, invite_status")
    .eq("id", tenantAccessId)
    .eq("property_id", propertyId)
    .eq("lease_id", leaseId)
    .eq("tenant_profile_id", profile.id)
    .maybeSingle();

  if (accessError) {
    throw new TenantPaymentError(accessError.message, 500);
  }

  if (!access || String(access.invite_status || "").toLowerCase() !== "accepted") {
    throw new TenantPaymentError("Tenant access is not active", 403);
  }

  const [{ data: lease, error: leaseError }, { data: property, error: propertyError }] =
    await Promise.all([
      tenantStripeSupabaseAdmin
        .from("leases")
        .select("id, start_date, end_date, lease_status, ended_at, monthly_rent")
        .eq("id", leaseId)
        .maybeSingle(),
      tenantStripeSupabaseAdmin
        .from("properties")
        .select("id, property_label, unit_name, bank_status, stripe_account_id")
        .eq("id", propertyId)
        .maybeSingle(),
    ]);

  if (leaseError || !lease) {
    throw new TenantPaymentError(leaseError?.message || "Lease not found", 404);
  }

  if (isLeaseEnded(lease)) {
    throw new TenantPaymentError(
      "Online rent payments are no longer available for this lease.",
      409
    );
  }

  if (propertyError || !property) {
    throw new TenantPaymentError(
      propertyError?.message || "Property not found",
      404
    );
  }

  if (String(property.bank_status || "").toLowerCase() !== "connected") {
    throw new TenantPaymentError(
      "This property is not ready for online payments yet.",
      409
    );
  }

  const stripeAccountId = String(property.stripe_account_id || "").trim();

  if (!stripeAccountId) {
    throw new TenantPaymentError(
      "This property is not ready for online payments yet.",
      409
    );
  }

  const monthlyRent = Number(lease.monthly_rent || 0);

  return {
    userId: user.id,
    userEmail: user.email || "",
    profileId: profile.id,
    tenantAccessId,
    propertyId,
    leaseId,
    propertyLabel: property.property_label || "AvenueBoard property",
    unitName: property.unit_name || null,
    stripeAccountId,
    monthlyRent,
  };
}

export class TenantPaymentError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "TenantPaymentError";
    this.status = status;
  }
}

function isLeaseEnded(lease?: {
  lease_status?: string | null;
  ended_at?: string | null;
}) {
  return (
    Boolean(lease?.ended_at) ||
    ["ended", "inactive", "terminated"].includes(
      String(lease?.lease_status || "").toLowerCase()
    )
  );
}

function getCurrentRentPeriod({
  startDate,
  leaseStartDate,
  endDate,
  paymentTrackingStartDate,
  leaseSetupType,
  leaseAmounts = [],
  payments,
}: {
  startDate?: string | null;
  leaseStartDate?: string | null;
  endDate?: string | null;
  paymentTrackingStartDate?: string | null;
  leaseSetupType?: string | null;
  leaseAmounts?: LeaseAmountLike[];
  payments: RentPaymentRow[];
}): RentCycleDecision {
  const today = new Date();
  const firstDueDate =
    getLeaseFirstPaymentCycleDate({
      startDate: leaseStartDate || startDate,
      paymentTrackingStartDate,
      leaseSetupType,
      leaseAmounts,
    }) || getFirstRentDueDate(startDate);
  const leaseEndDate = parseLocalDate(endDate);
  const todayStart = startOfToday(today);
  const currentCycle = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxEarlyCycle = new Date(
    currentCycle.getFullYear(),
    currentCycle.getMonth() + 1,
    1
  );
  const paidOrProcessingKeys = getPaidOrProcessingCycleKeys(payments);
  const currentCycleKey = formatCycleKey(currentCycle);
  const maxEarlyCycleKey = formatCycleKey(maxEarlyCycle);
  const allowedCycleKeys = [currentCycleKey, maxEarlyCycleKey];

  const cycles: Date[] = [];
  const cursor = new Date(firstDueDate);

  while (cursor <= maxEarlyCycle) {
    if (leaseEndDate && cursor > leaseEndDate) break;
    cycles.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const unpaidCycles = cycles.filter(
    (cycle) => !paidOrProcessingKeys.has(formatCycleKey(cycle))
  );
  const unpaidCycleKeys = unpaidCycles.map(formatCycleKey);
  const oldestPastOrCurrent =
    unpaidCycles.find((cycle) => cycle <= todayStart) || null;
  const nextUnpaid = unpaidCycles.find(
    (cycle) => cycle > todayStart && cycle <= maxEarlyCycle
  );
  const dueDate = oldestPastOrCurrent || nextUnpaid || null;
  const nextUnpaidCycleKey = dueDate ? formatCycleKey(dueDate) : null;
  const isEligible = Boolean(
    dueDate &&
      nextUnpaidCycleKey &&
      (dueDate <= todayStart || allowedCycleKeys.includes(nextUnpaidCycleKey))
  );
  const debug = {
    rentPaymentsFound: payments,
    paidCycleKeys: Array.from(paidOrProcessingKeys).sort(),
    currentCycleKey,
    allowedCycleKeys,
    unpaidCycleKeys,
    nextUnpaidCycleKey,
    isEligible,
  };

  if (!dueDate) {
    throw new TenantPaymentError("You have no payment due at this time.", 409);
  }

  const payableDueDate = dueDate;

  if (
    payableDueDate > todayStart &&
    !allowedCycleKeys.includes(formatCycleKey(payableDueDate))
  ) {
    throw new TenantPaymentError("You have no payment due at this time.", 409);
  }

  return {
    rentCycleKey: formatCycleKey(payableDueDate),
    periodLabel: formatPeriodLabel(payableDueDate),
    isFutureCycle: payableDueDate > todayStart,
    dueDate: payableDueDate.toISOString().slice(0, 10),
    debug,
  };
}

function getPaidOrProcessingCycleKeys(payments: RentPaymentRow[]) {
  const settledStatuses = new Set([
    "paid",
    "succeeded",
    "complete",
    "completed",
    "processing",
    "pending",
  ]);
  const keys = new Set<string>();

  payments.forEach((payment) => {
    if (!settledStatuses.has(String(payment.status || "").toLowerCase())) return;

    if (payment.rent_cycle_key) {
      keys.add(payment.rent_cycle_key);
      return;
    }

    const parsed = parsePeriodLabel(payment.period_label);
    if (parsed) keys.add(formatCycleKey(parsed));
  });

  return keys;
}

function getFirstRentDueDate(startDate?: string | null) {
  const parsedStart = parseLocalDate(startDate) || new Date();
  const year = parsedStart.getFullYear();
  const month = parsedStart.getMonth();

  if (parsedStart.getDate() === 1) {
    return new Date(year, month, 1);
  }

  return new Date(year, month + 1, 1);
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function startOfToday(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatPeriodLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCycleKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parsePeriodLabel(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value} 1`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

async function getLandlordFeePreference(leaseId: string) {
  const { data, error } = await tenantStripeSupabaseAdmin
    .from("lease_preferences")
    .select(
      "id, lease_id, landlord_absorbs_fee, created_at, authorized_agreed_at, terms_agreed_at"
    )
    .eq("lease_id", leaseId);

  if (error) {
    const fallback = await tenantStripeSupabaseAdmin
      .from("lease_preferences")
      .select("id, lease_id, landlord_absorbs_fee")
      .eq("lease_id", leaseId);

    if (fallback.error) {
      throw new TenantPaymentError(fallback.error.message, 500);
    }

    return resolveLandlordFeePreference(fallback.data || []);
  }

  return resolveLandlordFeePreference(data || []);
}

function resolveLandlordFeePreference(rows: LeasePreferenceDebugRow[]) {
  const sortedRows = [...rows].sort(compareLeasePreferenceRows);
  const row = sortedRows[0] || null;
  const rawLandlordAbsorbsFee = row?.landlord_absorbs_fee;

  return {
    id: row?.id ? String(row.id) : null,
    rawLandlordAbsorbsFee,
    rows: sortedRows,
    landlordAbsorbsFee:
      parseLandlordAbsorbsResidentPlatformFee(rawLandlordAbsorbsFee),
  };
}

function compareLeasePreferenceRows(
  left: LeasePreferenceDebugRow,
  right: LeasePreferenceDebugRow
) {
  return getLeasePreferenceSortTime(right) - getLeasePreferenceSortTime(left);
}

function getLeasePreferenceSortTime(row: LeasePreferenceDebugRow) {
  const value =
    row.updated_at ||
    row.created_at ||
    row.authorized_agreed_at ||
    row.terms_agreed_at ||
    "";
  const time = value ? new Date(value).getTime() : 0;

  return Number.isFinite(time) ? time : 0;
}
