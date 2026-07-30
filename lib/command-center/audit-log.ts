import {
  getCommandCenterAdminClient,
  type StaffUser,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";

export type AuditLogDirectoryParams = {
  query?: string;
  category?: string;
  action?: string;
  staff?: string;
  targetType?: string;
  date?: string;
  changeType?: string;
  page?: string;
  pageSize?: string;
};

export type AuditLogDirectoryResult = {
  items: AuditLogDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    category: AuditCategoryFilter;
    action: string;
    staff: string;
    targetType: string;
    date: AuditDateFilter;
    changeType: ChangeTypeFilter;
  };
  options: {
    actions: string[];
    staff: Array<{ id: string; label: string }>;
    targetTypes: string[];
  };
};

export type AuditLogDirectoryItem = {
  id: string;
  action: string;
  rawAction: string;
  category: AuditCategory;
  changeType: ChangeTypeFilter;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  changeSummary: string;
  reason: string;
  created: string;
  source: AuditSource;
};

export type AuditLogDetail = {
  id: string;
  action: string;
  rawAction: string;
  category: AuditCategory;
  changeType: ChangeTypeFilter;
  source: AuditSource;
  created: string;
  createdUtc: string;
  staff: {
    id: string | null;
    name: string;
    email: string;
    role: string;
  };
  target: {
    type: string;
    id: string;
    label: string;
    href: string | null;
  };
  reason: string;
  changeSummary: string;
  changes: AuditChangeRow[];
  metadata: SanitizedJson;
  context: Array<{ label: string; value: string; href?: string | null }>;
};

export type AuditChangeRow = {
  field: string;
  before: string;
  after: string;
};

type AuditCategoryFilter =
  | "all"
  | "authentication"
  | "people"
  | "properties"
  | "payments"
  | "cases"
  | "notes"
  | "settings"
  | "system"
  | "other";

type AuditCategory = Exclude<AuditCategoryFilter, "all">;
type AuditDateFilter = "all" | "today" | "7d" | "30d" | "mtd" | "ytd";
type ChangeTypeFilter =
  | "all"
  | "created"
  | "updated"
  | "assigned"
  | "status_changed"
  | "priority_changed"
  | "resolved"
  | "reopened"
  | "login"
  | "logout"
  | "access_denied"
  | "note_created"
  | "note_edited"
  | "other";
type AuditSource = "Command Center" | "Session" | "API" | "System" | "Unknown";
type SanitizedJson =
  | null
  | string
  | number
  | boolean
  | SanitizedJson[]
  | { [key: string]: SanitizedJson };

type AuditRow = {
  id: string;
  staff_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  metadata: unknown;
  created_at: string;
};

type StaffRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
};

type TargetLabel = {
  label: string;
  href: string | null;
};

const PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const DIRECTORY_FETCH_LIMIT = 500;
const ANALYTICS_TIMEZONE = "America/Chicago";
const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|card|bank|account_number|routing_number|cvv|ssn|government_id|access_token|refresh_token|service_role|webhook_secret)/i;
const MAX_VALUE_LENGTH = 800;

const CATEGORY_OPTIONS: AuditCategoryFilter[] = [
  "all",
  "authentication",
  "people",
  "properties",
  "payments",
  "cases",
  "notes",
  "settings",
  "system",
  "other",
];
const DATE_OPTIONS: AuditDateFilter[] = ["all", "today", "7d", "30d", "mtd", "ytd"];
const CHANGE_TYPE_OPTIONS: ChangeTypeFilter[] = [
  "all",
  "created",
  "updated",
  "assigned",
  "status_changed",
  "priority_changed",
  "resolved",
  "reopened",
  "login",
  "logout",
  "access_denied",
  "note_created",
  "note_edited",
  "other",
];

