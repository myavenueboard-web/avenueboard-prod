import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";
import type { InternalNoteRow } from "@/lib/command-center/people";

export type CaseDirectoryParams = {
  query?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignment?: string;
  date?: string;
  page?: string;
  pageSize?: string;
};

export type CaseStatus =
  | "new"
  | "open"
  | "waiting_on_customer"
  | "waiting_on_avenueboard"
  | "waiting_on_payment_partner"
  | "escalated"
  | "resolved"
  | "closed";

export type CasePriority = "standard" | "important" | "time_sensitive" | "critical";
export type SimplifiedCaseStatus =
  | "new"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "closed";

type CaseStatusFilter = "all" | SimplifiedCaseStatus;
type CasePriorityFilter = "all" | CasePriority;
type CaseCategoryFilter =
  | "all"
  | "account_access"
  | "property_setup"
  | "lease"
  | "resident_invitation"
  | "rent_payment"
  | "bank_connection"
  | "refund"
  | "dispute"
  | "statement"
  | "credit_reporting"
  | "avenue_perks"
  | "technical_issue"
  | "general_question";
type CaseAssignmentFilter = "all" | "unassigned" | "me" | string;
type CaseDateFilter = "all" | "today" | "7d" | "30d";

type SupportTicketRow = {
  id: string;
  ticket_number: string | null;
  conversation_id: string | null;
  user_id: string | null;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  category: string | null;
  message: string | null;
  status: string | null;
  priority: string | null;
  metadata: Record<string, unknown> | null;
  assigned_staff_user_id: string | null;
  resolved_by_staff_user_id: string | null;
  resolved_at: string | null;
  resolution_summary: string | null;
  last_customer_response_at: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  user_id?: string | null;
  email: string | null;
  display_name: string | null;
  phone?: string | null;
};

type UserRoleRow = {
  profile_id: string;
  role: string;
};

type PropertyRow = {
  id: string;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
};

type LeaseRow = {
  id: string;
  property_id: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | string | null;
  lease_status: string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
};

type StaffRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
};

type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  message: string | null;
  created_at: string | null;
};

type TicketEventRow = {
  id: string;
  ticket_id: string | null;
  conversation_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type EnrichedCase = {
  ticket: SupportTicketRow;
  customer: ProfileRow | null;
  roles: UserRoleRow[];
  property: PropertyRow | null;
  lease: LeaseRow | null;
  access: TenantAccessRow | null;
  assignedStaff: StaffRow | null;
  resolvedBy: StaffRow | null;
  paymentId: string | null;
};

export type CaseDirectoryItem = {
  id: string;
  caseNumber: string;
  subject: string;
  customer: string;
  customerEmail: string;
  customerId: string | null;
  customerRole: string;
  category: string;
  categoryKey: CaseCategoryFilter;
  priority: string;
  priorityKey: CasePriority;
  status: string;
  statusKey: CaseStatus;
  statusFilterKey: SimplifiedCaseStatus;
  assignedTo: string;
  assignedStaffId: string | null;
  relatedRecord: string;
  propertyId: string | null;
  leaseId: string | null;
  paymentId: string | null;
  created: string;
  updated: string;
  lastCustomerResponse: string;
  reviewWarning: string | null;
};

export type CaseDirectoryResult = {
  items: CaseDirectoryItem[];
  staffOptions: Array<{ id: string; label: string }>;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    status: CaseStatusFilter;
    priority: CasePriorityFilter;
    category: CaseCategoryFilter;
    assignment: CaseAssignmentFilter;
    date: CaseDateFilter;
  };
};

export type CaseDetail = {
  header: CaseDirectoryItem;
  overview: Array<[string, string]>;
  customer: {
    id: string | null;
    name: string;
    email: string;
    role: string;
  };
  related: Array<{ label: string; value: string; href?: string }>;
  message: string;
  timeline: Array<{ title: string; detail: string; timestamp: string }>;
  resolution: Array<[string, string]>;
  notes: InternalNoteRow[];
  staffOptions: Array<{ id: string; label: string }>;
  canAssign: boolean;
  canUpdateStatus: boolean;
  canUpdatePriority: boolean;
  canResolve: boolean;
  canReopen: boolean;
  canCreateNotes: boolean;
  canEditNotes: boolean;
  allowedStatuses: Array<{ value: CaseStatus; label: string }>;
};

