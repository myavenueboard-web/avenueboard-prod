import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";
import { getInternalNotes, type InternalNoteRow } from "@/lib/command-center/people";

export type PropertyDirectoryParams = {
  query?: string;
  status?: string;
  bank?: string;
  lease?: string;
  payment?: string;
  created?: string;
  page?: string;
  pageSize?: string;
};

type PropertyStatusFilter =
  | "all"
  | "active"
  | "setup_incomplete"
  | "vacant"
  | "lease_ending"
  | "lease_expired"
  | "archived";
type BankFilter = "all" | "connected" | "pending" | "not_connected" | "restricted";
type LeaseFilter = "all" | "active" | "future" | "expired" | "missing";
type PaymentFilter = "all" | "current" | "pending" | "late" | "failed" | "none";
type CreatedFilter = "all" | "7d" | "30d";

type PropertyRow = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  property_type: string | null;
  unit_name: string | null;
  units: string | null;
  status: string | null;
  bank_status: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
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
  created_at: string | null;
  updated_at: string | null;
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
  invite_status: string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  invite_status: string | null;
};

type RentPaymentRow = {
  id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  amount: number | string | null;
  rent_amount_cents: number | null;
  rent_cycle_key: string | null;
  rent_cycle_month_label: string | null;
  period_label: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type SupportTicketRow = {
  id: string;
  ticket_number: string | null;
  property_id: string | null;
  lease_id: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PropertyDirectoryItem = {
  id: string;
  property: string;
  address: string;
  landlord: string;
  landlordEmail: string;
  landlordId: string | null;
  status: string;
  lease: string;
  resident: string;
  monthlyRent: string;
  bankStatus: string;
  paymentStatus: string;
  openCases: number;
  lastActivity: string;
  created: string;
};

export type PropertyDirectoryResult = {
  items: PropertyDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    status: PropertyStatusFilter;
    bank: BankFilter;
    lease: LeaseFilter;
    payment: PaymentFilter;
    created: CreatedFilter;
  };
};

export type PropertyDetail = {
  header: PropertyDirectoryItem & {
    propertyType: string;
    unitName: string;
    units: string;
    updated: string;
    archived: string;
  };
  landlord: {
    id: string | null;
    name: string;
    email: string;
  };
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    dueDay: string;
    phase: string;
    remaining: string;
  };
  residents: Array<{
    id: string | null;
    name: string;
    email: string;
    role: string;
    accessStatus: string;
  }>;
  paymentSetup: {
    bankConnection: string;
    payoutSetup: string;
    collectionEnabled: string;
    latestSuccessfulPayment: string;
    latestFailedPayment: string;
    currentRentStatus: string;
  };
  support: {
    openCases: number;
    latestCase: string;
    timeSensitiveCases: number;
  };
  statements: {
    latestMonth: string;
    latestStatus: string;
  };
  relationships: RelationshipNode[];
  notes: InternalNoteRow[];
  canCreateNotes: boolean;
  canEditNotes: boolean;
  placeholders: Array<{ title: string; value: string }>;
};

export type RelationshipNode = {
  label: string;
  children?: RelationshipNode[];
};

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const LEASE_ENDING_DAYS = 45;
const PAID_STATUSES = new Set(["paid", "completed", "succeeded", "posted"]);
const FAILED_STATUSES = new Set(["failed", "declined"]);

