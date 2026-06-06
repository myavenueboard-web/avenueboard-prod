"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Loader2,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
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

type SpeechRecognitionController = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionController;

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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingTicketDraft, setPendingTicketDraft] =
    useState<PendingTicketDraft | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(context),
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);

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

  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, loading, minimized]);

  if (!open) return null;

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function sendMessage(messageText = input) {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSpeechNotice("");
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

  function toggleSpeechInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechNotice("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput((current) =>
          current.trim() ? `${current.trim()} ${transcript}` : transcript
        );
      }
    };
    recognition.onerror = () => {
      setSpeechNotice("I couldn’t capture that. You can type your message.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechNotice("");
    setListening(true);
    recognition.start();
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-[80] flex h-14 items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 text-left shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_62px_rgba(15,23,42,0.2)]"
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
      className={`fixed inset-x-0 bottom-0 z-[80] overflow-hidden border border-white/70 bg-white/95 shadow-[0_-20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-300 ease-out sm:inset-auto sm:bottom-6 sm:right-6 ${
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
                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FAFAFA_0%,#FFFFFF_100%)] px-4 py-5">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`animate-[avaMessageIn_180ms_ease-out] flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white text-[#B9476D] shadow-sm">
                    <Home size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[84%] rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-[#111827] font-medium text-white shadow-[0_10px_24px_rgba(17,24,39,0.16)]"
                      : "rounded-bl-md border border-zinc-100 bg-white text-zinc-700"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white text-[#B9476D] shadow-sm">
                  <Home size={14} />
                </div>
                <div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-zinc-100 bg-white px-4 py-3 text-[13px] text-zinc-500 shadow-sm">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-[avaTyping_1s_ease-in-out_infinite] rounded-full bg-zinc-400" />
                    <span className="h-1.5 w-1.5 animate-[avaTyping_1s_ease-in-out_160ms_infinite] rounded-full bg-zinc-400" />
                    <span className="h-1.5 w-1.5 animate-[avaTyping_1s_ease-in-out_320ms_infinite] rounded-full bg-zinc-400" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100/90 bg-white/90 p-4 backdrop-blur">
          {speechNotice && (
            <p className="mb-2 text-[11px] font-medium text-zinc-500">
              {speechNotice}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="flex items-end gap-2"
          >
            <button
              type="button"
              onClick={toggleSpeechInput}
              disabled={loading}
              className={`relative flex h-11 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                listening
                  ? "w-[118px] border-[#B9476D]/25 bg-[#B9476D]/10 px-3 text-[#B9476D] shadow-[0_0_0_4px_rgba(185,71,109,0.08)]"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
              }`}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
            >
              {listening && (
                <span className="absolute inset-0 rounded-2xl border border-[#B9476D]/25 animate-[avaListenPulse_1.5s_ease-out_infinite]" />
              )}
              <Mic size={17} />
              {listening && (
                <span className="ml-2 text-[12px] font-semibold">
                  Listening
                </span>
              )}
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Ask Ava..."
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[13px] leading-5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#B9476D] focus:ring-4 focus:ring-[#B9476D]/10"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B9476D] text-white shadow-[0_10px_24px_rgba(185,71,109,0.22)] transition hover:bg-[#a83c61] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes avaMessageIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes avaTyping {
          0%,
          80%,
          100% {
            opacity: 0.35;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @keyframes avaListenPulse {
          from {
            opacity: 0.65;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(1.12);
          }
        }
      `}</style>
    </aside>
  );
}
