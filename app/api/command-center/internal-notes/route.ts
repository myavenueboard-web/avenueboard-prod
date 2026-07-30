import { NextResponse } from "next/server";
import {
  getCommandCenterAdminClient,
  recordCommandCenterAudit,
  resolveStaffSession,
} from "@/lib/command-center/server";
import { staffHasCapability } from "@/lib/command-center/permissions";

export async function POST(request: Request) {
  const staff = await getApiStaff();
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    targetType?: string;
    targetId?: string;
    note?: string;
  };
  const note = String(body.note || "").trim();

  if (!isSupportedTarget(body.targetType) || !body.targetId || !note) {
    return NextResponse.json({ ok: false, error: "Invalid note" }, { status: 400 });
  }

  const createCapability = noteCapability(body.targetType, "create");
  if (!staffHasCapability(staff, createCapability)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const admin = getCommandCenterAdminClient();
  const { data, error } = await admin
    .from("command_center_internal_notes")
    .insert({
      target_type: body.targetType,
      target_id: body.targetId,
      staff_user_id: staff.id,
      note,
    })
    .select("id")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center note create failed:", error);
    }
    return NextResponse.json({ ok: false, error: "Unable to save note" }, { status: 500 });
  }

  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: noteAuditAction(body.targetType, "created"),
    targetType: body.targetType,
    targetId: body.targetId,
    metadata: { noteId: data.id },
  });

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const staff = await getApiStaff();
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    note?: string;
  };
  const note = String(body.note || "").trim();

  if (!body.id || !note) {
    return NextResponse.json({ ok: false, error: "Invalid note" }, { status: 400 });
  }

  const admin = getCommandCenterAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("command_center_internal_notes")
    .select("id, target_type, target_id, note")
    .eq("id", body.id)
    .maybeSingle();

  if (existingError) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center note lookup failed:", existingError);
    }
    return NextResponse.json({ ok: false, error: "Unable to update note" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Note not found" }, { status: 404 });
  }

  const editCapability = noteCapability(existing.target_type, "edit");
  if (!staffHasCapability(staff, editCapability)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("command_center_internal_notes")
    .update({ note })
    .eq("id", body.id);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center note update failed:", error);
    }
    return NextResponse.json({ ok: false, error: "Unable to update note" }, { status: 500 });
  }

  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: noteAuditAction(existing.target_type, "edited"),
    targetType: existing.target_type,
    targetId: existing.target_id,
    metadata: { noteId: existing.id },
  });

  return NextResponse.json({ ok: true });
}

async function getApiStaff() {
  const session = await resolveStaffSession();
  return session.status === "active" ? session.staff : null;
}

function isSupportedTarget(value: unknown): value is "profile" | "property" | "payment" | "case" {
  return value === "profile" || value === "property" || value === "payment" || value === "case";
}

function noteCapability(
  targetType: string,
  action: "create" | "edit"
) {
  if (targetType === "property") return `properties.notes.${action}` as const;
  if (targetType === "payment") return `payments.notes.${action}` as const;
  if (targetType === "case") return `cases.notes.${action}` as const;
  return `people.notes.${action}` as const;
}

function noteAuditAction(targetType: string, action: "created" | "edited") {
  if (targetType === "property") return `command_center_property_note_${action}`;
  if (targetType === "payment") return `command_center_payment_note_${action}`;
  if (targetType === "case") return `command_center_case_note_${action}`;
  return `command_center_internal_note_${action}`;
}
