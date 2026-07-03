import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FormField, { inputClass } from "./FormField";

type PreferencesStepProps = {
  loginEmail: string;
  preferencesForm: {
    phone: string;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    landlordAbsorbsFee: boolean;
    authorizedAgreement: boolean;
    termsAgreement: boolean;
  };
  setPreferencesForm: React.Dispatch<
    React.SetStateAction<{
      phone: string;
      whatsappEnabled: boolean;
      smsEnabled: boolean;
      landlordAbsorbsFee: boolean;
      authorizedAgreement: boolean;
      termsAgreement: boolean;
    }>
  >;
};

export default function PreferencesStep({
  loginEmail,
  preferencesForm,
  setPreferencesForm,
}: PreferencesStepProps) {
  const [showFeeNote, setShowFeeNote] = useState(false);
  const [showAuthNote, setShowAuthNote] = useState(false);
  const [showStopAbsorbingConfirm, setShowStopAbsorbingConfirm] =
    useState(false);
  const [emailTooltipOpen, setEmailTooltipOpen] = useState(false);
  const [emailTooltipPinned, setEmailTooltipPinned] = useState(false);
  const emailTooltipButtonRef = useRef<HTMLButtonElement | null>(null);
  const emailTooltipRef = useRef<HTMLDivElement | null>(null);

  const phoneDigits = preferencesForm.phone.replace(/\D/g, "");

  const phoneInvalid =
    preferencesForm.phone.trim() &&
    (phoneDigits.length < 10 || phoneDigits.length > 15);

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 15);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return `+${digits}`;
  }

  function closeEmailTooltip() {
    setEmailTooltipOpen(false);
    setEmailTooltipPinned(false);
  }

  function handleAbsorbFeeClick() {
    if (preferencesForm.landlordAbsorbsFee) {
      setShowStopAbsorbingConfirm(true);
      return;
    }

    setPreferencesForm((current) => ({
      ...current,
      landlordAbsorbsFee: true,
    }));
  }

  function confirmStopAbsorbingFee() {
    setPreferencesForm((current) => ({
      ...current,
      landlordAbsorbsFee: false,
    }));
    setShowStopAbsorbingConfirm(false);
  }

  useEffect(() => {
    if (!emailTooltipOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        emailTooltipRef.current?.contains(target) ||
        emailTooltipButtonRef.current?.contains(target)
      ) {
        return;
      }

      closeEmailTooltip();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeEmailTooltip();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [emailTooltipOpen]);

  return (
    <>
      <div className="space-y-6 sm:space-y-7">
        <section>
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-900">
              Contact Details
            </h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="block">
              <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2">
                <p className="text-[15px] font-medium text-zinc-900">
                  Email Address
                </p>
                <span
                  className="relative inline-flex"
                  onMouseEnter={() => setEmailTooltipOpen(true)}
                  onMouseLeave={() => {
                    if (!emailTooltipPinned) setEmailTooltipOpen(false);
                  }}
                >
                  <button
                    ref={emailTooltipButtonRef}
                    type="button"
                    onClick={() => {
                      const nextPinned = !emailTooltipPinned;
                      setEmailTooltipPinned(nextPinned);
                      setEmailTooltipOpen(nextPinned || !emailTooltipOpen);
                    }}
                    onFocus={() => setEmailTooltipOpen(true)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-200 text-[10px] font-semibold text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                    aria-expanded={emailTooltipOpen}
                    aria-label="Email address information"
                  >
                    ?
                  </button>
                  {emailTooltipOpen && (
                    <div
                      ref={emailTooltipRef}
                      className="absolute left-1/2 top-full z-50 mt-3 w-[min(360px,calc(100vw-48px))] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-[0_20px_48px_rgba(15,23,42,0.16)] sm:w-[360px] sm:px-5 sm:py-4"
                    >
                      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-zinc-200 bg-white" />
                      <p className="relative text-[14.5px] font-semibold text-zinc-950">
                        Account Email
                      </p>
                      <p className="relative mt-2.5 text-[14px] font-normal leading-6 text-zinc-600">
                        AvenueBoard currently uses the email connected to your
                        account for setup, security, and important account
                        notifications. Communication email changes will be
                        supported later.
                      </p>
                    </div>
                  )}
                </span>
              </div>
              <input
                value={loginEmail}
                disabled
                className={`${inputClass} cursor-not-allowed bg-zinc-50 text-zinc-500`}
              />
            </div>

            <FormField
              label={
                <>
                  Phone Number{" "}
                  <span className="text-[13.5px] text-zinc-400">
                    (Optional)
                  </span>
                </>
              }
            >
              <input
                type="tel"
                inputMode="numeric"
                value={preferencesForm.phone}
                onChange={(e) =>
                  setPreferencesForm({
                    ...preferencesForm,
                    phone: formatPhone(e.target.value),
                    whatsappEnabled: false,
                    smsEnabled: false,
                  })
                }
                placeholder="(415) 555-0000"
                className={`${inputClass} ${
                  phoneInvalid ? "border-red-200 bg-red-50/40" : ""
                }`}
              />

              {phoneInvalid && (
                <p className="mt-2 text-[13.5px] text-red-500">
                  Enter a valid phone number.
                </p>
              )}

              <p className="mt-2 text-[14px] leading-6 text-zinc-500">
                Optional. Providing a phone number may help AvenueBoard contact
                you or send important account notifications in the future.
              </p>
            </FormField>
          </div>
        </section>

        <section className="rounded-[18px] border border-zinc-200 bg-white px-4 py-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div className="max-w-[600px]">
              <h3 className="flex items-baseline gap-2 text-[16px] font-semibold tracking-[-0.02em] text-zinc-900">
                <span>Resident Platform Fee</span>
                <span className="text-[13.5px] font-medium tracking-normal text-zinc-400">
                  Optional
                </span>
              </h3>

              <p className="mt-1.5 text-[14px] leading-6 text-zinc-500">
                Some landlords choose to absorb this monthly platform fee for
                their residents. You can cover it yourself or let the resident
                handle it.{" "}
                <button
                  type="button"
                  onClick={() => setShowFeeNote(true)}
                  className="font-semibold text-[#2563EB] hover:opacity-80"
                >
                  Learn more
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={handleAbsorbFeeClick}
              className={`h-12 w-full rounded-xl px-5 text-[15px] font-semibold transition sm:w-auto sm:shrink-0 ${
                preferencesForm.landlordAbsorbsFee
                  ? "border border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                  : "border border-zinc-200 bg-white text-[#2563EB] hover:bg-[#EFF6FF]"
              }`}
            >
              {preferencesForm.landlordAbsorbsFee ? "Absorbed" : "Absorb Fee"}
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-900">
            Agreement
          </h3>

          <div className="mt-4 space-y-3">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3.5 text-[15px] leading-6 transition ${
                preferencesForm.authorizedAgreement
                  ? "border-[#BFDBFE] bg-[#EFF6FF]/70 text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <input
                type="checkbox"
                checked={preferencesForm.authorizedAgreement}
                onChange={(e) =>
                  setPreferencesForm({
                    ...preferencesForm,
                    authorizedAgreement: e.target.checked,
                  })
                }
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#2563EB]"
              />

              <span>
                I confirm that I am authorized to collect rent for this property
                as the owner or property manager.{" "}
                <button
                  type="button"
                  onClick={() => setShowAuthNote(true)}
                  className="font-semibold text-[#2563EB] hover:opacity-80"
                >
                  View agreement
                </button>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[14px] border px-4 py-3.5 text-[15px] leading-6 transition ${
                preferencesForm.termsAgreement
                  ? "border-[#BFDBFE] bg-[#EFF6FF]/70 text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <input
                type="checkbox"
                checked={preferencesForm.termsAgreement}
                onChange={(e) =>
                  setPreferencesForm({
                    ...preferencesForm,
                    termsAgreement: e.target.checked,
                  })
                }
                className="mt-1 h-[18px] w-[18px] shrink-0 accent-[#2563EB]"
              />

              <span>
                I have read and agree to the{" "}
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#2563EB] hover:opacity-80"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#2563EB] hover:opacity-80"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>
        </section>
      </div>

      {showFeeNote && (
        <PlatformFeeModal onClose={() => setShowFeeNote(false)} />
      )}

      {showAuthNote && (
        <AgreementDrawer onClose={() => setShowAuthNote(false)} />
      )}

      {showStopAbsorbingConfirm && (
        <StopAbsorbingFeeModal
          onCancel={() => setShowStopAbsorbingConfirm(false)}
          onConfirm={confirmStopAbsorbingFee}
        />
      )}
    </>
  );
}

function StopAbsorbingFeeModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        aria-label="Cancel stop absorbing platform fee"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-absorbing-platform-fee-title"
        className="relative w-full max-w-[430px] rounded-[26px] border border-zinc-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)]"
      >
        <h2
          id="stop-absorbing-platform-fee-title"
          className="text-[24px] font-semibold tracking-[-0.05em] text-slate-950"
        >
          Stop absorbing the platform fee?
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-zinc-600">
          Residents will begin paying the $10 monthly AvenueBoard Platform Fee
          for future payments.
        </p>
        <p className="mt-2 text-[15px] leading-6 text-zinc-600">
          You can enable fee absorption again at any time.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-5 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-[#2563EB] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1D4ED8]"
          >
            Stop absorbing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PlatformFeeModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const features = [
    {
      title: "Verified & secure payments",
      body: "Industry-standard security and verification to protect every payment.",
      icon: <ShieldIcon />,
    },
    {
      title: "Card payments today, ACH coming soon",
      body: "Residents can pay rent by card today. Standard ACH payments are planned for a future release.",
      icon: <BankIcon />,
    },
    {
      title: "Credit-building opportunities",
      body: "Residents may be able to build credit history with on-time rent payments.",
      icon: <CreditIcon />,
    },
    {
      title: "Avenue Perks",
      body: "Access resident perks and partner offers.",
      icon: <PerksIcon />,
    },
    {
      title: "Resident Board features",
      body: "Track payments, manage documents, view notes, and stay organized.",
      icon: <BoardIcon />,
    },
    {
      title: "Cloud-based access",
      body: "Secure access anytime, anywhere.",
      icon: <CloudIcon />,
    },
  ];

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[300] bg-slate-950/35 backdrop-blur-sm transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-platform-fee-title"
        className={`fixed bottom-0 right-0 top-0 z-[310] flex h-dvh w-full transform flex-col bg-white shadow-[-28px_0_90px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-out sm:w-[min(760px,100vw)] ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Close resident platform fee details"
        >
          ✕
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-6 sm:px-8 sm:pb-5 sm:pt-7">
          <div className="pr-12">
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="mt-6 text-[15px] leading-7 text-zinc-600">
            <p>
              AvenueBoard is built to make renting more rewarding for residents
              while making rental management simpler for landlords and property
              managers.
            </p>
          </div>

          <section className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2
                id="resident-platform-fee-title"
                className="text-[22px] font-semibold tracking-[-0.04em] text-[#0F172A] sm:text-[24px]"
              >
                What residents get
              </h2>
              <p className="text-[14px] leading-6 text-zinc-500">
                All included with the $10 monthly platform fee.
              </p>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-3.5 border-b border-zinc-100 px-4 py-3 last:border-b-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    {feature.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#0F172A]">
                      {feature.title}
                    </p>
                    <p className="mt-0.5 text-[14px] leading-5 text-zinc-600">
                      {feature.body}
                    </p>
                  </div>
                  <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_8px_18px_rgba(4,120,87,0.18)]">
                    <CheckIcon />
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#0F172A]">
              Choose who pays
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-[0.3fr_0.7fr]">
              <ChoiceCard
                title="Residents pay (default)"
                body="Resident pays the $10 monthly platform fee."
                tone="green"
              />
              <ChoiceCard
                title="Landlord absorbs"
                body="AvenueBoard deducts $10 from your monthly rent payout so your resident does not pay the platform fee."
                tone="blue"
              />
            </div>
          </section>

        </div>

        <div className="border-t border-zinc-200 bg-white px-5 py-4 sm:px-8">
          <p className="mb-3 text-left text-[13.5px] leading-5 text-zinc-500">
            You're always in control. You can change this preference anytime by
            editing the lease.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 text-[15px] font-semibold text-white transition hover:bg-[#1D4ED8] sm:w-auto"
          >
            Got it <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

function AgreementDrawer({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[300] bg-slate-950/35 backdrop-blur-sm transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-summary-title"
        className={`fixed bottom-0 right-0 top-0 z-[310] flex h-dvh w-full transform flex-col bg-white shadow-[-28px_0_90px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-out sm:w-[min(760px,100vw)] ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Close agreement summary"
        >
          ✕
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
          <div className="pr-12">
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="h-8 w-auto object-contain"
            />
          </div>

          <section className="mt-9">
            <h2
              id="agreement-summary-title"
              className="text-[24px] font-semibold tracking-[-0.04em] text-[#0F172A]"
            >
              Agreement
            </h2>
            <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-zinc-600">
              This agreement summary will be available here soon.
            </p>
          </section>
        </div>

        <div className="border-t border-zinc-200 bg-white px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-8 text-[15px] font-semibold text-white transition hover:bg-[#1D4ED8] sm:w-auto"
          >
            Got it <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

function ChoiceCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "green" | "blue";
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-3 ${
        tone === "green"
          ? "border-emerald-100 shadow-[inset_3px_0_0_rgba(5,150,105,0.28)]"
          : "border-[#BFDBFE] shadow-[inset_3px_0_0_rgba(37,99,235,0.26)]"
      }`}
    >
      <p
        className={`text-[15px] font-semibold ${
          tone === "green" ? "text-emerald-700" : "text-[#2563EB]"
        }`}
      >
        {title}
      </p>
      <p className="mt-1 text-[14px] leading-5 text-zinc-600">{body}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5.5 10.2 3 3 6-6.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResidentIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 9.4a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM5.25 16c.72-2.42 2.3-3.63 4.75-3.63s4.03 1.21 4.75 3.63"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 16h12M5.5 16V7.25L10 4l4.5 3.25V16M8 16v-4h4v4M7.5 8.75h.01M10 8.75h.01M12.5 8.75h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.25 15 5.1v4.2c0 3.2-1.8 5.95-5 7.45-3.2-1.5-5-4.25-5-7.45V5.1l5-1.85Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m7.8 9.9 1.45 1.45 3-3.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 8h13L10 4 3.5 8ZM5 8v6.5M8.3 8v6.5M11.7 8v6.5M15 8v6.5M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6.25h12v7.5H4v-7.5ZM4 8.7h12M6.2 12h2.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PerksIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.5 11.35 7l3.65.2-2.8 2.4.95 3.7L10 11.25 6.85 13.3l.95-3.7L5 7.2 8.65 7 10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 4.5h10v11H5v-11ZM7.4 7.5h5.2M7.4 10h5.2M7.4 12.5h3.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 14.5h7.1a3 3 0 0 0 .35-5.98A4.15 4.15 0 0 0 6.1 7.3 3.65 3.65 0 0 0 6.5 14.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoModal({
  title,
  children,
  onClose,
  size = "default",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "wide";
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-4 top-1/2 z-50 max-h-[88vh] -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:left-1/2 sm:max-w-[92vw] sm:-translate-x-1/2 sm:p-7 ${
          size === "wide" ? "sm:w-[700px]" : "sm:w-[520px]"
        }`}
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <h4 className="text-[19px] font-semibold tracking-[-0.03em] text-zinc-900 sm:text-[20px]">
              {title}
            </h4>

            <div className="mt-5 text-[14px] leading-6 text-zinc-500">
              {children}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