export const CASE_STATUSES: Array<{ value: CaseStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "waiting_on_customer", label: "Waiting on Customer" },
  { value: "waiting_on_avenueboard", label: "Waiting on AvenueBoard" },
  { value: "waiting_on_payment_partner", label: "Waiting on Payment Partner" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const SIMPLIFIED_CASE_STATUSES: Array<{ value: SimplifiedCaseStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const CASE_PRIORITIES: Array<{ value: CasePriority; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "important", label: "Important" },
  { value: "time_sensitive", label: "Time Sensitive" },
  { value: "critical", label: "Critical" },
];

export const CASE_CATEGORIES: Array<{ value: CaseCategoryFilter; label: string }> = [
  { value: "account_access", label: "Account Access" },
  { value: "property_setup", label: "Property Setup" },
  { value: "lease", label: "Lease" },
  { value: "resident_invitation", label: "Resident Invitation" },
  { value: "rent_payment", label: "Rent Payment" },
  { value: "bank_connection", label: "Bank Connection" },
  { value: "refund", label: "Refund" },
  { value: "dispute", label: "Dispute" },
  { value: "statement", label: "Statement" },
  { value: "credit_reporting", label: "Credit Reporting" },
  { value: "avenue_perks", label: "Avenue Perks" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "general_question", label: "General Question" },
];

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const DIRECTORY_FETCH_LIMIT = 750;
const CLOSED_STATUSES = new Set(["resolved", "closed"]);
const PAYMENT_RELATED_CATEGORIES = new Set(["rent_payment", "refund", "dispute", "bank_connection"]);
const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["open", "waiting_on_customer", "escalated", "resolved"],
  open: [
    "waiting_on_customer",
    "waiting_on_avenueboard",
    "waiting_on_payment_partner",
    "escalated",
    "resolved",
  ],
  waiting_on_customer: ["open", "resolved"],
  waiting_on_avenueboard: ["open", "escalated", "resolved"],
  waiting_on_payment_partner: ["open", "escalated", "resolved"],
  escalated: ["open", "waiting_on_payment_partner", "resolved"],
  resolved: ["open", "closed"],
  closed: [],
};

export async function getCasesDirectory(
  staff: StaffUser,
  params: CaseDirectoryParams
): Promise<CaseDirectoryResult> {
  assertCasesView(staff);

  const supabase = getCommandCenterAdminClient();
  const filters = normalizeFilters(params);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const searchIds = filters.query ? await findCaseIdsForSearch(filters.query) : null;

  if (searchIds && searchIds.size === 0) {
    return { ...emptyDirectory(filters, page, pageSize), staffOptions: await getActiveStaffOptions() };
  }

  let query = supabase
    .from("support_tickets")
    .select(ticketSelect())
    .order("updated_at", { ascending: false })
    .limit(DIRECTORY_FETCH_LIMIT);

  if (searchIds) query = query.in("id", [...searchIds]);
  if (filters.date !== "all") query = query.gte("created_at", dateFilterStart(filters.date));

  const { data, error } = await query;
  if (error) throw error;

  const enriched = await enrichCases((data || []) as unknown as SupportTicketRow[]);
  const filtered = enriched
    .map(summarizeCase)
    .filter((item) => passesFilters(item, filters, staff.id));
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    staffOptions: await getActiveStaffOptions(),
    page,
    pageSize,
    total: filtered.length,
    pageCount: Math.max(1, Math.ceil(filtered.length / pageSize)),
    filters,
  };
}

