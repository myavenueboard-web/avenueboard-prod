import FormField, { inputClass } from "./FormField";

type LeaseForm = {
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
};

type AdditionalAmount = {
  id: number;
  type: string;
  amount: string;
};

type LeaseStepProps = {
  leaseForm: LeaseForm;
  setLeaseForm: React.Dispatch<React.SetStateAction<LeaseForm>>;
  additionalAmounts: AdditionalAmount[];
  addAdditionalAmount: () => void;
  updateAdditionalAmount: (
    id: number,
    field: "type" | "amount",
    value: string
  ) => void;
  removeAdditionalAmount: (id: number) => void;
  attachments: Record<string, string>;
  handleDocumentsUpload: (files?: FileList | null) => void;
};

export default function LeaseStep({
  leaseForm,
  setLeaseForm,
  additionalAmounts,
  addAdditionalAmount,
  updateAdditionalAmount,
  removeAdditionalAmount,
  attachments,
  handleDocumentsUpload,
}: LeaseStepProps) {
  return (
    <>
      <div>
        <h1 className="text-[25px] font-semibold tracking-[-0.04em]">
          Lease Details
        </h1>

        <p className="mt-1 text-[14px] text-zinc-500">
          Set lease terms, optional amounts, and supporting documents.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Start Date">
            <input
              type="date"
              value={leaseForm.startDate}
              onChange={(e) =>
                setLeaseForm({ ...leaseForm, startDate: e.target.value })
              }
              className={inputClass}
            />
          </FormField>

          <FormField label="End Date">
            <input
              type="date"
              value={leaseForm.endDate}
              onChange={(e) =>
                setLeaseForm({ ...leaseForm, endDate: e.target.value })
              }
              className={inputClass}
            />
          </FormField>

          <FormField label="Rent Due Day">
            <select
              value={leaseForm.rentDueDay}
              onChange={(e) =>
                setLeaseForm({ ...leaseForm, rentDueDay: e.target.value })
              }
              className={inputClass}
            >
              <option>1st of the Month</option>
              <option>5th of the Month</option>
              <option>10th of the Month</option>
              <option>15th of the Month</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Monthly Rent">
            <input
              type="number"
              value={leaseForm.monthlyRent}
              onChange={(e) =>
                setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })
              }
              placeholder="$"
              className={inputClass}
            />
          </FormField>

          <FormField
            label={
              <>
                Security Deposit{" "}
                <span className="text-[12px] text-zinc-400">(Optional)</span>
              </>
            }
          >
            <input
              type="number"
              value={leaseForm.securityDeposit}
              onChange={(e) =>
                setLeaseForm({
                  ...leaseForm,
                  securityDeposit: e.target.value,
                })
              }
              placeholder="$"
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="rounded-[22px] border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Additional Amounts
              </h3>
            </div>

            <button
              type="button"
              onClick={addAdditionalAmount}
              className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[14px] font-medium text-[#B9476D] hover:bg-[#FFF7FA]"
            >
              + Add
            </button>
          </div>

          <div
            className={`space-y-3 ${
              additionalAmounts.length > 0 ? "mt-4" : "mt-0"
            }`}
          >
            {additionalAmounts.map((item) => {
              const amountMissing = !item.amount.trim();

              return (
                <div key={item.id} className="rounded-2xl bg-[#FAFAFA] p-3">
                  <div className="grid grid-cols-[1fr_160px_auto] gap-3">
                    <select
                      value={item.type}
                      onChange={(e) =>
                        updateAdditionalAmount(
                          item.id,
                          "type",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >
                      <option>Late Fee</option>
                      <option>One-time Discount</option>
                      <option>Cleaning Fee</option>
                      <option>One-time Charge</option>
                      <option>Pet Fee</option>
                      <option>Other</option>
                    </select>

                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        updateAdditionalAmount(
                          item.id,
                          "amount",
                          e.target.value
                        )
                      }
                      placeholder="$ Amount"
                      className={`${inputClass} ${
                        amountMissing ? "border-red-200 bg-red-50/40" : ""
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => removeAdditionalAmount(item.id)}
                      className="rounded-2xl border border-red-100 bg-red-50 px-4 text-[13px] font-medium text-red-500 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>

                  {amountMissing && (
                    <p className="mt-2 px-1 text-[12px] text-red-500">
                      Enter an amount or remove this item.
                    </p>
                  )}

                  {item.type === "Late Fee" && (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-[12px] leading-5 text-amber-800">
                        Late fee is added only if rent remains unpaid after the
                        grace period, typically 10 business days from the rent
                        due date.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Attachments
              </h3>

              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                Upload lease agreement, insurance, HOA rules, addendums, or any
                supporting lease documents.
              </p>
            </div>

            <label className="shrink-0 cursor-pointer rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-[14px] font-medium text-[#B9476D] hover:bg-[#FFF7FA]">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleDocumentsUpload(e.target.files)}
              />
              Upload Documents
            </label>
          </div>

          {attachments.Documents && (
            <div className="mt-4 rounded-2xl bg-[#F8F9FA] px-4 py-3 text-[13px] text-zinc-600">
              {attachments.Documents}
            </div>
          )}
        </div>
      </div>
    </>
  );
}