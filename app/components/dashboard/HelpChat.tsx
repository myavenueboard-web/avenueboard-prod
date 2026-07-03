"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Minus, Sparkles, X } from "lucide-react";
import AvaChatPanel, {
  type AvaChatMessage,
} from "@/app/components/ava/AvaChatPanel";

type HelpChatProps = {
  open: boolean;
  onClose: () => void;
};

const landlordPrompts = [
  "Add a property",
  "Invite a tenant",
  "View lease",
  "Rent collection",
  "Payment history",
  "Documents",
  "Reports",
];

export default function HelpChat({ open, onClose }: HelpChatProps) {
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<AvaChatMessage[]>([
    {
      id: "landlord-ava-welcome",
      role: "assistant",
      content:
        "Hi, I'm Ava 👋\n\nI can help you manage properties, tenants, leases, rent collection, documents, and anything related to AvenueBoard.\n\nHow can I help today?",
    },
  ]);

  if (!open || typeof document === "undefined") return null;

  function sendMessage(message: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `landlord-user-${Date.now()}`,
        role: "user",
        content: message,
      },
      {
        id: `landlord-ava-${Date.now()}`,
        role: "assistant",
        content:
          "I can help with Landlord Board workflows for properties, tenants, leases, rent collection, payment history, documents, reports, and support. Tell me what you want to do next.",
      },
    ]);
  }

  if (minimized) {
    return createPortal(
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-[310] flex h-14 items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 text-left shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_62px_rgba(15,23,42,0.22)]"
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
      </button>,
      document.body
    );
  }

  return createPortal(
      <aside
        className={`fixed inset-x-0 bottom-0 z-[310] overflow-hidden border border-white/70 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-300 ease-out sm:inset-auto sm:bottom-6 sm:right-6 ${
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
            prompts={landlordPrompts}
            onSend={sendMessage}
          />
        </div>
      </aside>,
    document.body
  );
}