export async function getCaseDetail(staff: StaffUser, caseId: string) {
  assertCasesView(staff);

  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(ticketSelect())
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [enriched] = await enrichCases([data as unknown as SupportTicketRow]);
  const header = summarizeCase(enriched);
  const [notes, timeline, staffOptions] = await Promise.all([
    getCaseNotes(staff, caseId),
    getCaseTimeline(data as unknown as SupportTicketRow),
    getActiveStaffOptions(),
  ]);

  return {
    header,
    overview: [
      ["Case Number", header.caseNumber],
      ["Category", header.category],
      ["Priority", header.priority],
      ["Status", header.status],
      ["Source", displaySource(enriched.ticket)],
      ["Created", header.created],
      ["Updated", header.updated],
      ["Last Customer Response", header.lastCustomerResponse],
      ["Resolution Date", formatDateTime(enriched.ticket.resolved_at)],
    ],
    customer: {
      id: header.customerId,
      name: header.customer,
      email: header.customerEmail,
      role: header.customerRole,
    },
    related: [
      {
        label: "Property",
        value: enriched.property?.property_label || enriched.property?.street_address || "Not linked",
        href: enriched.property?.id ? `/command-center/properties/${enriched.property.id}` : undefined,
      },
      { label: "Lease", value: enriched.lease?.id || "Not linked" },
      {
        label: "Payment",
        value: enriched.paymentId || "Not linked",
        href: enriched.paymentId ? `/command-center/payments/${enriched.paymentId}` : undefined,
      },
      {
        label: "Customer",
        value: header.customer,
        href: header.customerId ? `/command-center/people/${header.customerId}` : undefined,
      },
    ],
    message: enriched.ticket.message || "Not available",
    timeline,
    resolution: [
      ["Summary", enriched.ticket.resolution_summary || "Not available"],
      ["Resolved By", enriched.resolvedBy ? displayStaff(enriched.resolvedBy) : "Not available"],
      ["Resolved Date", formatDateTime(enriched.ticket.resolved_at)],
      ["Close Reason", metadataString(enriched.ticket.metadata, "close_reason") || "Not available"],
    ],
    notes,
    staffOptions,
    canAssign: canUseCaseAction(staff, "cases.assign", enriched.ticket),
    canUpdateStatus: canUseCaseAction(staff, "cases.status.update", enriched.ticket),
    canUpdatePriority: canUseCaseAction(staff, "cases.priority.update", enriched.ticket),
    canResolve: canUseCaseAction(staff, "cases.resolve", enriched.ticket),
    canReopen: canUseCaseAction(staff, "cases.reopen", enriched.ticket),
    canCreateNotes: canUseCaseAction(staff, "cases.notes.create", enriched.ticket),
    canEditNotes: canUseCaseAction(staff, "cases.notes.edit", enriched.ticket),
    allowedStatuses: getAllowedStatusOptions(
      header.statusKey,
      staff,
      Boolean(header.assignedStaffId)
    ),
  } satisfies CaseDetail;
}

export async function getCaseForMutation(caseId: string) {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(ticketSelect())
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as SupportTicketRow | null;
}

export async function getActiveStaffOptions() {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("id, email, full_name, role, status")
    .eq("status", "active")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return ((data || []) as unknown as StaffRow[]).map((staff) => ({
    id: staff.id,
    label: displayStaff(staff),
  }));
}

export async function getCaseNotes(staff: StaffUser, caseId: string) {
  assertCasesView(staff);
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("command_center_internal_notes")
    .select(
      "id, target_type, target_id, staff_user_id, note, created_at, updated_at, edited_at, staff_users(full_name, email)"
    )
    .eq("target_type", "case")
    .eq("target_id", caseId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data || []) as unknown as InternalNoteRow[];
}

export function normalizeCaseStatus(value: string | null | undefined): CaseStatus {
  const status = String(value || "").toLowerCase();
  if (status === "in_review") return "open";
  if (isCaseStatus(status)) return status;
  return "open";
}

