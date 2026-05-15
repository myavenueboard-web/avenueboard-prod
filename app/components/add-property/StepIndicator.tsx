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
    <div className="mb-6 flex items-center justify-between">
      <Step complete={step > 1 && propertyValid} active={step === 1} icon="⌂" label="Property" />
      <Step complete={step > 2 && tenantValid} active={step === 2} icon="♙" label="Tenant" />
      <Step complete={step > 3 && leaseValid} active={step === 3} icon="▣" label="Lease" />
      <Step active={step === 4} icon="☷" label="Preferences" />
    </div>
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
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 transition ${
        complete
          ? "border border-emerald-100 bg-emerald-50 text-emerald-600"
          : active
          ? "border border-[#F0D6DF] bg-white text-[#B9476D] shadow-sm"
          : "text-zinc-400"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] ${
          complete ? "bg-emerald-100" : active ? "bg-[#FFF0F5]" : "bg-zinc-100"
        }`}
      >
        {complete ? "✓" : icon}
      </span>

      <span className="text-[15px] font-medium">{label}</span>
    </div>
  );
}