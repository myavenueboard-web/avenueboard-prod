"use client";

import { useEffect, useRef, useState } from "react";

type HelpChatProps = {
  open: boolean;
  onClose: () => void;
};

type HelpQuestion = {
  question: string;
  answer: string;
};

type HelpTopic = {
  label: string;
  questions: HelpQuestion[];
};

type ChatMessage = {
  from: "user" | "assistant";
  text: string;
};

const topics: HelpTopic[] = [
  {
    label: "Add property",
    questions: [
      {
        question: "How do I add my first property?",
        answer:
          "Click Add Property, enter the property address, property type, unit details, and property label. Then continue to add the tenant and lease details.",
      },
      {
        question: "Is the property label visible to tenants?",
        answer:
          "The property label is mainly for your dashboard organization and helps identify each property inside AvenueBoard.",
      },
      {
        question: "Can I add more than one unit?",
        answer:
          "Yes. You can select the number of units during setup and manage multiple units under one property.",
      },
    ],
  },

  {
    label: "Invite tenant",
    questions: [
      {
        question: "Who receives the tenant invite?",
        answer:
          "Only the primary tenant receives the secure setup invitation to create their tenant board and payment setup.",
      },
      {
        question: "Can I add additional tenants?",
        answer:
          "Yes. Additional tenants can be saved as optional contacts with name, email, and phone details.",
      },
      {
        question: "What does the tenant set up?",
        answer:
          "Tenants can securely set up payment methods, autopay preferences, reminders, and view rent history.",
      },
    ],
  },

  {
    label: "Lease setup",
    questions: [
      {
        question: "What lease details are required?",
        answer:
          "Start date, end date, monthly rent, and rent due date are required during lease setup.",
      },
      {
        question: "How do additional amounts work?",
        answer:
          "Additional amounts can include late fees, discounts, pet fees, one-time charges, or custom lease charges.",
      },
      {
        question: "What documents can I upload?",
        answer:
          "You can upload lease agreements, HOA documents, insurance files, addendums, and supporting lease documents.",
      },
    ],
  },

  {
    label: "Bank account",
    questions: [
      {
        question: "When do I connect my bank account?",
        answer:
          "Bank setup happens after onboarding. You can connect immediately or choose Set up later.",
      },
      {
        question: "Why is bank setup required?",
        answer:
          "Your bank account is required so rent payments can be deposited securely after tenant payments are completed.",
      },
      {
        question: "Can I use the dashboard before connecting my bank?",
        answer:
          "Yes. You can continue into the dashboard and connect your bank account later.",
      },
    ],
  },

  {
    label: "Notifications",
    questions: [
      {
        question: "Is email notification required?",
        answer:
          "Yes. Email is the primary communication method for rent collection and account notifications.",
      },
      {
        question: "Can I enable SMS or WhatsApp?",
        answer:
          "Yes. SMS and WhatsApp notifications are optional and require a valid phone number.",
      },
      {
        question: "How do rent reminders work?",
        answer:
          "AvenueBoard can send reminders around rent due dates so tenants receive visibility before and after rent is due.",
      },
    ],
  },

  {
    label: "Tenant fee",
    questions: [
      {
        question: "How does the tenant setup fee work?",
        answer:
          "The setup fee is prorated by lease length, up to $89 for a full lease year.",
      },
      {
        question: "Can I absorb the tenant setup fee?",
        answer:
          "Yes. Landlords can choose to absorb the one-time tenant setup fee during onboarding.",
      },
      {
        question: "Will tenants know if I absorb the fee?",
        answer:
          "Yes. Tenants may receive a notification that the landlord covered the one-time setup fee on their behalf.",
      },
    ],
  },
];

export default function HelpChat({
  open,
  onClose,
}: HelpChatProps) {
  const [selectedTopic, setSelectedTopic] =
    useState<HelpTopic | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "assistant",
      text: "Hi, what do you need help with?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, selectedTopic]);

  if (!open) return null;

  function selectTopic(topic: HelpTopic) {
    setSelectedTopic(topic);

    setMessages([
      {
        from: "assistant",
        text: "Hi, what do you need help with?",
      },

      {
        from: "user",
        text: topic.label,
      },

      {
        from: "assistant",
        text: `Here are a few common questions related to ${topic.label.toLowerCase()}.`,
      },
    ]);
  }

  function selectQuestion(item: HelpQuestion) {
    setMessages((prev) => [
      ...prev,

      {
        from: "user",
        text: item.question,
      },

      {
        from: "assistant",
        text: item.answer,
      },

      {
        from: "assistant",
        text: "Need more help? You can always contact support below.",
      },
    ]);
  }

  function resetChat() {
    setSelectedTopic(null);

    setMessages([
      {
        from: "assistant",
        text: "Hi, what do you need help with?",
      },
    ]);
  }

  function contactSupport() {
    window.location.href =
      "mailto:support@avenueboard.com?subject=AvenueBoard Support Request";
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
      />

      <div className="fixed bottom-8 right-8 z-50 flex h-[640px] w-[440px] max-w-[92vw] flex-col overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-[21px] font-semibold tracking-[-0.04em] text-[#0F172A]">
              AvenueBoard Help
            </h2>

            <p className="mt-1 text-[13px] text-zinc-500">
              Guided support for setup and rent collection.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-5 py-5">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.text}-${index}`}
                className={`flex ${
                  message.from === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm ${
                    message.from === "user"
                      ? "rounded-tr-md bg-[#B9476D] font-medium text-white"
                      : "rounded-tl-md bg-white text-zinc-600"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {!selectedTopic && (
            <div className="mt-5 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => selectTopic(topic)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition hover:border-[#E45E8A] hover:bg-[#FFF8FB] hover:text-[#B9476D]"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          )}

          {selectedTopic && (
            <div className="mt-5 space-y-2">
              {selectedTopic.questions.map((item) => (
                <button
                  key={item.question}
                  onClick={() => selectQuestion(item)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-[13px] font-medium text-zinc-700 transition hover:border-[#E45E8A] hover:bg-[#FFF8FB] hover:text-[#B9476D]"
                >
                  {item.question}
                </button>
              ))}

              <button
                onClick={resetChat}
                className="mt-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-700"
              >
                Choose another topic
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 bg-white px-5 py-4">
          <button
            onClick={contactSupport}
            className="h-[50px] w-full rounded-2xl bg-[#0F172A] text-[14px] font-semibold text-white transition hover:bg-[#1E293B]"
          >
            Contact Support
          </button>

          <p className="mt-3 text-center text-[12px] text-zinc-400">
            AI assistant and live chat can be added here later.
          </p>
        </div>
      </div>
    </>
  );
}