export function normalizeCasePriority(value: string | null | undefined): CasePriority {
  const priority = String(value || "").toLowerCase();
  if (priority === "urgent") return "critical";
  if (priority === "high") return "time_sensitive";
  if (priority === "normal") return "standard";
  if (priority === "low") return "standard";
  if (isCasePriority(priority)) return priority;
  return "standard";
}

export function canUseCaseAction(
  staff: StaffUser,
  capability:
    | "cases.assign"
    | "cases.status.update"
    | "cases.priority.update"
    | "cases.notes.create"
    | "cases.notes.edit"
    | "cases.resolve"
    | "cases.reopen",
  ticket: SupportTicketRow
) {
  if (!staffHasCapability(staff, capability)) return false;
  if (staff.role !== "payments") return true;
  return isPaymentRelated(ticket);
}

export function isValidStatusTransition(
  current: CaseStatus,
  next: CaseStatus,
  staff: StaffUser
) {
  if (current === next) return true;
  if (current === "closed" && staff.role === "super_admin" && next === "open") return true;
  return STATUS_TRANSITIONS[current]?.includes(next) || false;
}

export function getStatusLabel(value: CaseStatus | string) {
  return SIMPLIFIED_CASE_STATUSES.find((status) => status.value === value)?.label || formatStatus(value);
}

export function simplifyCaseStatus(
  status: CaseStatus,
  assigned: boolean
): SimplifiedCaseStatus {
  if (status === "resolved" || status === "closed" || status === "escalated") {
    return status;
  }
  if (status === "waiting_on_payment_partner") return "escalated";
  if (status === "waiting_on_customer" || status === "waiting_on_avenueboard") {
    return "in_progress";
  }
  if (status === "open") return assigned ? "in_progress" : "new";
  return "new";
}

function getSimplifiedStatusLabel(value: SimplifiedCaseStatus) {
  return SIMPLIFIED_CASE_STATUSES.find((status) => status.value === value)?.label || formatStatus(value);
}

function dedupeStatusOptions(options: Array<{ value: CaseStatus; label: string }>) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.label)) return false;
    seen.add(option.label);
    return true;
  });
}

export function getPriorityLabel(value: CasePriority | string) {
  return CASE_PRIORITIES.find((priority) => priority.value === value)?.label || formatStatus(value);
}

export function getCategoryLabel(value: string | null | undefined) {
  const key = normalizeCategory(value);
  return CASE_CATEGORIES.find((category) => category.value === key)?.label || "General Question";
}

export function getAllowedStatusOptions(
  current: CaseStatus,
  staff: StaffUser,
  assigned: boolean
) {
  const allowed = new Set<CaseStatus>([current, ...(STATUS_TRANSITIONS[current] || [])]);
  if (current === "closed" && staff.role === "super_admin") allowed.add("open");
  const options = CASE_STATUSES.filter((status) => allowed.has(status.value))
    .filter((status) => !["waiting_on_customer", "waiting_on_avenueboard", "waiting_on_payment_partner"].includes(status.value))
    .map((status) => ({
      value: status.value,
      label: getSimplifiedStatusLabel(
        simplifyCaseStatus(status.value, status.value === current ? assigned : true)
      ),
    }));

  if (["waiting_on_customer", "waiting_on_avenueboard", "waiting_on_payment_partner"].includes(current)) {
    options.unshift({
      value: current,
      label: getSimplifiedStatusLabel(simplifyCaseStatus(current, true)),
    });
  }

  return dedupeStatusOptions(options);
}

function assertCasesView(staff: StaffUser) {
  if (!staffHasCapability(staff, "cases.view")) {
    throw new Error("Cases view permission required.");
  }
}

