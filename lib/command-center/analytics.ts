import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";

export type AnalyticsRangeId = "today" | "7d" | "30d" | "mtd" | "ytd";

export type AnalyticsMetricKind =
  | "current snapshot"
  | "period total"
  | "period unique count"
  | "period average"
  | "period conversion rate";

export type AnalyticsMetric = {
  key: string;
  label: string;
  value: string;
  help: string;
  kind: AnalyticsMetricKind;
  state?: "ready" | "error" | "deferred";
};

export type AnalyticsSection = {
  title: string;
  description: string;
  metrics: AnalyticsMetric[];
};

export type AnalyticsTrendPoint = {
  label: string;
  users: number;
  landlords: number;
  residents: number;
};

export type FunnelStage = {
  label: string;
  count: number;
  previousConversion: string;
  registeredConversion: string;
  dropOff: number;
  limitation?: string;
};

export type BreakdownRow = {
  label: string;
  value: string;
};

export type AnalyticsDashboard = {
  range: AnalyticsDateRange;
  definitions: MetricDefinition[];
  executive: AnalyticsSection;
  userGrowth: {
    metrics: AnalyticsMetric[];
    trend: AnalyticsTrendPoint[];
    split: BreakdownRow[];
  };
  activation: {
    landlord: FunnelStage[];
    resident: FunnelStage[];
  };
  portfolio: AnalyticsSection;
  payments: AnalyticsSection & {
    methodSplit: BreakdownRow[];
  };
  support: AnalyticsSection & {
    byCategory: BreakdownRow[];
    byStatus: BreakdownRow[];
    byPriority: BreakdownRow[];
  };
  health: AnalyticsSection;
  limitations: string[];
};

export type AnalyticsDateRange = {
  id: AnalyticsRangeId;
  label: string;
  start: Date;
  end: Date;
  timezone: string;
  boundaryDescription: string;
  bucket: "hour" | "day" | "week";
};

type MetricDefinition = {
  key: string;
  displayName: string;
  description: string;
  sourceTables: string[];
  entity: string;
  dateField: string;
  aggregation: AnalyticsMetricKind;
  currentDefinition: string;
  limitations: string;
};

type ProfileRow = {
  id: string;
  created_at: string | null;
};

type RoleRow = {
  profile_id: string;
  role: string;
};

type PropertyRow = {
  id: string;
  owner_profile_id: string | null;
  status: string | null;
  bank_status: string | null;
  stripe_onboarding_complete: boolean | null;
  created_at: string | null;
};

type LeaseRow = {
  id: string;
  property_id: string | null;
  lease_status: string | null;
  start_date: string | null;
  end_date: string | null;
  ended_at: string | null;
  monthly_rent: number | string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  invite_status: string | null;
  created_at: string | null;
};

type LeaseTenantRow = {
  id: string;
  lease_id: string | null;
  profile_id: string | null;
  email: string | null;
};

type PaymentRow = {
  id: string;
  profile_id: string | null;
  tenant_profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  amount: number | string | null;
  total_amount_cents: number | null;
  rent_amount_cents: number | null;
  source: string | null;
  payment_method_id: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type CaseRow = {
  id: string;
  category: string | null;
  status: string | null;
  priority: string | null;
  assigned_staff_user_id: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CountResult = { count: number | null; error: unknown };
type CountQuery = PromiseLike<CountResult>;

const ANALYTICS_TIMEZONE = "America/Chicago";
const SUCCESS_STATUSES = new Set(["paid", "completed", "succeeded", "posted"]);
const FAILED_STATUSES = new Set(["failed", "declined", "canceled", "cancelled"]);
const PROCESSING_STATUSES = new Set(["pending", "processing", "in_progress"]);
const PARTIAL_STATUSES = new Set(["partial"]);
const TERMINAL_STATUSES = new Set([...SUCCESS_STATUSES, ...FAILED_STATUSES]);
const ACTIVE_CASE_STATUSES = new Set([
  "new",
  "open",
  "in_review",
  "waiting_on_customer",
  "waiting_on_avenueboard",
  "waiting_on_payment_partner",
  "escalated",
]);

export const ANALYTICS_METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: "total_registered_users",
    displayName: "Total registered users",
    description: "All profile records currently in AvenueBoard.",
    sourceTables: ["profiles"],
    entity: "profile",
    dateField: "created_at for period variants",
    aggregation: "current snapshot",
    currentDefinition: "Count of profile ids.",
    limitations: "Profiles without auth linkage are still counted as profile records.",
  },
  {
    key: "landlord_activation_funnel",
    displayName: "Landlord activation funnel",
    description: "Current-state landlord progression across property, lease, invite, bank, and payment milestones.",
    sourceTables: ["user_roles", "properties", "leases", "tenant_access", "rent_payments"],
    entity: "unique landlord profile",
    dateField: "current state; not cohort timestamped",
    aggregation: "period conversion rate",
    currentDefinition: "Deduplicated landlord profile ids at each reliable current-state milestone.",
    limitations: "Historical milestone timestamps are not complete, so this is not a cohort funnel.",
  },
  {
    key: "rent_processed",
    displayName: "Rent processed",
    description: "Successful rent amount in the selected period.",
    sourceTables: ["rent_payments"],
    entity: "rent payment",
    dateField: "paid_at",
    aggregation: "period total",
    currentDefinition: "Sum of rent_amount_cents when available, otherwise amount, for paid-like statuses.",
    limitations: "Refund/dispute netting is omitted because reliable refund/dispute fields are not stored.",
  },
  {
    key: "support_cases",
    displayName: "Support cases",
    description: "Operational support ticket counts and breakdowns.",
    sourceTables: ["support_tickets"],
    entity: "support ticket",
    dateField: "created_at or resolved_at depending on metric",
    aggregation: "period total",
    currentDefinition: "Counts normalized Command Center case statuses and priorities.",
    limitations: "First staff action is omitted unless reliable response/event timestamps exist.",
  },
];

