import { createClient } from "@supabase/supabase-js";
import { avenueBoardProductKnowledge } from "@/lib/support/avenueBoardKnowledge";

export type SupportCategory =
  | "payment_issue"
  | "lease_issue"
  | "document_issue"
  | "account_access"
  | "notes_issue"
  | "rent_question"
  | "technical_issue"
  | "general_support";

export type SupportPriority = "low" | "normal" | "high" | "urgent";

export type TenantSupportContext = {
  userName?: string | null;
  tenantName?: string | null;
  role?: string | null;
  tenantStatus?: string | null;
  tenantAccessId?: string | null;
  propertyId?: string | null;
  leaseId?: string | null;
  propertyLabel?: string | null;
  leaseStatus?: string | null;
  rentAmount?: string | null;
  dueDate?: string | null;
  paymentStatus?: string | null;
  availableFeatures?: string[] | null;
  currentPage?: string | null;
  productCapabilities?: Record<string, boolean> | null;
  monthlyRent?: number | null;
  notesEnabled?: boolean | null;
  documentsCount?: number | null;
};

export type ChatMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export type SupportTicketInput = {
  category: SupportCategory;
  message: string;
  priority?: SupportPriority;
  tenantAccessId?: string | null;
  propertyId?: string | null;
  leaseId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
};

type ProfileRow = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
};

type TenantAccessRow = {
  id: string;
  tenant_profile_id: string;
  property_id: string | null;
  lease_id: string | null;
  status?: string | null;
  invite_status?: string | null;
};

type SupportTicketRow = {
  id: string;
  ticket_number: string;
  category: SupportCategory;
  status: string;
  priority: SupportPriority;
  created_at: string;
};

type SupportConversationRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

type SupportSupabaseError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export const supportSupabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supportSupabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function describeSupportError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const typedError = error as SupportSupabaseError;

  return {
    message: typedError.message || "Unknown support error",
    code: typedError.code || null,
    details: typedError.details || null,
    hint: typedError.hint || null,
  };
}

export async function getAuthedSupportUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) return { user: null, profile: null, error: "Unauthorized" };

  const { data, error } = await supportSupabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, profile: null, error: "Unauthorized" };
  }

  const { data: profile } = await supportSupabaseAdmin
    .from("profiles")
    .select("id, user_id, email, display_name")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    user: data.user as SupabaseUser,
    profile: (profile || null) as ProfileRow | null,
    error: null,
  };
}

export function detectSupportCategory(message: string): SupportCategory {
  const text = message.toLowerCase();

  if (
    /payment failed|failed payment|payment unsuccessful|charge|charged|duplicate|card|bank|autopay|refund/.test(
      text
    )
  ) {
    return "payment_issue";
  }

  if (/rent|amount|due|balance/.test(text)) {
    return "rent_question";
  }

  if (/lease|agreement|document|pdf|file|download|upload/.test(text)) {
    return text.includes("lease") && !/document|pdf|file|download|upload/.test(text)
      ? "lease_issue"
      : "document_issue";
  }

  if (/login|signup|sign up|invite|account|password|access/.test(text)) {
    return "account_access";
  }

  if (/note|notes|shared note|private note/.test(text)) {
    return "notes_issue";
  }

  if (/bug|error|broken|not working|technical|screen|page|button/.test(text)) {
    return "technical_issue";
  }

  return "general_support";
}

export function shouldCreateTicket(message: string) {
  return /payment failed|failed payment|payment unsuccessful|unsuccessful payment|duplicate charge|charged twice|double charge|cannot access lease|can't access lease|cant access lease|cannot download|can't download|cant download|locked out|account issue|human help|talk to a person|speak with a human|support case|open support case|support ticket|create a ticket|create support ticket|contact support|report an issue|need human|real person|refund|unresolved|not resolved/.test(
    message.toLowerCase()
  );
}

export function isOutOfScopeMessage(message: string) {
  return /politics|medical|doctor|diagnose|diagnosis|medicine|tax advice|legal advice|lawsuit|code this|write code|javascript|python|stock pick|sports score|recipe|weather forecast/.test(
    message.toLowerCase()
  );
}

export function isCompetitorQuestion(message: string) {
  return /competitor|better platform|better app|alternative|compare|vs\.?|versus|should i use/.test(
    message.toLowerCase()
  );
}

