import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";
import type { InternalNoteRow } from "@/lib/command-center/people";

export type PaymentDirectoryParams = {
  query?: string;
  status?: string;
  method?: string;
  date?: string;
  min?: string;
  max?: string;
  page?: string;
  pageSize?: string;
};

type PaymentStatusFilter =
  | "all"
  | "successful"
  | "processing"
  | "pending"
  | "failed"
  | "partial";
type PaymentMethodFilter = "all" | "ach" | "card" | "other";
type PaymentDateFilter = "all" | "today" | "7d" | "30d";

type RentPaymentRow = {
  id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  amount: number | string | null;
  total_amount_cents: number | null;
  rent_amount_cents: number | null;
  tenant_service_fee_cents: number | null;
  rent_cycle_key: string | null;
  rent_cycle_month_label: string | null;
  period_label: string | null;
  source: string | null;
  status: string | null;
  paid_at: string | null;
  payment_method_id: string | null;
  receipt_url: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone?: string | null;
};

type PropertyRow = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  bank_status: string | null;
  stripe_onboarding_complete: boolean | null;
};

type LeaseRow = {
  id: string;
  property_id: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | string | null;
  rent_due_day: string | number | null;
  lease_status: string | null;
  payment_status: string | null;
  ended_at: string | null;
};

type LeaseTenantRow = {
  id: string;
  lease_id: string | null;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  tenant_role: string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
};

type EnrichedPayment = {
  payment: RentPaymentRow;
  lease: LeaseRow | null;
  property: PropertyRow | null;
  landlord: ProfileRow | null;
  resident: ProfileRow | LeaseTenantRow | null;
  tenant: LeaseTenantRow | null;
  access: TenantAccessRow | null;
  duplicateCount: number;
};

export type PaymentDirectoryItem = {
  id: string;
  resident: string;
  residentEmail: string;
  residentId: string | null;
  landlord: string;
  landlordEmail: string;
  landlordId: string | null;
  property: string;
  propertyId: string | null;
  leaseId: string | null;
  rentMonth: string;
  amountDue: string;
  amountPaid: string;
  remainingBalance: string;
  paymentStatus: PaymentStatusLabel;
  paymentMethod: string;
  created: string;
  paidOn: string;
  requiresReview: boolean;
  reviewReasons: string[];
};

export type PaymentDirectoryResult = {
  items: PaymentDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    status: PaymentStatusFilter;
    method: PaymentMethodFilter;
    date: PaymentDateFilter;
    min: string;
    max: string;
  };
};

export type PaymentDetail = {
  header: PaymentDirectoryItem;
  overview: Array<[string, string]>;
  resident: {
    id: string | null;
    name: string;
    email: string;
  };
  property: {
    id: string | null;
    name: string;
    leaseId: string;
    rentMonth: string;
    monthlyRent: string;
  };
  landlord: {
    id: string | null;
    name: string;
    email: string;
    bankStatus: string;
  };
  stripe: Array<StripeReference>;
  reviewReasons: string[];
  relationships: Array<{ label: string; href?: string }>;
  notes: InternalNoteRow[];
  canCreateNotes: boolean;
  canEditNotes: boolean;
};

export type StripeReference = {
  label: string;
  value: string;
  href: string | null;
  copyable: boolean;
};

type PaymentStatusLabel =
  | "Successful"
  | "Processing"
  | "Pending"
  | "Failed"
  | "Partial"
  | "Unknown";

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const DIRECTORY_FETCH_LIMIT = 750;
const SUCCESS_STATUSES = new Set(["paid", "completed", "succeeded", "posted"]);
const PROCESSING_STATUSES = new Set(["processing", "in_progress"]);
const PENDING_STATUSES = new Set(["pending", "open", "requires_payment_method"]);
const FAILED_STATUSES = new Set(["failed", "declined", "canceled", "cancelled"]);

