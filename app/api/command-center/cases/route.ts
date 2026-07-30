import { NextResponse } from "next/server";
import {
  getCommandCenterAdminClient,
  recordCommandCenterAudit,
  resolveStaffSession,
} from "@/lib/command-center/server";
import {
  canUseCaseAction,
  getCaseForMutation,
  getCasesDirectory,
  isValidStatusTransition,
  normalizeCasePriority,
  normalizeCaseStatus,
  type CasePriority,
  type CaseStatus,
} from "@/lib/command-center/cases";

type CaseUpdateBody = {
  caseId?: string;
  action?: string;
  assignedStaffUserId?: string | null;
  status?: CaseStatus;
  priority?: CasePriority;
  resolutionSummary?: string;
};

export async function GET() {
  const session = await resolveStaffSession();
  if (session.status !== "active" || !session.staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [open, inProgress] = await Promise.all([
      getCasesDirectory(session.staff, { status: "new", page: "1", pageSize: "25" }),
      getCasesDirectory(session.staff, { status: "in_progress", page: "1", pageSize: "25" }),
    ]);

    return NextResponse.json({
      ok: true,
      counts: {
        open: open.total,
        inProgress: inProgress.total,
        actionable: open.total + inProgress.total,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center case navigation counts failed:", error);
    }
    return NextResponse.json({ ok: false, error: "Unable to load case counts" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await resolveStaffSession();
  if (session.status !== "active" || !session.staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CaseUpdateBody;
  if (!body.caseId || !body.action) {
    return NextResponse.json({ ok: false, error: "Invalid case update" }, { status: 400 });
  }

  const existing = await getCaseForMutation(body.caseId);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  try {
    if (body.action === "assign") {
      return await updateAssignment(session.staff, existing, body.assignedStaffUserId || null);
    }
    if (body.action === "status") {
      return await updateStatus(session.staff, existing, body.status);
    }
    if (body.action === "priority") {
      return await updatePriority(session.staff, existing, body.priority);
    }
    if (body.action === "resolve") {
      return await resolveCase(session.staff, existing, body.resolutionSummary || "");
    }
    if (body.action === "reopen") {
      return await reopenCase(session.staff, existing);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center case update failed:", error);
    }
    return NextResponse.json({ ok: false, error: "Unable to update case" }, { status: 500 });
  }

  return NextResponse.json({ ok: false, error: "Unsupported case action" }, { status: 400 });
}

async function updateAssignment(
  staff: NonNullable<Awaited<ReturnType<typeof resolveStaffSession>>["staff"]>,
  existing: Awaited<ReturnType<typeof getCaseForMutation>>,
  assignedStaffUserId: string | null
) {
  if (!existing || !canUseCaseAction(staff, "cases.assign", existing)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const admin = getCommandCenterAdminClient();
  if (assignedStaffUserId) {
    const { data: assignee, error } = await admin
      .from("staff_users")
      .select("id, status")
      .eq("id", assignedStaffUserId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!assignee) {
      return NextResponse.json({ ok: false, error: "Assignee is not active" }, { status: 400 });
    }
  }

  const before = existing.assigned_staff_user_id || null;
  const { error } = await admin
    .from("support_tickets")
    .update({ assigned_staff_user_id: assignedStaffUserId })
    .eq("id", existing.id);
  if (error) throw error;

  await recordCaseEvent(existing.id, "assignment_changed", {
    before,
    after: assignedStaffUserId,
  });
  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: "command_center_case_assignment_changed",
    targetType: "case",
    targetId: existing.id,
    metadata: { before, after: assignedStaffUserId },
  });

  return NextResponse.json({ ok: true });
}

async function updateStatus(
  staff: NonNullable<Awaited<ReturnType<typeof resolveStaffSession>>["staff"]>,
  existing: Awaited<ReturnType<typeof getCaseForMutation>>,
  nextStatus: CaseStatus | undefined
) {
  if (!existing || !nextStatus || !canUseCaseAction(staff, "cases.status.update", existing)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const current = normalizeCaseStatus(existing.status);
  if (!isValidStatusTransition(current, nextStatus, staff)) {
    return NextResponse.json({ ok: false, error: "Invalid status transition" }, { status: 400 });
  }

  const admin = getCommandCenterAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ status: nextStatus })
    .eq("id", existing.id);
  if (error) throw error;

  await recordCaseEvent(existing.id, "status_changed", { before: current, after: nextStatus });
  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: "command_center_case_status_changed",
    targetType: "case",
    targetId: existing.id,
    metadata: { before: current, after: nextStatus },
  });

  return NextResponse.json({ ok: true });
}

async function updatePriority(
  staff: NonNullable<Awaited<ReturnType<typeof resolveStaffSession>>["staff"]>,
  existing: Awaited<ReturnType<typeof getCaseForMutation>>,
  nextPriority: CasePriority | undefined
) {
  if (!existing || !nextPriority || !canUseCaseAction(staff, "cases.priority.update", existing)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const before = normalizeCasePriority(existing.priority);
  const admin = getCommandCenterAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ priority: nextPriority })
    .eq("id", existing.id);
  if (error) throw error;

  await recordCaseEvent(existing.id, "priority_changed", { before, after: nextPriority });
  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: "command_center_case_priority_changed",
    targetType: "case",
    targetId: existing.id,
    metadata: { before, after: nextPriority },
  });

  return NextResponse.json({ ok: true });
}