export function detectPriority(message: string): SupportPriority {
  const text = message.toLowerCase();

  if (/payment failed|failed payment|duplicate charge|charged twice|double charge|locked out|account locked|cannot access lease|can't access lease|incorrect rent|wrong rent|rent amount looks wrong/.test(text)) {
    return "high";
  }

  if (/feedback|suggestion|idea/.test(text)) {
    return "low";
  }

  return "normal";
}

export function buildFallbackReply(
  message: string,
  context?: TenantSupportContext
) {
  const category = detectSupportCategory(message);
  const property = context?.propertyLabel ? ` for ${context.propertyLabel}` : "";
  const supportsSharedNotes =
    context?.productCapabilities?.shared_notes ??
    avenueBoardProductKnowledge.capabilities.shared_notes.supported;

  if (category === "payment_issue" || category === "rent_question") {
    return `I can help with that${property}. In your tenant portal, check the payment area for current status, due date, and payment method details. I can explain what you’re seeing, but I can’t promise refunds, reversals, or payment outcomes. If it needs review, I’ll create a support case for the AvenueBoard team.`;
  }

  if (category === "lease_issue" || category === "document_issue") {
    return `I can help you find lease documents${property}. In the tenant portal, use Property Documents for uploaded files and Lease Status for lease details. If a document is missing or will not open, I’ll create a support case for review.`;
  }

  if (/note|notes|shared note|private note/.test(message.toLowerCase())) {
    if (supportsSharedNotes) {
      return `Shared Notes are supported in the tenant dashboard. Private notes stay visible only to the tenant who created them, while shared notes for the same lease/property can be visible between the tenant and landlord. You can check the Notes section on the tenant dashboard.`;
    }

    return `I’m not fully sure whether notes are enabled for this account. Please check the Notes section on the tenant dashboard, or I can create a support case if it is missing.`;
  }

  if (category === "account_access") {
    return `I can help with account or invite access. First, confirm you’re signed in with the same email that received the invitation. If your lease still does not appear, I’ll create a support case so the team can review your access.`;
  }

  return "I’m having trouble reaching Ava right now. Please try again in a moment.";
}

export function buildCompetitorReply() {
  return "AvenueBoard is built to keep rental operations organized in one place: lease records, tenant access, property documents, shared notes, payment visibility, support cases, Avenue Perks, and eligible credit-building opportunities when enabled. I can explain how those pieces work in AvenueBoard, but I won’t recommend another platform or claim one is better.";
}

async function validateTenantContext(
  profileId: string | null,
  input: SupportTicketInput
) {
  if (!profileId || !input.tenantAccessId) return input;

  const { data } = await supportSupabaseAdmin
    .from("tenant_access")
    .select("id, tenant_profile_id, property_id, lease_id, status, invite_status")
    .eq("id", input.tenantAccessId)
    .eq("tenant_profile_id", profileId)
    .maybeSingle();

  const access = (data || null) as TenantAccessRow | null;

  if (!access) {
    return {
      ...input,
      tenantAccessId: null,
      propertyId: null,
      leaseId: null,
    };
  }

  return {
    ...input,
    propertyId: access.property_id || input.propertyId || null,
    leaseId: access.lease_id || input.leaseId || null,
  };
}

