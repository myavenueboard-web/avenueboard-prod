import { useState } from "react";
import FormField, { inputClass } from "./FormField";

type TenantForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AdditionalTenant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type TenantStepProps = {
  tenantForm: TenantForm;
  setTenantForm: React.Dispatch<React.SetStateAction<TenantForm>>;
  additionalTenants: AdditionalTenant[];
  removeAdditionalTenant: (id: number) => void;
  openAdditionalTenantModal: () => void;
  validationAttempted?: boolean;
};

export default function TenantStep({
  tenantForm,
  setTenantForm,
  additionalTenants,
  removeAdditionalTenant,
  openAdditionalTenantModal,
  validationAttempted = false,
}: TenantStepProps) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const tenantInputClass = inputClass.replace("bg-[#F8F9FA]", "bg-white");
  const phoneEntered = tenantForm.phone.trim().length > 0;
  const showEmailError =
    (emailTouched || validationAttempted) && !isValidEmail(tenantForm.email);
  const showPhoneError =
    (phoneTouched || validationAttempted) &&
    phoneEntered &&
    !isValidOptionalPhone(tenantForm.phone);

  return (
    <>
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.04em] sm:text-[25px]">
  Add Tenant
</h1>

<p className="mt-1 text-[14.5px] leading-6 text-zinc-500">
  Add the tenant who will receive the board invite.
</p>
      </div>

      <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/25 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[16px] font-semibold text-zinc-900">
                  Primary Tenant
                </h3>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-[13px] font-medium text-[#2563EB] ring-1 ring-blue-100">
                  Board invite
                </span>
              </div>

              <p className="mt-2 text-[14px] leading-6 text-zinc-500">
                This tenant receives the secure setup link, payment access,
                reminders, and receipts.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField label="First Name">
                <input
                  value={tenantForm.firstName}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="Sarah"
                  className={tenantInputClass}
                />
              </FormField>

              <FormField label="Last Name">
                <input
                  value={tenantForm.lastName}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Johnson"
                  className={tenantInputClass}
                />
              </FormField>
            </div>

            <FormField label="Email Address">
              <div className="relative">
                <input
                  type="email"
                  value={tenantForm.email}
                  onBlur={() => setEmailTouched(true)}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="tenant@email.com"
                  className={`${tenantInputClass} ${
                    showEmailError ? "border-red-200 bg-red-50/40" : ""
                  }`}
                />
                {showEmailError && (
                  <FieldTooltip>Enter a valid email address.</FieldTooltip>
                )}
              </div>
            </FormField>

            <FormField
              label={
                <>
                  Phone Number{" "}
                  <span className="text-[13.5px] font-medium text-zinc-400">
                    Optional
                  </span>
                </>
              }
            >
              <div className="relative">
                <input
                  type="tel"
                  inputMode="tel"
                  value={tenantForm.phone}
                  onBlur={() => setPhoneTouched(true)}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      phone: formatPhone(e.target.value),
                    })
                  }
                  placeholder="(415) 555-0000"
                  className={`${tenantInputClass} ${
                    showPhoneError ? "border-red-200 bg-red-50/40" : ""
                  }`}
                />
                {showPhoneError && (
                  <FieldTooltip>
                    Enter a valid phone number, or leave it blank.
                  </FieldTooltip>
                )}
              </div>
            </FormField>
          </div>
        </div>

        {additionalTenants.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Additional Tenants
                </h3>

                <p className="mt-1 text-[14px] leading-5 text-zinc-500">
                  Optional contacts only. No board invites will be sent.
                </p>
              </div>

              <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-[14px] font-medium text-zinc-500">
                {additionalTenants.length} added
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {additionalTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex flex-col gap-3 rounded-lg bg-[#F8F9FA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-zinc-900">
                      {tenant.firstName} {tenant.lastName}
                    </p>

                    <p className="mt-1 break-words text-[13.5px] text-zinc-500">
                      {tenant.email || "No email"}{" "}
                      {tenant.phone ? `• ${tenant.phone}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAdditionalTenant(tenant.id)}
                    className="w-fit text-[13.5px] font-medium text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openAdditionalTenantModal}
          className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-3 text-[15px] font-medium text-[#2563EB] transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
        >
          + Add Additional Tenant
        </button>
      </form>
    </>
  );
}

function FieldTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute right-2 top-[calc(100%+6px)] z-20 max-w-[280px] rounded-xl border border-red-100 bg-white px-3 py-2 text-[13px] font-medium leading-5 text-red-600 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
      {children}
    </span>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidOptionalPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `+${digits}`;
}