export function getAnalyticsDateRange(range: string | undefined): AnalyticsDateRange {
  const id: AnalyticsRangeId =
    range === "today" || range === "30d" || range === "mtd" || range === "ytd"
      ? range
      : "7d";
  const now = new Date();
  const chicago = getZonedParts(now);
  let startParts = { year: chicago.year, month: chicago.month, day: chicago.day };
  let bucket: AnalyticsDateRange["bucket"] = id === "today" ? "hour" : "day";
  let label = "Last 7 Days";

  if (id === "today") {
    label = "Today";
  } else if (id === "30d") {
    label = "Last 30 Days";
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    startParts = getZonedParts(start);
  } else if (id === "mtd") {
    label = "Month to Date";
    startParts = { year: chicago.year, month: chicago.month, day: 1 };
  } else if (id === "ytd") {
    label = "Year to Date";
    startParts = { year: chicago.year, month: 1, day: 1 };
    bucket = "week";
  } else {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    startParts = getZonedParts(start);
  }

  const start = zonedDateToUtc(startParts.year, startParts.month, startParts.day);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowParts = getZonedParts(tomorrow);
  const end = id === "today" ? zonedDateToUtc(tomorrowParts.year, tomorrowParts.month, tomorrowParts.day) : now;

  return {
    id,
    label,
    start,
    end,
    timezone: ANALYTICS_TIMEZONE,
    boundaryDescription:
      "America/Chicago timezone, inclusive start, exclusive end. Today ends at the next Chicago midnight; other ranges end at request time.",
    bucket,
  };
}

export async function getCommandCenterAnalytics(
  staff: StaffUser,
  range: AnalyticsDateRange
): Promise<AnalyticsDashboard> {
  if (!staffHasCapability(staff, "analytics.view")) {
    throw new Error("Analytics view permission required.");
  }

  const [
    people,
    portfolio,
    payments,
    support,
    health,
    trends,
    landlordFunnel,
    residentFunnel,
  ] = await Promise.all([
    loadPeopleAnalytics(range),
    loadPortfolioAnalytics(range),
    loadPaymentAnalytics(range),
    loadSupportAnalytics(range),
    loadOperationalHealth(),
    loadUserGrowthTrend(range),
    loadLandlordFunnel(),
    loadResidentFunnel(),
  ]);

  return {
    range,
    definitions: ANALYTICS_METRIC_DEFINITIONS,
    executive: {
      title: "Executive Overview",
      description: "Top-line internal operations metrics. Snapshot and period metrics are labeled separately.",
      metrics: [
        people.totalUsers,
        people.totalLandlords,
        people.totalResidents,
        people.newSignups,
        people.activeLandlords,
        people.activeResidents,
        portfolio.totalProperties,
        portfolio.activeLeases,
        portfolio.rentCollectingLandlords,
        payments.rentProcessed,
        payments.successfulPayments,
        payments.failedPayments,
        support.openCases,
        support.criticalCases,
      ],
    },
    userGrowth: {
      metrics: [
        people.newSignups,
        people.newLandlords,
        people.newResidents,
        people.totalUsers,
        people.dualRoleUsers,
      ],
      trend: trends,
      split: [
        { label: "Landlord-only", value: people.landlordOnly.value },
        { label: "Resident-only", value: people.residentOnly.value },
        { label: "Dual-role", value: people.dualRoleUsers.value },
      ],
    },
    activation: {
      landlord: landlordFunnel,
      resident: residentFunnel,
    },
    portfolio,
    payments,
    support,
    health,
    limitations: [
      "Custom ranges are deferred until a Command Center date picker is added.",
      "Activation funnels are current-state funnels because historical milestone timestamps are incomplete.",
      "First staff response time is deferred until staff response events are reliably stored.",
      "Refund and dispute analytics are omitted because reliable refund/dispute records are not stored.",
      "Payment method split is inferred from stored source/payment method strings only.",
    ],
  };
}

async function loadPeopleAnalytics(range: AnalyticsDateRange) {
  const supabase = getCommandCenterAdminClient();
  const [profiles, roles, newProfiles] = await Promise.all([
    safeCount("total_registered_users", () =>
      supabase.from("profiles").select("id", { count: "exact", head: true })
    ),
    safeRows<RoleRow>("user_roles", () => supabase.from("user_roles").select("profile_id, role")),
    safeRows<ProfileRow>("new_profiles", () =>
      supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString())
        .limit(5000)
    ),
  ]);

  const roleMap = buildRoleMap(roles.data);
  const landlordIds = idsForRole(roleMap, "landlord");
  const residentIds = idsForRole(roleMap, "tenant");
  const dualIds = [...landlordIds].filter((id) => residentIds.has(id));
  const newProfileIds = new Set(newProfiles.data.map((profile) => profile.id));
  const newLandlords = [...newProfileIds].filter((id) => landlordIds.has(id)).length;
  const newResidents = [...newProfileIds].filter((id) => residentIds.has(id)).length;

  return {
    totalUsers: metric("total_registered_users", "Total registered users", profiles, "All profile records.", "current snapshot"),
    totalLandlords: valueMetric("total_landlords", "Total landlords", landlordIds.size, "Unique profiles with landlord role.", "current snapshot"),
    totalResidents: valueMetric("total_residents", "Total residents", residentIds.size, "Unique profiles with tenant role.", "current snapshot"),
    newSignups: valueMetric("new_signups", "New signups", newProfiles.data.length, "Profiles created in selected period.", "period total", newProfiles.error),
    newLandlords: valueMetric("new_landlords", "New landlords", newLandlords, "New profiles in selected period that currently have landlord role.", "period unique count", roles.error || newProfiles.error),
    newResidents: valueMetric("new_residents", "New residents", newResidents, "New profiles in selected period that currently have tenant role.", "period unique count", roles.error || newProfiles.error),
    activeLandlords: valueMetric("active_landlords", "Active landlords", landlordIds.size, "Current unique landlord-role profiles.", "current snapshot", roles.error),
    activeResidents: valueMetric("active_residents", "Active residents", residentIds.size, "Current unique tenant-role profiles.", "current snapshot", roles.error),
    landlordOnly: valueMetric("landlord_only", "Landlord-only users", landlordIds.size - dualIds.length, "Unique landlord profiles without tenant role.", "current snapshot", roles.error),
    residentOnly: valueMetric("resident_only", "Resident-only users", residentIds.size - dualIds.length, "Unique tenant profiles without landlord role.", "current snapshot", roles.error),
    dualRoleUsers: valueMetric("dual_role_users", "Dual-role users", dualIds.length, "Unique profiles with both landlord and tenant roles.", "current snapshot", roles.error),
  };
}

