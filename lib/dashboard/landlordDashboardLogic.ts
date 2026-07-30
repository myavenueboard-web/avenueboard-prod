export type DashboardLeaseLike = {
  id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  lease_status?: string | null;
  payment_status?: string | null;
  ended_at?: string | null;
  lease_tenants?: unknown[] | null;
};

export type DashboardPropertyLike<TLease extends DashboardLeaseLike> = {
  status?: string | null;
  bank_status?: string | null;
  leases?: TLease[] | null;
};

export type PropertyActionState = {
  actionNeeded: boolean;
  reasons: Array<
    | "bank_pending"
    | "lease_missing"
    | "setup_incomplete"
    | "tenant_missing"
    | "lease_ending_soon"
    | "lease_expired"
    | "payment_issue"
    | "future_lease"
  >;
};

const BLOCKING_LEASE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "declined",
  "ended",
  "expired",
  "inactive",
  "terminated",
]);

const SETUP_LEASE_STATUSES = new Set(["draft", "setup", "pending"]);
const PAYMENT_ISSUE_STATUSES = new Set(["declined", "failed", "late"]);

export function selectRelevantLease<TLease extends DashboardLeaseLike>(
  leases: TLease[] | null | undefined,
  now = new Date()
) {
  const leaseList = [...(leases || [])];
  if (!leaseList.length) return null;

  const today = startOfDay(now);

  const currentActive = leaseList
    .filter((lease) => isCurrentActiveLease(lease, today))
    .sort(compareCurrentLeases)[0];
  if (currentActive) return currentActive;

  const currentAction = leaseList
    .filter((lease) => isCurrentActionLease(lease, today))
    .sort(compareCurrentLeases)[0];
  if (currentAction) return currentAction;

  const nearestFuture = leaseList
    .filter((lease) => {
      const start = parseDashboardDate(lease.start_date);
      return Boolean(start && start > today && !isBlockingLeaseStatus(lease));
    })
    .sort((a, b) => getDateTime(a.start_date, Number.MAX_SAFE_INTEGER) - getDateTime(b.start_date, Number.MAX_SAFE_INTEGER))[0];
  if (nearestFuture) return nearestFuture;

  const mostRecentlyEnded = leaseList
    .filter((lease) => {
      const end = parseDashboardDate(lease.end_date);
      return Boolean(end && end < today);
    })
    .sort((a, b) => getDateTime(b.end_date, 0) - getDateTime(a.end_date, 0))[0];

  return mostRecentlyEnded || leaseList.sort(compareCurrentLeases)[0] || null;
}

export function getPropertyActionState<TLease extends DashboardLeaseLike>(
  property: DashboardPropertyLike<TLease>,
  selectedLease: TLease | null,
  now = new Date()
): PropertyActionState {
  const reasons: PropertyActionState["reasons"] = [];
  const today = startOfDay(now);
  const propertyActive = String(property.status || "").toLowerCase() === "active";

  if (property.bank_status !== "connected") reasons.push("bank_pending");
  if (!selectedLease) reasons.push("lease_missing");

  if (selectedLease) {
    const status = normalizeLeaseStatus(selectedLease);
    const start = parseDashboardDate(selectedLease.start_date);
    const end = parseDashboardDate(selectedLease.end_date);

    if (!propertyActive || SETUP_LEASE_STATUSES.has(status)) {
      reasons.push("setup_incomplete");
    }
    if (!selectedLease.lease_tenants?.length) reasons.push("tenant_missing");
    if (end && end < today) reasons.push("lease_expired");
    if (end && end >= today && daysBetween(today, end) <= 60) {
      reasons.push("lease_ending_soon");
    }
    if (PAYMENT_ISSUE_STATUSES.has(String(selectedLease.payment_status || "").toLowerCase())) {
      reasons.push("payment_issue");
    }
    if (start && start > today) reasons.push("future_lease");
    if (isBlockingLeaseStatus(selectedLease)) reasons.push("setup_incomplete");
  }

  return {
    actionNeeded: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
  };
}

export function isCurrentActiveLease(
  lease: DashboardLeaseLike | null | undefined,
  now = new Date()
) {
  if (!lease || isBlockingLeaseStatus(lease) || isSetupLeaseStatus(lease)) {
    return false;
  }
  if (lease.ended_at) return false;

  const today = startOfDay(now);
  const start = parseDashboardDate(lease.start_date);
  const end = parseDashboardDate(lease.end_date);

  if (!start || !end) return false;
  return start <= today && end >= today;
}

export function isSetupLeaseStatus(lease: DashboardLeaseLike) {
  return SETUP_LEASE_STATUSES.has(normalizeLeaseStatus(lease));
}

export function isBlockingLeaseStatus(lease: DashboardLeaseLike) {
  return Boolean(lease.ended_at) || BLOCKING_LEASE_STATUSES.has(normalizeLeaseStatus(lease));
}

export function parseDashboardDate(value?: string | null) {
  if (!value) return null;
  const [datePart] = value.split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return startOfDay(new Date(parts[0], parts[1] - 1, parts[2]));
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isCurrentActionLease(lease: DashboardLeaseLike, today: Date) {
  const start = parseDashboardDate(lease.start_date);
  const end = parseDashboardDate(lease.end_date);
  const overlapsToday = (!start || start <= today) && (!end || end >= today);
  if (!overlapsToday) return false;
  return (
    isSetupLeaseStatus(lease) ||
    !lease.lease_tenants?.length ||
    PAYMENT_ISSUE_STATUSES.has(String(lease.payment_status || "").toLowerCase()) ||
    Boolean(end && daysBetween(today, end) <= 60)
  );
}

function compareCurrentLeases<TLease extends DashboardLeaseLike>(a: TLease, b: TLease) {
  return getDateTime(b.start_date, 0) - getDateTime(a.start_date, 0);
}

function getDateTime(value: string | null | undefined, fallback: number) {
  return parseDashboardDate(value)?.getTime() ?? fallback;
}

function normalizeLeaseStatus(lease: DashboardLeaseLike) {
  return String(lease.lease_status || "active").toLowerCase();
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
