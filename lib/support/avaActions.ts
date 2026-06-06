import {
  buildConversationSummary,
  buildEscalationMessage,
  createSupportTicket,
  detectPriority,
  detectSupportCategory,
  shouldCreateTicket,
  storeSupportEvent,
  type ChatMessageInput,
  type SupportCategory,
  type SupportPriority,
  type TenantSupportContext,
} from "@/lib/support/supportServer";

export type AvaActionName =
  | "prepare_support_ticket"
  | "confirm_support_ticket"
  | "cancel_support_ticket"
  | "retrieve_lease_information"
  | "retrieve_payment_information"
  | "retrieve_document_information"
  | "retrieve_notes";

export type AvaPendingTicketDraft = {
  status:
    | "collecting_ticket_details"
    | "awaiting_ticket_confirmation"
    | "ticket_created"
    | "needs_description"
    | "awaiting_confirmation";
  originalUserMessage: string;
  issueSummary?: string;
  details?: string;
  category?: SupportCategory;
  priority?: SupportPriority;
  conversationSummary?: string;
};

export type AvaActionResult = {
  action: AvaActionName;
  reply: string;
  ticket?: {
    id: string;
    ticket_number: string;
    category: string;
    status: string;
    priority: string;
    created_at: string;
  } | null;
  pendingTicketDraft?: AvaPendingTicketDraft | null;
  metadata?: Record<string, unknown>;
};

type ExecuteAvaActionInput = {
  action: AvaActionName;
  message: string;
  messages?: ChatMessageInput[];
  userId: string;
  profileId: string | null;
  conversationId: string | null;
  context?: TenantSupportContext;
  pendingTicketDraft?: AvaPendingTicketDraft | null;
};

const issueSignals = [
  /payment failed|failed payment|payment unsuccessful/i,
  /duplicate charge|charged twice|double charge/i,
  /cannot access lease|can't access lease|cant access lease|lease.+not (opening|loading|available)|lease.+missing/i,
  /document missing|document.+not (opening|loading|available)|can't download|cannot download/i,
  /invite.+not working|invitation.+not working|invite missing/i,
  /login issue|account issue|password|locked out|account locked/i,
  /rent amount looks wrong|incorrect rent|wrong rent|rent.+wrong/i,
  /landlord|tenant communication|message/i,
  /note|shared note|private note/i,
  /bug|error|broken|not working/i,
];

export function detectAvaAction(
  message: string,
  context?: TenantSupportContext,
  pendingTicketDraft?: AvaPendingTicketDraft | null
): AvaActionName | null {
  const text = message.trim().toLowerCase();
  const ticketState = normalizeTicketState(pendingTicketDraft?.status);

  console.log("Ava ticket flow state", {
    currentTicketState: ticketState,
    hasPendingTicketDraft: Boolean(pendingTicketDraft),
  });

  if (ticketState === "awaiting_ticket_confirmation") {
    if (isConfirmation(text)) return "confirm_support_ticket";
    if (isCancellation(text)) return "cancel_support_ticket";
    return "prepare_support_ticket";
  }

  if (ticketState === "collecting_ticket_details") {
    if (isCancellation(text)) return "cancel_support_ticket";
    return "prepare_support_ticket";
  }

  if (shouldCreateTicket(text)) {
    return "prepare_support_ticket";
  }

  if (/lease|agreement|lease status|unit|property info|property information/.test(text)) {
    return "retrieve_lease_information";
  }

  if (/payment|rent|paid|due|autopay|receipt|history|charge/.test(text)) {
    return "retrieve_payment_information";
  }

  if (/document|documents|file|download|upload|pdf/.test(text)) {
    return "retrieve_document_information";
  }

  if (
    context?.notesEnabled !== false &&
    /note|notes|shared note|private note/.test(text)
  ) {
    return "retrieve_notes";
  }

  return null;
}