async function loadPortfolioAnalytics(range: AnalyticsDateRange): Promise<AnalyticsSection & {
  totalProperties: AnalyticsMetric;
  activeLeases: AnalyticsMetric;
  rentCollectingLandlords: AnalyticsMetric;
}> {
  const supabase = getCommandCenterAdminClient();
  const [properties, leases, createdProperties, access] = await Promise.all([
    safeRows<PropertyRow>("properties", () =>
      supabase
        .from("properties")
        .select("id, owner_profile_id, status, bank_status, stripe_onboarding_complete, created_at")
        .limit(5000)
    ),
    safeRows<LeaseRow>("leases", () =>
      supabase
        .from("leases")
        .select("id, property_id, lease_status, start_date, end_date, ended_at, monthly_rent")
        .limit(5000)
    ),
    safeCount("properties_created_period", () =>
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString())
    ),
    safeRows<TenantAccessRow>("tenant_access", () =>
      supabase.from("tenant_access").select("id, tenant_profile_id, property_id, lease_id, invite_status, created_at").limit(5000)
    ),
  ]);

  const now = new Date();
  const activeLeases = leases.data.filter((lease) => isActiveLease(lease, now));
  const futureLeases = leases.data.filter((lease) => lease.start_date && new Date(lease.start_date) > now);
  const expiredLeases = leases.data.filter((lease) => lease.end_date && new Date(lease.end_date) < now);
  const activePropertyIds = new Set(activeLeases.map((lease) => lease.property_id).filter(Boolean));
  const activeProperties = properties.data.filter((property) => activePropertyIds.has(property.id));
  const setupIncomplete = properties.data.filter((property) => !isPropertyPaymentEnabled(property));
  const vacant = properties.data.filter((property) => !activePropertyIds.has(property.id) && String(property.status || "").toLowerCase() === "active");
  const ending30 = leasesEndingWithin(activeLeases, 30);
  const ending60 = leasesEndingWithin(activeLeases, 60);
  const ending90 = leasesEndingWithin(activeLeases, 90);
  const rentValues = activeLeases.map((lease) => Number(lease.monthly_rent || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const rentRoll = rentValues.reduce((sum, value) => sum + value, 0);
  const connectedLandlords = new Set(
    properties.data
      .filter((property) => isPropertyPaymentEnabled(property))
      .map((property) => property.owner_profile_id)
      .filter(Boolean)
  );
  const sharedError = properties.error || leases.error;

  const metrics = [
    metric("properties_created_period", "Properties created", createdProperties, "Property records created in selected period.", "period total"),
    valueMetric("total_properties", "Total properties", properties.data.length, "All current property records.", "current snapshot", properties.error),
    valueMetric("active_properties", "Active properties", activeProperties.length, "Properties with an active lease today.", "current snapshot", sharedError),
    valueMetric("setup_incomplete_properties", "Setup-incomplete properties", setupIncomplete.length, "Properties without connected payout/payment setup.", "current snapshot", properties.error),
    valueMetric("vacant_properties", "Vacant properties", vacant.length, "Active property records without an active lease.", "current snapshot", sharedError),
    valueMetric("active_leases", "Active leases", activeLeases.length, "Leases active today.", "current snapshot", leases.error),
    valueMetric("future_leases", "Future leases", futureLeases.length, "Leases with a future start date.", "current snapshot", leases.error),
    valueMetric("expired_leases", "Expired leases", expiredLeases.length, "Leases whose end date has passed.", "current snapshot", leases.error),
    valueMetric("leases_ending_30", "Leases ending within 30 days", ending30, "Active leases ending within 30 days.", "current snapshot", leases.error),
    valueMetric("leases_ending_60", "Leases ending within 60 days", ending60, "Active leases ending within 60 days.", "current snapshot", leases.error),
    valueMetric("leases_ending_90", "Leases ending within 90 days", ending90, "Active leases ending within 90 days.", "current snapshot", leases.error),
    valueMetric("average_monthly_rent", "Average monthly rent", rentValues.length ? formatCurrency(rentRoll / rentValues.length) : "$0", "Average monthly rent across active leases.", "current snapshot", leases.error),
    valueMetric("rent_roll", "Rent roll", formatCurrency(rentRoll), "Monthly rent total from active leases.", "current snapshot", leases.error),
    valueMetric("resident_invites", "Resident invitations", access.data.length, "Tenant access/invite records.", "current snapshot", access.error),
  ];

  return {
    title: "Portfolio and Lease Activity",
    description: "Current portfolio state plus selected-period property creation.",
    metrics,
    totalProperties: metrics[1],
    activeLeases: metrics[5],
    rentCollectingLandlords: valueMetric("rent_collecting_landlords", "Rent-collecting landlords", connectedLandlords.size, "Distinct landlords with at least one payment-enabled property.", "current snapshot", properties.error),
  };
}

async function loadPaymentAnalytics(range: AnalyticsDateRange): Promise<AnalyticsSection & {
  rentProcessed: AnalyticsMetric;
  successfulPayments: AnalyticsMetric;
  failedPayments: AnalyticsMetric;
  methodSplit: BreakdownRow[];
}> {
  const supabase = getCommandCenterAdminClient();
  const payments = await safeRows<PaymentRow>("rent_payments_period", () =>
    supabase
      .from("rent_payments")
      .select("id, profile_id, tenant_profile_id, tenant_access_id, property_id, lease_id, amount, total_amount_cents, rent_amount_cents, source, payment_method_id, status, paid_at, created_at")
      .or(
        `paid_at.gte.${range.start.toISOString()},created_at.gte.${range.start.toISOString()}`
      )
      .limit(5000)
  );

  const periodPayments = payments.data.filter((payment) => {
    const date = payment.paid_at || payment.created_at;
    return inRange(date, range);
  });
  const uniquePayments = dedupePayments(periodPayments);
  const successful = uniquePayments.filter((payment) => SUCCESS_STATUSES.has(status(payment)));
  const failed = uniquePayments.filter((payment) => FAILED_STATUSES.has(status(payment)));
  const processing = uniquePayments.filter((payment) => PROCESSING_STATUSES.has(status(payment)));
  const partial = uniquePayments.filter((payment) => PARTIAL_STATUSES.has(status(payment)));
  const terminal = uniquePayments.filter((payment) => TERMINAL_STATUSES.has(status(payment)));
  const rentProcessed = successful.reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const average = successful.length ? rentProcessed / successful.length : 0;
  const review = uniquePayments.filter(
    (payment) => FAILED_STATUSES.has(status(payment)) || PROCESSING_STATUSES.has(status(payment)) || !knownPaymentStatus(payment)
  );
  const methodCounts = countBy(uniquePayments, paymentMethod);

  return {
    title: "Payments",
    description: "Selected-period rent movement and payment health. Pending/processing rows are not terminal failures.",
    metrics: [
      valueMetric("rent_processed", "Rent processed", formatCurrency(rentProcessed), "Successful rent volume in selected period.", "period total", payments.error),
      valueMetric("successful_payments", "Successful payments", successful.length, "Paid/completed/succeeded/posted payment rows after dedupe.", "period total", payments.error),
      valueMetric("failed_payments", "Failed payments", failed.length, "Failed/declined/canceled terminal attempts.", "period total", payments.error),
      valueMetric("processing_payments", "Processing payments", processing.length, "Pending or processing payment rows.", "period total", payments.error),
      valueMetric("partial_payments", "Partial payments", partial.length, "Payment rows marked partial.", "period total", payments.error),
      valueMetric("payment_success_rate", "Payment success rate", percent(successful.length, terminal.length), "Successful terminal payments divided by all terminal attempts.", "period conversion rate", payments.error),
      valueMetric("average_payment_amount", "Average payment amount", formatCurrency(average), "Average successful rent payment amount.", "period average", payments.error),
      deferredMetric("outstanding_balance", "Outstanding balance", "Requires statement-level allocation across obligations; deferred to avoid misleading totals."),
      valueMetric("payments_requiring_review", "Payments requiring review", review.length, "Failed, processing, or unknown payment rows.", "period total", payments.error),
    ],
    rentProcessed: valueMetric("rent_processed", "Rent processed", formatCurrency(rentProcessed), "Successful rent volume in selected period.", "period total", payments.error),
    successfulPayments: valueMetric("successful_payments", "Successful payments", successful.length, "Paid/completed/succeeded/posted payment rows after dedupe.", "period total", payments.error),
    failedPayments: valueMetric("failed_payments", "Failed payments", failed.length, "Failed/declined/canceled terminal attempts.", "period total", payments.error),
    methodSplit: Object.entries(methodCounts).map(([label, count]) => ({ label, value: String(count) })),
  };
}

async function loadSupportAnalytics(range: AnalyticsDateRange): Promise<AnalyticsSection & {
  openCases: AnalyticsMetric;
  criticalCases: AnalyticsMetric;
  byCategory: BreakdownRow[];
  byStatus: BreakdownRow[];
  byPriority: BreakdownRow[];
}> {
  const supabase = getCommandCenterAdminClient();
  const cases = await safeRows<CaseRow>("support_tickets", () =>
    supabase
      .from("support_tickets")
      .select("id, category, status, priority, assigned_staff_user_id, resolved_at, created_at, updated_at")
      .limit(5000)
  );
  const periodCases = cases.data.filter((item) => inRange(item.created_at, range));
  const openCases = cases.data.filter((item) => ACTIVE_CASE_STATUSES.has(normalizeCaseStatus(item.status)));
  const resolvedPeriod = cases.data.filter((item) => normalizeCaseStatus(item.status) === "resolved" && inRange(item.resolved_at, range));
  const closedCases = cases.data.filter((item) => normalizeCaseStatus(item.status) === "closed");
  const critical = openCases.filter((item) => ["critical", "time_sensitive"].includes(normalizeCasePriority(item.priority)));
  const unassigned = openCases.filter((item) => !item.assigned_staff_user_id);
  const waitingCustomer = openCases.filter((item) => normalizeCaseStatus(item.status) === "waiting_on_customer");
  const waitingPaymentPartner = openCases.filter((item) => normalizeCaseStatus(item.status) === "waiting_on_payment_partner");
  const reopened = cases.data.filter((item) => normalizeCaseStatus(item.status) === "open" && item.resolved_at);

  return {
    title: "Support Cases",
    description: "Support ticket volume and current operational queue state.",
    metrics: [
      valueMetric("new_cases_period", "New cases", periodCases.length, "Support cases created in selected period.", "period total", cases.error),
      valueMetric("open_cases", "Open cases", openCases.length, "Current non-closed cases.", "current snapshot", cases.error),
      valueMetric("resolved_cases_period", "Resolved cases", resolvedPeriod.length, "Cases resolved in selected period using resolved_at.", "period total", cases.error),
      valueMetric("closed_cases", "Closed cases", closedCases.length, "Current closed cases.", "current snapshot", cases.error),
      valueMetric("critical_cases", "Critical/time-sensitive cases", critical.length, "Open critical or time-sensitive cases.", "current snapshot", cases.error),
      valueMetric("unassigned_cases", "Unassigned cases", unassigned.length, "Open cases without assigned staff.", "current snapshot", cases.error),
      valueMetric("reopened_cases", "Reopened case count", reopened.length, "Cases currently open with a prior resolved_at timestamp.", "current snapshot", cases.error),
      valueMetric("waiting_on_customer", "Waiting on customer", waitingCustomer.length, "Open cases waiting on customer.", "current snapshot", cases.error),
      valueMetric("waiting_on_payment_partner", "Waiting on payment partner", waitingPaymentPartner.length, "Open cases waiting on payment partner.", "current snapshot", cases.error),
      deferredMetric("average_first_response_time", "Average time to first staff action", "Reliable first staff response timestamps are not configured yet."),
      valueMetric("average_resolution_time", "Average resolution time", averageResolutionTime(cases.data), "Average created-to-resolved time where resolved_at exists.", "period average", cases.error),
    ],
    openCases: valueMetric("open_cases", "Open cases", openCases.length, "Current non-closed cases.", "current snapshot", cases.error),
    criticalCases: valueMetric("critical_cases", "Critical/time-sensitive cases", critical.length, "Open critical or time-sensitive cases.", "current snapshot", cases.error),
    byCategory: breakdown(countBy(cases.data, (item) => titleCase(normalizeCategory(item.category)))),
    byStatus: breakdown(countBy(cases.data, (item) => titleCase(normalizeCaseStatus(item.status)))),
    byPriority: breakdown(countBy(cases.data, (item) => titleCase(normalizeCasePriority(item.priority)))),
  };
}

async function loadOperationalHealth(): Promise<AnalyticsSection> {
  const supabase = getCommandCenterAdminClient();
  const [properties, payments, cases, leases, access] = await Promise.all([
    safeRows<PropertyRow>("health_properties", () =>
      supabase.from("properties").select("id, status, bank_status, stripe_onboarding_complete, owner_profile_id, created_at").limit(5000)
    ),
    safeRows<PaymentRow>("health_payments", () =>
      supabase.from("rent_payments").select("id, property_id, lease_id, profile_id, tenant_profile_id, status, paid_at, created_at, amount, rent_amount_cents, total_amount_cents, source, payment_method_id, tenant_access_id").limit(5000)
    ),
    safeRows<CaseRow>("health_cases", () =>
      supabase.from("support_tickets").select("id, category, status, priority, assigned_staff_user_id, resolved_at, created_at, updated_at").limit(5000)
    ),
    safeRows<LeaseRow>("health_leases", () =>
      supabase.from("leases").select("id, property_id, lease_status, start_date, end_date, ended_at, monthly_rent").limit(5000)
    ),
    safeRows<TenantAccessRow>("health_access", () =>
      supabase.from("tenant_access").select("id, tenant_profile_id, property_id, lease_id, invite_status, created_at").limit(5000)
    ),
  ]);
  const now = new Date();
  const failedPayments = payments.data.filter((payment) => FAILED_STATUSES.has(status(payment)));
  const longProcessing = payments.data.filter((payment) => PROCESSING_STATUSES.has(status(payment)) && olderThan(payment.created_at, 2));
  const unknownPayments = payments.data.filter((payment) => !knownPaymentStatus(payment));
  const missingRelationships = payments.data.filter((payment) => !payment.property_id || !payment.lease_id || (!payment.profile_id && !payment.tenant_profile_id));
  const openCases = cases.data.filter((item) => ACTIVE_CASE_STATUSES.has(normalizeCaseStatus(item.status)));
  const unassignedNew = openCases.filter((item) => !item.assigned_staff_user_id && ["new", "open"].includes(normalizeCaseStatus(item.status)));
  const criticalCases = openCases.filter((item) => ["critical", "time_sensitive"].includes(normalizeCasePriority(item.priority)));
  const leasesEndingSoon = leases.data.filter((lease) => isActiveLease(lease, now) && lease.end_date && daysBetween(now, new Date(lease.end_date)) <= 30);

  return {
    title: "Operational Health",
    description: "Current actionable counts. These are current-state metrics unless noted.",
    metrics: [
      valueMetric("bank_connection_issues", "Bank connection issues", properties.data.filter((property) => property.bank_status !== "connected").length, "Properties without connected payout status.", "current snapshot", properties.error),
      valueMetric("failed_payments_review", "Failed payments requiring review", failedPayments.length, "Failed payment rows requiring review.", "current snapshot", payments.error),
      valueMetric("long_processing_payments", "Payments processing beyond threshold", longProcessing.length, "Processing/pending payment rows older than 2 days.", "current snapshot", payments.error),
      valueMetric("unassigned_new_cases", "Unassigned new cases", unassignedNew.length, "New/open cases without assigned staff.", "current snapshot", cases.error),
      valueMetric("critical_cases_health", "Critical cases", criticalCases.length, "Open critical or time-sensitive cases.", "current snapshot", cases.error),
      valueMetric("properties_requiring_setup", "Properties requiring setup", properties.data.filter((property) => !isPropertyPaymentEnabled(property)).length, "Properties with incomplete payout/payment setup.", "current snapshot", properties.error),
      valueMetric("pending_resident_invitations", "Pending resident invitations", access.data.filter((row) => row.invite_status !== "accepted").length, "Tenant access rows not accepted.", "current snapshot", access.error),
      valueMetric("active_leases_ending_soon", "Active leases ending soon", leasesEndingSoon.length, "Active leases ending in the next 30 days.", "current snapshot", leases.error),
      valueMetric("unknown_payment_statuses", "Unknown payment statuses", unknownPayments.length, "Payment rows with statuses outside Command Center normalization.", "current snapshot", payments.error),
      valueMetric("missing_payment_relationships", "Records with incomplete linkage", missingRelationships.length, "Payment rows missing property, lease, or resident linkage.", "current snapshot", payments.error),
    ],
  };
}

async function loadUserGrowthTrend(range: AnalyticsDateRange): Promise<AnalyticsTrendPoint[]> {
  const supabase = getCommandCenterAdminClient();
  const profiles = await safeRows<ProfileRow>("growth_profiles", () =>
    supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString())
      .limit(5000)
  );
  const profileIds = profiles.data.map((profile) => profile.id);
  const roles = profileIds.length
    ? await safeRows<RoleRow>("growth_roles", () =>
        supabase.from("user_roles").select("profile_id, role").in("profile_id", profileIds)
      )
    : { data: [] as RoleRow[], error: null };
  const roleMap = buildRoleMap(roles.data);
  const buckets = createBuckets(range);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  profiles.data.forEach((profile) => {
    const bucket = profile.created_at ? byKey.get(bucketKey(new Date(profile.created_at), range.bucket)) : null;
    if (!bucket) return;
    bucket.users += 1;
    const userRoles = roleMap.get(profile.id) || new Set<string>();
    if (userRoles.has("landlord")) bucket.landlords += 1;
    if (userRoles.has("tenant")) bucket.residents += 1;
  });

  return buckets.map(({ label, users, landlords, residents }) => ({
    label,
    users,
    landlords,
    residents,
  }));
}