function normalizeFilters(params: CaseDirectoryParams) {
  return {
    query: (params.query || "").trim().slice(0, 140),
    status: isStatusFilter(params.status) ? params.status : "all",
    priority: isPriorityFilter(params.priority) ? params.priority : "all",
    category: isCategoryFilter(params.category) ? params.category : "all",
    assignment: params.assignment || "all",
    date: isDateFilter(params.date) ? params.date : "all",
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
  filters: CaseDirectoryResult["filters"],
  page: number,
  pageSize: number
): Omit<CaseDirectoryResult, "staffOptions"> {
  return { items: [], page, pageSize, total: 0, pageCount: 1, filters };
}

function ticketSelect() {
  return [
    "id",
    "ticket_number",
    "conversation_id",
    "user_id",
    "profile_id",
    "tenant_access_id",
    "property_id",
    "lease_id",
    "category",
    "message",
    "status",
    "priority",
    "metadata",
    "assigned_staff_user_id",
    "resolved_by_staff_user_id",
    "resolved_at",
    "resolution_summary",
    "last_customer_response_at",
    "source",
    "created_at",
    "updated_at",
  ].join(", ");
}

async function findCaseIdsForSearch(query: string) {
  const supabase = getCommandCenterAdminClient();
  const like = `%${query}%`;
  const ids = new Set<string>();
  const uuidSearch = isUuid(query);

  const directOr = [
    uuidSearch ? `id.eq.${query}` : "",
    uuidSearch ? `profile_id.eq.${query}` : "",
    uuidSearch ? `lease_id.eq.${query}` : "",
    uuidSearch ? `property_id.eq.${query}` : "",
    `ticket_number.ilike.${like}`,
    `category.ilike.${like}`,
    `message.ilike.${like}`,
  ]
    .filter(Boolean)
    .join(",");

  const [direct, profiles, properties, staff] = await Promise.all([
    supabase.from("support_tickets").select("id").or(directOr).limit(200),
    supabase
      .from("profiles")
      .select("id")
      .or(`email.ilike.${like},display_name.ilike.${like},phone.ilike.${like}`)
      .limit(100),
    supabase
      .from("properties")
      .select("id")
      .or(`property_label.ilike.${like},street_address.ilike.${like},city.ilike.${like},state_name.ilike.${like},zip.ilike.${like}`)
      .limit(100),
    supabase
      .from("staff_users")
      .select("id")
      .or(`email.ilike.${like},full_name.ilike.${like}`)
      .limit(50),
  ]);

  if (!direct.error) direct.data?.forEach((row) => ids.add(row.id));

  const profileIds = !profiles.error ? profiles.data?.map((row) => row.id) || [] : [];
  const propertyIds = !properties.error ? properties.data?.map((row) => row.id) || [] : [];
  const staffIds = !staff.error ? staff.data?.map((row) => row.id) || [] : [];

  if (profileIds.length || propertyIds.length || staffIds.length) {
    const clauses = [
      profileIds.length ? `profile_id.in.(${profileIds.join(",")})` : "",
      propertyIds.length ? `property_id.in.(${propertyIds.join(",")})` : "",
      staffIds.length ? `assigned_staff_user_id.in.(${staffIds.join(",")})` : "",
    ]
      .filter(Boolean)
      .join(",");
    const { data } = await supabase.from("support_tickets").select("id").or(clauses).limit(300);
    data?.forEach((row) => ids.add(row.id));
  }

  if (uuidSearch) {
    const { data: paymentRows } = await supabase
      .from("rent_payments")
      .select("property_id, lease_id, tenant_profile_id, profile_id")
      .eq("id", query)
      .limit(1);
    const payment = paymentRows?.[0];
    const clauses = [
      payment?.property_id ? `property_id.eq.${payment.property_id}` : "",
      payment?.lease_id ? `lease_id.eq.${payment.lease_id}` : "",
      payment?.tenant_profile_id ? `profile_id.eq.${payment.tenant_profile_id}` : "",
      payment?.profile_id ? `profile_id.eq.${payment.profile_id}` : "",
    ]
      .filter(Boolean)
      .join(",");
    if (clauses) {
      const { data } = await supabase.from("support_tickets").select("id").or(clauses).limit(100);
      data?.forEach((row) => ids.add(row.id));
    }
  }

  return ids;
}

async function enrichCases(tickets: SupportTicketRow[]) {
  if (!tickets.length) return [];
  const supabase = getCommandCenterAdminClient();
  const profileIds = unique(tickets.map((ticket) => ticket.profile_id));
  const propertyIds = unique(tickets.map((ticket) => ticket.property_id));
  const leaseIds = unique(tickets.map((ticket) => ticket.lease_id));
  const accessIds = unique(tickets.map((ticket) => ticket.tenant_access_id));
  const staffIds = unique([
    ...tickets.map((ticket) => ticket.assigned_staff_user_id),
    ...tickets.map((ticket) => ticket.resolved_by_staff_user_id),
  ]);

  const [{ data: profiles }, { data: roles }, { data: properties }, { data: leases }, { data: access }, { data: staff }] =
    await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("id, user_id, email, display_name, phone").in("id", profileIds)
        : { data: [] },
      profileIds.length
        ? supabase.from("user_roles").select("profile_id, role").in("profile_id", profileIds)
        : { data: [] },
      propertyIds.length
        ? supabase.from("properties").select("id, property_label, street_address, city, state_name, zip").in("id", propertyIds)
        : { data: [] },
      leaseIds.length
        ? supabase.from("leases").select("id, property_id, start_date, end_date, monthly_rent, lease_status").in("id", leaseIds)
        : { data: [] },
      accessIds.length
        ? supabase.from("tenant_access").select("id, tenant_profile_id, property_id, lease_id").in("id", accessIds)
        : { data: [] },
      staffIds.length
        ? supabase.from("staff_users").select("id, email, full_name, role, status").in("id", staffIds)
        : { data: [] },
    ]);

  const profileRows = (profiles || []) as unknown as ProfileRow[];
  const roleRows = (roles || []) as unknown as UserRoleRow[];
  const propertyRows = (properties || []) as unknown as PropertyRow[];
  const leaseRows = (leases || []) as unknown as LeaseRow[];
  const accessRows = (access || []) as unknown as TenantAccessRow[];
  const staffRows = (staff || []) as unknown as StaffRow[];

  return tickets.map((ticket) => {
    const accessRow = accessRows.find((row) => row.id === ticket.tenant_access_id) || null;
    const customer =
      profileRows.find((profile) => profile.id === ticket.profile_id) ||
      profileRows.find((profile) => profile.id === accessRow?.tenant_profile_id) ||
      null;
    const lease =
      leaseRows.find((row) => row.id === ticket.lease_id) ||
      leaseRows.find((row) => row.id === accessRow?.lease_id) ||
      null;
    const property =
      propertyRows.find((row) => row.id === ticket.property_id) ||
      propertyRows.find((row) => row.id === accessRow?.property_id) ||
      propertyRows.find((row) => row.id === lease?.property_id) ||
      null;
    return {
      ticket,
      customer,
      roles: customer ? roleRows.filter((role) => role.profile_id === customer.id) : [],
      property,
      lease,
      access: accessRow,
      assignedStaff: staffRows.find((row) => row.id === ticket.assigned_staff_user_id) || null,
      resolvedBy: staffRows.find((row) => row.id === ticket.resolved_by_staff_user_id) || null,
      paymentId: metadataString(ticket.metadata, "payment_id") || metadataString(ticket.metadata, "rent_payment_id"),
    } satisfies EnrichedCase;
  });
}