export async function executeAvaAction(
  input: ExecuteAvaActionInput
): Promise<AvaActionResult> {
  console.log("Ava selected action", {
    action: input.action,
    currentTicketState: normalizeTicketState(input.pendingTicketDraft?.status),
    hasPendingTicketDraft: Boolean(input.pendingTicketDraft),
  });

  switch (input.action) {
    case "prepare_support_ticket":
      return prepareSupportTicketAction(input);
    case "confirm_support_ticket":
      return confirmSupportTicketAction(input);
    case "cancel_support_ticket":
      return {
        action: input.action,
        reply: "No problem. I won’t create a support case. Tell me what changed if you want to revise it.",
      pendingTicketDraft: null,
      metadata: {
        supportDraftCancelled: true,
        stateTransition: "ticket_flow_cancelled_to_normal",
      },
      };
    case "retrieve_lease_information":
      return {
        action: input.action,
        reply: buildLeaseInformationReply(input.context),
        metadata: { retrieved: "lease_information" },
      };
    case "retrieve_payment_information":
      return {
        action: input.action,
        reply: buildPaymentInformationReply(input.context),
        metadata: { retrieved: "payment_information" },
      };
    case "retrieve_document_information":
      return {
        action: input.action,
        reply: buildDocumentInformationReply(input.context),
        metadata: { retrieved: "document_information" },
      };
    case "retrieve_notes":
      return {
        action: input.action,
        reply: buildNotesReply(input.context),
        metadata: { retrieved: "notes" },
      };
  }
}

function prepareSupportTicketAction(input: ExecuteAvaActionInput): AvaActionResult {
  const currentState = normalizeTicketState(input.pendingTicketDraft?.status);
  const meaningfulMessages =
    currentState === "collecting_ticket_details" ||
    currentState === "awaiting_ticket_confirmation"
      ? [input.message]
      : getMeaningfulSupportMessages(input.message, input.messages);

  if (meaningfulMessages.length === 0) {
    const pendingTicketDraft: AvaPendingTicketDraft = {
      status: "collecting_ticket_details",
      originalUserMessage: input.message,
    };

    console.log("Ava ticket state transition", {
      from: currentState,
      to: "collecting_ticket_details",
      pendingTicketDraft,
    });

    return {
      action: "prepare_support_ticket",
      reply:
        "Sure — what would you like support to help with? Please describe the issue, and I’ll prepare a support case for you.",
      pendingTicketDraft,
      metadata: {
        supportDraftNeedsDescription: true,
        stateTransition: `${currentState}_to_collecting_ticket_details`,
      },
    };
  }

  const summary = buildIssueDraft(
    meaningfulMessages,
    input.pendingTicketDraft?.originalUserMessage || input.message,
    input.messages
  );

  const pendingTicketDraft: AvaPendingTicketDraft = {
    status: "awaiting_ticket_confirmation",
    originalUserMessage:
      input.pendingTicketDraft?.originalUserMessage || input.message,
    issueSummary: summary.issueSummary,
    details: summary.details,
    category: summary.category,
    priority: summary.priority,
    conversationSummary: summary.conversationSummary,
  };

  console.log("Ava ticket state transition", {
    from: currentState,
    to: "awaiting_ticket_confirmation",
    pendingTicketDraft,
  });

  return {
    action: "prepare_support_ticket",
    reply: `Here’s what I’ll include in the support case:\n\nIssue: ${summary.issueSummary}\nDetails: ${summary.details}\n\nShould I create a support case with this information?`,
    pendingTicketDraft,
    metadata: {
      supportDraftAwaitingConfirmation: true,
      category: summary.category,
      priority: summary.priority,
      stateTransition: `${currentState}_to_awaiting_ticket_confirmation`,
    },
  };
}

