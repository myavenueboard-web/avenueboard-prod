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
        <h1 className="text-[20px] font-semibold tracking-[-0.04em] sm:text-[25px]">
  Lease Details
</h1>

<p className="mt-1 text-[13px] text-zinc-500 sm:text-[14px]">
  Set lease terms and upload documents.
</p>
      </div>

      <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
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

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Additional Amounts
              </h3>
            </div>

            <button
              type="button"
              onClick={addAdditionalAmount}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[14px] font-medium text-[#B9476D] hover:bg-[#FFF7FA] sm:w-auto sm:py-2"
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
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
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
                      className="h-[52px] rounded-2xl border border-red-100 bg-red-50 px-4 text-[13px] font-medium text-red-500 hover:bg-red-100 sm:h-auto"
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

        <div className="rounded-[22px] border border-zinc-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Attachments
              </h3>

              <p className="mt-1 text-[13px] leading-5 text-zinc-500">
                Upload lease agreement, insurance, HOA rules, addendums, or any
                supporting lease documents.
              </p>
            </div>

            <label className="w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-center text-[14px] font-medium text-[#B9476D] hover:bg-[#FFF7FA] sm:w-auto">
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
            <div className="mt-4 break-words rounded-2xl bg-[#F8F9FA] px-4 py-3 text-[13px] text-zinc-600">
              {attachments.Documents}
            </div>
          )}
        </div>
      </div>
    </>
  );
}