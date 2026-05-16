import { useState } from "react";
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

  const phoneRequired =
    preferencesForm.whatsappEnabled || preferencesForm.smsEnabled;

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

  return (
    <>
      <div>
       <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[20px]">
  Notification preferences and agreement.
</h3>
      </div>

      <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <FormField label="Email">
            <input
              value={loginEmail}
              disabled
              className={`${inputClass} cursor-not-allowed bg-zinc-50 text-zinc-500`}
            />
          </FormField>

          <FormField
            label={
              <>
                Phone Number{" "}
                <span className="text-[12px] text-zinc-400">
                  {phoneRequired ? "(Required)" : "(Optional)"}
                </span>
              </>
            }
          >
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={preferencesForm.phone}
              onChange={(e) =>
                setPreferencesForm({
                  ...preferencesForm,
                  phone: formatPhone(e.target.value),
                })
              }
              onKeyDown={(e) => {
                const allowedKeys = [
                  "Backspace",
                  "Delete",
                  "Tab",
                  "ArrowLeft",
                  "ArrowRight",
                  "Home",
                  "End",
                ];

                if (allowedKeys.includes(e.key)) return;

                if (!/^[0-9]$/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="(415) 555-0000"
              className={`${inputClass} ${
                (phoneRequired && !preferencesForm.phone.trim()) || phoneInvalid
                  ? "border-red-200 bg-red-50/40"
                  : ""
              }`}
            />

            {phoneRequired && !preferencesForm.phone.trim() && (
              <p className="mt-2 text-[12px] text-red-500">
                Phone number is required for WhatsApp or SMS alerts.
              </p>
            )}

            {phoneInvalid && (
              <p className="mt-2 text-[12px] text-red-500">
                Enter a valid phone number.
              </p>
            )}
          </FormField>
        </div>

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-[16px] font-semibold text-zinc-900">
            Notifications
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E45E8A] bg-[#FFF8FB] p-4 text-center">
              <p className="text-[14px] font-semibold text-[#B9476D]">
                Email
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setPreferencesForm({
                  ...preferencesForm,
                  whatsappEnabled: !preferencesForm.whatsappEnabled,
                })
              }
              className={`rounded-2xl border p-4 text-center transition ${
                preferencesForm.whatsappEnabled
                  ? "border-[#E45E8A] bg-[#FFF8FB] text-[#B9476D]"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <p className="text-[14px] font-semibold">WhatsApp</p>
            </button>

            <button
              type="button"
              onClick={() =>
                setPreferencesForm({
                  ...preferencesForm,
                  smsEnabled: !preferencesForm.smsEnabled,
                })
              }
              className={`rounded-2xl border p-4 text-center transition ${
                preferencesForm.smsEnabled
                  ? "border-[#E45E8A] bg-[#FFF8FB] text-[#B9476D]"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <p className="text-[14px] font-semibold">SMS</p>
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Tenant Setup Fee
              </h3>

              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                Some landlords prefer to absorb the tenant one-time setup fee on
                behalf of their tenants.{" "}
                <button
                  type="button"
                  onClick={() => setShowFeeNote(true)}
                  className="font-semibold text-[#B9476D] hover:opacity-80"
                >
                  Learn more
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setPreferencesForm({
                  ...preferencesForm,
                  landlordAbsorbsFee: !preferencesForm.landlordAbsorbsFee,
                })
              }
              className={`h-12 w-full rounded-2xl px-5 text-[14px] font-semibold transition sm:w-auto sm:shrink-0 ${
                preferencesForm.landlordAbsorbsFee
                  ? "bg-[#B9476D] text-white"
                  : "border border-zinc-200 bg-white text-[#B9476D] hover:bg-[#FFF7FA]"
              }`}
            >
              {preferencesForm.landlordAbsorbsFee
                ? "Fee Absorbed"
                : "Absorb Fee"}
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 className="text-[16px] font-semibold text-zinc-900">
            Agreement
          </h3>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 text-[14px] leading-6 text-zinc-700">
              <input
                type="checkbox"
                checked={preferencesForm.authorizedAgreement}
                onChange={(e) =>
                  setPreferencesForm({
                    ...preferencesForm,
                    authorizedAgreement: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#B9476D]"
              />

              <span>
                I confirm I am authorized to collect rent for this property as
                the owner or property manager.
              </span>
            </label>

            <label className="flex items-start gap-3 text-[14px] leading-6 text-zinc-700">
              <input
                type="checkbox"
                checked={preferencesForm.termsAgreement}
                onChange={(e) =>
                  setPreferencesForm({
                    ...preferencesForm,
                    termsAgreement: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#B9476D]"
              />

              <span>
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#B9476D] hover:opacity-80"
                >
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#B9476D] hover:opacity-80"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>
        </div>
      </div>

      {showFeeNote && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowFeeNote(false)}
          />

          <div className="fixed inset-x-4 top-1/2 z-50 max-h-[88vh] -translate-y-1/2 overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:left-1/2 sm:w-[520px] sm:max-w-[92vw] sm:-translate-x-1/2 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h4 className="text-[19px] font-semibold tracking-[-0.03em] text-zinc-900 sm:text-[20px]">
                  Tenant setup benefits
                </h4>

                <p className="mt-3 text-[13px] leading-6 text-zinc-500">
                  The tenant setup fee is calculated up to $89 per full lease
                  year and may be lower depending on the lease duration. Shorter
                  lease terms are prorated accordingly. If absorbed, the fee is
                  deducted from the tenant’s first month rent before payout and
                  covers the tenant onboarding and secure payment setup
                  experience.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFeeNote(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                "Verified tenant payment setup",
                "Free ACH payments and seamless autopay setup",
                "Payment method verification",
                "Tenant dashboard access",
                "Receipts, reminders, and payment visibility",
                "Secure rent payment experience",
                "No hidden monthly markups",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-[#FAFAFA] px-4 py-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-600">
                    ✓
                  </span>

                  <p className="text-[13px] leading-5 text-zinc-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#FFF7FA] px-5 py-4">
              <p className="text-[13px] leading-6 text-[#9F3D62]">
                Your tenant will be notified that you covered the one-time setup
                fee on their behalf, giving them a smoother start while keeping
                the rent payment experience clear and transparent.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}