import { NextResponse } from "next/server";
import { resolveStaffSession, STAFF_ROLES } from "@/lib/command-center/server";
import { updateStaffAccess } from "@/lib/command-center/settings";
import type { StaffRole } from "@/lib/command-center/server";

type StaffUpdateBody = {
  staffUserId?: string;
  action?: "change_role" | "suspend" | "restore" | "revoke" | "activate" | "toggle_mfa";
  role?: StaffRole;
  mfaRequired?: boolean;
  reason?: string;
  expectedUpdatedAt?: string | null;
};

export async function PATCH(request: Request) {
  const session = await resolveStaffSession();
  if (session.status !== "active" || !session.staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as StaffUpdateBody;
  if (!body.staffUserId || !body.action) {
    return NextResponse.json({ ok: false, error: "Invalid staff update" }, { status: 400 });
  }

  try {
    const input = normalizeUpdateInput(body);
    if (!input) {
      return NextResponse.json({ ok: false, error: "Invalid staff update" }, { status: 400 });
    }

    const result = await updateStaffAccess(session.staff, input);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center staff update failed:", error);
    }
    return NextResponse.json({ ok: false, error: "Unable to update staff access" }, { status: 500 });
  }
}

function normalizeUpdateInput(body: StaffUpdateBody) {
  const base = {
    targetStaffUserId: body.staffUserId!,
    reason: String(body.reason || "").trim(),
    expectedUpdatedAt: body.expectedUpdatedAt || null,
  };

  if (body.action === "change_role") {
    if (!STAFF_ROLES.includes(body.role as StaffRole)) return null;
    return { ...base, action: "change_role" as const, role: body.role as StaffRole };
  }
  if (body.action === "toggle_mfa") {
    return { ...base, action: "toggle_mfa" as const, mfaRequired: Boolean(body.mfaRequired) };
  }
  if (body.action === "suspend") return { ...base, action: "suspend" as const };
  if (body.action === "restore") return { ...base, action: "restore" as const };
  if (body.action === "revoke") return { ...base, action: "revoke" as const };
  if (body.action === "activate") return { ...base, action: "activate" as const };
  return null;
}
