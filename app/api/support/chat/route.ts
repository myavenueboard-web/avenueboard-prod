import { NextResponse } from "next/server";
import {
  type AvaPendingTicketDraft,
  detectAvaAction,
  executeAvaAction,
} from "@/lib/support/avaActions";
import {
  buildFallbackReply,
  buildCompetitorReply,
  detectSupportCategory,
  getAuthedSupportUser,
  getOrCreateSupportConversation,
  isCompetitorQuestion,
  isOutOfScopeMessage,
  logAvaResponseReview,
  storeSupportEvent,
  storeSupportMessage,
  supportSystemPrompt,
  type ChatMessageInput,
  type TenantSupportContext,
} from "@/lib/support/supportServer";

type ChatRequestBody = {
  message?: string;
  messages?: ChatMessageInput[];
  context?: TenantSupportContext;
  conversationId?: string | null;
  pendingTicketDraft?: AvaPendingTicketDraft | null;
};

type OpenAIChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: Request) {
  const { user, profile, error } = await getAuthedSupportUser(request);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const authedUser = user;
  const userQuestion = message;
  let conversationId: string | null = null;

  async function recordAvaAnswer(
    response: string,
    feedbackFlag = "unreviewed",
    metadata?: Record<string, unknown>
  ) {
    await logAvaResponseReview({
      userId: authedUser.id,
      profileId: profile?.id || null,
      conversationId,
      question: userQuestion,
      response,
      feedbackFlag,
      metadata: {
        currentPage: body.context?.currentPage || "tenant_dashboard",
        productCapabilities: body.context?.productCapabilities || null,
        tenantData: {
          leaseStatus: body.context?.leaseStatus || null,
          monthlyRent: body.context?.monthlyRent || null,
          notesEnabled: body.context?.notesEnabled ?? null,
          documentsCount: body.context?.documentsCount ?? null,
        },
        ...metadata,
      },
    });
  }

  try {
    const conversation = await getOrCreateSupportConversation({
      userId: user.id,
      profileId: profile?.id || null,
      context: body.context,
      conversationId: body.conversationId || null,
    });

    conversationId = conversation.id;

    await storeSupportMessage({
      conversationId,
      role: "user",
      message,
      metadata: {
        source: "tenant_widget",
        category: detectSupportCategory(message),
      },
    });
  } catch (conversationError) {
    console.error("Ava conversation setup error", conversationError);
  }

  if (isOutOfScopeMessage(message)) {
    const reply =
      "I’m here to help with AvenueBoard accounts, leases, payments, documents, support requests, and platform features.";

    if (conversationId) {
      await storeSupportMessage({
        conversationId,
        role: "assistant",
        message: reply,
        metadata: { outOfScope: true },
      });
    }
    await recordAvaAnswer(reply, "unreviewed", { outOfScope: true });

    return NextResponse.json({
      ok: true,
      reply,
      ticket: null,
      conversationId,
    });
  }

  if (isCompetitorQuestion(message)) {
    const reply = buildCompetitorReply();

    if (conversationId) {
      await storeSupportMessage({
        conversationId,
        role: "assistant",
        message: reply,
        metadata: { competitorQuestion: true },
      });
    }
    await recordAvaAnswer(reply, "unreviewed", { competitorQuestion: true });

    return NextResponse.json({
      ok: true,
      reply,
      ticket: null,
      conversationId,
    });
  }

  const action = detectAvaAction(
    message,
    body.context,
    body.pendingTicketDraft || null
  );

  if (action) {
    console.log("Ava chat action requested", {
      action,
      currentTicketState: body.pendingTicketDraft?.status || "normal",
      userId: authedUser.id,
      profileId: profile?.id || null,
      payload: {
        message,
        tenantAccessId: body.context?.tenantAccessId || null,
        propertyId: body.context?.propertyId || null,
        leaseId: body.context?.leaseId || null,
        conversationId,
      },
      pendingTicketDraft: body.pendingTicketDraft || null,
    });

    try {
      const result = await executeAvaAction({
        action,
        message,
        messages: body.messages,
        userId: authedUser.id,
        profileId: profile?.id || null,
        conversationId,
        context: body.context,
        pendingTicketDraft: body.pendingTicketDraft || null,
      });

      if (conversationId) {
        await storeSupportEvent({
          conversationId,
          eventType: "ava_action_executed",
          metadata: {
            action: result.action,
            pendingTicketDraft: result.pendingTicketDraft || null,
            stateTransition: result.metadata?.stateTransition || null,
            ...(result.metadata || {}),
          },
        });
        await storeSupportMessage({
          conversationId,
          role: "assistant",
          message: result.reply,
          metadata: {
            action: result.action,
            ...(result.metadata || {}),
          },
        });
      }
      await recordAvaAnswer(result.reply, "unreviewed", {
        action: result.action,
        ...(result.metadata || {}),
      });

      return NextResponse.json({
        ok: true,
        reply: result.reply,
        ticket: result.ticket || null,
        action: result.action,
        pendingTicketDraft: result.pendingTicketDraft ?? null,
        conversationId,
      });
    } catch (actionError) {
      console.error("Ava action execution error", {
        action,
        currentTicketState: body.pendingTicketDraft?.status || "normal",
        userId: authedUser.id,
        profileId: profile?.id || null,
        payload: {
          message,
          tenantAccessId: body.context?.tenantAccessId || null,
          propertyId: body.context?.propertyId || null,
          leaseId: body.context?.leaseId || null,
          conversationId,
        },
        pendingTicketDraft: body.pendingTicketDraft || null,
        error:
          actionError instanceof Error
            ? {
                message: actionError.message,
                stack: actionError.stack,
              }
            : actionError,
      });
      const reply =
        action === "confirm_support_ticket" ||
        action === "prepare_support_ticket"
          ? "I couldn’t create a support case right now. Please email support@avenueboard.com."
          : "I couldn’t retrieve that information right now. Please try again in a moment, or ask me to create a support case if you need our team to review it.";

      if (conversationId) {
        await storeSupportEvent({
          conversationId,
          eventType: "ava_action_failed",
          metadata: {
            action,
          },
        });
        await storeSupportMessage({
          conversationId,
          role: "assistant",
          message: reply,
          metadata: {
            action,
            actionFailed: true,
          },
        });
      }
      await recordAvaAnswer(reply, "needs_prompt_tuning", {
        action,
        actionFailed: true,
      });

      return NextResponse.json({
        ok: true,
        reply,
        ticket: null,
        action,
        pendingTicketDraft: body.pendingTicketDraft || null,
        conversationId,
      });
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey) {
    const reply = buildFallbackReply(message, body.context);

    if (conversationId) {
      await storeSupportMessage({
        conversationId,
        role: "assistant",
        message: reply,
        metadata: { provider: "fallback" },
      });
    }
    await recordAvaAnswer(reply, "unreviewed", { provider: "fallback" });

    return NextResponse.json({
      ok: true,
      reply,
      ticket: null,
      conversationId,
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SUPPORT_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: supportSystemPrompt(body.context),
          },
          ...(body.messages || []).slice(-8).map((item) => ({
            role: item.role,
            content: item.content,
          })),
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const result = (await response.json()) as OpenAIChatCompletion;
    const reply = result.choices?.[0]?.message?.content?.trim();
    const assistantReply = reply || buildFallbackReply(message, body.context);

    if (conversationId) {
      await storeSupportMessage({
        conversationId,
        role: "assistant",
        message: assistantReply,
        metadata: { provider: reply ? "openai" : "fallback" },
      });
    }
    await recordAvaAnswer(assistantReply, "unreviewed", {
      provider: reply ? "openai" : "fallback",
    });

    return NextResponse.json({
      ok: true,
      reply: assistantReply,
      ticket: null,
      conversationId,
    });
  } catch (chatError) {
    console.error("Ava chat error", chatError);
    const reply = buildFallbackReply(message, body.context);

    if (conversationId) {
      await storeSupportMessage({
        conversationId,
        role: "assistant",
        message: reply,
        metadata: { provider: "fallback", error: true },
      });
    }
    await recordAvaAnswer(reply, "needs_prompt_tuning", {
      provider: "fallback",
      error: true,
    });

    return NextResponse.json({
      ok: true,
      reply,
      ticket: null,
      conversationId,
    });
  }
}