async function loadLandlordFunnel(): Promise<FunnelStage[]> {
  const supabase = getCommandCenterAdminClient();
  const [roles, properties, leases, access, payments] = await Promise.all([
    safeRows<RoleRow>("funnel_roles", () => supabase.from("user_roles").select("profile_id, role").eq("role", "landlord")),
    safeRows<PropertyRow>("funnel_properties", () =>
      supabase.from("properties").select("id, owner_profile_id, status, bank_status, stripe_onboarding_complete, created_at").limit(5000)
    ),
    safeRows<LeaseRow>("funnel_leases", () =>
      supabase.from("leases").select("id, property_id, lease_status, start_date, end_date, ended_at, monthly_rent").limit(5000)
    ),
    safeRows<TenantAccessRow>("funnel_access", () =>
      supabase.from("tenant_access").select("id, tenant_profile_id, property_id, lease_id, invite_status, created_at").limit(5000)
    ),
    safeRows<PaymentRow>("funnel_payments", () =>
      supabase.from("rent_payments").select("id, profile_id, tenant_profile_id, tenant_access_id, property_id, lease_id, status, paid_at, created_at, amount, total_amount_cents, rent_amount_cents, source, payment_method_id").limit(5000)
    ),
  ]);

  const landlords = new Set(roles.data.map((role) => role.profile_id));
  const propertyById = new Map(properties.data.map((property) => [property.id, property]));
  const propertyOwners = new Map(properties.data.map((property) => [property.id, property.owner_profile_id]));
  const propertyAdded = new Set(properties.data.map((property) => property.owner_profile_id).filter(Boolean) as string[]);
  const leaseAdded = new Set<string>();
  leases.data.forEach((lease) => {
    const owner = lease.property_id ? propertyOwners.get(lease.property_id) : null;
    if (owner) leaseAdded.add(owner);
  });
  const residentInvited = new Set<string>();
  access.data.forEach((row) => {
    const propertyId = row.property_id || leases.data.find((lease) => lease.id === row.lease_id)?.property_id || null;
    const owner = propertyId ? propertyOwners.get(propertyId) : null;
    if (owner) residentInvited.add(owner);
  });
  const bankConnected = new Set(
    properties.data.filter(isPropertyPaymentEnabled).map((property) => property.owner_profile_id).filter(Boolean) as string[]
  );
  const successfulPayment = new Set<string>();
  payments.data.filter((payment) => SUCCESS_STATUSES.has(status(payment))).forEach((payment) => {
    const propertyId = payment.property_id || leases.data.find((lease) => lease.id === payment.lease_id)?.property_id || null;
    const owner = propertyId ? propertyOwners.get(propertyId) : null;
    if (owner) successfulPayment.add(owner);
  });
  const now = new Date();
  const rentCollecting = new Set<string>();
  leases.data.filter((lease) => isActiveLease(lease, now)).forEach((lease) => {
    const property = lease.property_id ? propertyById.get(lease.property_id) : null;
    if (property?.owner_profile_id && isPropertyPaymentEnabled(property)) rentCollecting.add(property.owner_profile_id);
  });

  return buildFunnel([
    ["Registered", landlords.size],
    ["Property Added", intersectionSize(landlords, propertyAdded)],
    ["Lease Added", intersectionSize(landlords, leaseAdded)],
    ["Resident Invited", intersectionSize(landlords, residentInvited)],
    ["Bank Connected", intersectionSize(landlords, bankConnected)],
    ["Payment Enabled", intersectionSize(landlords, bankConnected)],
    ["First Successful Rent Payment", intersectionSize(landlords, successfulPayment)],
    ["Rent Collecting", intersectionSize(landlords, rentCollecting)],
  ], "Current activation state");
}

