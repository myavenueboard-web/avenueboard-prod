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
    <div className="mb-4 overflow-hidden">
      <div className="flex items-center justify-between gap-[2px] sm:gap-3">
        <Step
          complete={step > 1 && propertyValid}
          active={step === 1}
          icon="⌂"
          label="Property"
        />

        <Connector active={step > 1} />

        <Step
          complete={step > 2 && tenantValid}
          active={step === 2}
          icon="♙"
          label="Tenant"
        />

        <Connector active={step > 2} />

        <Step
          complete={step > 3 && leaseValid}
          active={step === 3}
          icon="▣"
          label="Lease"
        />

        <Connector active={step > 3} />

        <Step
          active={step === 4}
          icon="☷"
          label={
            <>
              <span className="sm:hidden">Prefs</span>
              <span className="hidden sm:inline">Preferences</span>
            </>
          }
        />
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div
      className={`h-[2px] w-4 rounded-full sm:w-10 ${
        active ? "bg-[#B9476D]" : "bg-zinc-200"
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
  icon: string;
  label: ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1 rounded-2xl px-2 py-2 transition sm:gap-2 sm:px-4 ${
        complete
          ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
          : active
          ? "border border-[#F0D6DF] bg-white text-[#B9476D] shadow-sm"
          : "border border-transparent text-zinc-400"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] sm:h-8 sm:w-8 sm:text-[14px] ${
          complete ? "bg-emerald-100" : active ? "bg-[#FFF0F5]" : "bg-zinc-100"
        }`}
      >
        {complete ? "✓" : icon}
      </span>

      <span className="text-[11px] font-medium sm:text-[15px]">{label}</span>
    </div>
  );
}