function summarizeCase(enriched: EnrichedCase): CaseDirectoryItem {
  const statusKey = normalizeCaseStatus(enriched.ticket.status);
  const priorityKey = normalizeCasePriority(enriched.ticket.priority);
  const categoryKey = normalizeCategory(enriched.ticket.category);
  const assignedStaffId = enriched.assignedStaff?.id || null;
  const statusFilterKey = simplifyCaseStatus(statusKey, Boolean(assignedStaffId));
  return {
    id: enriched.ticket.id,
    caseNumber: enriched.ticket.ticket_number || enriched.ticket.id,
    subject: getCaseSubject(enriched.ticket),
    customer: displayProfileName(enriched.customer),
    customerEmail: enriched.customer?.email || "Not available",
    customerId: enriched.customer?.id || null,
    customerRole: getCustomerRole(enriched.roles),
    category: getCategoryLabel(categoryKey),
    categoryKey,
    priority: getPriorityLabel(priorityKey),
    priorityKey,
    status: getSimplifiedStatusLabel(statusFilterKey),
    statusKey,
    statusFilterKey,
    assignedTo: enriched.assignedStaff ? displayStaff(enriched.assignedStaff) : "Not assigned",
    assignedStaffId,
    relatedRecord: getRelatedRecordLabel(enriched),
    propertyId: enriched.property?.id || null,
    leaseId: enriched.lease?.id || enriched.ticket.lease_id || null,
    paymentId: enriched.paymentId,
    created: formatDateTime(enriched.ticket.created_at),
    updated: formatDateTime(enriched.ticket.updated_at),
    lastCustomerResponse: formatDateTime(
      enriched.ticket.last_customer_response_at || enriched.ticket.created_at
    ),
    reviewWarning: getReviewWarning(enriched.ticket),
  };
}

