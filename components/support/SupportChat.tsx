"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import AvaChatPanel from "@/app/components/ava/AvaChatPanel";
import { supabase } from "@/lib/supabase";

export type SupportChatContext = {
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

type SupportChatProps = {
  open: boolean;
  context?: SupportChatContext;
  onClose: () => void;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type PendingTicketDraft = {
  status:
    | "collecting_ticket_details"
    | "awaiting_ticket_confirmation"
    | "ticket_created"
    | "needs_description"
    | "awaiting_confirmation";
  originalUserMessage: string;
  issueSummary?: string;
  details?: string;
  category?: string;
  priority?: string;
  conversationSummary?: string;
};

const residentFaqPrompts = [
  "Where is my lease?",
  "How do I pay rent?",
  "Enable AutoPay",
  "Contact my landlord",
  "View documents",
  "Report an issue",
];

function getFirstName(context?: SupportChatContext) {
  const name = context?.userName || context?.tenantName || "";
  return name.trim().split(/\s+/)[0] || "there";
}

function createWelcomeMessage(context?: SupportChatContext): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: `Hi ${getFirstName(context)}, I’m Ava. How can I help today?`,
  };
}

export default function SupportChat({
  open,
  context,
  onClose,
}: SupportChatProps) {
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingTicketDraft, setPendingTicketDraft] =
    useState<PendingTicketDraft | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(context),
  ]);

  const safeHistory = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  useEffect(() => {
    if (open) setMinimized(false);
  }, [open]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.id !== "welcome") return prev;
      return [createWelcomeMessage(context)];
    });
  }, [context?.tenantName, context?.userName]);

  if (!open) return null;

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function sendMessage(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const token = await getToken();

      if (!token) throw new Error("Missing session");

      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          messages: safeHistory,
          context,
          conversationId,
          pendingTicketDraft,
        }),
      });

      if (!response.ok) throw new Error("Ava request failed");

      const data = (await response.json()) as {
        reply?: string;
        conversationId?: string | null;
        pendingTicketDraft?: PendingTicketDraft | null;
      };

      if (data.conversationId) setConversationId(data.conversationId);
      if ("pendingTicketDraft" in data) {
        setPendingTicketDraft(data.pendingTicketDraft || null);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            data.reply ||
            "I’m having trouble responding right now. Please email support@avenueboard.com if this is urgent.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "I’m having trouble connecting right now. Please email support@avenueboard.com if this is urgent.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-[310] flex h-14 items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 text-left shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_62px_rgba(15,23,42,0.2)]"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F172A] text-white">
          <Sparkles size={17} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="hidden sm:block">
          <span className="block text-[13px] font-semibold text-zinc-950">
            Ava
          </span>
          <span className="block text-[11px] font-medium text-zinc-500">
            Your AvenueBoard Assistant
          </span>
        </span>
      </button>
    );
  }

  return (
    <aside
      className={`fixed inset-x-0 bottom-0 z-[310] overflow-hidden border border-white/70 bg-white/95 shadow-[0_-20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-300 ease-out sm:inset-auto sm:bottom-6 sm:right-6 ${
        expanded
          ? "h-[88dvh] rounded-t-[28px] sm:h-[760px] sm:w-[680px] sm:rounded-[30px]"
          : "h-[82dvh] rounded-t-[28px] sm:h-[640px] sm:w-[430px] sm:rounded-[28px]"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-zinc-100/80 bg-white/80 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
                <Sparkles size={19} />
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-zinc-950">
                  Ava
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-zinc-500">
                  Your AvenueBoard Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
                aria-label="Minimize Ava"
              >
                <Minus size={17} />
              </button>
              <button
                onClick={() => setExpanded((current) => !current)}
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 sm:flex"
                aria-label={expanded ? "Shrink Ava" : "Expand Ava"}
              >
                {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
                aria-label="Close Ava"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        </div>

        <AvaChatPanel
          className="min-h-0 flex-1"
          messages={messages}
          loading={loading}
          prompts={residentFaqPrompts}
          onSend={sendMessage}
        />
      </div>
    </aside>
  );
}