export async function getAuditLogDirectory(
  staff: StaffUser,
  params: AuditLogDirectoryParams
): Promise<AuditLogDirectoryResult> {
  assertAuditLogView(staff);

  const filters = normalizeFilters(params);
  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize);
  const supabase = getCommandCenterAdminClient();
  const [staffOptions, actionOptions, targetTypeOptions] = await Promise.all([
    loadStaffOptions(),
    loadDistinctAuditValues("action"),
    loadDistinctAuditValues("target_type"),
  ]);
  const searchStaffIds = filters.query
    ? staffOptions
        .filter((option) => option.searchText.includes(filters.query.toLowerCase()))
        .map((option) => option.id)
    : [];

  let query = supabase
    .from("command_center_audit_logs")
    .select(auditSelect(), { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.action !== "all") query = query.eq("action", filters.action);
  const categoryPatterns = actionPatternsForCategory(filters.category);
  if (categoryPatterns.length) query = query.or(categoryPatterns.join(","));
  const changePatterns = actionPatternsForChangeType(filters.changeType);
  if (changePatterns.length) query = query.or(changePatterns.join(","));
  if (filters.staff === "system") query = query.is("staff_user_id", null);
  else if (filters.staff !== "all") query = query.eq("staff_user_id", filters.staff);
  if (filters.targetType !== "all") query = query.eq("target_type", filters.targetType);

  const range = getDateRange(filters.date);
  if (range) {
    query = query
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString());
  }

  if (filters.query) {
    const safe = escapePostgrestLike(filters.query);
    const ors = [
      `action.ilike.%${safe}%`,
      `target_type.ilike.%${safe}%`,
      `target_id.ilike.%${safe}%`,
      `reason.ilike.%${safe}%`,
    ];
    if (isUuid(filters.query)) ors.push(`id.eq.${filters.query}`);
    searchStaffIds.forEach((id) => ors.push(`staff_user_id.eq.${id}`));
    query = query.or(ors.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = ((data || []) as unknown as AuditRow[]).filter((row) =>
    passesComputedFilters(row, filters)
  );
  const staffMap = await loadStaffMap(rows.map((row) => row.staff_user_id));
  const targetMap = await resolveDirectoryTargets(rows);

  return {
    items: rows.map((row) => summarizeAuditRow(row, staffMap, targetMap)),
    page,
    pageSize,
    total: count || rows.length,
    pageCount: Math.max(1, Math.ceil((count || rows.length) / pageSize)),
    filters,
    options: {
      actions: actionOptions,
      staff: [
        ...staffOptions.map((item) => ({ id: item.id, label: item.label })),
        { id: "system", label: "System / No Staff" },
      ],
      targetTypes: targetTypeOptions,
    },
  };
}

export async function getAuditLogDetail(staff: StaffUser, auditId: string) {
  assertAuditLogView(staff);

  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("command_center_audit_logs")
    .select(auditSelect())
    .eq("id", auditId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as AuditRow;
  const staffMap = await loadStaffMap([row.staff_user_id]);
  const target = await resolveDetailTarget(row.target_type, row.target_id);
  const normalized = normalizeAuditAction(row.action);
  const staffActor = row.staff_user_id ? staffMap.get(row.staff_user_id) : null;
  const changes = buildChangeRows(row);
  const metadata = sanitizeJson(row.metadata);

  return {
    id: row.id,
    action: normalized.label,
    rawAction: row.action,
    category: normalized.category,
    changeType: normalized.changeType,
    source: inferSource(row.action, row.metadata),
    created: formatDateTime(row.created_at),
    createdUtc: row.created_at,
    staff: {
      id: staffActor?.id || null,
      name: staffActor?.full_name || staffActor?.email || "System / No Staff",
      email: staffActor?.email || "Not available",
      role: formatRole(staffActor?.role),
    },
    target: {
      type: formatTargetType(row.target_type),
      id: row.target_id || "Not available",
      label: target.label,
      href: target.href,
    },
    reason: row.reason || "Not provided",
    changeSummary: summarizeChange(row, normalized),
    changes,
    metadata,
    context: buildContext(row, target),
  } satisfies AuditLogDetail;
}

function assertAuditLogView(staff: StaffUser) {
  if (!staffHasCapability(staff, "audit_log.view")) {
    throw new Error("Audit log view permission required.");
  }
}

function auditSelect() {
  return "id, staff_user_id, action, target_type, target_id, before_data, after_data, reason, metadata, created_at";
}

function normalizeFilters(params: AuditLogDirectoryParams) {
  return {
    query: String(params.query || "").trim(),
    category: CATEGORY_OPTIONS.includes(params.category as AuditCategoryFilter)
      ? (params.category as AuditCategoryFilter)
      : "all",
    action: String(params.action || "all"),
    staff: String(params.staff || "all"),
    targetType: String(params.targetType || "all"),
    date: DATE_OPTIONS.includes(params.date as AuditDateFilter)
      ? (params.date as AuditDateFilter)
      : "30d",
    changeType: CHANGE_TYPE_OPTIONS.includes(params.changeType as ChangeTypeFilter)
      ? (params.changeType as ChangeTypeFilter)
      : "all",
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

function passesComputedFilters(row: AuditRow, filters: ReturnType<typeof normalizeFilters>) {
  const normalized = normalizeAuditAction(row.action);
  if (filters.category !== "all" && normalized.category !== filters.category) return false;
  if (filters.changeType !== "all" && normalized.changeType !== filters.changeType) return false;
  return true;
}

function actionPatternsForCategory(category: AuditCategoryFilter) {
  if (category === "authentication") {
    return ["action.ilike.%login%", "action.ilike.%logout%", "action.ilike.%access_denied%"];
  }
  if (category === "notes") return ["action.ilike.%note%"];
  if (category === "cases") return ["action.ilike.%case%"];
  if (category === "payments") return ["action.ilike.%payment%"];
  if (category === "properties") return ["action.ilike.%propert%"];
  if (category === "people") return ["action.ilike.%people%", "action.ilike.%profile%"];
  if (category === "settings") return ["action.ilike.%setting%", "action.ilike.%staff%"];
  if (category === "system") return ["action.ilike.%system%"];
  return [];
}

function actionPatternsForChangeType(changeType: ChangeTypeFilter) {
  if (changeType === "created") return ["action.ilike.%created%"];
  if (changeType === "updated") return ["action.ilike.%edited%", "action.ilike.%updated%", "action.ilike.%changed%"];
  if (changeType === "assigned") return ["action.ilike.%assignment%", "action.ilike.%assigned%"];
  if (changeType === "status_changed") return ["action.ilike.%status%"];
  if (changeType === "priority_changed") return ["action.ilike.%priority%"];
  if (changeType === "resolved") return ["action.ilike.%resolved%"];
  if (changeType === "reopened") return ["action.ilike.%reopened%"];
  if (changeType === "login") return ["action.ilike.%login%"];
  if (changeType === "logout") return ["action.ilike.%logout%"];
  if (changeType === "access_denied") return ["action.ilike.%access_denied%"];
  if (changeType === "note_created") return ["action.ilike.%note_created%"];
  if (changeType === "note_edited") return ["action.ilike.%note_edited%"];
  return [];
}

async function loadStaffOptions() {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("id, email, full_name, role, status")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return ((data || []) as StaffRow[]).map((staff) => ({
    id: staff.id,
    label: `${staff.full_name || staff.email || "Unnamed staff"} (${formatRole(staff.role)})`,
    searchText: `${staff.full_name || ""} ${staff.email || ""} ${staff.role || ""}`.toLowerCase(),
  }));
}

async function loadDistinctAuditValues(column: "action" | "target_type") {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("command_center_audit_logs")
    .select(column)
    .not(column, "is", null)
    .order(column, { ascending: true })
    .limit(DIRECTORY_FETCH_LIMIT);
  if (error) throw error;
  return Array.from(
    new Set(
      ((data || []) as Array<Record<typeof column, string | null>>)
        .map((row) => row[column])
        .filter(Boolean) as string[]
    )
  );
}

async function loadStaffMap(ids: Array<string | null>) {
  const cleanIds = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!cleanIds.length) return new Map<string, StaffRow>();
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("id, email, full_name, role, status")
    .in("id", cleanIds);
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center audit staff resolution failed:", error);
    }
    return new Map<string, StaffRow>();
  }
  return new Map(((data || []) as StaffRow[]).map((staff) => [staff.id, staff]));
}

async function resolveDirectoryTargets(rows: AuditRow[]) {
  const map = new Map<string, TargetLabel>();
  await Promise.all(
    ["profile", "property", "payment", "case", "staff_user"].map(async (type) => {
      const ids = rows
        .filter((row) => row.target_type === type && row.target_id)
        .map((row) => row.target_id!) ;
      if (!ids.length) return;
      const labels = await resolveTargets(type, Array.from(new Set(ids)));
      labels.forEach((value, key) => map.set(`${type}:${key}`, value));
    })
  );
  return map;
}

async function resolveDetailTarget(type: string | null, id: string | null): Promise<TargetLabel> {
  if (!type || !id) return { label: "Not available", href: null };
  const labels = await resolveTargets(type, [id]);
  return labels.get(id) || { label: "Record no longer available", href: null };
}

async function resolveTargets(type: string, ids: string[]) {
  const supabase = getCommandCenterAdminClient();
  const labels = new Map<string, TargetLabel>();
  try {
    if (type === "profile") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
      if (error) throw error;
      (data || []).forEach((row: { id: string; display_name: string | null; email: string | null }) => {
        labels.set(row.id, {
          label: row.display_name || row.email || row.id,
          href: `/command-center/people/${row.id}`,
        });
      });
    } else if (type === "property") {
      const { data, error } = await supabase
        .from("properties")
        .select("id, property_label, street_address")
        .in("id", ids);
      if (error) throw error;
      (data || []).forEach((row: { id: string; property_label: string | null; street_address: string | null }) => {
        labels.set(row.id, {
          label: [row.property_label, row.street_address].filter(Boolean).join(" · ") || row.id,
          href: `/command-center/properties/${row.id}`,
        });
      });
    } else if (type === "payment") {
      const { data, error } = await supabase
        .from("rent_payments")
        .select("id, amount, rent_amount_cents, status")
        .in("id", ids);
      if (error) throw error;
      (data || []).forEach((row: { id: string; amount: number | string | null; rent_amount_cents: number | null; status: string | null }) => {
        labels.set(row.id, {
          label: `${row.id} · ${formatPaymentAmount(row)} · ${titleCase(row.status || "unknown")}`,
          href: `/command-center/payments/${row.id}`,
        });
      });
    } else if (type === "case") {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, category")
        .in("id", ids);
      if (error) throw error;
      (data || []).forEach((row: { id: string; ticket_number: string | null; category: string | null }) => {
        labels.set(row.id, {
          label: `${row.ticket_number || row.id} · ${titleCase(row.category || "case")}`,
          href: `/command-center/cases/${row.id}`,
        });
      });
    } else if (type === "staff_user") {
      const { data, error } = await supabase
        .from("staff_users")
        .select("id, email, full_name")
        .in("id", ids);
      if (error) throw error;
      (data || []).forEach((row: { id: string; email: string | null; full_name: string | null }) => {
        labels.set(row.id, {
          label: row.full_name || row.email || row.id,
          href: "/command-center/settings",
        });
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center audit target resolution failed:", { type, error });
    }
  }
  return labels;
}

function summarizeAuditRow(
  row: AuditRow,
  staffMap: Map<string, StaffRow>,
  targetMap: Map<string, TargetLabel>
): AuditLogDirectoryItem {
  const normalized = normalizeAuditAction(row.action);
  const staff = row.staff_user_id ? staffMap.get(row.staff_user_id) : null;
  const targetKey = row.target_type && row.target_id ? `${row.target_type}:${row.target_id}` : "";
  const target = targetMap.get(targetKey);

  return {
    id: row.id,
    action: normalized.label,
    rawAction: row.action,
    category: normalized.category,
    changeType: normalized.changeType,
    staffName: staff?.full_name || staff?.email || "System / No Staff",
    staffEmail: staff?.email || "Not available",
    staffRole: formatRole(staff?.role),
    targetType: formatTargetType(row.target_type),
    targetId: row.target_id || "Not available",
    targetLabel: target?.label || (row.target_id ? "Record no longer available" : "Not available"),
    changeSummary: summarizeChange(row, normalized),
    reason: row.reason || "Not provided",
    created: formatDateTime(row.created_at),
    source: inferSource(row.action, row.metadata),
  };
}

function normalizeAuditAction(action: string): {
  label: string;
  category: AuditCategory;
  changeType: ChangeTypeFilter;
} {
  const raw = action.toLowerCase();
  if (raw.includes("login")) return { label: "Login", category: "authentication", changeType: "login" };
  if (raw.includes("logout")) return { label: "Logout", category: "authentication", changeType: "logout" };
  if (raw.includes("access_denied")) return { label: "Access Denied", category: "authentication", changeType: "access_denied" };
  if (raw.includes("case_assignment")) return { label: "Case Assigned", category: "cases", changeType: "assigned" };
  if (raw.includes("case_status")) return { label: "Case Status Changed", category: "cases", changeType: "status_changed" };
  if (raw.includes("case_priority")) return { label: "Case Priority Changed", category: "cases", changeType: "priority_changed" };
  if (raw.includes("case_resolved")) return { label: "Case Resolved", category: "cases", changeType: "resolved" };
  if (raw.includes("case_reopened")) return { label: "Case Reopened", category: "cases", changeType: "reopened" };
  if (raw.includes("note_created")) return { label: "Note Created", category: "notes", changeType: "note_created" };
  if (raw.includes("note_edited")) return { label: "Note Edited", category: "notes", changeType: "note_edited" };
  if (raw.includes("payment")) return { label: titleCase(action), category: "payments", changeType: inferChangeType(raw) };
  if (raw.includes("propert")) return { label: titleCase(action), category: "properties", changeType: inferChangeType(raw) };
  if (raw.includes("people") || raw.includes("profile") || raw.includes("internal_note")) {
    return { label: titleCase(action), category: "people", changeType: inferChangeType(raw) };
  }
  if (raw.includes("setting") || raw.includes("staff")) return { label: titleCase(action), category: "settings", changeType: inferChangeType(raw) };
  if (raw.includes("system")) return { label: titleCase(action), category: "system", changeType: inferChangeType(raw) };
  return { label: titleCase(action), category: "other", changeType: inferChangeType(raw) };
}

function inferChangeType(raw: string): ChangeTypeFilter {
  if (raw.includes("created")) return "created";
  if (raw.includes("edited") || raw.includes("updated") || raw.includes("changed")) return "updated";
  if (raw.includes("assigned")) return "assigned";
  if (raw.includes("resolved")) return "resolved";
  if (raw.includes("reopened")) return "reopened";
  return "other";
}

function summarizeChange(
  row: AuditRow,
  normalized: ReturnType<typeof normalizeAuditAction>
) {
  const changes = buildChangeRows(row);
  if (changes.length) {
    const first = changes[0];
    return `${titleCase(first.field)} changed: ${first.before} → ${first.after}`;
  }
  if (normalized.changeType === "login") return "Staff session started";
  if (normalized.changeType === "logout") return "Staff session ended";
  if (normalized.changeType === "access_denied") return "Access denied";
  if (normalized.changeType === "note_created") return "Internal note created";
  if (normalized.changeType === "note_edited") return "Internal note edited";
  return normalized.label;
}

function buildChangeRows(row: AuditRow): AuditChangeRow[] {
  const beforeSource = isPlainObject(row.before_data)
    ? row.before_data
    : isPlainObject(row.metadata) && isPlainObject(row.metadata.before)
    ? row.metadata.before
    : undefined;
  const afterSource = isPlainObject(row.after_data)
    ? row.after_data
    : isPlainObject(row.metadata) && isPlainObject(row.metadata.after)
    ? row.metadata.after
    : undefined;

  if (beforeSource || afterSource) {
    const keys = new Set([
      ...Object.keys(beforeSource || {}),
      ...Object.keys(afterSource || {}),
    ]);
    return [...keys]
      .filter((key) => !valuesEqual(beforeSource?.[key], afterSource?.[key]))
      .map((key) => ({
        field: key,
        before: stringifySafeValue(key, beforeSource?.[key]),
        after: stringifySafeValue(key, afterSource?.[key]),
      }))
      .slice(0, 25);
  }

  if (isPlainObject(row.metadata) && ("before" in row.metadata || "after" in row.metadata)) {
    return [
      {
        field: "value",
        before: stringifySafeValue("before", row.metadata.before),
        after: stringifySafeValue("after", row.metadata.after),
      },
    ];
  }

  return [];
}

function buildContext(row: AuditRow, target: TargetLabel) {
  const context: Array<{ label: string; value: string; href?: string | null }> = [];
  if (row.target_type && row.target_id) {
    context.push({
      label: "Target",
      value: `${formatTargetType(row.target_type)} · ${target.label}`,
      href: target.href,
    });
  }
  if (isPlainObject(row.metadata)) {
    const metadata = row.metadata;
    ["noteId", "authUserId", "caseId", "paymentId", "propertyId", "profileId"].forEach((key) => {
      const value = metadata[key];
      if (typeof value === "string" && !SENSITIVE_KEY_PATTERN.test(key)) {
        context.push({ label: titleCase(key), value });
      }
    });
  }
  return context;
}

function sanitizeJson(value: unknown, key = ""): SanitizedJson {
  if (SENSITIVE_KEY_PATTERN.test(key)) return "[REDACTED]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeJson(item, key));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeJson(childValue, childKey),
      ])
    );
  }
  return truncate(String(value));
}