async function resolveCase(
  staff: NonNullable<Awaited<ReturnType<typeof resolveStaffSession>>["staff"]>,
  existing: Awaited<ReturnType<typeof getCaseForMutation>>,
  resolutionSummary: string
) {
  if (!existing || !canUseCaseAction(staff, "cases.resolve", existing)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const summary = resolutionSummary.trim();
  if (!summary) {
    return NextResponse.json({ ok: false, error: "Resolution summary required" }, { status: 400 });
  }

  const before = normalizeCaseStatus(existing.status);
  const admin = getCommandCenterAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({
      status: "resolved",
      resolution_summary: summary,
      resolved_by_staff_user_id: staff.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw error;

  await recordCaseEvent(existing.id, "case_resolved", { before, after: "resolved" });
  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: "command_center_case_resolved",
    targetType: "case",
    targetId: existing.id,
    metadata: { before, after: "resolved" },
  });

  return NextResponse.json({ ok: true });
}

async function reopenCase(
  staff: NonNullable<Awaited<ReturnType<typeof resolveStaffSession>>["staff"]>,
  existing: Awaited<ReturnType<typeof getCaseForMutation>>
) {
  if (!existing || !canUseCaseAction(staff, "cases.reopen", existing)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const current = normalizeCaseStatus(existing.status);
  if (!isValidStatusTransition(current, "open", staff)) {
    return NextResponse.json({ ok: false, error: "Invalid status transition" }, { status: 400 });
  }

  const admin = getCommandCenterAdminClient();
  const { error } = await admin
    .from("support_tickets")
    .update({ status: "open", resolved_at: null, resolved_by_staff_user_id: null })
    .eq("id", existing.id);
  if (error) throw error;

  await recordCaseEvent(existing.id, "case_reopened", { before: current, after: "open" });
  await recordCommandCenterAudit({
    staffUserId: staff.id,
    action: "command_center_case_reopened",
    targetType: "case",
    targetId: existing.id,
    metadata: { before: current, after: "open" },
  });

  return NextResponse.json({ ok: true });
}

async function recordCaseEvent(
  caseId: string,
  eventType: string,
  metadata: Record<string, unknown>
) {
  const admin = getCommandCenterAdminClient();
  await admin
    .from("support_ticket_events")
    .insert({ ticket_id: caseId, event_type: eventType, metadata })
    .throwOnError();
}