export async function getPaymentsDirectory(
  staff: StaffUser,
  params: PaymentDirectoryParams
): Promise<PaymentDirectoryResult> {
  assertPaymentsView(staff);

  const supabase = getCommandCenterAdminClient();
  const filters = normalizeFilters(params);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const searchIds = filters.query ? await findPaymentIdsForSearch(filters.query) : null;

  if (searchIds && searchIds.size === 0) return emptyDirectory(filters, page, pageSize);

  let query = supabase
    .from("rent_payments")
    .select(paymentSelect())
    .order("created_at", { ascending: false })
    .limit(DIRECTORY_FETCH_LIMIT);

  if (searchIds) query = query.in("id", [...searchIds]);
  if (filters.date !== "all") query = query.gte("created_at", dateFilterStart(filters.date));

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data || []) as unknown as RentPaymentRow[]).filter((payment) =>
    passesRawAmountFilter(payment, filters)
  );
  const enriched = await enrichPayments(rows);
  const filtered = enriched
    .map(summarizePayment)
    .filter((item) => passesComputedFilters(item, filters));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total: filtered.length,
    pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
    filters,
  };
}

export async function getPaymentDetail(staff: StaffUser, paymentId: string) {
  assertPaymentsView(staff);

  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("rent_payments")
    .select(paymentSelect())
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [enriched] = await enrichPayments([data as unknown as RentPaymentRow]);
  const header = summarizePayment(enriched);
  const notes = await getPaymentNotes(staff, paymentId);

  return {
    header,
    overview: [
      ["Amount Due", header.amountDue],
      ["Amount Paid", header.amountPaid],
      ["Remaining Balance", header.remainingBalance],
      ["Payment Status", header.paymentStatus],
      ["Payment Method", header.paymentMethod],
      ["Created", header.created],
      ["Paid On", header.paidOn],
    ],
    resident: {
      id: header.residentId,
      name: header.resident,
      email: header.residentEmail,
    },
    property: {
      id: header.propertyId,
      name: header.property,
      leaseId: header.leaseId || "Not available",
      rentMonth: header.rentMonth,
      monthlyRent: enriched.lease?.monthly_rent
        ? formatCurrency(Number(enriched.lease.monthly_rent))
        : "Not available",
    },
    landlord: {
      id: header.landlordId,
      name: header.landlord,
      email: header.landlordEmail,
      bankStatus: formatStatus(enriched.property?.bank_status),
    },
    stripe: buildStripeReferences(enriched.payment),
    reviewReasons: header.reviewReasons,
    relationships: [
      { label: "Resident", href: header.residentId ? `/command-center/people/${header.residentId}` : undefined },
      { label: "Property", href: header.propertyId ? `/command-center/properties/${header.propertyId}` : undefined },
      { label: "Lease" },
      { label: "Landlord", href: header.landlordId ? `/command-center/people/${header.landlordId}` : undefined },
      { label: "Cases module deferred" },
    ],
    notes,
    canCreateNotes: staffHasCapability(staff, "payments.notes.create"),
    canEditNotes: staffHasCapability(staff, "payments.notes.edit"),
  } satisfies PaymentDetail;
}