async function loadResidentFunnel(): Promise<FunnelStage[]> {
  const supabase = getCommandCenterAdminClient();
  const [access, tenants, roles, payments, leases] = await Promise.all([
    safeRows<TenantAccessRow>("resident_access", () =>
      supabase.from("tenant_access").select("id, tenant_profile_id, property_id, lease_id, invite_status, created_at").limit(5000)
    ),
    safeRows<LeaseTenantRow>("resident_tenants", () =>
      supabase.from("lease_tenants").select("id, lease_id, profile_id, email").limit(5000)
    ),
    safeRows<RoleRow>("resident_roles", () => supabase.from("user_roles").select("profile_id, role").eq("role", "tenant")),
    safeRows<PaymentRow>("resident_payments", () =>
      supabase.from("rent_payments").select("id, profile_id, tenant_profile_id, tenant_access_id, property_id, lease_id, status, paid_at, created_at, amount, total_amount_cents, rent_amount_cents, source, payment_method_id").limit(5000)
    ),
    safeRows<LeaseRow>("resident_leases", () =>
      supabase.from("leases").select("id, property_id, lease_status, start_date, end_date, ended_at, monthly_rent").limit(5000)
    ),
  ]);

  const invited = new Set([
    ...access.data.map((row) => row.tenant_profile_id).filter(Boolean),
    ...tenants.data.map((row) => row.profile_id).filter(Boolean),
  ] as string[]);
  const registered = new Set(roles.data.map((role) => role.profile_id));
  const leaseConnected = new Set([
    ...access.data.filter((row) => row.lease_id).map((row) => row.tenant_profile_id).filter(Boolean),
    ...tenants.data.filter((row) => row.lease_id).map((row) => row.profile_id).filter(Boolean),
  ] as string[]);
  const firstPayment = new Set(
    payments.data
      .filter((payment) => SUCCESS_STATUSES.has(status(payment)))
      .map((payment) => payment.tenant_profile_id || payment.profile_id)
      .filter(Boolean) as string[]
  );
  const activeLeaseIds = new Set(leases.data.filter((lease) => isActiveLease(lease, new Date())).map((lease) => lease.id));
  const activePayers = new Set(
    payments.data
      .filter((payment) => SUCCESS_STATUSES.has(status(payment)) && payment.lease_id && activeLeaseIds.has(payment.lease_id))
      .map((payment) => payment.tenant_profile_id || payment.profile_id)
      .filter(Boolean) as string[]
  );

  return buildFunnel([
    ["Invited", invited.size],
    ["Registered", intersectionSize(invited, registered)],
    ["Lease Connected", intersectionSize(invited, leaseConnected)],
    ["First Successful Payment", intersectionSize(invited, firstPayment)],
    ["Active Payer", intersectionSize(invited, activePayers)],
  ], "Payment method added omitted because a reliable payment-method signal is not exposed in analytics schema.");
}