export async function createSupportTicket({
  userId,
  profileId,
  input,
}: {
  userId: string;
  profileId: string | null;
  input: SupportTicketInput;
}) {
  const safeInput = await validateTenantContext(profileId, input);
  const payload: Record<string, unknown> = {
    user_id: userId,
    profile_id: profileId,
    tenant_access_id: safeInput.tenantAccessId || null,
    property_id: safeInput.propertyId || null,
    lease_id: safeInput.leaseId || null,
    category: safeInput.category || detectSupportCategory(safeInput.message),
    message: safeInput.message,
    priority: safeInput.priority || detectPriority(safeInput.message),
    status: "open",
  };

  if (safeInput.conversationId) {
    payload.conversation_id = safeInput.conversationId;
  }

  if (safeInput.metadata) {
    payload.metadata = safeInput.metadata;
  }

  console.log("Ticket creation requested", {
    userId,
    profileId,
    payload,
  });

  const { data, error } = await supportSupabaseAdmin
    .from("support_tickets")
    .insert(payload)
    .select("id, ticket_number, category, status, priority, created_at")
    .single();

  console.log("Support ticket Supabase response", {
    data,
    error: error ? describeSupportError(error) : null,
  });

  if (error || !data) {
    const details = describeSupportError(error);
    console.error("Support ticket insert failed", {
      userId,
      profileId,
      payload,
      error: details,
    });

    throw new Error(
      [
        details.message || "Unable to create support ticket",
        details.code ? `code=${details.code}` : null,
        details.details ? `details=${details.details}` : null,
        details.hint ? `hint=${details.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  console.log("Support ticket insert succeeded", {
    userId,
    ticketId: data.id,
    ticketNumber: data.ticket_number,
  });

  return data as SupportTicketRow;
}

export async function getOrCreateSupportConversation({
  userId,
  profileId,
  context,
  conversationId,
}: {
  userId: string;
  profileId: string | null;
  context?: TenantSupportContext;
  conversationId?: string | null;
}) {
  if (conversationId) {
    const { data } = await supportSupabaseAdmin
      .from("support_conversations")
      .select(
        "id, user_id, profile_id, tenant_access_id, property_id, lease_id, status, created_at, updated_at"
      )
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) return data as SupportConversationRow;
  }

  const safeContext = await validateTenantContext(profileId, {
    category: "general_support",
    message: "Support conversation started",
    tenantAccessId: context?.tenantAccessId || null,
    propertyId: context?.propertyId || null,
    leaseId: context?.leaseId || null,
  });

  const { data, error } = await supportSupabaseAdmin
    .from("support_conversations")
    .insert({
      user_id: userId,
      profile_id: profileId,
      tenant_access_id: safeContext.tenantAccessId || null,
      property_id: safeContext.propertyId || null,
      lease_id: safeContext.leaseId || null,
      status: "open",
    })
    .select(
      "id, user_id, profile_id, tenant_access_id, property_id, lease_id, status, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to create support conversation");
  }

  return data as SupportConversationRow;
}

export async function storeSupportMessage({
  conversationId,
  role,
  message,
  metadata,
}: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supportSupabaseAdmin
    .from("support_conversation_messages")
    .insert({
      conversation_id: conversationId,
      role,
      message,
      metadata: metadata || {},
    });

  if (error) {
    console.error("Ava conversation message storage error", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export async function storeSupportEvent({
  ticketId,
  conversationId,
  eventType,
  metadata,
}: {
  ticketId?: string | null;
  conversationId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supportSupabaseAdmin
    .from("support_ticket_events")
    .insert({
      ticket_id: ticketId || null,
      conversation_id: conversationId || null,
      event_type: eventType,
      metadata: metadata || {},
    });

  if (error) {
    console.error("Ava support event storage error", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export async function logAvaResponseReview({
  userId,
  profileId,
  conversationId,
  question,
  response,
  feedbackFlag,
  metadata,
}: {
  userId: string;
  profileId?: string | null;
  conversationId?: string | null;
  question: string;
  response: string;
  feedbackFlag?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supportSupabaseAdmin
    .from("ava_response_reviews")
    .insert({
      user_id: userId,
      profile_id: profileId || null,
      conversation_id: conversationId || null,
      question,
      response,
      feedback_flag: feedbackFlag || "unreviewed",
      metadata: metadata || {},
    });

  if (error) {
    console.error("Ava response review log error", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export function buildEscalationMessage(ticketNumber: string) {
  return `I've created support case ${ticketNumber} with the details you provided. Our team will review it and get back to you within 2–3 business days.`;
}

export function buildConversationSummary(
  messages: ChatMessageInput[] | undefined,
  latestMessage: string
) {
  const history = (messages || [])
    .slice(-8)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  return [history, `user: ${latestMessage}`].filter(Boolean).join("\n");
}

export function supportSystemPrompt(context?: TenantSupportContext) {
  const availableFeatures = context?.availableFeatures?.length
    ? context.availableFeatures.join(", ")
    : "Tenant portal, lease documents, payment history, property documents, notes, support cases, Avenue Perks, and eligible credit-building features when enabled";
  const capabilities = {
    shared_notes:
      context?.productCapabilities?.shared_notes ??
      avenueBoardProductKnowledge.capabilities.shared_notes.supported,
    documents:
      context?.productCapabilities?.documents ??
      avenueBoardProductKnowledge.capabilities.documents.supported,
    lease_status:
      context?.productCapabilities?.lease_status ??
      avenueBoardProductKnowledge.capabilities.leases.supported,
    credit_building:
      context?.productCapabilities?.credit_building ??
      avenueBoardProductKnowledge.capabilities.credit_building.supported,
    avenue_perks:
      context?.productCapabilities?.avenue_perks ??
      avenueBoardProductKnowledge.capabilities.avenue_perks.supported,
    support_tickets:
      context?.productCapabilities?.support_tickets ??
      avenueBoardProductKnowledge.capabilities.support_workflow.supported,
    payments:
      context?.productCapabilities?.payments ??
      avenueBoardProductKnowledge.capabilities.payments.supported,
  };
  const productKnowledge = {
    product: avenueBoardProductKnowledge.product,
    positioning: avenueBoardProductKnowledge.positioning,
    current_page:
      context?.currentPage || ("tenant_dashboard" as keyof typeof avenueBoardProductKnowledge.pages),
    page:
      avenueBoardProductKnowledge.pages[
        (context?.currentPage as keyof typeof avenueBoardProductKnowledge.pages) ||
          "tenant_dashboard"
      ] || avenueBoardProductKnowledge.pages.tenant_dashboard,
    capabilities: avenueBoardProductKnowledge.capabilities,
    competitorPositioning: avenueBoardProductKnowledge.competitorPositioning,
  };

  return `
You are Ava, the built-in AvenueBoard assistant. You represent AvenueBoard with a calm, professional, helpful, and concise voice.

Do not say you are an AI assistant. Refer to yourself as Ava.

You help AvenueBoard users with rent payments, leases, lease documents, receipts, tenant onboarding, tenant invitations, account access, dashboard navigation, support tickets, payment setup, payment status, rent reminders, AvenueBoard features, AvenueBoard benefits, credit reporting when enabled, rewards/perks when enabled, and property information available in the tenant portal.

Rules:
- You may engage in brief, natural small talk, including greetings, thanks, acknowledgements, and simple conversational questions like "How are you?"
- For small talk, respond warmly and concisely, then naturally guide back toward AvenueBoard help when appropriate.
- Stay focused on AvenueBoard after brief small talk.
- Only reject clearly unrelated topics such as politics, medical advice, stock trading, programming help, homework, or unrelated world knowledge. If asked about those, reply exactly: "I’m here to help with AvenueBoard accounts, leases, payments, documents, support requests, and platform features."
- If asked about competitors or "a better platform", do not use a fallback response, do not recommend competitors, and do not say another platform is better. Explain AvenueBoard strengths and supported features neutrally.
- Never guess product capabilities. Use the structured capability context and product knowledge below. If capability information is unavailable or unclear, say you are unsure and suggest where the user can verify it in AvenueBoard.
- Do not invent functionality, policies, statuses, refunds, payments, document permissions, or notes behavior.
- Give clear navigation steps when useful, such as which dashboard section to open.
- Keep answers natural, short, helpful, and professional.
- Avoid robotic wording, repetitive support-bot language, and repeatedly listing everything Ava can help with.
- Do not make legal, financial, tax, refund, chargeback, reversal, or payment outcome promises.
- Do not claim a payment succeeded or failed unless the user context explicitly says so.
- If the issue sounds serious, unresolved, or needs human review, say additional review is needed. The application may create a support case automatically.
- Do not claim a support case was created unless the action result says a ticket was created.
- If a support case needs more detail, ask for a concise issue description before creation.
- Do not ask the user to complete a long form or questionnaire.

Structured product capabilities:
${JSON.stringify(capabilities, null, 2)}

AvenueBoard product knowledge:
${JSON.stringify(productKnowledge, null, 2)}

Safe tenant context:
- User name: ${context?.userName || context?.tenantName || "Unknown"}
- Role: ${context?.role || "tenant"}
- Tenant status: ${context?.tenantStatus || "Unknown"}
- Current page: ${context?.currentPage || "tenant_dashboard"}
- Property: ${context?.propertyLabel || "Unknown"}
- Lease status: ${context?.leaseStatus || "Unknown"}
- Monthly rent: ${
    typeof context?.monthlyRent === "number"
      ? context.monthlyRent
      : context?.rentAmount || "Unknown"
  }
- Due date: ${context?.dueDate || "Unknown"}
- Payment status: ${context?.paymentStatus || "Unknown"}
- Notes enabled: ${
    typeof context?.notesEnabled === "boolean"
      ? String(context.notesEnabled)
      : "Unknown"
  }
- Documents count: ${
    typeof context?.documentsCount === "number"
      ? context.documentsCount
      : "Unknown"
  }
- Available features: ${availableFeatures}
  `.trim();
}
