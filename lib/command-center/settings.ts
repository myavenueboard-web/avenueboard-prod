import {
  getCommandCenterAdminClient,
  recordCommandCenterAudit,
  STAFF_ROLES,
  type StaffRole,
  type StaffStatus,
  type StaffUser,
} from "@/lib/command-center/server";
import {
  COMMAND_CENTER_ROLE_CAPABILITIES,
  getStaffCapabilities,
  staffHasCapability,
  type CommandCenterCapability,
} from "@/lib/command-center/permissions";
import {
  CASE_CATEGORIES,
  CASE_PRIORITIES,
  SIMPLIFIED_CASE_STATUSES,
} from "@/lib/command-center/cases";

export type StaffDirectoryParams = {
  query?: string;
  role?: string;
  status?: string;
  mfa?: string;
  page?: string;
};

export type StaffDirectoryItem = {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  roleLabel: string;
  status: StaffStatus;
  statusLabel: string;
  mfaRequired: boolean;
  lastLogin: string;
  created: string;
  updated: string;
  invitedBy: string;
  canChangeRole: boolean;
  canSuspend: boolean;
  canRestore: boolean;
  canRevoke: boolean;
  canActivate: boolean;
  canToggleMfa: boolean;
};

export type StaffDirectoryResult = {
  items: StaffDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  filters: {
    query: string;
    role: StaffRole | "all";
    status: StaffStatus | "all";
    mfa: "all" | "required" | "not_required";
  };
};

export type StaffSettingsSummary = {
  directory: StaffDirectoryResult;
  roleMatrix: Array<{
    capability: CommandCenterCapability;
    roles: Record<StaffRole, boolean>;
  }>;
  supportConfig: {
    statuses: string[];
    priorities: string[];
    categories: string[];
  };
  platformInfo: Array<[string, string]>;
  securityInfo: string[];
  provisioningSteps: string[];
};

export type StaffDetail = {
  staff: StaffDirectoryItem & {
    authUserId: string;
    statusDescription: string;
    permissions: CommandCenterCapability[];
  };
  recentAuditEvents: Array<{
    id: string;
    action: string;
    reason: string;
    created: string;
  }>;
};

type StaffRow = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  status: StaffStatus;
  mfa_required: boolean;
  invited_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_login_at: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  reason: string | null;
  created_at: string | null;
};

type StaffUpdateInput =
  | { action: "change_role"; targetStaffUserId: string; role: StaffRole; reason: string; expectedUpdatedAt?: string | null }
  | { action: "suspend"; targetStaffUserId: string; reason: string; expectedUpdatedAt?: string | null }
  | { action: "restore"; targetStaffUserId: string; reason?: string; expectedUpdatedAt?: string | null }
  | { action: "revoke"; targetStaffUserId: string; reason: string; expectedUpdatedAt?: string | null }
  | { action: "activate"; targetStaffUserId: string; reason?: string; expectedUpdatedAt?: string | null }
  | { action: "toggle_mfa"; targetStaffUserId: string; mfaRequired: boolean; reason?: string; expectedUpdatedAt?: string | null };

const PAGE_SIZE = 20;
const VALID_STATUSES: StaffStatus[] = ["invited", "active", "suspended", "revoked"];
const MFA_FILTERS = ["all", "required", "not_required"] as const;
const STAFF_SELECT =
  "id, auth_user_id, email, full_name, role, status, mfa_required, invited_by, created_at, updated_at, last_login_at";

export async function getCommandCenterSettings(
  actor: StaffUser,
  params: StaffDirectoryParams
): Promise<StaffSettingsSummary> {
  assertSettingsView(actor);
  const directory = await getStaffDirectory(actor, params);

  return {
    directory,
    roleMatrix: buildRoleMatrix(),
    supportConfig: {
      statuses: SIMPLIFIED_CASE_STATUSES.map((item) => item.label),
      priorities: CASE_PRIORITIES.map((item) => item.label),
      categories: CASE_CATEGORIES.filter((item) => item.value !== "all").map((item) => item.label),
    },
    platformInfo: buildPlatformInfo(),
    securityInfo: [
      "Command Center routes require an active staff membership.",
      "Role capabilities are enforced server-side from the centralized permission map.",
      "Staff access changes are audited with before and after values.",
      "Normal staff cannot edit or delete audit history.",
      "Sensitive payment and infrastructure values are not rendered in Settings.",
      "MVP uses shared Supabase Auth with a staff_users membership gate.",
      "MFA requirement is tracked per staff user and visible to administrators.",
    ],
    provisioningSteps: [
      "Create the user in Supabase Auth through an approved server/admin process.",
      "Insert or provision a matching staff_users record.",
      "Assign one of the supported Command Center roles.",
      "Set status to invited or active.",
      "Require MFA where appropriate.",
    ],
  };
}