async function safeCount(key: string, run: () => CountQuery) {
  try {
    const { count, error } = await run();
    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Command Center analytics metric failed (${key}):`, error);
    }
    return { count: null, error };
  }
}

async function safeRows<T>(key: string, run: () => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  try {
    const { data, error } = await run();
    if (error) throw error;
    return { data: (data || []) as T[], error: null };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Command Center analytics query failed (${key}):`, error);
    }
    return { data: [] as T[], error };
  }
}

function metric(
  key: string,
  label: string,
  result: Awaited<ReturnType<typeof safeCount>>,
  help: string,
  kind: AnalyticsMetricKind
): AnalyticsMetric {
  if (result.error) return unavailableMetric(key, label, help, kind);
  return { key, label, value: formatNumber(result.count || 0), help, kind };
}

function valueMetric(
  key: string,
  label: string,
  value: string | number,
  help: string,
  kind: AnalyticsMetricKind,
  error?: unknown
): AnalyticsMetric {
  if (error) return unavailableMetric(key, label, help, kind);
  return {
    key,
    label,
    value: typeof value === "number" ? formatNumber(value) : value,
    help,
    kind,
  };
}

function unavailableMetric(
  key: string,
  label: string,
  help: string,
  kind: AnalyticsMetricKind
): AnalyticsMetric {
  return { key, label, value: "Unavailable", help, kind, state: "error" };
}