function stringifySafeValue(key: string, value: unknown) {
  const safe = sanitizeJson(value, key);
  if (safe === null) return "Not available";
  const rendered = typeof safe === "string" ? safe : JSON.stringify(safe);
  return truncate(rendered);
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function inferSource(action: string, metadata: unknown): AuditSource {
  const raw = action.toLowerCase();
  if (raw.includes("login") || raw.includes("logout") || raw.includes("access_denied")) {
    return "Session";
  }
  if (isPlainObject(metadata) && typeof metadata.source === "string") {
    const source = metadata.source.toLowerCase();
    if (source.includes("api")) return "API";
    if (source.includes("system")) return "System";
    if (source.includes("command")) return "Command Center";
  }
  if (raw.includes("system")) return "System";
  if (raw.includes("command_center")) return "Command Center";
  return "Unknown";
}

function getDateRange(filter: AuditDateFilter) {
  if (filter === "all") return null;
  const now = new Date();
  const chicago = getZonedParts(now);
  let startParts = { year: chicago.year, month: chicago.month, day: chicago.day };
  if (filter === "7d" || filter === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - (filter === "7d" ? 7 : 30));
    startParts = getZonedParts(start);
  } else if (filter === "mtd") {
    startParts = { year: chicago.year, month: chicago.month, day: 1 };
  } else if (filter === "ytd") {
    startParts = { year: chicago.year, month: 1, day: 1 };
  }
  return {
    start: zonedDateToUtc(startParts.year, startParts.month, startParts.day),
    end: now,
  };
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ANALYTICS_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatTargetType(value: string | null | undefined) {
  if (!value) return "Not available";
  if (value === "profile") return "Profile";
  if (value === "property") return "Property";
  if (value === "payment") return "Payment";
  if (value === "case") return "Case";
  if (value === "staff_user") return "Staff User";
  if (value === "system") return "System";
  return titleCase(value);
}

function formatRole(value: string | null | undefined) {
  return value ? titleCase(value) : "Not available";
}

function formatPaymentAmount(row: { amount: number | string | null; rent_amount_cents?: number | null }) {
  const cents = Number(row.rent_amount_cents || 0);
  const amount = cents > 0 ? cents / 100 : Number(row.amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function escapePostgrestLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", "\\,");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function truncate(value: string) {
  return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