export async function getPropertiesDirectory(
  staff: StaffUser,
  params: PropertyDirectoryParams
): Promise<PropertyDirectoryResult> {
  assertPropertiesView(staff);

  const supabase = getCommandCenterAdminClient();
  const filters = normalizeFilters(params);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const searchIds = filters.query ? await findPropertyIdsForSearch(filters.query) : null;

  if (searchIds && searchIds.size === 0) return emptyDirectory(filters, page, pageSize);

  let query = supabase
    .from("properties")
    .select(
      "id, owner_profile_id, property_label, street_address, city, state_name, zip, property_type, unit_name, units, status, bank_status, stripe_account_id, stripe_onboarding_complete, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (searchIds) query = query.in("id", [...searchIds]);
  if (filters.bank !== "all") {
    if (filters.bank === "not_connected") {
      query = query.or("bank_status.is.null,bank_status.neq.connected");
    } else {
      query = query.eq("bank_status", filters.bank);
    }
  }
  if (filters.created !== "all") {
    const start = new Date();
    start.setDate(start.getDate() - (filters.created === "7d" ? 7 : 30));
    query = query.gte("created_at", start.toISOString());
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const properties = (data || []) as PropertyRow[];
  const enriched = await enrichProperties(properties);
  const filtered = enriched.filter((item) => passesComputedFilters(item, filters));

  return {
    items: filtered,
    page,
    pageSize,
    total: count || filtered.length,
    pageCount: Math.max(1, Math.ceil((count || filtered.length) / pageSize)),
    filters,
  };
}

export async function getPropertyDetail(staff: StaffUser, propertyId: string) {
  assertPropertiesView(staff);

  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, owner_profile_id, property_label, street_address, city, state_name, zip, property_type, unit_name, units, status, bank_status, stripe_account_id, stripe_onboarding_complete, created_at, updated_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [item] = await enrichProperties([data as PropertyRow]);
  const related = await getPropertyRelatedData(data as PropertyRow);
  const notes = await getInternalNotes(staff, propertyId);
  const relevantLease = selectRelevantLease(related.leases);
  const latestSuccessful = related.payments.find(isPaidPayment);
  const latestFailed = related.payments.find(isFailedPayment);
  const latestCase = related.cases[0];

  return {
    header: {
      ...item,
      propertyType: data.property_type || "Not available",
      unitName: data.unit_name || "Not available",
      units: data.units || "Not available",
      updated: formatDate(data.updated_at),
      archived: String(data.status || "").toLowerCase() === "archived" ? "Archived" : "Not archived",
    },
    landlord: {
      id: related.landlord?.id || null,
      name: displayProfileName(related.landlord),
      email: related.landlord?.email || "Not available",
    },
    lease: relevantLease
      ? {
          id: relevantLease.id,
          status: relevantLease.lease_status || "Not available",
          startDate: formatDate(relevantLease.start_date),
          endDate: formatDate(relevantLease.end_date),
          monthlyRent: formatCurrency(Number(relevantLease.monthly_rent || 0)),
          dueDay: relevantLease.rent_due_day ? ordinal(Number(relevantLease.rent_due_day)) : "Not available",
          phase: leasePhase(relevantLease),
          remaining: leaseRemaining(relevantLease),
        }
      : {
          id: "Not available",
          status: "Missing",
          startDate: "Not available",
          endDate: "Not available",
          monthlyRent: "Not available",
          dueDay: "Not available",
          phase: "Missing",
          remaining: "Not available",
        },
    residents: related.tenants.map((tenant) => ({
      id: tenant.profile_id,
      name: displayTenantName(tenant),
      email: tenant.email || "Not available",
      role: tenant.tenant_role || "resident",
      accessStatus: related.access.find((access) => access.lease_id === tenant.lease_id)?.invite_status || tenant.invite_status || "Not available",
    })),
    paymentSetup: {
      bankConnection: item.bankStatus,
      payoutSetup: data.stripe_onboarding_complete ? "Complete" : "Not complete",
      collectionEnabled: isPaymentCollectionEnabled(data as PropertyRow, relevantLease, related.tenants) ? "Enabled" : "Not enabled",
      latestSuccessfulPayment: latestSuccessful
        ? `${formatCurrency(paymentAmount(latestSuccessful))} · ${formatDate(latestSuccessful.paid_at || latestSuccessful.created_at)}`
        : "No activity",
      latestFailedPayment: latestFailed
        ? `${formatCurrency(paymentAmount(latestFailed))} · ${formatDate(latestFailed.created_at)}`
        : "No activity",
      currentRentStatus: item.paymentStatus,
    },
    support: {
      openCases: related.cases.filter(isOpenCase).length,
      latestCase: latestCase
        ? `${latestCase.ticket_number || latestCase.id} · ${latestCase.status || "open"}`
        : "No activity",
      timeSensitiveCases: related.cases.filter((ticket) =>
        ["high", "urgent"].includes(String(ticket.priority || "").toLowerCase())
      ).length,
    },
    statements: {
      latestMonth: latestSuccessful?.rent_cycle_month_label || latestSuccessful?.period_label || "Not available",
      latestStatus: latestSuccessful ? "Available" : "No payment activity",
    },
    relationships: buildRelationshipTree(data as PropertyRow, related.landlord, relevantLease, related.tenants, related.payments, related.cases),
    notes,
    canCreateNotes: staffHasCapability(staff, "properties.notes.create"),
    canEditNotes: staffHasCapability(staff, "properties.notes.edit"),
    placeholders: [
      { title: "Lease", value: relevantLease ? relevantLease.id : "Missing" },
      { title: "Residents", value: `${related.tenants.length} linked` },
      { title: "Payments", value: `${related.payments.length} recent rows` },
      { title: "Cases", value: `${related.cases.length} recent cases` },
      { title: "Statements", value: latestSuccessful ? "Latest statement available" : "Deferred" },
      { title: "Activity", value: "Dedicated activity stream deferred" },
    ],
  } satisfies PropertyDetail;
}

function assertPropertiesView(staff: StaffUser) {
  if (!staffHasCapability(staff, "properties.view")) {
    throw new Error("Properties view permission required.");
  }
}

function normalizeFilters(params: PropertyDirectoryParams) {
  const created: CreatedFilter =
    params.created === "7d" || params.created === "30d" ? params.created : "all";

  return {
    query: (params.query || "").trim().slice(0, 120),
    status: isStatusFilter(params.status) ? params.status : "all",
    bank: isBankFilter(params.bank) ? params.bank : "all",
    lease: isLeaseFilter(params.lease) ? params.lease : "all",
    payment: isPaymentFilter(params.payment) ? params.payment : "all",
    created,
  };
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
  filters: PropertyDirectoryResult["filters"],
  page: number,
  pageSize: number
): PropertyDirectoryResult {
  return { items: [], page, pageSize, total: 0, pageCount: 1, filters };
}

async function findPropertyIdsForSearch(query: string) {
  const supabase = getCommandCenterAdminClient();
  const like = `%${query}%`;
  const ids = new Set<string>();
  const uuidSearch = isUuid(query);

  const [properties, landlords, residents] = await Promise.all([
    supabase
      .from("properties")
      .select("id")
      .or(
        [
          uuidSearch ? `id.eq.${query}` : "",
          `property_label.ilike.${like}`,
          `street_address.ilike.${like}`,
          `city.ilike.${like}`,
          `state_name.ilike.${like}`,
          `zip.ilike.${like}`,
        ]
          .filter(Boolean)
          .join(",")
      )
      .limit(100),
    supabase
      .from("profiles")
      .select("id")
      .or(`email.ilike.${like},display_name.ilike.${like},phone.ilike.${like}`)
      .limit(100),
    supabase
      .from("lease_tenants")
      .select("lease_id")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(100),
  ]);

  if (!properties.error) properties.data?.forEach((property) => ids.add(property.id));

  const landlordIds = !landlords.error ? landlords.data?.map((row) => row.id) || [] : [];
  if (landlordIds.length) {
    const { data } = await supabase
      .from("properties")
      .select("id")
      .in("owner_profile_id", landlordIds);
    data?.forEach((property) => ids.add(property.id));
  }

  const leaseIds = [
    ...(uuidSearch ? [query] : []),
    ...(!residents.error
      ? (residents.data || []).map((row) => row.lease_id).filter(Boolean)
      : []),
  ];
  if (leaseIds.length) {
    const { data } = await supabase
      .from("leases")
      .select("property_id")
      .in("id", leaseIds);
    data?.forEach((lease) => {
      if (lease.property_id) ids.add(lease.property_id);
    });
  }

  return ids;
}

async function enrichProperties(properties: PropertyRow[]) {
  if (!properties.length) return [];
  const related = await getRelatedData(properties);

  return properties.map((property) => {
    const propertyLeases = related.leases.filter((lease) => lease.property_id === property.id);
    const lease = selectRelevantLease(propertyLeases);
    const tenants = related.tenants.filter((tenant) =>
      propertyLeases.some((item) => item.id === tenant.lease_id)
    );
    const payments = related.payments.filter(
      (payment) => payment.property_id === property.id || propertyLeases.some((item) => item.id === payment.lease_id)
    );
    const cases = related.cases.filter((ticket) => ticket.property_id === property.id);
    const landlord = related.profiles.find((profile) => profile.id === property.owner_profile_id);
    return summarizeProperty(property, landlord, lease, tenants, payments, cases);
  });
}

async function getRelatedData(properties: PropertyRow[]) {
  const supabase = getCommandCenterAdminClient();
  const propertyIds = properties.map((property) => property.id);
  const ownerIds = [...new Set(properties.map((property) => property.owner_profile_id).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: leases }, { data: cases }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, email, display_name, phone").in("id", ownerIds)
      : { data: [] },
    supabase
      .from("leases")
      .select("id, property_id, start_date, end_date, monthly_rent, rent_due_day, lease_status, payment_status, ended_at, created_at, updated_at")
      .in("property_id", propertyIds),
    supabase
      .from("support_tickets")
      .select("id, ticket_number, property_id, lease_id, status, priority, category, created_at, updated_at")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false }),
  ]);

  const leaseRows = (leases || []) as LeaseRow[];
  const leaseIds = leaseRows.map((lease) => lease.id);
  const [{ data: tenants }, { data: payments }, { data: access }] = leaseIds.length
    ? await Promise.all([
        supabase
          .from("lease_tenants")
          .select("id, lease_id, profile_id, first_name, last_name, email, phone, tenant_role, invite_status")
          .in("lease_id", leaseIds),
        supabase
          .from("rent_payments")
          .select("id, profile_id, tenant_access_id, property_id, lease_id, amount, rent_amount_cents, rent_cycle_key, rent_cycle_month_label, period_label, status, paid_at, created_at")
          .in("lease_id", leaseIds)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("tenant_access")
          .select("id, tenant_profile_id, property_id, lease_id, invite_status")
          .in("lease_id", leaseIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return {
    profiles: (profiles || []) as ProfileRow[],
    leases: leaseRows,
    tenants: (tenants || []) as LeaseTenantRow[],
    payments: (payments || []) as RentPaymentRow[],
    cases: (cases || []) as SupportTicketRow[],
    access: (access || []) as TenantAccessRow[],
  };
}

async function getPropertyRelatedData(property: PropertyRow) {
  const related = await getRelatedData([property]);
  const landlord = related.profiles.find((profile) => profile.id === property.owner_profile_id) || null;
  return { ...related, landlord };
}

function summarizeProperty(
  property: PropertyRow,
  landlord: ProfileRow | undefined,
  lease: LeaseRow | null,
  tenants: LeaseTenantRow[],
  payments: RentPaymentRow[],
  cases: SupportTicketRow[]
): PropertyDirectoryItem {
  const status = propertyStatus(property, lease, tenants);

  return {
    id: property.id,
    property: property.property_label || property.street_address || "Unnamed property",
    address: formatAddress(property),
    landlord: displayProfileName(landlord),
    landlordEmail: landlord?.email || "Not available",
    landlordId: landlord?.id || null,
    status,
    lease: lease ? `${formatDate(lease.start_date)} - ${formatDate(lease.end_date)}` : "No lease",
    resident: selectPrimaryTenant(tenants)
      ? displayTenantName(selectPrimaryTenant(tenants)!)
      : "Not assigned",
    monthlyRent: lease?.monthly_rent ? formatCurrency(Number(lease.monthly_rent)) : "Not available",
    bankStatus: formatStatus(property.bank_status),
    paymentStatus: paymentStatus(property, lease, tenants, payments),
    openCases: cases.filter(isOpenCase).length,
    lastActivity: formatDateTime(lastActivity(property, lease ? [lease] : [], payments, cases)),
    created: formatDate(property.created_at),
  };
}

export function selectRelevantLease(leases: LeaseRow[]) {
  const now = new Date();
  const current = leases
    .filter(isCurrentLease)
    .sort((a, b) => Date.parse(b.updated_at || b.created_at || "") - Date.parse(a.updated_at || a.created_at || ""))[0];
  if (current) return current;

  const actionNeeded = leases.find((lease) =>
    ["pending", "setup_incomplete", "action_needed"].includes(String(lease.payment_status || "").toLowerCase())
  );
  if (actionNeeded) return actionNeeded;

  const future = leases
    .filter((lease) => lease.start_date && new Date(lease.start_date) > now)
    .sort((a, b) => Date.parse(a.start_date || "") - Date.parse(b.start_date || ""))[0];
  if (future) return future;

  return leases
    .filter((lease) => lease.end_date || lease.ended_at)
    .sort((a, b) => Date.parse(b.ended_at || b.end_date || "") - Date.parse(a.ended_at || a.end_date || ""))[0] || null;
}

function propertyStatus(property: PropertyRow, lease: LeaseRow | null, tenants: LeaseTenantRow[]) {
  if (String(property.status || "").toLowerCase() === "archived") return "Archived";
  if (!lease) return isSetupComplete(property, lease, tenants) ? "Vacant" : "Setup Incomplete";
  if (isCurrentLease(lease)) {
    if (!isSetupComplete(property, lease, tenants)) return "Setup Incomplete";
    if (isLeaseEnding(lease)) return "Lease Ending";
    return "Active";
  }
  if (leasePhase(lease) === "Expired") return "Lease Expired";
  if (leasePhase(lease) === "Future") return "Vacant";
  return "Setup Incomplete";
}

function paymentStatus(
  property: PropertyRow,
  lease: LeaseRow | null,
  tenants: LeaseTenantRow[],
  payments: RentPaymentRow[]
) {
  if (!isPaymentCollectionEnabled(property, lease, tenants)) return "Pending";
  if (payments.some(isFailedPayment)) return "Failed";
  if (payments.some(isPaidPayment)) return "Current";
  if (!lease) return "No Payment Activity";
  const dueDay = Number(lease.rent_due_day || 1);
  if (Number.isFinite(dueDay) && new Date().getDate() > dueDay) return "Late";
  return payments.length ? "Pending" : "No Payment Activity";
}

function passesComputedFilters(
  item: PropertyDirectoryItem,
  filters: PropertyDirectoryResult["filters"]
) {
  if (filters.status !== "all" && slug(item.status) !== filters.status) return false;
  if (filters.lease !== "all" && !leaseFilterMatches(item.lease, filters.lease, item.status)) return false;
  if (filters.payment !== "all") {
    const paymentSlug =
      item.paymentStatus === "No Payment Activity" ? "none" : slug(item.paymentStatus);
    if (paymentSlug !== filters.payment) return false;
  }
  return true;
}

function leaseFilterMatches(lease: string, filter: LeaseFilter, status: string) {
  if (filter === "missing") return lease === "No lease";
  if (filter === "active") return ["Active", "Lease Ending"].includes(status);
  if (filter === "future") return status === "Vacant" && lease !== "No lease";
  if (filter === "expired") return status === "Lease Expired";
  return true;
}

function isCurrentLease(lease: LeaseRow) {
  const status = String(lease.lease_status || "").toLowerCase();
  if (status !== "active" || lease.ended_at) return false;
  const now = new Date();
  const start = lease.start_date ? new Date(lease.start_date) : null;
  const end = lease.end_date ? new Date(lease.end_date) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function isLeaseEnding(lease: LeaseRow) {
  if (!lease.end_date) return false;
  const end = new Date(lease.end_date);
  const diff = end.getTime() - Date.now();
  return diff >= 0 && diff <= LEASE_ENDING_DAYS * 24 * 60 * 60 * 1000;
}

function isSetupComplete(property: PropertyRow, lease: LeaseRow | null, tenants: LeaseTenantRow[]) {
  return Boolean(
    property.status === "active" &&
      property.bank_status === "connected" &&
      property.stripe_onboarding_complete &&
      lease &&
      tenants.length
  );
}

function isPaymentCollectionEnabled(
  property: PropertyRow,
  lease: LeaseRow | null,
  tenants: LeaseTenantRow[]
) {
  return Boolean(property.bank_status === "connected" && property.stripe_onboarding_complete && lease && tenants.length);
}

function selectPrimaryTenant(tenants: LeaseTenantRow[]) {
  return (
    tenants.find((tenant) => String(tenant.tenant_role || "").toLowerCase() === "primary") ||
    tenants[0] ||
    null
  );
}

function isPaidPayment(payment: RentPaymentRow) {
  return PAID_STATUSES.has(String(payment.status || "").toLowerCase());
}

function isFailedPayment(payment: RentPaymentRow) {
  return FAILED_STATUSES.has(String(payment.status || "").toLowerCase());
}

function isOpenCase(ticket: SupportTicketRow) {
  return ["open", "in_review"].includes(String(ticket.status || "").toLowerCase());
}

function lastActivity(
  property: PropertyRow,
  leases: LeaseRow[],
  payments: RentPaymentRow[],
  cases: SupportTicketRow[]
) {
  const values = [
    property.updated_at,
    property.created_at,
    ...leases.map((lease) => lease.updated_at || lease.created_at),
    ...payments.map((payment) => payment.paid_at || payment.created_at),
    ...cases.map((ticket) => ticket.updated_at || ticket.created_at),
  ].filter(Boolean) as string[];
  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

function leasePhase(lease: LeaseRow) {
  if (isCurrentLease(lease)) return "Active";
  if (lease.start_date && new Date(lease.start_date) > new Date()) return "Future";
  if (lease.end_date && new Date(lease.end_date) < new Date()) return "Expired";
  return lease.lease_status || "Not available";
}

function leaseRemaining(lease: LeaseRow) {
  if (!lease.end_date) return "Not available";
  const diff = new Date(lease.end_date).getTime() - Date.now();
  if (diff < 0) return "Ended";
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `${days} days`;
}

function buildRelationshipTree(
  property: PropertyRow,
  landlord: ProfileRow | null,
  lease: LeaseRow | null,
  tenants: LeaseTenantRow[],
  payments: RentPaymentRow[],
  cases: SupportTicketRow[]
): RelationshipNode[] {
  return [
    {
      label: property.property_label || property.street_address || "Property",
      children: [
        { label: `Landlord: ${displayProfileName(landlord || undefined)}` },
        {
          label: lease ? `Current Lease: ${lease.id}` : "Current Lease: Not available",
          children: [
            {
              label: `Primary Resident: ${
                selectPrimaryTenant(tenants)
                  ? displayTenantName(selectPrimaryTenant(tenants)!)
                  : "Not assigned"
              }`,
            },
            ...tenants
              .filter((tenant) => tenant !== selectPrimaryTenant(tenants))
              .map((tenant) => ({ label: `Additional Resident: ${displayTenantName(tenant)}` })),
          ],
        },
        { label: `Payments: ${payments.length} recent rows` },
        { label: `Cases: ${cases.length} recent cases` },
      ],
    },
  ];
}

export function displayProfileName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.email?.split("@")[0] || "Not available";
}

function displayTenantName(tenant: LeaseTenantRow) {
  return [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || tenant.email || "Not assigned";
}

function formatAddress(property: PropertyRow) {
  const line = [property.street_address, property.unit_name].filter(Boolean).join(", ");
  const cityLine = [property.city, property.state_name, property.zip].filter(Boolean).join(", ");
  return [line, cityLine].filter(Boolean).join(" · ") || "Not available";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Not available";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function paymentAmount(payment: RentPaymentRow) {
  if (Number(payment.rent_amount_cents || 0) > 0) return Number(payment.rent_amount_cents) / 100;
  return Number(payment.amount || 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ordinal(value: number) {
  if (!Number.isFinite(value)) return "Not available";
  const suffix =
    value % 10 === 1 && value % 100 !== 11
      ? "st"
      : value % 10 === 2 && value % 100 !== 12
      ? "nd"
      : value % 10 === 3 && value % 100 !== 13
      ? "rd"
      : "th";
  return `${value}${suffix}`;
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(" ", "_");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isStatusFilter(value: unknown): value is PropertyStatusFilter {
  return [
    "all",
    "active",
    "setup_incomplete",
    "vacant",
    "lease_ending",
    "lease_expired",
    "archived",
  ].includes(String(value));
}

function isBankFilter(value: unknown): value is BankFilter {
  return ["all", "connected", "pending", "not_connected", "restricted"].includes(String(value));
}

function isLeaseFilter(value: unknown): value is LeaseFilter {
  return ["all", "active", "future", "expired", "missing"].includes(String(value));
}

function isPaymentFilter(value: unknown): value is PaymentFilter {
  return ["all", "current", "pending", "late", "failed", "none"].includes(String(value));
}