async function getCaseTimeline(ticket: SupportTicketRow) {
  const supabase = getCommandCenterAdminClient();
  const [messagesResult, eventsResult, notesResult] = await Promise.all([
    ticket.conversation_id
      ? supabase
          .from("support_conversation_messages")
          .select("id, conversation_id, role, message, created_at")
          .eq("conversation_id", ticket.conversation_id)
          .order("created_at", { ascending: true })
          .limit(50)
      : { data: [] },
    supabase
      .from("support_ticket_events")
      .select("id, ticket_id, conversation_id, event_type, metadata, created_at")
      .or(
        [
          `ticket_id.eq.${ticket.id}`,
          ticket.conversation_id ? `conversation_id.eq.${ticket.conversation_id}` : "",
        ]
          .filter(Boolean)
          .join(",")
      )
      .order("created_at", { ascending: true })
      .limit(80),
    supabase
      .from("command_center_internal_notes")
      .select("id, target_type, target_id, note, created_at")
      .eq("target_type", "case")
      .eq("target_id", ticket.id)
      .order("created_at", { ascending: true })
      .limit(25),
  ]);

  const items = [
    {
      title: "Case created",
      detail: getCaseSubject(ticket),
      timestamp: ticket.created_at || "",
    },
    ...((messagesResult.data || []) as unknown as ConversationMessageRow[]).map((message) => ({
      title: message.role === "user" ? "Customer message" : "Support conversation",
      detail: truncate(message.message || "Not available", 220),
      timestamp: message.created_at || "",
    })),
    ...((eventsResult.data || []) as unknown as TicketEventRow[]).map((event) => ({
      title: formatStatus(event.event_type),
      detail: event.metadata ? summarizeMetadata(event.metadata) : "Recorded event",
      timestamp: event.created_at || "",
    })),
    ...((notesResult.data || []) as unknown as Array<{ note: string | null; created_at: string | null }>).map((note) => ({
      title: "Internal note",
      detail: truncate(note.note || "Internal note added", 180),
      timestamp: note.created_at || "",
    })),
  ];

  if (ticket.resolved_at) {
    items.push({
      title: "Case resolved",
      detail: ticket.resolution_summary || "Resolved",
      timestamp: ticket.resolved_at,
    });
  }

  return items
    .filter((item) => item.timestamp)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((item) => ({ ...item, timestamp: formatDateTime(item.timestamp) }));
}

function passesFilters(item: CaseDirectoryItem, filters: CaseDirectoryResult["filters"], staffId: string) {
  if (
    filters.status !== "all" &&
    (filters.status === "resolved"
      ? item.statusFilterKey !== "resolved" && item.statusFilterKey !== "closed"
      : item.statusFilterKey !== filters.status)
  ) {
    return false;
  }
  if (filters.priority !== "all" && item.priorityKey !== filters.priority) return false;
  if (filters.category !== "all" && item.categoryKey !== filters.category) return false;
  if (filters.assignment === "unassigned" && item.assignedStaffId) return false;
  if (filters.assignment === "me" && item.assignedStaffId !== staffId) return false;
  if (!["all", "unassigned", "me"].includes(filters.assignment) && item.assignedStaffId !== filters.assignment) {
    return false;
  }
  return true;
}