async function confirmSupportTicketAction(input: ExecuteAvaActionInput) {
  const draft = input.pendingTicketDraft;

  if (!draft?.issueSummary || !draft.details) {
    return {
      action: "prepare_support_ticket" as const,
      reply:
        "Sure — what would you like support to help with? Please describe the issue, and I’ll prepare a support case for you.",
      pendingTicketDraft: {
        status: "collecting_ticket_details" as const,
        originalUserMessage: input.message,
      },
      metadata: { supportDraftNeedsDescription: true },
    };
  }

  console.log("Ava support ticket confirmation requested", {
    userId: input.userId,
    profileId: input.profileId,
    conversationId: input.conversationId,
    draft,
  });

  const latestAssistantResponse = `Here’s what I’ll include in the support case:\n\nIssue: ${draft.issueSummary}\nDetails: ${draft.details}\n\nShould I create a support case with this information?`;
  const safeTenantContext = buildSafeTenantContext(input.context);
  const pageContext = {
    currentPage: input.context?.currentPage || "tenant_dashboard",
    productCapabilities: input.context?.productCapabilities || null,
  };

  const ticket = await createSupportTicket({
    userId: input.userId,
    profileId: input.profileId,
    input: {
      category: draft.category || detectSupportCategory(draft.details),
      priority: draft.priority || detectPriority(draft.details),
      tenantAccessId: input.context?.tenantAccessId || null,
      propertyId: input.context?.propertyId || null,
      leaseId: input.context?.leaseId || null,
      conversationId: input.conversationId,
      message: draft.issueSummary,
      metadata: {
        created_from: "ava",
        original_user_message: draft.originalUserMessage,
        conversation_summary:
          draft.conversationSummary ||
          buildConversationSummary(input.messages, input.message),
        confirmed_issue_summary: draft.issueSummary,
        issue_details: draft.details,
        latest_assistant_response: latestAssistantResponse,
        page_context: pageContext,
        tenant_context: safeTenantContext,
      },
    },
  });

  await storeSupportEvent({
    ticketId: ticket.id,
    conversationId: input.conversationId,
    eventType: "support_case_created",
    metadata: {
      action: "confirm_support_ticket",
      category: ticket.category,
      priority: ticket.priority,
      source: "ava_action_layer",
      issueSummary: draft.issueSummary,
    },
  });

  console.log("Ava ticket creation success", {
    ticketNumber: ticket.ticket_number,
    category: ticket.category,
    priority: ticket.priority,
    stateTransition: "awaiting_ticket_confirmation_to_ticket_created",
  });

  return {
    action: "confirm_support_ticket" as const,
    reply: buildEscalationMessage(ticket.ticket_number),
    ticket,
    pendingTicketDraft: null,
    metadata: {
      ticketNumber: ticket.ticket_number,
      escalated: true,
      issueSummary: draft.issueSummary,
      stateTransition: "awaiting_ticket_confirmation_to_ticket_created",
    },
  };
}

function normalizeTicketState(status?: AvaPendingTicketDraft["status"]) {
  if (status === "needs_description") return "collecting_ticket_details";
  if (status === "awaiting_confirmation") return "awaiting_ticket_confirmation";
  return status || "normal";
}

function getMeaningfulSupportMessages(
  latestMessage: string,
  messages?: ChatMessageInput[]
) {
  const candidates = [
    ...(messages || [])
      .filter((message) => message.role === "user")
      .slice(-6)
      .map((message) => message.content),
    latestMessage,
  ];

  return candidates.filter(hasMeaningfulSupportContext);
}

function hasMeaningfulSupportContext(message: string) {
  const text = message.trim();

  if (text.length < 12) return false;
  if (shouldCreateTicket(text) && text.split(/\s+/).length <= 6) return false;

  return issueSignals.some((pattern) => pattern.test(text));
}

function buildIssueDraft(
  meaningfulMessages: string[],
  originalUserMessage: string,
  messages?: ChatMessageInput[]
) {
  const issueText = meaningfulMessages.join(" ");
  const category = detectSupportCategory(issueText);
  const priority = detectPriority(issueText);

  return {
    issueSummary: buildIssueSummary(issueText, category),
    details: cleanSentence(meaningfulMessages[meaningfulMessages.length - 1]),
    category,
    priority,
    conversationSummary: buildConversationSummary(messages, originalUserMessage),
  };
}