export async function getStaffDirectory(
  actor: StaffUser,
  params: StaffDirectoryParams
): Promise<StaffDirectoryResult> {
  assertStaffView(actor);

  const supabase = getCommandCenterAdminClient();
  const filters = normalizeFilters(params);
  const page = normalizePage(params.page);

  let query = supabase
    .from("staff_users")
    .select(STAFF_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (filters.role !== "all") query = query.eq("role", filters.role);
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.mfa === "required") query = query.eq("mfa_required", true);
  if (filters.mfa === "not_required") query = query.eq("mfa_required", false);
  if (filters.query) {
    const safe = escapePostgrestLike(filters.query);
    const ors = [
      `email.ilike.%${safe}%`,
      `full_name.ilike.%${safe}%`,
    ];
    if (isUuid(filters.query)) ors.push(`id.eq.${filters.query}`);
    query = query.or(ors.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data || []) as StaffRow[];
  const inviterMap = await loadInviterMap(rows);

  return {
    items: rows.map((row) => summarizeStaff(row, actor, inviterMap)),
    page,
    pageSize: PAGE_SIZE,
    total: count || rows.length,
    pageCount: Math.max(1, Math.ceil((count || rows.length) / PAGE_SIZE)),
    filters,
  };
}

export async function getStaffDetail(actor: StaffUser, staffUserId: string) {
  assertStaffView(actor);

  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select(STAFF_SELECT)
    .eq("id", staffUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as StaffRow;
  const inviterMap = await loadInviterMap([row]);
  const { data: auditRows, error: auditError } = await supabase
    .from("command_center_audit_logs")
    .select("id, action, reason, created_at")
    .or(`staff_user_id.eq.${staffUserId},target_id.eq.${staffUserId}`)
    .order("created_at", { ascending: false })
    .limit(12);
  if (auditError && process.env.NODE_ENV === "development") {
    console.error("Command Center staff detail audit lookup failed:", auditError);
  }

  const summarized = summarizeStaff(row, actor, inviterMap);
  return {
    staff: {
      ...summarized,
      authUserId: row.auth_user_id,
      statusDescription: statusDescription(row.status),
      permissions: getStaffCapabilities(row.role),
    },
    recentAuditEvents: ((auditRows || []) as AuditRow[]).map((event) => ({
      id: event.id,
      action: titleCase(event.action),
      reason: event.reason || "Not provided",
      created: formatDateTime(event.created_at),
    })),
  } satisfies StaffDetail;
}

export async function updateStaffAccess(actor: StaffUser, input: StaffUpdateInput) {
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select(STAFF_SELECT)
    .eq("id", input.targetStaffUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false as const, error: "Staff user not found." };

  const target = data as StaffRow;
  const validation = await validateStaffUpdate(actor, target, input);
  if (!validation.ok) return validation;

  const update = buildStaffUpdate(input);
  const beforeData = snapshotStaff(target);
  const query = supabase.from("staff_users").update(update).eq("id", target.id);
  const guardedQuery = input.expectedUpdatedAt
    ? query.eq("updated_at", input.expectedUpdatedAt)
    : query;
  const { data: updatedRows, error: updateError } = await guardedQuery
    .select(STAFF_SELECT);
  if (updateError) throw updateError;
  const updated = (updatedRows || [])[0] as StaffRow | undefined;
  if (!updated) {
    return { ok: false as const, error: "Staff record changed. Refresh and try again." };
  }

  await recordCommandCenterAudit({
    staffUserId: actor.id,
    action: auditActionForUpdate(input),
    targetType: "staff_user",
    targetId: target.id,
    beforeData,
    afterData: snapshotStaff(updated),
    reason: input.reason || null,
    metadata: { targetEmail: target.email },
  });

  return { ok: true as const };
}

function assertSettingsView(staff: StaffUser) {
  if (!staffHasCapability(staff, "settings.view")) {
    throw new Error("Settings view permission required.");
  }
}

function assertStaffView(staff: StaffUser) {
  if (!staffHasCapability(staff, "staff.view")) {
    throw new Error("Staff view permission required.");
  }
}

async function validateStaffUpdate(actor: StaffUser, target: StaffRow, input: StaffUpdateInput) {
  if (input.targetStaffUserId === actor.id && ["suspend", "revoke"].includes(input.action)) {
    return { ok: false as const, error: "You cannot suspend or revoke your own access." };
  }

  if (input.action === "change_role") {
    if (!staffHasCapability(actor, "staff.role.update")) {
      return { ok: false as const, error: "You are not authorized to change roles." };
    }
    if (!STAFF_ROLES.includes(input.role)) {
      return { ok: false as const, error: "Invalid role." };
    }
    if (!input.reason.trim()) {
      return { ok: false as const, error: "Reason is required." };
    }
    if (target.id === actor.id && target.role === "super_admin" && input.role !== "super_admin") {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        return { ok: false as const, error: "The final active super admin cannot remove their own role." };
      }
    }
    return { ok: true as const };
  }

  if (input.action === "toggle_mfa") {
    if (!staffHasCapability(actor, "staff.mfa.update")) {
      return { ok: false as const, error: "You are not authorized to update MFA requirements." };
    }
    return { ok: true as const };
  }

  if (!staffHasCapability(actor, "staff.status.update")) {
    return { ok: false as const, error: "You are not authorized to update staff status." };
  }
  if (actor.role !== "super_admin") {
    if (target.role === "super_admin") {
      return { ok: false as const, error: "Only super admins can update super admin status." };
    }
    if (!["suspend", "restore"].includes(input.action)) {
      return { ok: false as const, error: "Only super admins can perform this status update." };
    }
  }
  if (["suspend", "revoke"].includes(input.action) && !input.reason?.trim()) {
    return { ok: false as const, error: "Reason is required." };
  }
  if (target.role === "super_admin" && ["suspend", "revoke"].includes(input.action)) {
    const activeSuperAdminCount = await countActiveSuperAdmins();
    if (target.status === "active" && activeSuperAdminCount <= 1) {
      return { ok: false as const, error: "The final active super admin cannot be suspended or revoked." };
    }
  }
  return { ok: true as const };
}

function buildStaffUpdate(input: StaffUpdateInput) {
  if (input.action === "change_role") return { role: input.role };
  if (input.action === "suspend") return { status: "suspended" };
  if (input.action === "restore") return { status: "active" };
  if (input.action === "revoke") return { status: "revoked" };
  if (input.action === "activate") return { status: "active" };
  return { mfa_required: input.mfaRequired };
}

function auditActionForUpdate(input: StaffUpdateInput) {
  if (input.action === "change_role") return "command_center_staff_role_changed";
  if (input.action === "suspend") return "command_center_staff_suspended";
  if (input.action === "restore") return "command_center_staff_restored";
  if (input.action === "revoke") return "command_center_staff_revoked";
  if (input.action === "activate") return "command_center_staff_activated";
  return "command_center_staff_mfa_changed";
}

async function countActiveSuperAdmins() {
  const supabase = getCommandCenterAdminClient();
  const { count, error } = await supabase
    .from("staff_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("status", "active");
  if (error) throw error;
  return count || 0;
}

function summarizeStaff(
  row: StaffRow,
  actor: StaffUser,
  inviterMap: Map<string, string>
): StaffDirectoryItem {
  return {
    id: row.id,
    fullName: row.full_name || "Unnamed staff",
    email: row.email,
    role: row.role,
    roleLabel: roleLabel(row.role),
    status: row.status,
    statusLabel: statusLabel(row.status),
    mfaRequired: row.mfa_required,
    lastLogin: formatDateTime(row.last_login_at),
    created: formatDateTime(row.created_at),
    updated: row.updated_at || "",
    invitedBy: row.invited_by ? inviterMap.get(row.invited_by) || "Record no longer available" : "Not available",
    canChangeRole: staffHasCapability(actor, "staff.role.update"),
    canSuspend: canUpdateStatus(actor, row, "suspend"),
    canRestore: canUpdateStatus(actor, row, "restore"),
    canRevoke: canUpdateStatus(actor, row, "revoke"),
    canActivate: canUpdateStatus(actor, row, "activate"),
    canToggleMfa: staffHasCapability(actor, "staff.mfa.update"),
  };
}

function canUpdateStatus(actor: StaffUser, row: StaffRow, action: "suspend" | "restore" | "revoke" | "activate") {
  if (!staffHasCapability(actor, "staff.status.update")) return false;
  if (actor.id === row.id && ["suspend", "revoke"].includes(action)) return false;
  if (actor.role !== "super_admin" && (row.role === "super_admin" || !["suspend", "restore"].includes(action))) {
    return false;
  }
  if (action === "suspend") return row.status === "active" || row.status === "invited";
  if (action === "restore") return row.status === "suspended" || row.status === "revoked";
  if (action === "revoke") return row.status !== "revoked";
  return row.status === "invited";
}

async function loadInviterMap(rows: StaffRow[]) {
  const ids = Array.from(new Set(rows.map((row) => row.invited_by).filter(Boolean) as string[]));
  if (!ids.length) return new Map<string, string>();
  const supabase = getCommandCenterAdminClient();
  const { data, error } = await supabase
    .from("staff_users")
    .select("id, email, full_name")
    .in("id", ids);
  if (error) return new Map<string, string>();
  return new Map(
    ((data || []) as Array<{ id: string; email: string | null; full_name: string | null }>).map((row) => [
      row.id,
      row.full_name || row.email || row.id,
    ])
  );
}

function normalizeFilters(params: StaffDirectoryParams): StaffDirectoryResult["filters"] {
  const role = STAFF_ROLES.includes(params.role as StaffRole) ? (params.role as StaffRole) : "all";
  const status = VALID_STATUSES.includes(params.status as StaffStatus)
    ? (params.status as StaffStatus)
    : "all";
  const mfa = MFA_FILTERS.includes(params.mfa as StaffDirectoryResult["filters"]["mfa"])
    ? (params.mfa as StaffDirectoryResult["filters"]["mfa"])
    : "all";
  return {
    query: String(params.query || "").trim(),
    role,
    status,
    mfa,
  };
}

function buildRoleMatrix() {
  const capabilities = Array.from(
    new Set(Object.values(COMMAND_CENTER_ROLE_CAPABILITIES).flat())
  ).sort();
  return capabilities.map((capability) => ({
    capability,
    roles: Object.fromEntries(
      STAFF_ROLES.map((role) => [
        role,
        COMMAND_CENTER_ROLE_CAPABILITIES[role].includes(capability),
      ])
    ) as Record<StaffRole, boolean>,
  }));
}

function buildPlatformInfo(): Array<[string, string]> {
  return [
    ["Application Environment", process.env.VERCEL_ENV || process.env.NODE_ENV || "Not available"],
    ["Deployment Identifier", maskValue(process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || "")],
    ["Supabase Project", maskSupabaseProject(process.env.NEXT_PUBLIC_SUPABASE_URL || "")],
    ["Build Timestamp", process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || "Not configured"],
    ["Analytics Timezone", "America/Chicago"],
    ["Authentication Model", "Shared Supabase Auth, staff membership required"],
    ["MFA Policy", "Tracked per staff user via mfa_required"],
  ];
}

function snapshotStaff(row: StaffRow) {
  return {
    role: row.role,
    status: row.status,
    mfa_required: row.mfa_required,
    email: row.email,
  };
}

function normalizePage(value: string | undefined) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function roleLabel(role: StaffRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "read_only") return "Read Only";
  return titleCase(role);
}

function statusLabel(status: StaffStatus) {
  return titleCase(status);
}

function statusDescription(status: StaffStatus) {
  if (status === "invited") return "Staff record exists but is not yet active.";
  if (status === "active") return "Can access Command Center when role is valid.";
  if (status === "suspended") return "Temporarily denied Command Center access.";
  return "Access revoked until explicitly restored by a super admin.";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function maskSupabaseProject(value: string) {
  const match = value.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? maskValue(match[1]) : "Not available";
}

function maskValue(value: string) {
  if (!value) return "Not available";
  if (value.length <= 10) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function escapePostgrestLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", "\\,");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
