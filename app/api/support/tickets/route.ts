import { NextResponse } from "next/server";
import {
  createSupportTicket,
  detectPriority,
  detectSupportCategory,
  getAuthedSupportUser,
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

export async function POST(request: Request) {
  console.log("Support ticket API route called");

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
    console.log("Support ticket API ticket creation requested", {
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
