import type { ReactNode } from "react";

type StepIndicatorProps = {
  step: number;
  propertyValid: boolean;
  tenantValid: boolean;
  leaseValid: boolean;
};

export default function StepIndicator({
  step,
  propertyValid,
  tenantValid,
  leaseValid,
}: StepIndicatorProps) {
  return (
    <div className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-[2px] sm:gap-3">
        <Step
          complete={step > 1 && propertyValid}
          active={step === 1}
          icon={<PropertyIcon />}
          label="Property"
        />

        <Connector active={step > 1} />

        <Step
          complete={step > 2 && tenantValid}
          active={step === 2}
          icon={<TenantIcon />}
          label="Tenant"
        />

        <Connector active={step > 2} />

        <Step
          complete={step > 3 && leaseValid}
          active={step === 3}
          icon={<LeaseIcon />}
          label="Lease"
        />

        <Connector active={step > 3} />

        <Step
          active={step === 4}
          icon={<AgreementIcon />}
          label="Review"
        />
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div
      className={`h-[2px] w-4 rounded-full sm:w-14 ${
        active ? "bg-[#2563EB]" : "bg-zinc-200"
      }`}
    />
  );
}

function Step({
  active = false,
  complete = false,
  icon,
  label,
}: {
  active?: boolean;
  complete?: boolean;
  icon: ReactNode;
  label: ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1 rounded-2xl px-2 py-2 transition sm:gap-2 sm:px-4 ${
        complete
          ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
          : active
          ? "border border-blue-200 bg-white text-[#2563EB] shadow-sm"
          : "border border-transparent text-zinc-400"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center text-[13.5px] transition sm:h-8 sm:w-8 ${
          complete
            ? "rounded-full bg-emerald-100 text-emerald-700"
            : active
            ? "text-[#2563EB]"
            : "rounded-full bg-zinc-100 text-zinc-500"
        }`}
      >
        {complete ? "✓" : icon}
      </span>

      <span className="text-[13px] font-medium sm:text-[15px]">{label}</span>
    </div>
  );
}

function PropertyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11.2 12 5l8 6.2M6.5 10v8.2h11V10M10 18v-4.5h4V18"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TenantIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 12 12ZM5.8 19.2c.9-3.1 3-4.7 6.2-4.7s5.3 1.6 6.2 4.7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LeaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.8h7.2L17 7.6v11.6H7V4.8ZM14 5v3h3M9.5 11.2h5M9.5 14h5M9.5 16.8h3.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgreementIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.8 6.5h10.4M6.8 10.2h10.4M6.8 13.9h6.4M16.6 14.2l-3.6 3.6-1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
