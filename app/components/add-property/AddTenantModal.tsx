import FormField, { inputClass } from "./FormField";

type AddTenantModalProps = {
  additionalFirstName: string;
  additionalLastName: string;
  additionalEmail: string;
  additionalPhone: string;
  setAdditionalFirstName: (value: string) => void;
  setAdditionalLastName: (value: string) => void;
  setAdditionalEmail: (value: string) => void;
  setAdditionalPhone: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
};

export default function AddTenantModal({
  additionalFirstName,
  additionalLastName,
  additionalEmail,
  additionalPhone,
  setAdditionalFirstName,
  setAdditionalLastName,
  setAdditionalEmail,
  setAdditionalPhone,
  onClose,
  onAdd,
}: AddTenantModalProps) {
  const canAdd = additionalFirstName.trim() && additionalLastName.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.04em] sm:text-[22px]">
              Add Additional Tenant
            </h2>

            <p className="mt-2 text-[13px] leading-5 text-zinc-500">
              Additional tenants are saved as optional contacts only. They will
              not receive a portal invite.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First Name">
              <input
                value={additionalFirstName}
                onChange={(e) => setAdditionalFirstName(e.target.value)}
                placeholder="John"
                className={inputClass}
              />
            </FormField>

            <FormField label="Last Name">
              <input
                value={additionalLastName}
                onChange={(e) => setAdditionalLastName(e.target.value)}
                placeholder="Doe"
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField label="Email Address">
            <input
              type="email"
              value={additionalEmail}
              onChange={(e) => setAdditionalEmail(e.target.value)}
              placeholder="additional@email.com"
              className={inputClass}
            />
          </FormField>

          <FormField label="Phone Number">
            <input
              value={additionalPhone}
              onChange={(e) => setAdditionalPhone(e.target.value)}
              placeholder="(415) 555-0000"
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-5 text-[14px] font-medium text-zinc-700"
          >
            Cancel
          </button>

          <button
            onClick={onAdd}
            disabled={!canAdd}
            className={`h-12 rounded-2xl px-5 text-[14px] font-semibold ${
              canAdd
                ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
                : "cursor-not-allowed bg-zinc-100 text-zinc-400"
            }`}
          >
            Add Tenant
          </button>
        </div>
      </div>
    </div>
  );
}