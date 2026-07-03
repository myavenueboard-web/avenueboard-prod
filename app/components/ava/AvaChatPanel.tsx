"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Mic,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AvaChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
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

type AvaChatPanelProps = {
  messages: AvaChatMessage[];
  loading?: boolean;
  prompts: string[];
  onSend: (message: string) => void | Promise<void>;
  thinkingLabel?: string;
  className?: string;
};

export default function AvaChatPanel({
  messages,
  loading = false,
  prompts,
  onSend,
  thinkingLabel = "Ava is thinking...",
  className = "",
}: AvaChatPanelProps) {
  const [input, setInput] = useState("");
  const [faqExpanded, setFaqExpanded] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function send(message = input) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setInput("");
    setSpeechNotice("");
    await onSend(trimmed);
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
      setSpeechNotice("I couldn't capture that. You can type your message.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechNotice("");
    setListening(true);
    recognition.start();
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FAFAFA_0%,#FFFFFF_100%)] px-4 py-5">
        <div className="space-y-4">
          {messages.map((message) => (
            <AvaMessageBubble key={message.id} message={message} />
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-zinc-100 bg-white px-4 py-3 text-[13px] text-zinc-500 shadow-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>{thinkingLabel}</span>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-100/90 bg-white/90 p-4 backdrop-blur">
        {speechNotice ? (
          <p className="mb-2 text-[11px] font-medium text-zinc-500">
            {speechNotice}
          </p>
        ) : null}

        <section className="mb-3">
          <button
            type="button"
            onClick={() => setFaqExpanded((expanded) => !expanded)}
            aria-expanded={faqExpanded}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-1 py-2 text-left text-[12px] font-semibold text-[#0F172A] transition active:scale-[0.99]"
          >
            <span>View frequently asked questions</span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-zinc-500 transition-transform duration-200 ${
                faqExpanded ? "" : "rotate-180"
              }`}
            />
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              faqExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap gap-2 pt-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    disabled={loading}
                    className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-[#0F172A] transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={toggleSpeechInput}
            disabled={loading}
            className={`relative flex h-11 shrink-0 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-50 ${
              listening
                ? "w-[104px] bg-[#2563EB]/10 px-2.5 text-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.08)]"
                : "w-8 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? (
              <span className="absolute inset-0 rounded-2xl animate-[avaListenPulse_1.5s_ease-out_infinite] ring-1 ring-[#2563EB]/25" />
            ) : null}
            <Mic size={17} />
            {listening ? (
              <span className="ml-2 text-[12px] font-semibold">Listening</span>
            ) : null}
          </button>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask Ava..."
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[13px] leading-5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message to Ava"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B9476D] text-white shadow-[0_10px_24px_rgba(185,71,109,0.22)] transition hover:bg-[#a83c61] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
          >
            <Send size={17} />
          </button>
        </form>

        <div className="mt-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10.5px] font-medium text-zinc-400">
            <Link href="/privacy-policy" className="hover:text-zinc-700">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms-of-service" className="hover:text-zinc-700">
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              href="/help-center?section=faq"
              className="inline-flex items-center justify-center gap-1 text-zinc-500 hover:text-[#0F172A]"
            >
              Need more help?{" "}
              <span className="text-[#0F172A]">Open Help Center</span>
              <ArrowRight size={12} />
            </Link>
          </div>
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
    </div>
  );
}

function AvaMessageBubble({ message }: { message: AvaChatMessage }) {
  const user = message.role === "user";

  return (
    <div
      className={`animate-[avaMessageIn_180ms_ease-out] flex ${
        user ? "justify-end" : "justify-start"
      }`}
    >
      {!user ? (
        null
      ) : null}

      <div
        className={`max-w-[84%] whitespace-pre-line rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm ${
          user
            ? "rounded-br-md bg-[#111827] font-medium text-white shadow-[0_10px_24px_rgba(17,24,39,0.16)]"
            : "rounded-bl-md border border-zinc-100 bg-white text-zinc-700"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
