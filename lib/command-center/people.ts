import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";

export type PeopleRoleFilter = "all" | "landlord" | "resident" | "dual";
export type PeopleActivityFilter = "all" | "7d" | "30d" | "none";

export type PeopleDirectoryParams = {
  query?: string;
  role?: string;
  activity?: string;
  page?: string;
  pageSize?: string;
};

type ProfileRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type UserRoleRow = {
  profile_id: string;
  role: string;
};

type PropertyRow = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  status: string | null;
  bank_status: string | null;
  created_at: string | null;
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

type RentPaymentRow = {
  id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  amount: number | string | null;
  rent_amount_cents: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type SupportTicketRow = {
  id: string;
  ticket_number: string | null;
  profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type InternalNoteRow = {
  id: string;
  target_type: string;
  target_id: string;
  staff_user_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  staff_users?: { full_name: string | null; email: string | null } | null;
};

export type PeopleDirectoryItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  lifecycle: string;
  properties: number;
  activeLeases: number;
  relationships: string;
  lastActivity: string;
  joined: string;
};

export type PeopleDirectoryResult = {
  items: PeopleDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    role: PeopleRoleFilter;
    activity: PeopleActivityFilter;
  };
};

export type PeopleDetail = {
  profile: PeopleDirectoryItem & {
    rawEmail: string | null;
    rawPhone: string | null;
    createdAt: string | null;
    verified: string;
    standing: string;
  };
  landlord: {
    properties: PropertyRow[];
    activeProperties: number;
    activeLeases: LeaseRow[];
    residents: LeaseTenantRow[];
  };
  resident: {
    landlord: string;
    property: string;
    lease: string;
    rent: string;
    nextDue: string;
  };
  support: {
    openCases: number;
    latestCase: string;
  };
  payments: {
    latestPayment: string;
    failedPayments: number;
    status: string;
  };
  relationships: RelationshipNode[];
  notes: InternalNoteRow[];
  placeholders: Array<{ title: string; value: string }>;
  canCreateNotes: boolean;
  canEditNotes: boolean;
};

export type RelationshipNode = {
  label: string;
  children?: RelationshipNode[];
};

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const ACTIVE_LEASE_STATUSES = new Set(["active"]);
const PAID_STATUSES = new Set(["paid", "completed", "succeeded", "posted"]);
const FAILED_STATUSES = new Set(["failed", "declined"]);

export async function getPeopleDirectory(
  staff: StaffUser,
  params: PeopleDirectoryParams
): Promise<PeopleDirectoryResult> {
  assertPeopleView(staff);

  const supabase = getCommandCenterAdminClient();
  const filters = normalizePeopleFilters(params);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const searchIds = filters.query
    ? await findProfileIdsForSearch(filters.query)
    : null;
  const roleIds = filters.role !== "all" ? await findProfileIdsForRole(filters.role) : null;
  const profileIds = intersectCandidateSets(searchIds, roleIds);

  if (profileIds && profileIds.size === 0) {
    return emptyDirectory(filters, page);
  }

  let profileQuery = supabase
    .from("profiles")
    .select(
      "id, user_id, email, display_name, phone, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (profileIds) {
    profileQuery = profileQuery.in("id", [...profileIds]);
  }

  const { data, count, error } = await profileQuery;
  if (error) throw error;

  const profiles = (data || []) as ProfileRow[];
  const enriched = await enrichProfiles(profiles);
  const activityFiltered = applyActivityFilter(enriched, filters.activity);

  return {
    items: activityFiltered,
    page,
    pageSize,
    total: count || activityFiltered.length,
    pageCount: Math.max(1, Math.ceil((count || 0) / pageSize)),
    filters,
  };
}

export async function getPeopleDetail(staff: StaffUser, profileId: string) {
  assertPeopleView(staff);

  const supabase = getCommandCenterAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, user_id, email, display_name, phone, created_at, updated_at"
    )
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) return null;

  const [directoryItem] = await enrichProfiles([profile as ProfileRow]);
  const relationships = await getProfileRelationships(profileId);
  const notes = await getInternalNotes(staff, profileId);

  return {
    profile: {
      ...directoryItem,
      rawEmail: profile.email,
      rawPhone: profile.phone,
      createdAt: profile.created_at,
      verified: profile.user_id ? "Auth linked" : "Not verified",
      standing: directoryItem.status === "Active" ? "Good standing" : directoryItem.status,
    },
    ...relationships,
    notes,
    canCreateNotes: staffHasCapability(staff, "people.notes.create"),
    canEditNotes: staffHasCapability(staff, "people.notes.edit"),
  } satisfies PeopleDetail;
}