function deferredMetric(key: string, label: string, help: string): AnalyticsMetric {
  return { key, label, value: "Not configured", help, kind: "current snapshot", state: "deferred" };
}

function getZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function zonedDateToUtc(year: number, month: number, day: number) {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = timeZoneOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60 * 1000);
}

function timeZoneOffsetMinutes(date: Date) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIMEZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function createBuckets(range: AnalyticsDateRange) {
  const buckets: Array<{ key: string; label: string; users: number; landlords: number; residents: number }> = [];
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    buckets.push({
      key: bucketKey(cursor, range.bucket),
      label: bucketLabel(cursor, range.bucket),
      users: 0,
      landlords: 0,
      residents: 0,
    });
    if (range.bucket === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else if (range.bucket === "week") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function bucketKey(date: Date, bucket: AnalyticsDateRange["bucket"]) {
  if (bucket === "hour") return date.toISOString().slice(0, 13);
  if (bucket === "week") return date.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, bucket: AnalyticsDateRange["bucket"]) {
  if (bucket === "hour") {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: ANALYTICS_TIMEZONE }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: ANALYTICS_TIMEZONE,
  }).format(date);
}

function buildRoleMap(roles: RoleRow[]) {
  const map = new Map<string, Set<string>>();
  roles.forEach((role) => {
    if (!map.has(role.profile_id)) map.set(role.profile_id, new Set());
    map.get(role.profile_id)?.add(role.role);
  });
  return map;
}

