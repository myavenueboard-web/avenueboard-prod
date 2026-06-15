import { createClient } from "@supabase/supabase-js";

export const TENANT_SERVICE_FEE_CENTS = 1000;

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
  monthlyRent: number;
  rentAmountCents: number;
  tenantServiceFeeCents: number;
  totalAmountCents: number;
  rentCycleKey: string;
  isFutureCycle: boolean;
  periodLabel: string;
  dueDate: string;
  guardrailDebug: RentCycleDecisionDebug;
};

export const tenantStripeSupabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function getTenantPaymentContext(
  request: Request,
  payload: TenantPaymentRequest
): Promise<TenantPaymentContext> {
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
        .select("id, start_date, end_date, monthly_rent")
        .eq("id", leaseId)
        .maybeSingle(),
      tenantStripeSupabaseAdmin
        .from("properties")
        .select("id, property_label, unit_name")
        .eq("id", propertyId)
        .maybeSingle(),
    ]);

  if (leaseError || !lease) {
    throw new TenantPaymentError(leaseError?.message || "Lease not found", 404);
  }

  if (propertyError || !property) {
    throw new TenantPaymentError(
      propertyError?.message || "Property not found",
      404
    );
  }

  const monthlyRent = Number(lease.monthly_rent || 0);

  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    throw new TenantPaymentError("Rent amount is unavailable", 400);
  }

  const { data: payments } = await tenantStripeSupabaseAdmin
    .from("rent_payments")
    .select("rent_cycle_key, period_label, status")
    .eq("lease_id", leaseId)
    .eq("tenant_access_id", tenantAccessId);

  const rentPayments = (payments || []) as RentPaymentRow[];

  const rentPeriod = getCurrentRentPeriod({
    startDate: lease.start_date,
    endDate: lease.end_date,
    payments: rentPayments,
  });

  return {
    userId: user.id,
    userEmail: user.email || "",
    profileId: profile.id,
    tenantAccessId,
    propertyId,
    leaseId,
    propertyLabel: property.property_label || "AvenueBoard property",
    unitName: property.unit_name || null,
    monthlyRent,
    rentAmountCents: Math.round(monthlyRent * 100),
    tenantServiceFeeCents: TENANT_SERVICE_FEE_CENTS,
    totalAmountCents: Math.round(monthlyRent * 100) + TENANT_SERVICE_FEE_CENTS,
    rentCycleKey: rentPeriod.rentCycleKey,
    isFutureCycle: rentPeriod.isFutureCycle,
    periodLabel: rentPeriod.periodLabel,
    dueDate: rentPeriod.dueDate,
    guardrailDebug: rentPeriod.debug,
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

function getCurrentRentPeriod({
  startDate,
  endDate,
  payments,
}: {
  startDate?: string | null;
  endDate?: string | null;
  payments: RentPaymentRow[];
}): RentCycleDecision {
  const today = new Date();
  const firstDueDate = getFirstRentDueDate(startDate);
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

  console.info("Tenant Pay Now guardrail decision:", debug);

  if (!dueDate) {
    throw new TenantPaymentError("You have no payment due at this time.", 409);
  }

  const payableDueDate = dueDate;

  if (
    payableDueDate > todayStart &&
    !allowedCycleKeys.includes(formatCycleKey(payableDueDate))
  ) {
    console.warn("Tenant Pay Now blocked by early-payment limit:", debug);
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