function buildIssueSummary(issueText: string, category: SupportCategory) {
  const text = issueText.toLowerCase();

  if (/duplicate charge|charged twice|double charge/.test(text)) {
    return "Possible duplicate rent/payment charge.";
  }
  if (/payment failed|failed payment|payment unsuccessful/.test(text)) {
    return "Payment was unsuccessful or failed.";
  }
  if (/auto ?pay|autopay|auto payment|automatic payment|payment setup|setup auto payment|set up auto payment/.test(text)) {
    return "Unable to set up AutoPay.";
  }
  if (/cannot access lease|can't access lease|cant access lease|lease.+not (opening|loading|available)/.test(text)) {
    return "Tenant is having trouble accessing the lease.";
  }
  if (/document missing|document.+not (opening|loading|available)|can't download|cannot download/.test(text)) {
    return "Tenant is having trouble with a lease/property document.";
  }
  if (/invite|invitation/.test(text)) {
    return "Tenant invitation or onboarding issue.";
  }
  if (/login|password|locked out|account/.test(text)) {
    return "Account access issue.";
  }
  if (/rent amount looks wrong|incorrect rent|wrong rent|rent.+wrong/.test(text)) {
    return "Rent amount may be incorrect.";
  }
  if (/note|notes/.test(text)) {
    return "Tenant notes issue.";
  }
  if (category === "technical_issue") {
    return "Technical issue in the AvenueBoard portal.";
  }

  return "General AvenueBoard support request.";
}

function cleanSentence(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function isConfirmation(text: string) {
  return /^(yes|yep|yeah|correct|submit|create it|that's right|that is right|right|please do|go ahead|confirm|confirmed)\b/.test(
    text
  );
}

function isCancellation(text: string) {
  return /^(no|cancel|never mind|nevermind|not now|don'?t|do not)\b/.test(text);
}

function buildSafeTenantContext(context?: TenantSupportContext) {
  return {
    tenantName: context?.tenantName || context?.userName || null,
    role: context?.role || "tenant",
    tenantStatus: context?.tenantStatus || null,
    propertyLabel: context?.propertyLabel || null,
    leaseStatus: context?.leaseStatus || null,
    monthlyRent: context?.monthlyRent || null,
    dueDate: context?.dueDate || null,
    paymentStatus: context?.paymentStatus || null,
    notesEnabled: context?.notesEnabled ?? null,
    documentsCount: context?.documentsCount ?? null,
  };
}

function buildLeaseInformationReply(context?: TenantSupportContext) {
  const leaseStatus = context?.leaseStatus || "not available";
  const property = context?.propertyLabel || "your selected property";

  return `For ${property}, the lease status I can see is ${leaseStatus}. You can open the Lease Status card on the tenant dashboard for the full lease view.`;
}

function buildPaymentInformationReply(context?: TenantSupportContext) {
  const rent =
    typeof context?.monthlyRent === "number"
      ? `$${context.monthlyRent.toLocaleString()}`
      : context?.rentAmount || "not available";
  const dueDate = context?.dueDate || "not available";
  const paymentStatus = context?.paymentStatus || "not available";

  return `Here’s what I can see right now: monthly rent is ${rent}, due date is ${dueDate}, and payment status is ${paymentStatus}. For more detail, open Payment Progress or All history on the tenant dashboard.`;
}

function buildDocumentInformationReply(context?: TenantSupportContext) {
  const count =
    typeof context?.documentsCount === "number"
      ? context.documentsCount
      : null;

  if (count === null) {
    return "Property Documents are supported in the tenant dashboard. I’m not sure how many documents are available for this lease right now, so please check the Property Documents section to verify.";
  }

  return `Property Documents are supported for this lease. I can see ${count} document${count === 1 ? "" : "s"} in the current dashboard context. You can use View or Download in the Property Documents section.`;
}

function buildNotesReply(context?: TenantSupportContext) {
  if (context?.notesEnabled === false) {
    return "I’m not sure notes are enabled for this account. Please check the tenant dashboard, or I can create a support case if the Notes section is missing.";
  }

  return "Notes are supported in the tenant dashboard. Private notes are only visible to the tenant who created them, and shared notes can be visible between you and the landlord for the same lease/property. You can check the Notes section on the tenant dashboard.";
}