function dateFilterStart(filter: CaseDateFilter) {
  const now = new Date();
  if (filter === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  now.setDate(now.getDate() - (filter === "7d" ? 7 : 30));
  return now.toISOString();
}

function getCaseSubject(ticket: SupportTicketRow) {
  return (
    metadataString(ticket.metadata, "subject") ||
    metadataString(ticket.metadata, "conversation_summary") ||
    truncate(ticket.message || getCategoryLabel(ticket.category), 96)
  );
}

function getCustomerRole(roles: UserRoleRow[]) {
  const values = new Set(roles.map((role) => role.role));
  if (values.has("landlord") && values.has("resident")) return "Dual";
  if (values.has("landlord")) return "Landlord";
  if (values.has("resident")) return "Resident";
  return "Not available";
}

function getRelatedRecordLabel(enriched: EnrichedCase) {
  if (enriched.paymentId) return `Payment ${shortId(enriched.paymentId)}`;
  if (enriched.property) return enriched.property.property_label || enriched.property.street_address || "Property";
  if (enriched.lease) return `Lease ${shortId(enriched.lease.id)}`;
  return "Not linked";
}

function getReviewWarning(ticket: SupportTicketRow) {
  const priority = normalizeCasePriority(ticket.priority);
  const status = normalizeCaseStatus(ticket.status);
  if (CLOSED_STATUSES.has(status)) return null;
  const updated = ticket.updated_at || ticket.created_at;
  if (!updated) return null;
  const hours = (Date.now() - new Date(updated).getTime()) / (60 * 60 * 1000);
  if (priority === "critical") return "Immediate review";
  if (priority === "time_sensitive" && hours > 4) return "Overdue review";
  if (priority === "important" && hours > 24) return "Overdue review";
  if (priority === "standard" && hours > 48) return "Review overdue";
  return null;
}

function isPaymentRelated(ticket: SupportTicketRow) {
  const category = normalizeCategory(ticket.category);
  return PAYMENT_RELATED_CATEGORIES.has(category) || Boolean(metadataString(ticket.metadata, "payment_id"));
}

function displaySource(ticket: SupportTicketRow) {
  return ticket.source || metadataString(ticket.metadata, "source") || "Not available";
}

function displayProfileName(profile: ProfileRow | null | undefined) {
  return profile?.display_name || profile?.email?.split("@")[0] || "Not available";
}

function displayStaff(staff: StaffRow | { full_name: string | null; email: string }) {
  return staff.full_name || staff.email;
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "Not available";
  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null | undefined) {
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

function normalizeCategory(value: string | null | undefined): CaseCategoryFilter {
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

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function summarizeMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value)
  );
  return entries.length
    ? entries
        .slice(0, 3)
        .map(([key, value]) => `${formatStatus(key)}: ${String(value)}`)
        .join(" · ")
    : "Recorded event";
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean))] as string[];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isCaseStatus(value: string): value is CaseStatus {
  return CASE_STATUSES.some((status) => status.value === value);
}

function isCasePriority(value: string): value is CasePriority {
  return CASE_PRIORITIES.some((priority) => priority.value === value);
}

function isStatusFilter(value: unknown): value is CaseStatusFilter {
  return value === "all" || SIMPLIFIED_CASE_STATUSES.some((status) => status.value === value);
}

function isPriorityFilter(value: unknown): value is CasePriorityFilter {
  return value === "all" || isCasePriority(String(value));
}

function isCategoryFilter(value: unknown): value is CaseCategoryFilter {
  return value === "all" || CASE_CATEGORIES.some((category) => category.value === value);
}

function isDateFilter(value: unknown): value is CaseDateFilter {
  return ["all", "today", "7d", "30d"].includes(String(value));
}
