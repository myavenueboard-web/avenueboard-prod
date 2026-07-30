import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCommandCenterAdminClient,
  recordCommandCenterAudit,
  STAFF_ROLES,
  type StaffUser,
} from "@/lib/command-center/server";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const body = (await request.json().catch(() => ({}))) as {
    event?: "login" | "logout";
  };

  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getCommandCenterAdminClient();
  const { data: staff, error: staffError } = await admin
    .from("staff_users")
    .select("id, auth_user_id, email, full_name, role, status, mfa_required, last_login_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (staffError) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center session staff lookup failed:", staffError);
    }
    return NextResponse.json(
      { ok: false, error: "Unable to verify staff access" },
      { status: 500 }
    );
  }

  if (!staff || staff.status !== "active" || !STAFF_ROLES.includes(staff.role)) {
    await recordCommandCenterAudit({
      staffUserId: staff?.id || null,
      action: "command_center_access_denied",
      reason: staff ? `staff_status_${staff.status}` : "missing_staff_membership",
      metadata: { authUserId: user.id, email: user.email || null },
    });

    return NextResponse.json(
      { ok: false, error: "Staff access required" },
      { status: 403 }
    );
  }

  const event = body.event === "logout" ? "logout" : "login";

  if (event === "login") {
    await admin
      .from("staff_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", staff.id);
  }

  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action:
      event === "login"
        ? "command_center_staff_login"
        : "command_center_staff_logout",
    metadata: { role: staff.role },
  });

  return NextResponse.json({ ok: true, staff: staff as StaffUser });
}
