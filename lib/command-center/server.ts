import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { staffHasCapability } from "@/lib/command-center/permissions";

export type StaffRole =
  | "super_admin"
  | "operations"
  | "support"
  | "payments"
  | "read_only";

export type StaffStatus = "invited" | "active" | "suspended" | "revoked";

export type StaffUser = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  status: StaffStatus;
  mfa_required: boolean;
  last_login_at: string | null;
};

type AuditInput = {
  staffUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "operations",
  "support",
  "payments",
  "read_only",
];

export function getCommandCenterAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getCommandCenterAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async (supabaseCookies) => {
          try {
            supabaseCookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Server Components can read cookies but cannot always persist
            // refreshed auth cookies. Route handlers still persist cookies.
            if (process.env.NODE_ENV === "development") {
              console.warn("Command Center auth cookie refresh skipped:", error);
            }
          }
        },
      },
    }
  );
}

export async function resolveStaffSession() {
  const supabase = await getCommandCenterAuthClient();
  const admin = getCommandCenterAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" as const, staff: null };
  }

  const { data: staff, error } = await admin
    .from("staff_users")
    .select(
      "id, auth_user_id, email, full_name, role, status, mfa_required, last_login_at"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center staff lookup failed:", error);
    }
    return { status: "error" as const, staff: null };
  }

  if (!staff) {
    await recordCommandCenterAudit({
      action: "command_center_access_denied",
      reason: "missing_staff_membership",
      metadata: { authUserId: user.id, email: user.email || null },
    });
    return { status: "not_staff" as const, staff: null };
  }

  if (staff.status !== "active" || !STAFF_ROLES.includes(staff.role)) {
    await recordCommandCenterAudit({
      staffUserId: staff.id,
      action: "command_center_access_denied",
      reason: `staff_status_${staff.status}`,
      metadata: { role: staff.role },
    });
    return { status: "denied" as const, staff: staff as StaffUser };
  }

  return { status: "active" as const, staff: staff as StaffUser };
}

export async function requireCommandCenterStaff() {
  const session = await resolveStaffSession();

  if (session.status === "unauthenticated") {
    redirect("/command-center/login");
  }

  if (session.status !== "active" || !session.staff) {
    redirect("/command-center/login?error=staff_required");
  }

  if (!staffHasCapability(session.staff, "command_center.view")) {
    await recordCommandCenterAudit({
      staffUserId: session.staff.id,
      action: "command_center_access_denied",
      reason: "missing_command_center_view_capability",
      metadata: { role: session.staff.role },
    });
    redirect("/command-center/login?error=staff_required");
  }

  return session.staff;
}

export async function recordCommandCenterAudit(input: AuditInput) {
  try {
    const admin = getCommandCenterAdminClient();
    await admin.from("command_center_audit_logs").insert({
      staff_user_id: input.staffUserId || null,
      action: input.action,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      before_data: input.beforeData || null,
      after_data: input.afterData || null,
      reason: input.reason || null,
      metadata: input.metadata || null,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center audit insert failed:", error);
    }
  }
}

export function formatStaffRole(role: StaffRole) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