async function getPaymentNotes(staff: StaffUser, paymentId: string) {
  assertPaymentsView(staff);
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("command_center_internal_notes")
    .select(
      "id, target_type, target_id, staff_user_id, note, created_at, updated_at, edited_at, staff_users(full_name, email)"
    )
    .eq("target_type", "payment")
    .eq("target_id", paymentId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return (data || []) as unknown as InternalNoteRow[];
}

function assertPaymentsView(staff: StaffUser) {
  if (!staffHasCapability(staff, "payments.view")) {
    throw new Error("Payments view permission required.");
  }
}

function normalizeFilters(params: PaymentDirectoryParams) {
  return {
    query: (params.query || "").trim().slice(0, 140),
    status: isStatusFilter(params.status) ? params.status : "all",
    method: isMethodFilter(params.method) ? params.method : "all",
    date: isDateFilter(params.date) ? params.date : "all",
    min: normalizeMoneyFilter(params.min),
    max: normalizeMoneyFilter(params.max),
  };
}

function normalizeMoneyFilter(value: string | undefined) {
  if (!value) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "";
}

function normalizePage(value: string | undefined) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function normalizePageSize(value: string | undefined) {
  const pageSize = Number(value || PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? pageSize
    : PAGE_SIZE;
}

function emptyDirectory(
  filters: PaymentDirectoryResult["filters"],
  page: number,
  pageSize: number
): PaymentDirectoryResult {
  return { items: [], page, pageSize, total: 0, pageCount: 1, filters };
}

function paymentSelect() {
  return [
    "id",
    "profile_id",
    "tenant_access_id",
    "tenant_profile_id",
    "property_id",
    "lease_id",
    "amount",
    "total_amount_cents",
    "rent_amount_cents",
    "tenant_service_fee_cents",
    "rent_cycle_key",
    "rent_cycle_month_label",
    "period_label",
    "source",
    "status",
    "paid_at",
    "payment_method_id",
    "receipt_url",
    "stripe_checkout_session_id",
    "stripe_payment_intent_id",
    "created_at",
    "updated_at",
  ].join(", ");
}

async function findPaymentIdsForSearch(query: string) {
  const supabase = getCommandCenterAdminClient();
  const like = `%${query}%`;
  const ids = new Set<string>();
  const uuidSearch = isUuid(query);

  const directOr = [
    uuidSearch ? `id.eq.${query}` : "",
    uuidSearch ? `lease_id.eq.${query}` : "",
    uuidSearch ? `property_id.eq.${query}` : "",
    uuidSearch ? `tenant_access_id.eq.${query}` : "",
    `period_label.ilike.${like}`,
    `rent_cycle_key.ilike.${like}`,
    `rent_cycle_month_label.ilike.${like}`,
    `status.ilike.${like}`,
    `source.ilike.${like}`,
    `stripe_payment_intent_id.ilike.${like}`,
  ]
    .filter(Boolean)
    .join(",");

  const [direct, profiles, properties, tenants] = await Promise.all([
    supabase.from("rent_payments").select("id").or(directOr).limit(200),
    supabase
      .from("profiles")
      .select("id")
      .or(`email.ilike.${like},display_name.ilike.${like},phone.ilike.${like}`)
      .limit(100),
    supabase
      .from("properties")
      .select("id, owner_profile_id")
      .or(`property_label.ilike.${like},street_address.ilike.${like},city.ilike.${like},state_name.ilike.${like},zip.ilike.${like}`)
      .limit(100),
    supabase
      .from("lease_tenants")
      .select("lease_id, profile_id")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(100),
  ]);

  if (!direct.error) direct.data?.forEach((row) => ids.add(row.id));

  const profileIds = !profiles.error ? profiles.data?.map((row) => row.id) || [] : [];
  const propertyIds = !properties.error ? properties.data?.map((row) => row.id) || [] : [];
  const tenantLeaseIds = !tenants.error
    ? (tenants.data || []).map((row) => row.lease_id).filter(Boolean)
    : [];

  if (profileIds.length) {
    const [profilePayments, ownedProperties] = await Promise.all([
      supabase
        .from("rent_payments")
        .select("id")
        .or(`profile_id.in.(${profileIds.join(",")}),tenant_profile_id.in.(${profileIds.join(",")})`)
        .limit(300),
      supabase.from("properties").select("id").in("owner_profile_id", profileIds),
    ]);
    if (!profilePayments.error) profilePayments.data?.forEach((row) => ids.add(row.id));
    if (!ownedProperties.error) {
      ownedProperties.data?.forEach((property) => propertyIds.push(property.id));
    }
  }

  const leaseIds = new Set<string>(tenantLeaseIds as string[]);
  if (propertyIds.length) {
    const { data: propertyLeases } = await supabase
      .from("leases")
      .select("id")
      .in("property_id", [...new Set(propertyIds)]);
    propertyLeases?.forEach((lease) => leaseIds.add(lease.id));

    const { data: propertyPayments } = await supabase
      .from("rent_payments")
      .select("id")
      .in("property_id", [...new Set(propertyIds)])
      .limit(300);
    propertyPayments?.forEach((payment) => ids.add(payment.id));
  }

  if (leaseIds.size) {
    const { data: leasePayments } = await supabase
      .from("rent_payments")
      .select("id")
      .in("lease_id", [...leaseIds])
      .limit(300);
    leasePayments?.forEach((payment) => ids.add(payment.id));
  }

  return ids;
}

async function enrichPayments(payments: RentPaymentRow[]) {
  if (!payments.length) return [];
  const supabase = getCommandCenterAdminClient();
  const leaseIds = unique(payments.map((payment) => payment.lease_id));
  const directPropertyIds = unique(payments.map((payment) => payment.property_id));
  const tenantAccessIds = unique(payments.map((payment) => payment.tenant_access_id));
  const directResidentIds = unique([
    ...payments.map((payment) => payment.tenant_profile_id),
    ...payments.map((payment) => payment.profile_id),
  ]);

  const [{ data: leases }, { data: accessRows }] = await Promise.all([
    leaseIds.length
      ? supabase
          .from("leases")
          .select("id, property_id, start_date, end_date, monthly_rent, rent_due_day, lease_status, payment_status, ended_at")
          .in("id", leaseIds)
      : { data: [] },
    tenantAccessIds.length
      ? supabase
          .from("tenant_access")
          .select("id, tenant_profile_id, property_id, lease_id")
          .in("id", tenantAccessIds)
      : { data: [] },
  ]);

  const leaseRows = (leases || []) as unknown as LeaseRow[];
  const access = (accessRows || []) as unknown as TenantAccessRow[];
  const propertyIds = unique([
    ...directPropertyIds,
    ...leaseRows.map((lease) => lease.property_id),
    ...access.map((row) => row.property_id),
  ]);
  const allLeaseIds = unique([
    ...leaseIds,
    ...access.map((row) => row.lease_id),
  ]);

  const [{ data: properties }, { data: tenants }] = await Promise.all([
    propertyIds.length
      ? supabase
          .from("properties")
          .select("id, owner_profile_id, property_label, street_address, city, state_name, zip, bank_status, stripe_onboarding_complete")
          .in("id", propertyIds)
      : { data: [] },
    allLeaseIds.length
      ? supabase
          .from("lease_tenants")
          .select("id, lease_id, profile_id, first_name, last_name, email, phone, tenant_role")
          .in("lease_id", allLeaseIds)
      : { data: [] },
  ]);

  const propertyRows = (properties || []) as unknown as PropertyRow[];
  const tenantRows = (tenants || []) as unknown as LeaseTenantRow[];
  const profileIds = unique([
    ...directResidentIds,
    ...access.map((row) => row.tenant_profile_id),
    ...tenantRows.map((row) => row.profile_id),
    ...propertyRows.map((property) => property.owner_profile_id),
  ]);
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, phone")
        .in("id", profileIds)
    : { data: [] };

  const profileRows = (profiles || []) as unknown as ProfileRow[];
  const duplicateKeys = buildDuplicateKeys(payments);

  return payments.map((payment) => {
    const accessRow = access.find((row) => row.id === payment.tenant_access_id) || null;
    const lease =
      leaseRows.find((row) => row.id === payment.lease_id) ||
      leaseRows.find((row) => row.id === accessRow?.lease_id) ||
      null;
    const property =
      propertyRows.find((row) => row.id === payment.property_id) ||
      propertyRows.find((row) => row.id === lease?.property_id) ||
      propertyRows.find((row) => row.id === accessRow?.property_id) ||
      null;
    const landlord = property
      ? profileRows.find((row) => row.id === property.owner_profile_id) || null
      : null;
    const leaseTenants = tenantRows.filter((row) => row.lease_id === lease?.id);
    const tenant =
      leaseTenants.find((row) => String(row.tenant_role || "").toLowerCase() === "primary") ||
      leaseTenants.find((row) => row.profile_id === payment.tenant_profile_id) ||
      leaseTenants[0] ||
      null;
    const resident =
      profileRows.find((row) => row.id === payment.tenant_profile_id) ||
      profileRows.find((row) => row.id === payment.profile_id) ||
      profileRows.find((row) => row.id === accessRow?.tenant_profile_id) ||
      tenant ||
      null;
    const duplicateKey = duplicatePaymentKey(payment);

    return {
      payment,
      lease,
      property,
      landlord,
      resident,
      tenant,
      access: accessRow,
      duplicateCount: duplicateKey ? duplicateKeys.get(duplicateKey) || 0 : 0,
    } satisfies EnrichedPayment;
  });
}

function summarizePayment(enriched: EnrichedPayment): PaymentDirectoryItem {
  const due = amountDue(enriched);
  const paid = amountPaid(enriched.payment);
  const remaining = Math.max(due - paid, 0);
  const status = normalizePaymentStatus(enriched.payment, due, paid);
  const reviewReasons = getReviewReasons(enriched, status, due, paid);

  return {
    id: enriched.payment.id,
    resident: displayResident(enriched.resident),
    residentEmail: displayResidentEmail(enriched.resident),
    residentId: getResidentId(enriched),
    landlord: displayProfileName(enriched.landlord),
    landlordEmail: enriched.landlord?.email || "Not available",
    landlordId: enriched.landlord?.id || null,
    property: enriched.property?.property_label || enriched.property?.street_address || "Not available",
    propertyId: enriched.property?.id || null,
    leaseId: enriched.lease?.id || enriched.payment.lease_id || null,
    rentMonth:
      enriched.payment.rent_cycle_month_label ||
      enriched.payment.period_label ||
      formatRentCycleKey(enriched.payment.rent_cycle_key) ||
      "Not available",
    amountDue: formatCurrency(due),
    amountPaid: formatCurrency(paid),
    remainingBalance: formatCurrency(remaining),
    paymentStatus: status,
    paymentMethod: normalizePaymentMethod(enriched.payment),
    created: formatDateTime(enriched.payment.created_at),
    paidOn: formatDateTime(enriched.payment.paid_at),
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

function passesRawAmountFilter(
  payment: RentPaymentRow,
  filters: PaymentDirectoryResult["filters"]
) {
  const min = filters.min ? Number(filters.min) : null;
  const max = filters.max ? Number(filters.max) : null;
  const amount = amountPaid(payment) || rawAmountDollars(payment);
  if (min !== null && amount < min) return false;
  if (max !== null && amount > max) return false;
  return true;
}

function passesComputedFilters(
  item: PaymentDirectoryItem,
  filters: PaymentDirectoryResult["filters"]
) {
  if (filters.status !== "all" && item.paymentStatus.toLowerCase() !== filters.status) {
    return false;
  }
  if (filters.method !== "all" && slug(item.paymentMethod) !== filters.method) {
    return false;
  }
  return true;
}

function normalizePaymentStatus(
  payment: RentPaymentRow,
  due: number,
  paid: number
): PaymentStatusLabel {
  const status = String(payment.status || "").toLowerCase();
  if (status === "partial" || (paid > 0 && due > 0 && paid < due)) return "Partial";
  if (SUCCESS_STATUSES.has(status)) return "Successful";
  if (PROCESSING_STATUSES.has(status)) return "Processing";
  if (PENDING_STATUSES.has(status)) return "Pending";
  if (FAILED_STATUSES.has(status)) return "Failed";
  return "Unknown";
}

function normalizePaymentMethod(payment: RentPaymentRow) {
  const source = String(payment.source || payment.payment_method_id || "").toLowerCase();
  if (source.includes("ach") || source.includes("bank")) return "ACH";
  if (source.includes("card") || source.includes("stripe")) return "Card";
  return "Other";
}

function amountDue(enriched: EnrichedPayment) {
  const leaseRent = Number(enriched.lease?.monthly_rent || 0);
  if (Number.isFinite(leaseRent) && leaseRent > 0) return leaseRent;
  const rentCents = Number(enriched.payment.rent_amount_cents || 0);
  if (Number.isFinite(rentCents) && rentCents > 0) return rentCents / 100;
  return rawAmountDollars(enriched.payment);
}

function amountPaid(payment: RentPaymentRow) {
  const status = String(payment.status || "").toLowerCase();
  if (!SUCCESS_STATUSES.has(status) && status !== "partial") return 0;
  const rentCents = Number(payment.rent_amount_cents || 0);
  if (Number.isFinite(rentCents) && rentCents > 0) return rentCents / 100;
  return rawAmountDollars(payment);
}

function rawAmountDollars(payment: RentPaymentRow) {
  const amount = Number(payment.amount || 0);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const totalCents = Number(payment.total_amount_cents || 0);
  if (Number.isFinite(totalCents) && totalCents > 0) return totalCents / 100;
  return 0;
}

function getReviewReasons(
  enriched: EnrichedPayment,
  status: PaymentStatusLabel,
  due: number,
  paid: number
) {
  const reasons: string[] = [];
  if (status === "Failed") reasons.push("Failed payment");
  if (status === "Unknown") reasons.push("Unknown payment status");
  if (status === "Processing" && isOlderThan(enriched.payment.created_at, 2)) {
    reasons.push("Processing longer than 2 days");
  }
  if (!enriched.lease) reasons.push("Missing lease");
  if (!enriched.property) reasons.push("Missing property");
  if (!enriched.resident) reasons.push("Missing resident");
  if (enriched.duplicateCount > 1) reasons.push("Possible duplicate rent cycle");
  if (due > 0 && paid > due) reasons.push("Payment allocation mismatch");
  if (status === "Partial") reasons.push("Partial payment");
  return reasons;
}

function buildDuplicateKeys(payments: RentPaymentRow[]) {
  const keys = new Map<string, number>();
  payments.forEach((payment) => {
    const key = duplicatePaymentKey(payment);
    if (!key) return;
    keys.set(key, (keys.get(key) || 0) + 1);
  });
  return keys;
}

function duplicatePaymentKey(payment: RentPaymentRow) {
  const leaseId = payment.lease_id;
  const cycle = payment.rent_cycle_key || payment.period_label || payment.rent_cycle_month_label;
  if (!leaseId || !cycle) return null;
  return `${leaseId}:${cycle}`;
}

function buildStripeReferences(payment: RentPaymentRow): StripeReference[] {
  return [
    {
      label: "Payment Intent",
      value: payment.stripe_payment_intent_id || "Not Available",
      href: payment.stripe_payment_intent_id
        ? `https://dashboard.stripe.com/search?query=${encodeURIComponent(payment.stripe_payment_intent_id)}`
        : null,
      copyable: Boolean(payment.stripe_payment_intent_id),
    },
    {
      label: "Charge ID",
      value: "Not Available",
      href: null,
      copyable: false,
    },
    {
      label: "Transfer ID",
      value: "Not Available",
      href: null,
      copyable: false,
    },
    {
      label: "Payout ID",
      value: "Not Available",
      href: null,
      copyable: false,
    },
    {
      label: "Checkout Session",
      value: payment.stripe_checkout_session_id || "Not Available",
      href: payment.stripe_checkout_session_id
        ? `https://dashboard.stripe.com/search?query=${encodeURIComponent(payment.stripe_checkout_session_id)}`
        : null,
      copyable: Boolean(payment.stripe_checkout_session_id),
    },
  ];
}

function dateFilterStart(filter: PaymentDateFilter) {
  const now = new Date();
  if (filter === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  now.setDate(now.getDate() - (filter === "7d" ? 7 : 30));
  return now.toISOString();
}

function displayProfileName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.email?.split("@")[0] || "Not available";
}

function displayResident(value: ProfileRow | LeaseTenantRow | null) {
  if (!value) return "Not available";
  if ("display_name" in value) return displayProfileName(value);
  return [value.first_name, value.last_name].filter(Boolean).join(" ") || value.email || "Not available";
}

function displayResidentEmail(value: ProfileRow | LeaseTenantRow | null) {
  return value?.email || "Not available";
}

function getResidentId(enriched: EnrichedPayment) {
  if (enriched.payment.tenant_profile_id) return enriched.payment.tenant_profile_id;
  if (enriched.payment.profile_id) return enriched.payment.profile_id;
  if (enriched.access?.tenant_profile_id) return enriched.access.tenant_profile_id;
  if (enriched.tenant?.profile_id) return enriched.tenant.profile_id;
  return null;
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Not available";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRentCycleKey(value: string | null | undefined) {
  if (!value) return "";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean))] as string[];
}

function isOlderThan(value: string | null | undefined, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(" ", "_");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isStatusFilter(value: unknown): value is PaymentStatusFilter {
  return ["all", "successful", "processing", "pending", "failed", "partial"].includes(
    String(value)
  );
}

function isMethodFilter(value: unknown): value is PaymentMethodFilter {
  return ["all", "ach", "card", "other"].includes(String(value));
}

function isDateFilter(value: unknown): value is PaymentDateFilter {
  return ["all", "today", "7d", "30d"].includes(String(value));
}