function idsForRole(roleMap: Map<string, Set<string>>, role: string) {
  const ids = new Set<string>();
  roleMap.forEach((roles, id) => {
    if (roles.has(role)) ids.add(id);
  });
  return ids;
}

function buildFunnel(stages: Array<[string, number]>, limitation?: string): FunnelStage[] {
  const registered = stages[0]?.[1] || 0;
  return stages.map(([label, count], index) => {
    const previous = index === 0 ? count : stages[index - 1][1];
    return {
      label,
      count,
      previousConversion: percent(count, previous),
      registeredConversion: percent(count, registered),
      dropOff: Math.max(previous - count, 0),
      limitation,
    };
  });
}

function isActiveLease(lease: LeaseRow, now: Date) {
  if (String(lease.lease_status || "").toLowerCase() !== "active" || lease.ended_at) return false;
  const start = lease.start_date ? new Date(lease.start_date) : null;
  const end = lease.end_date ? new Date(lease.end_date) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function isPropertyPaymentEnabled(property: PropertyRow) {
  return Boolean(property.bank_status === "connected" && property.stripe_onboarding_complete);
}

function leasesEndingWithin(leases: LeaseRow[], days: number) {
  const now = new Date();
  return leases.filter((lease) => {
    if (!lease.end_date) return false;
    const diff = daysBetween(now, new Date(lease.end_date));
    return diff >= 0 && diff <= days;
  }).length;
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function inRange(value: string | null | undefined, range: AnalyticsDateRange) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date < range.end;
}

function dedupePayments(payments: PaymentRow[]) {
  const seen = new Set<string>();
  return payments.filter((payment) => {
    const key = payment.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function status(payment: PaymentRow) {
  return String(payment.status || "").toLowerCase();
}

function knownPaymentStatus(payment: PaymentRow) {
  return (
    SUCCESS_STATUSES.has(status(payment)) ||
    FAILED_STATUSES.has(status(payment)) ||
    PROCESSING_STATUSES.has(status(payment)) ||
    PARTIAL_STATUSES.has(status(payment))
  );
}

function paymentAmount(payment: PaymentRow) {
  const rentCents = Number(payment.rent_amount_cents || 0);
  if (Number.isFinite(rentCents) && rentCents > 0) return rentCents / 100;
  const amount = Number(payment.amount || 0);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const totalCents = Number(payment.total_amount_cents || 0);
  return Number.isFinite(totalCents) ? totalCents / 100 : 0;
}

function paymentMethod(payment: PaymentRow) {
  const source = String(payment.source || payment.payment_method_id || "").toLowerCase();
  if (source.includes("ach") || source.includes("bank")) return "ACH";
  if (source.includes("card") || source.includes("stripe")) return "Card";
  return "Other";
}

function normalizeCaseStatus(value: string | null | undefined) {
  const statusValue = String(value || "").toLowerCase();
  if (statusValue === "in_review") return "open";
  if (statusValue) return statusValue;
  return "open";
}

function normalizeCasePriority(value: string | null | undefined) {
  const priority = String(value || "").toLowerCase();
  if (priority === "urgent") return "critical";
  if (priority === "high") return "time_sensitive";
  if (priority === "normal" || priority === "low") return "standard";
  return priority || "standard";
}

function normalizeCategory(value: string | null | undefined) {
  const raw = String(value || "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (raw.includes("account")) return "account_access";
  if (raw.includes("property")) return "property_setup";
  if (raw.includes("invite")) return "resident_invitation";
  if (raw.includes("rent") || raw.includes("payment")) return "rent_payment";
  if (raw.includes("bank")) return "bank_connection";
  if (raw.includes("refund")) return "refund";
  if (raw.includes("dispute")) return "dispute";
  if (raw.includes("statement")) return "statement";
  if (raw.includes("credit")) return "credit_reporting";
  if (raw.includes("perk")) return "avenue_perks";
  if (raw.includes("technical") || raw.includes("bug")) return "technical_issue";
  if (raw.includes("lease")) return "lease";
  return "general_question";
}

function countBy<T>(rows: T[], getLabel: (row: T) => string) {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    const label = getLabel(row);
    counts[label] = (counts[label] || 0) + 1;
  });
  return counts;
}

function breakdown(counts: Record<string, number>): BreakdownRow[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: formatNumber(value) }));
}

function averageResolutionTime(cases: CaseRow[]) {
  const durations = cases
    .filter((item) => item.created_at && item.resolved_at)
    .map((item) => new Date(item.resolved_at!).getTime() - new Date(item.created_at!).getTime())
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!durations.length) return "Not configured";
  const averageMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const hours = Math.round(averageMs / (60 * 60 * 1000));
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

function olderThan(value: string | null | undefined, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function intersectionSize(left: Set<string>, right: Set<string>) {
  let count = 0;
  left.forEach((value) => {
    if (right.has(value)) count += 1;
  });
  return count;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );
}

function percent(numerator: number, denominator: number) {
  if (!denominator || !Number.isFinite(denominator)) return "0%";
  const value = Math.max(0, (numerator / denominator) * 100);
  return `${Math.round(value)}%`;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
