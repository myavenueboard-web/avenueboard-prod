import { NextResponse } from "next/server";
import {
  createSupportTicket,
  detectPriority,
  detectSupportCategory,
  getAuthedSupportUser,
  supportDebugLog,
  supportSupabaseAdmin,
  storeSupportEvent,
  type SupportCategory,
  type SupportPriority,
} from "@/lib/support/supportServer";

type CreateTicketBody = {
  message?: string;
  category?: SupportCategory;
  priority?: SupportPriority;
  tenantAccessId?: string | null;
  propertyId?: string | null;
  leaseId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
};

type UpdateTicketBody = {
  ticketId?: string;
  status?: string;
  closeNote?: string;
};

export async function POST(request: Request) {
  supportDebugLog("Support ticket API route called");

  const { user, profile, error } = await getAuthedSupportUser(request);

  if (error || !user) {
    console.error("Support ticket API auth failed", { error });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateTicketBody;

  try {
    body = (await request.json()) as CreateTicketBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      { error: "Ticket message is required" },
      { status: 400 }
    );
  }

  try {
    supportDebugLog("Support ticket API ticket creation requested", {
      userId: user.id,
      profileId: profile?.id || null,
      payload: {
        message,
        category: body.category || detectSupportCategory(message),
        priority: body.priority || detectPriority(message),
        tenantAccessId: body.tenantAccessId || null,
        propertyId: body.propertyId || null,
        leaseId: body.leaseId || null,
        conversationId: body.conversationId || null,
        metadata: body.metadata || {
          created_from: "support_api",
          original_user_message: message,
          confirmed_issue_summary: message,
        },
      },
    });

    const ticket = await createSupportTicket({
      userId: user.id,
      profileId: profile?.id || null,
      input: {
        category: body.category || detectSupportCategory(message),
        message,
        priority: body.priority || detectPriority(message),
        tenantAccessId: body.tenantAccessId || null,
        propertyId: body.propertyId || null,
        leaseId: body.leaseId || null,
        conversationId: body.conversationId || null,
        metadata: body.metadata,
      },
    });

    await storeSupportEvent({
      ticketId: ticket.id,
      conversationId: body.conversationId || null,
      eventType: "support_case_created",
      metadata: {
        category: ticket.category,
        priority: ticket.priority,
        source: "manual_support_route",
      },
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (ticketError) {
    console.error("Support ticket API creation failed", {
      userId: user.id,
      profileId: profile?.id || null,
      error:
        ticketError instanceof Error
          ? {
              message: ticketError.message,
              stack: ticketError.stack,
            }
          : ticketError,
    });

    return NextResponse.json(
      {
        error:
          ticketError instanceof Error
            ? ticketError.message
            : "Unable to create support ticket",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { user, profile, error } = await getAuthedSupportUser(request);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateTicketBody;

  try {
    body = (await request.json()) as UpdateTicketBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ticketId = body.ticketId?.trim();
  const nextStatus = body.status?.trim().toLowerCase();
  const closeNote = body.closeNote?.trim() || "";
  const databaseClosedStatus = "resolved";

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
  }

  if (nextStatus !== "closed") {
    return NextResponse.json(
      { error: "Only closing support cases is supported from Help Center." },
      { status: 400 }
    );
  }

  supportDebugLog("Support ticket close requested", {
    userId: user.id,
    profileId: profile?.id || null,
    ticketId,
    requestedStatus: nextStatus,
    databaseStatus: databaseClosedStatus,
    hasCloseNote: Boolean(closeNote),
  });

  const { data: existingTicket, error: loadError } = await supportSupabaseAdmin
    .from("support_tickets")
    .select("id, user_id, profile_id, status, metadata")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();

  supportDebugLog("Support ticket close load result", {
    ticketId,
    status: existingTicket?.status || null,
    error: loadError
      ? {
          message: loadError.message,
          code: loadError.code,
          details: loadError.details,
          hint: loadError.hint,
        }
      : null,
  });

  if (loadError) {
    return NextResponse.json(
      { error: loadError.message || "Unable to load support case" },
      { status: 500 }
    );
  }

  if (!existingTicket) {
    return NextResponse.json({ error: "Support case not found" }, { status: 404 });
  }

  if (profile?.id && existingTicket.profile_id && existingTicket.profile_id !== profile.id) {
    return NextResponse.json({ error: "Support case not found" }, { status: 404 });
  }

  if (["closed", "resolved"].includes(String(existingTicket.status || "open").toLowerCase())) {
    return NextResponse.json({
      ok: true,
      ticket: { id: ticketId, status: "closed", updated_at: new Date().toISOString() },
    });
  }

  const updatedAt = new Date().toISOString();
  const existingMetadata =
    existingTicket.metadata &&
    typeof existingTicket.metadata === "object" &&
    !Array.isArray(existingTicket.metadata)
      ? existingTicket.metadata
      : {};
  const nextMetadata = {
    ...existingMetadata,
    ...(closeNote
      ? {
          close_note: closeNote,
          closed_from: "help_center",
          closed_at: updatedAt,
        }
      : {}),
  };
  const { data: updatedRows, error: updateError } = await supportSupabaseAdmin
    .from("support_tickets")
    .update({
      status: databaseClosedStatus,
      updated_at: updatedAt,
      metadata: nextMetadata,
    })
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .select("id, status, updated_at, metadata");

  supportDebugLog("Support ticket close update result", {
    ticketId,
    databaseStatus: databaseClosedStatus,
    rowCount: updatedRows?.length || 0,
    rows: updatedRows || [],
    error: updateError
      ? {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        }
      : null,
  });

  if (updateError || !updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: updateError?.message || "Unable to close support case" },
      { status: 500 }
    );
  }

  const updatedTicket = updatedRows[0];

  await storeSupportEvent({
    ticketId,
    eventType: "support_case_closed",
    metadata: {
      source: "help_center",
      closed_by_user_id: user.id,
      close_note: closeNote || null,
    },
  });

  return NextResponse.json({
    ok: true,
    ticket: { ...updatedTicket, status: "closed" },
  });
}