export async function getInternalNotes(staff: StaffUser, profileId: string) {
  assertPeopleView(staff);
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("command_center_internal_notes")
    .select(
      "id, target_type, target_id, staff_user_id, note, created_at, updated_at, edited_at, staff_users(full_name, email)"
    )
    .eq("target_type", "profile")
    .eq("target_id", profileId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return ((data || []) as unknown as Array<InternalNoteRow & { staff_users?: unknown }>).map(
    (note) => ({
      ...note,
      staff_users: normalizeJoinedStaff(note.staff_users),
    })
  );
}

function assertPeopleView(staff: StaffUser) {
  if (!staffHasCapability(staff, "people.view")) {
    throw new Error("People view permission required.");
  }
}

function normalizePeopleFilters(params: PeopleDirectoryParams) {
  const role: PeopleRoleFilter =
    params.role === "landlord" ||
    params.role === "resident" ||
    params.role === "dual"
      ? params.role
      : "all";
  const activity: PeopleActivityFilter =
    params.activity === "7d" || params.activity === "30d" || params.activity === "none"
      ? params.activity
      : "all";

  return {
    query: (params.query || "").trim().slice(0, 120),
    role,
    activity,
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

async function findProfileIdsForSearch(query: string) {
  const supabase = getCommandCenterAdminClient();
  const like = `%${query.replaceAll(",", " ").trim()}%`;
  const ids = new Set<string>();
  const uuidSearch = isUuid(query);

  const [profiles, properties, leaseTenants] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .or(
        [
          uuidSearch ? `id.eq.${query}` : "",
          `email.ilike.${like}`,
          `display_name.ilike.${like}`,
          `phone.ilike.${like}`,
        ]
          .filter(Boolean)
          .join(",")
      )
      .limit(100),
    supabase
      .from("properties")
      .select("owner_profile_id")
      .or(
        `property_label.ilike.${like},street_address.ilike.${like},city.ilike.${like},state_name.ilike.${like},zip.ilike.${like}`
      )
      .limit(100),
    supabase
      .from("lease_tenants")
      .select("profile_id")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(100),
  ]);

  if (!profiles.error) profiles.data?.forEach((row) => ids.add(row.id));
  if (!properties.error) {
    properties.data?.forEach((row) => {
      if (row.owner_profile_id) ids.add(row.owner_profile_id);
    });
  }
  if (!leaseTenants.error) {
    leaseTenants.data?.forEach((row) => {
      if (row.profile_id) ids.add(row.profile_id);
    });
  }

  return ids;
}

async function findProfileIdsForRole(role: PeopleRoleFilter) {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("profile_id, role")
    .in("role", ["landlord", "tenant"]);

  if (error) throw error;

  const byProfile = new Map<string, Set<string>>();
  (data || []).forEach((row: UserRoleRow) => {
    if (!row.profile_id) return;
    if (!byProfile.has(row.profile_id)) byProfile.set(row.profile_id, new Set());
    byProfile.get(row.profile_id)?.add(row.role);
  });

  return new Set(
    [...byProfile.entries()]
      .filter(([, roles]) => {
        if (role === "dual") return roles.has("landlord") && roles.has("tenant");
        if (role === "landlord") return roles.has("landlord");
        if (role === "resident") return roles.has("tenant");
        return true;
      })
      .map(([id]) => id)
  );
}

function intersectCandidateSets(
  left: Set<string> | null,
  right: Set<string> | null
) {
  if (!left && !right) return null;
  if (!left) return right;
  if (!right) return left;
  return new Set([...left].filter((id) => right.has(id)));
}

function emptyDirectory(
  filters: PeopleDirectoryResult["filters"],
  page: number
): PeopleDirectoryResult {
  return { items: [], page, pageSize: PAGE_SIZE, total: 0, pageCount: 1, filters };
}

async function enrichProfiles(profiles: ProfileRow[]) {
  if (!profiles.length) return [];

  const supabase = getCommandCenterAdminClient();
  const profileIds = profiles.map((profile) => profile.id);

  const [{ data: roles }, { data: properties }, { data: tenantLinks }, { data: support }] =
    await Promise.all([
      supabase.from("user_roles").select("profile_id, role").in("profile_id", profileIds),
      supabase
        .from("properties")
        .select(
          "id, owner_profile_id, property_label, street_address, city, state_name, zip, status, bank_status, created_at"
        )
        .in("owner_profile_id", profileIds),
      supabase
        .from("lease_tenants")
        .select("id, lease_id, profile_id, first_name, last_name, email, phone, tenant_role, invite_status")
        .in("profile_id", profileIds),
      supabase
        .from("support_tickets")
        .select("id, profile_id, property_id, lease_id, status, priority, category, created_at, updated_at")
        .in("profile_id", profileIds),
    ]);

  const propertyRows = (properties || []) as PropertyRow[];
  const propertyIds = propertyRows.map((property) => property.id);
  const tenantRows = (tenantLinks || []) as LeaseTenantRow[];
  const tenantLeaseIds = tenantRows.map((tenant) => tenant.lease_id).filter(Boolean) as string[];
  const leasePropertyIds = propertyIds;

  const { data: leases } =
    propertyIds.length || tenantLeaseIds.length
      ? await supabase
          .from("leases")
          .select(
            "id, property_id, start_date, end_date, monthly_rent, rent_due_day, lease_status, payment_status, ended_at, created_at"
          )
          .or(
            [
              leasePropertyIds.length ? `property_id.in.(${leasePropertyIds.join(",")})` : "",
              tenantLeaseIds.length ? `id.in.(${tenantLeaseIds.join(",")})` : "",
            ]
              .filter(Boolean)
              .join(",")
          )
      : { data: [] };

  const leaseRows = (leases || []) as LeaseRow[];
  const leaseIds = leaseRows.map((lease) => lease.id);
  const { data: payments } = leaseIds.length
    ? await supabase
        .from("rent_payments")
        .select("id, profile_id, tenant_access_id, property_id, lease_id, amount, rent_amount_cents, status, paid_at, created_at")
        .in("lease_id", leaseIds)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  return profiles.map((profile) =>
    summarizeProfile(
      profile,
      ((roles || []) as UserRoleRow[]).filter((role) => role.profile_id === profile.id),
      propertyRows.filter((property) => property.owner_profile_id === profile.id),
      leaseRows,
      tenantRows.filter((tenant) => tenant.profile_id === profile.id),
      ((payments || []) as RentPaymentRow[]),
      ((support || []) as SupportTicketRow[]).filter((ticket) => ticket.profile_id === profile.id)
    )
  );
}

function summarizeProfile(
  profile: ProfileRow,
  roles: UserRoleRow[],
  properties: PropertyRow[],
  leases: LeaseRow[],
  tenantLinks: LeaseTenantRow[],
  payments: RentPaymentRow[],
  support: SupportTicketRow[]
): PeopleDirectoryItem {
  const roleSet = new Set(roles.map((role) => role.role));
  const ownedPropertyIds = new Set(properties.map((property) => property.id));
  const ownedLeases = leases.filter((lease) => lease.property_id && ownedPropertyIds.has(lease.property_id));
  const residentLeaseIds = new Set(tenantLinks.map((tenant) => tenant.lease_id).filter(Boolean));
  const residentLeases = leases.filter((lease) => residentLeaseIds.has(lease.id));
  const activeLeases = [...ownedLeases, ...residentLeases].filter(isActiveLease);
  const lifecycle = getLifecycle(roleSet, properties, ownedLeases, tenantLinks, payments);
  const lastActivityDate = getLastActivityDate(profile, properties, ownedLeases, payments, support);

  return {
    id: profile.id,
    name: getProfileName(profile),
    email: profile.email || "Not available",
    phone: profile.phone || "Not available",
    role: getRoleLabel(roleSet),
    status: getStatusLabel(lifecycle),
    lifecycle,
    properties: properties.length,
    activeLeases: activeLeases.length,
    relationships: getRelationshipLabel(roleSet, properties, tenantLinks),
    lastActivity: formatDateTime(lastActivityDate),
    joined: formatDate(profile.created_at),
  };
}

async function getProfileRelationships(profileId: string) {
  const supabase = getCommandCenterAdminClient();
  const [{ data: properties }, { data: tenantLinks }, { data: support }, { data: payments }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("id, owner_profile_id, property_label, street_address, city, state_name, zip, status, bank_status, created_at")
        .eq("owner_profile_id", profileId),
      supabase
        .from("lease_tenants")
        .select("id, lease_id, profile_id, first_name, last_name, email, phone, tenant_role, invite_status")
        .eq("profile_id", profileId),
      supabase
        .from("support_tickets")
        .select("id, ticket_number, profile_id, property_id, lease_id, status, priority, category, created_at, updated_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("rent_payments")
        .select("id, profile_id, tenant_access_id, property_id, lease_id, amount, rent_amount_cents, status, paid_at, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const propertyRows = (properties || []) as PropertyRow[];
  const propertyIds = propertyRows.map((property) => property.id);
  const tenantRows = (tenantLinks || []) as LeaseTenantRow[];
  const tenantLeaseIds = tenantRows.map((tenant) => tenant.lease_id).filter(Boolean) as string[];

  const { data: leases } =
    propertyIds.length || tenantLeaseIds.length
      ? await supabase
          .from("leases")
          .select("id, property_id, start_date, end_date, monthly_rent, rent_due_day, lease_status, payment_status, ended_at, created_at")
          .or(
            [
              propertyIds.length ? `property_id.in.(${propertyIds.join(",")})` : "",
              tenantLeaseIds.length ? `id.in.(${tenantLeaseIds.join(",")})` : "",
            ]
              .filter(Boolean)
              .join(",")
          )
      : { data: [] };

  const leaseRows = (leases || []) as LeaseRow[];
  const linkedPropertyIds = [
    ...new Set(
      leaseRows
        .map((lease) => lease.property_id)
        .filter((id): id is string => Boolean(id))
        .filter((id) => !propertyIds.includes(id))
    ),
  ];
  const { data: linkedProperties } = linkedPropertyIds.length
    ? await supabase
        .from("properties")
        .select("id, owner_profile_id, property_label, street_address, city, state_name, zip, status, bank_status, created_at")
        .in("id", linkedPropertyIds)
    : { data: [] };
  const allPropertyRows = [...propertyRows, ...((linkedProperties || []) as PropertyRow[])];
  const activeLeases = leaseRows.filter(isActiveLease);
  const activePropertyIds = new Set(activeLeases.map((lease) => lease.property_id));
  const latestSupport = ((support || []) as SupportTicketRow[])[0];
  const paymentRows = (payments || []) as RentPaymentRow[];
  const latestPayment = paymentRows[0];
  const failedPayments = paymentRows.filter((payment) =>
    FAILED_STATUSES.has(String(payment.status || "").toLowerCase())
  ).length;

  return {
    landlord: {
      properties: propertyRows,
      activeProperties: propertyRows.filter((property) => activePropertyIds.has(property.id)).length,
      activeLeases,
      residents: tenantRows,
    },
    resident: getResidentSummary(tenantRows, leaseRows, allPropertyRows),
    support: {
      openCases: ((support || []) as SupportTicketRow[]).filter((ticket) =>
        ["open", "in_review"].includes(String(ticket.status || "").toLowerCase())
      ).length,
      latestCase: latestSupport
        ? `${latestSupport.ticket_number || latestSupport.id} · ${latestSupport.status || "open"}`
        : "Not available",
    },
    payments: {
      latestPayment: latestPayment
        ? `${formatCurrency(paymentAmount(latestPayment))} · ${latestPayment.status || "unknown"} · ${formatDate(latestPayment.paid_at || latestPayment.created_at)}`
        : "Not available",
      failedPayments,
      status: failedPayments > 0 ? "Needs review" : paymentRows.length ? "Payment activity found" : "No payment activity",
    },
    relationships: buildRelationshipTree(allPropertyRows, leaseRows, tenantRows),
    placeholders: [
      { title: "Properties", value: `${propertyRows.length} linked` },
      { title: "Leases", value: `${leaseRows.length} linked` },
      { title: "Payments", value: `${paymentRows.length} recent rows` },
      { title: "Cases", value: `${((support || []) as SupportTicketRow[]).length} recent cases` },
      { title: "Activity", value: "Dedicated activity stream deferred" },
    ],
  };
}

function applyActivityFilter(
  items: PeopleDirectoryItem[],
  activity: PeopleActivityFilter
) {
  if (activity === "all") return items;
  const now = Date.now();
  const cutoff =
    activity === "7d" ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const time = Date.parse(item.lastActivity);
    if (!Number.isFinite(time)) return activity === "none";
    if (activity === "none") return time < now - 30 * 24 * 60 * 60 * 1000;
    return time >= cutoff;
  });
}

function getLifecycle(
  roles: Set<string>,
  properties: PropertyRow[],
  leases: LeaseRow[],
  tenantLinks: LeaseTenantRow[],
  payments: RentPaymentRow[]
) {
  if (roles.has("landlord")) {
    if (leases.some(isActiveLease) && payments.some(isPaidPayment)) return "Rent Collecting";
    if (leases.some(isActiveLease)) return "Lease Added";
    if (tenantLinks.length) return "Resident Invited";
    if (properties.some((property) => property.bank_status === "connected")) return "Bank Connected";
    if (properties.length) return "Property Added";
    return "Registered";
  }

  if (roles.has("tenant")) {
    if (payments.some(isPaidPayment)) return "First Payment";
    if (leases.some(isActiveLease)) return "Lease Connected";
    if (tenantLinks.length) return "Invited";
    return "Registered";
  }

  return "Registered";
}

function getStatusLabel(lifecycle: string) {
  if (["Registered", "Property Added", "Invited"].includes(lifecycle)) {
    return "Setup Incomplete";
  }
  if (lifecycle === "Inactive") return "Closed";
  return "Active";
}

function getLastActivityDate(
  profile: ProfileRow,
  properties: PropertyRow[],
  leases: LeaseRow[],
  payments: RentPaymentRow[],
  support: SupportTicketRow[]
) {
  const values = [
    profile.updated_at,
    profile.created_at,
    ...properties.map((property) => property.created_at),
    ...leases.map((lease) => lease.created_at),
    ...payments.map((payment) => payment.paid_at || payment.created_at),
    ...support.map((ticket) => ticket.updated_at || ticket.created_at),
  ].filter(Boolean) as string[];

  return values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

function getProfileName(profile: ProfileRow) {
  return (
    profile.display_name ||
    profile.email?.split("@")[0] ||
    "Unknown Profile"
  );
}

function getRoleLabel(roles: Set<string>) {
  if (roles.has("landlord") && roles.has("tenant")) return "Dual Role";
  if (roles.has("landlord")) return "Landlord";
  if (roles.has("tenant")) return "Resident";
  return "Registered";
}

function getRelationshipLabel(
  roles: Set<string>,
  properties: PropertyRow[],
  tenantLinks: LeaseTenantRow[]
) {
  const parts = [];
  if (roles.has("landlord")) parts.push(`${properties.length} properties`);
  if (roles.has("tenant")) parts.push(`${tenantLinks.length} lease links`);
  return parts.length ? parts.join(" · ") : "No linked relationships";
}

function isActiveLease(lease: LeaseRow) {
  const status = String(lease.lease_status || "").toLowerCase();
  if (!ACTIVE_LEASE_STATUSES.has(status)) return false;
  if (lease.ended_at) return false;
  const now = new Date();
  const start = lease.start_date ? new Date(lease.start_date) : null;
  const end = lease.end_date ? new Date(lease.end_date) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function isPaidPayment(payment: RentPaymentRow) {
  return PAID_STATUSES.has(String(payment.status || "").toLowerCase());
}

function paymentAmount(payment: RentPaymentRow) {
  if (Number(payment.rent_amount_cents || 0) > 0) {
    return Number(payment.rent_amount_cents) / 100;
  }
  return Number(payment.amount || 0);
}

function getResidentSummary(
  tenants: LeaseTenantRow[],
  leases: LeaseRow[],
  properties: PropertyRow[]
) {
  const lease = leases.find((item) => tenants.some((tenant) => tenant.lease_id === item.id));
  const property = properties.find((item) => item.id === lease?.property_id);

  return {
    landlord: "Not available",
    property: property?.property_label || property?.street_address || "Not available",
    lease: lease ? `${formatDate(lease.start_date)} - ${formatDate(lease.end_date)}` : "Not available",
    rent: lease?.monthly_rent ? formatCurrency(Number(lease.monthly_rent)) : "Not available",
    nextDue: lease?.rent_due_day ? `${ordinal(Number(lease.rent_due_day))}` : "Not available",
  };
}

function buildRelationshipTree(
  properties: PropertyRow[],
  leases: LeaseRow[],
  tenants: LeaseTenantRow[]
) {
  if (!properties.length && !tenants.length) {
    return [{ label: "No relationships found" }];
  }

  const propertyNodes = properties.map((property) => {
    const propertyLeases = leases.filter((lease) => lease.property_id === property.id);
    return {
      label: property.property_label || property.street_address || "Property",
      children: propertyLeases.map((lease) => ({
        label: `Lease ${formatDate(lease.start_date)} - ${formatDate(lease.end_date)}`,
        children: tenants
          .filter((tenant) => tenant.lease_id === lease.id)
          .map((tenant) => ({
            label: [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || tenant.email || "Resident",
          })),
      })),
    };
  });

  const residentNodes = tenants.length
    ? [
        {
          label: "Resident links",
          children: tenants.map((tenant) => ({
            label: tenant.email || tenant.id,
          })),
        },
      ]
    : [];

  return [...propertyNodes, ...residentNodes];
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toISOString();
}

export function formatDisplayDateTime(value: string | null | undefined) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function ordinal(value: number) {
  if (!Number.isFinite(value)) return "Not available";
  const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeJoinedStaff(value: unknown) {
  if (Array.isArray(value)) {
    return (value[0] || null) as InternalNoteRow["staff_users"];
  }
  if (value && typeof value === "object") {
    return value as InternalNoteRow["staff_users"];
  }
  return null;
}
