import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  source?: "auto" | "manual";
  manuallyEdited?: boolean;
};

type AttachmentItem = {
  id: string;
  name: string;
  type?: string;
  size?: number;
};

type LeaseStepProps = {
  leaseForm: LeaseForm;
  setLeaseForm: React.Dispatch<React.SetStateAction<LeaseForm>>;
  leaseSetupType?: "new" | "existing";
  setLeaseSetupType?: React.Dispatch<React.SetStateAction<"new" | "existing">>;
  leaseSetupConfirmed?: boolean;
  setLeaseSetupConfirmed?: React.Dispatch<React.SetStateAction<boolean>>;
  paymentTrackingStartDate?: string;
  setPaymentTrackingStartDate?: React.Dispatch<React.SetStateAction<string>>;
  additionalAmounts: AdditionalAmount[];
  addAdditionalAmount: (
    type?: string,
    amount?: string,
    options?: Pick<AdditionalAmount, "source" | "manuallyEdited">
  ) => void;
  updateAdditionalAmount: (
    id: number,
    field: "type" | "amount",
    value: string,
    options?: Partial<Pick<AdditionalAmount, "source" | "manuallyEdited">>
  ) => void;
  removeAdditionalAmount: (id: number) => void;
  attachments: Record<string, string>;
  documentAttachments?: AttachmentItem[];
  documentError?: string;
  handleDocumentsUpload: (files?: FileList | null) => void;
  removeDocumentAttachment?: (id: string) => void;
  validationAttempted?: number;
  isEditMode?: boolean;
};

const amountTypes = [
  "Prorated rent",
  "Late fee",
  "One-time fee",
  "One-time discount",
  "Cleaning fee",
  "Pet fee",
  "Parking",
  "Utilities",
  "Other",
];

export default function LeaseStep({
  leaseForm,
  setLeaseForm,
  leaseSetupType = "new",
  setLeaseSetupType,
  leaseSetupConfirmed,
  setLeaseSetupConfirmed,
  paymentTrackingStartDate = "",
  setPaymentTrackingStartDate,
  additionalAmounts,
  addAdditionalAmount,
  updateAdditionalAmount,
  removeAdditionalAmount,
  attachments,
  documentAttachments,
  documentError,
  handleDocumentsUpload,
  removeDocumentAttachment,
  validationAttempted = 0,
  isEditMode = false,
}: LeaseStepProps) {
  const [amountMenuOpen, setAmountMenuOpen] = useState(false);
  const [amountMenuPosition, setAmountMenuPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 256,
  });
  const [mounted, setMounted] = useState(false);
  const [rentTooltipOpen, setRentTooltipOpen] = useState(false);
  const [rentTooltipPinned, setRentTooltipPinned] = useState(false);
  const [confirmExistingSwitchOpen, setConfirmExistingSwitchOpen] =
    useState(false);
  const [invalidAmountIds, setInvalidAmountIds] = useState<Set<number>>(
    () => new Set()
  );
  const [localSetupConfirmed, setLocalSetupConfirmed] = useState(
    !setLeaseSetupType
  );
  const amountMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const amountMenuRef = useRef<HTMLDivElement | null>(null);
  const amountInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const rentTooltipButtonRef = useRef<HTMLButtonElement | null>(null);
  const rentTooltipRef = useRef<HTMLDivElement | null>(null);
  const proratedEditedRef = useRef(false);
  const proratedRemovedRef = useRef(false);
  const attachmentItems = documentAttachments || getAttachmentItems(attachments);
  const showLeaseSetupChoice = Boolean(setLeaseSetupType);
  const setupConfirmed = setLeaseSetupConfirmed
    ? Boolean(leaseSetupConfirmed)
    : localSetupConfirmed;
  const showLeaseForm = !showLeaseSetupChoice || setupConfirmed;
  const showSetupSelector =
    showLeaseSetupChoice && Boolean(setLeaseSetupType) && !setupConfirmed;
  const proratedAmount = calculateProratedRent(
    leaseForm.startDate,
    leaseForm.monthlyRent
  );
  const proratedDetails = getProrationDetails(
    leaseForm.startDate,
    leaseForm.monthlyRent
  );
  const hasAutoProratedRent = additionalAmounts.some(
    (item) => item.type === "Prorated rent" && item.source === "auto"
  );
  const newLeaseStartAllowed = isNewLeaseStartAllowed(leaseForm.startDate);
  const showNewLeaseStartWarning =
    !isEditMode &&
    leaseSetupType === "new" &&
    leaseForm.startDate.trim() &&
    !newLeaseStartAllowed;
  const availableAmountTypes =
    leaseSetupType === "existing"
      ? amountTypes.filter((type) => type !== "Prorated rent")
      : amountTypes;

  function applyLeaseSetupType(type: "new" | "existing") {
    setLeaseSetupType?.(type);
  }

  function requestLeaseSetupType(type: "new" | "existing") {
    if (
      type === "existing" &&
      leaseSetupType === "new" &&
      hasAutoProratedRent
    ) {
      setConfirmExistingSwitchOpen(true);
      return;
    }

    applyLeaseSetupType(type);
  }

  function confirmSwitchToExisting() {
    additionalAmounts
      .filter((item) => item.type === "Prorated rent")
      .forEach((item) => removeAdditionalAmount(item.id));

    proratedRemovedRef.current = false;
    proratedEditedRef.current = false;
    applyLeaseSetupType("existing");
    setConfirmExistingSwitchOpen(false);
  }

  function handleSelectAmountType(type: string) {
    addAdditionalAmount(type);
    setAmountMenuOpen(false);
  }

  function updateAmountMenuPosition() {
    const button = amountMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const preferredHeight = 256;
    const margin = 10;
    const viewportPadding = 16;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      160,
      Math.min(preferredHeight, shouldOpenAbove ? spaceAbove - margin : spaceBelow - margin)
    );
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - margin)
      : Math.min(rect.bottom + margin, window.innerHeight - maxHeight - viewportPadding);
    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding
    );

    setAmountMenuPosition({ top, left, maxHeight });
  }

  function toggleAmountMenu() {
    if (amountMenuOpen) {
      setAmountMenuOpen(false);
      return;
    }

    updateAmountMenuPosition();
    setAmountMenuOpen(true);
  }

  function updateSetupConfirmed(value: boolean) {
    if (setLeaseSetupConfirmed) {
      setLeaseSetupConfirmed(value);
      return;
    }

    setLocalSetupConfirmed(value);
  }

  function handleAmountChange(item: AdditionalAmount, value: string) {
    if (item.type === "Prorated rent") {
      proratedEditedRef.current = true;
    }

    updateAdditionalAmount(
      item.id,
      "amount",
      value,
      item.type === "Prorated rent"
        ? { manuallyEdited: true, source: item.source || "manual" }
        : undefined
    );

    if (isValidAmountValue(value)) {
      setInvalidAmountIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleRemoveAmount(item: AdditionalAmount) {
    if (item.type === "Prorated rent" && item.source === "auto") {
      proratedRemovedRef.current = true;
    }

    removeAdditionalAmount(item.id);
    setInvalidAmountIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  function handleAmountBlur(item: AdditionalAmount) {
    setInvalidAmountIds((current) => {
      const next = new Set(current);

      if (isValidAmountValue(item.amount)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }

      return next;
    });
  }

  function closeRentTooltip() {
    setRentTooltipOpen(false);
    setRentTooltipPinned(false);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!setPaymentTrackingStartDate || paymentTrackingStartDate) return;
    setPaymentTrackingStartDate(getNextFirstOfMonthDate());
  }, [paymentTrackingStartDate, setPaymentTrackingStartDate]);

  useEffect(() => {
    if (leaseForm.rentDueDay === "1st of the Month") return;

    setLeaseForm((current) => ({
      ...current,
      rentDueDay: "1st of the Month",
    }));
  }, [leaseForm.rentDueDay, setLeaseForm]);

  useEffect(() => {
    if (!rentTooltipOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        rentTooltipRef.current?.contains(target) ||
        rentTooltipButtonRef.current?.contains(target)
      ) {
        return;
      }

      closeRentTooltip();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRentTooltip();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [rentTooltipOpen]);

  useEffect(() => {
    if (!amountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        amountMenuRef.current?.contains(target) ||
        amountMenuButtonRef.current?.contains(target)
      ) {
        return;
      }

      setAmountMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAmountMenuOpen(false);
    }

    function handleViewportChange() {
      updateAmountMenuPosition();
    }

    updateAmountMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [amountMenuOpen]);

  useEffect(() => {
    if (!showLeaseSetupChoice) {
      return;
    }

    const proratedRows = additionalAmounts.filter(
      (item) => item.type === "Prorated rent"
    );

    if (leaseSetupType === "existing") {
      proratedRows.forEach((item) => removeAdditionalAmount(item.id));
      return;
    }

    const existing = proratedRows.find((item) => item.source === "auto");

    if (!proratedAmount) {
      if (existing) removeAdditionalAmount(existing.id);
      return;
    }

    if (!existing && !proratedRemovedRef.current) {
      addAdditionalAmount("Prorated rent", proratedAmount, {
        source: "auto",
        manuallyEdited: false,
      });
      proratedEditedRef.current = false;
      return;
    }

    if (
      existing &&
      !existing.manuallyEdited &&
      !proratedEditedRef.current &&
      existing.amount !== proratedAmount
    ) {
      updateAdditionalAmount(existing.id, "amount", proratedAmount, {
        source: "auto",
        manuallyEdited: false,
      });
    }
  }, [
    addAdditionalAmount,
    additionalAmounts,
    leaseSetupType,
    removeAdditionalAmount,
    proratedAmount,
    showLeaseSetupChoice,
    updateAdditionalAmount,
  ]);

  useEffect(() => {
    if (!validationAttempted) return;

    const firstInvalid = additionalAmounts.find(
      (item) => !isValidAmountValue(item.amount)
    );

    if (!firstInvalid) return;

    setInvalidAmountIds((current) => {
      const next = new Set(current);
      next.add(firstInvalid.id);
      return next;
    });

    const input = amountInputRefs.current[firstInvalid.id];
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    input?.focus();
  }, [additionalAmounts, validationAttempted]);

  return (
    <>
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.04em] sm:text-[25px]">
  Lease Details
</h1>

<p
  className={`text-[14.5px] leading-6 text-zinc-500 ${
    showSetupSelector ? "mt-3" : "mt-1"
  }`}
>
  Set lease terms and upload documents.
</p>
{isEditMode && (
  <p className="mt-2 text-[14.5px] leading-6 text-[#2563EB]">
    To extend this lease, update the end date and save your changes.
  </p>
)}
      </div>

      <div
        className={`space-y-4 sm:space-y-5 ${
          showSetupSelector ? "mt-8 sm:mt-9" : "mt-5 sm:mt-6"
        }`}
      >
        {showSetupSelector && setLeaseSetupType && (
          <div className="space-y-3">
            <div>
              <p className="text-[15px] font-semibold text-zinc-950">
                How are you setting up this lease?
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  value: "new" as const,
                  label: "New Lease",
                  helper:
                    "Choose this when the resident is starting soon, starting today, or started within the past 15 days. AvenueBoard can calculate a prorated first payment if the lease begins mid-month.",
                },
                {
                  value: "existing" as const,
                  label: "Existing Lease",
                  helper:
                    "Choose this when the resident already has an active lease or the lease started more than 15 days ago. AvenueBoard will manage future rent payments only, without recreating past payments.",
                },
              ].map((option) => {
                const active = leaseSetupType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
	                    onClick={() => requestLeaseSetupType(option.value)}
                    className={`w-full rounded-xl border p-4 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF]"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`text-[15px] font-semibold ${
                        active ? "text-[#1D4ED8]" : "text-zinc-950"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="mt-2 block text-[14px] leading-6 text-zinc-500">
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateSetupConfirmed(true)}
                className="h-11 rounded-xl bg-[#2563EB] px-6 text-[15px] font-semibold text-white transition hover:bg-[#1D4ED8] active:scale-[0.98]"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {showLeaseSetupChoice && setLeaseSetupType && setupConfirmed && (
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2 text-[14.5px]">
            <p className="font-medium text-zinc-700">
              Lease setup:{" "}
              <span className="font-semibold text-[#1D4ED8]">
                {leaseSetupType === "new" ? "New Lease" : "Existing Lease"}
              </span>
            </p>
            <button
              type="button"
              onClick={() => updateSetupConfirmed(false)}
              className="text-[14.5px] font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
            >
              Change
            </button>
          </div>
        )}

        {showLeaseForm && (
          <>
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

          <div className="block">
            <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2">
              <p className="text-[15px] font-medium text-zinc-900">
                Rent Due Day
              </p>
              <span
                className="relative inline-flex"
                onMouseEnter={() => setRentTooltipOpen(true)}
                onMouseLeave={() => {
                  if (!rentTooltipPinned) setRentTooltipOpen(false);
                }}
              >
                <button
                  ref={rentTooltipButtonRef}
                  type="button"
                  onClick={() => {
                    const nextPinned = !rentTooltipPinned;
                    setRentTooltipPinned(nextPinned);
                    setRentTooltipOpen(nextPinned || !rentTooltipOpen);
                  }}
                  onFocus={() => setRentTooltipOpen(true)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-200 text-[10px] font-semibold text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                  aria-expanded={rentTooltipOpen}
                  aria-label="Rent due day information"
                >
                  ?
                </button>
                {rentTooltipOpen && (
                  <div
                    ref={rentTooltipRef}
                    className="absolute left-1/2 top-full z-50 mt-3 w-[min(360px,calc(100vw-48px))] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-[0_20px_48px_rgba(15,23,42,0.16)] sm:w-[360px] sm:px-5 sm:py-4"
                  >
                    <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-zinc-200 bg-white" />
                    <p className="relative text-[14.5px] font-semibold text-zinc-950">
                      Monthly Rent Schedule
                    </p>
                    <div className="relative mt-2.5 space-y-2.5 text-[14px] font-normal leading-6 text-zinc-600">
                      <p>
                        AvenueBoard currently supports monthly rent payments due
                        on the 1st of each month.
                      </p>
                      {leaseSetupType === "new" ? (
                        <>
                          <p>
                            For new leases that begin mid-month, AvenueBoard
                            automatically calculates a prorated first payment.
                          </p>
                          <p>
                            You can review and edit the prorated amount under
                            Additional Amounts before completing setup.
                          </p>
                        </>
                      ) : (
                        <p>
                          For existing leases, AvenueBoard begins tracking rent
                          from the next payment cycle. Previous rent payments
                          won’t be recreated.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </span>
            </div>
            <div className="flex h-[52px] items-center rounded-xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-zinc-900 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
              1st of the Month
            </div>
          </div>
	        </div>

        {showNewLeaseStartWarning && (
          <p className="-mt-1 text-[13.5px] font-medium leading-5 text-red-500">
            This looks like an existing lease. Please use Existing Lease for
            leases that started more than 15 days ago.
          </p>
        )}
	
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

          {leaseSetupType === "new" ? (
            <div className="block">
              <div className="mb-1.5 sm:mb-2">
                <p className="text-[15px] font-medium text-zinc-900">
                  Security Deposit{" "}
                  <span className="text-[13.5px] text-zinc-400">(Optional)</span>
                </p>
              </div>
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
            </div>
          ) : (
            <div className="block">
              <div className="mb-1.5 sm:mb-2">
                <p className="text-[15px] font-medium text-zinc-900">
                  Rent payments will begin from
                </p>
              </div>
              <div
                className="flex h-[52px] items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-zinc-900 shadow-[0_1px_0_rgba(15,23,42,0.02)]"
                aria-readonly="true"
              >
                <span>{formatDisplayDate(paymentTrackingStartDate)}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4 shrink-0 text-zinc-400"
                >
                  <path
                    d="M6.5 3.25V5.5M13.5 3.25V5.5M4.25 8H15.75M5.75 4.75H14.25C15.08 4.75 15.75 5.42 15.75 6.25V14.25C15.75 15.08 15.08 15.75 14.25 15.75H5.75C4.92 15.75 4.25 15.08 4.25 14.25V6.25C4.25 5.42 4.92 4.75 5.75 4.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-2 text-[14px] leading-6 text-zinc-500">
                Previous rent payments won't be recreated. AvenueBoard will
                begin tracking rent from this payment cycle.
              </p>
            </div>
          )}
        </div>

        <div className="relative z-10 pb-2 pt-2 sm:pb-4 sm:pt-4">
          <div className="relative flex items-center justify-between gap-4 border-b border-zinc-100 pb-2.5">
            <p className="text-[15px] font-medium text-zinc-900">
              Additional Amounts
            </p>

            <button
              ref={amountMenuButtonRef}
              type="button"
              onClick={toggleAmountMenu}
              className="relative z-20 text-[14.5px] font-semibold text-[#2563EB] transition hover:text-[#1D4ED8] active:scale-[0.98]"
              aria-expanded={amountMenuOpen}
            >
              + Add
            </button>

            {mounted &&
              amountMenuOpen &&
              createPortal(
                <div
                  ref={amountMenuRef}
                  className="fixed z-[120] w-56 overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
                  style={{
                    top: amountMenuPosition.top,
                    left: amountMenuPosition.left,
                    maxHeight: amountMenuPosition.maxHeight,
                  }}
                >
	                  {availableAmountTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectAmountType(type)}
                      className="block w-full px-3.5 py-2.5 text-left text-[14px] font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                    >
                      {type}
                    </button>
                  ))}
                </div>,
                document.body
              )}
          </div>

          {additionalAmounts.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {additionalAmounts.map((item) => {
                const showAmountError = invalidAmountIds.has(item.id);
	                const helperNote =
	                  item.type === "Late fee"
	                    ? "Late fee applies automatically if rent remains unpaid more than 10 days after the due date."
	                    : "";
	                return (
                  <div
                    key={item.id}
                    className="grid items-start gap-2 py-2.5 sm:grid-cols-[1fr_150px_32px]"
                  >
                    <div className="min-w-0 pt-2">
                      <p className="text-[14.5px] font-medium text-zinc-800">
                        {item.type}
                      </p>
	                      {item.type === "Prorated rent" && proratedDetails && (
	                        <div className="mt-1 space-y-0.5 text-[14px] leading-5 text-zinc-500">
                            <p>Monthly rent: {formatMoney(proratedDetails.rent)}</p>
                            <p>Start date: {formatLongDate(proratedDetails.start)}</p>
                            <p>
                              Days charged: {proratedDetails.rangeLabel} ={" "}
                              {proratedDetails.daysCharged} days
                            </p>
                            <p>
                              Calculation: {formatMoney(proratedDetails.rent)} ÷{" "}
                              {proratedDetails.totalDays} ×{" "}
                              {proratedDetails.daysCharged} ={" "}
                              {formatMoney(proratedDetails.amount)}
                            </p>
                            {item.manuallyEdited && (
                              <p className="font-medium text-zinc-600">
                                Edited by landlord
                              </p>
                            )}
                          </div>
	                      )}
	                      {helperNote && (
	                        <p className="mt-1 text-[14px] leading-5 text-zinc-500">
	                          {helperNote}
	                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        ref={(node) => {
                          amountInputRefs.current[item.id] = node;
                        }}
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          handleAmountChange(item, e.target.value)
                        }
                        onBlur={() => handleAmountBlur(item)}
                        placeholder="$ Amount"
                        className={`${inputClass} ${
                          showAmountError
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : ""
                        }`}
                        aria-invalid={showAmountError}
                      />
                      {showAmountError && (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 rounded-xl border border-red-100 bg-white px-3 py-2 text-[13px] font-medium leading-5 text-red-600 shadow-[0_14px_34px_rgba(127,29,29,0.14)]">
                          <span className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-red-100 bg-white" />
                          Enter an amount or remove this item.
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveAmount(item)}
                        className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-zinc-400 transition hover:text-red-500 active:scale-[0.96]"
                        aria-label="Delete additional amount"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-4 w-4"
                        >
                          <path
                            d="M7.5 4.5H12.5M4.75 6.5H15.25M8 8.75V14M12 8.75V14M6.25 6.5L6.75 15.25C6.81 16.09 7.5 16.75 8.34 16.75H11.66C12.5 16.75 13.19 16.09 13.25 15.25L13.75 6.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-1 sm:pt-2">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-2.5">
            <p className="text-[15px] font-medium text-zinc-900">
              Attachments
            </p>

            <label className="cursor-pointer text-[14.5px] font-semibold text-[#2563EB] transition hover:text-[#1D4ED8] active:scale-[0.98]">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleDocumentsUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              + Upload Documents
            </label>
          </div>

          {documentError && (
            <p className="mt-2 text-[13.5px] font-medium leading-5 text-red-500">
              {documentError}
            </p>
          )}

          {attachmentItems.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {attachmentItems.map((item) => (
                <div
                  key={item.id}
                  className={`grid items-center gap-2 py-2.5 ${
                    removeDocumentAttachment ? "sm:grid-cols-[1fr_32px]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-medium text-zinc-800">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[14px] text-zinc-500">
                      {formatAttachmentDetail(item)}
                    </p>
                  </div>

                  {removeDocumentAttachment && (
                    <button
                      type="button"
                      onClick={() => removeDocumentAttachment(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-zinc-400 transition hover:text-red-500 active:scale-[0.96]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          d="M7.5 4.5H12.5M4.75 6.5H15.25M8 8.75V14M12 8.75V14M6.25 6.5L6.75 15.25C6.81 16.09 7.5 16.75 8.34 16.75H11.66C12.5 16.75 13.19 16.09 13.25 15.25L13.75 6.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[14px] leading-6 text-amber-700">
            Note: These documents will be attached to this lease and may be
            visible to the resident. Avoid uploading personal or unrelated
            files.
          </p>
        </div>
          </>
	        )}
	      </div>

        {mounted &&
          confirmExistingSwitchOpen &&
          createPortal(
            <div className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/30 px-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-zinc-950">
                  Switch to Existing Lease?
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-zinc-600">
                  AvenueBoard will remove the automatically calculated prorated
                  rent. You can still add any one-time adjustments manually
                  under Additional Amounts.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmExistingSwitchOpen(false)}
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSwitchToExisting}
                    className="h-10 rounded-xl bg-[#2563EB] px-4 text-[14px] font-semibold text-white transition hover:bg-[#1D4ED8] active:scale-[0.98]"
                  >
                    Switch to Existing Lease
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
	    </>
	  );
	}

function getAttachmentItems(attachments: Record<string, string>) {
  if (attachments.DocumentDetails) {
    try {
      return JSON.parse(attachments.DocumentDetails) as AttachmentItem[];
    } catch {
      return [];
    }
  }

  return (attachments.Documents || "")
    .split(",")
    .map((name, index) => name.trim() && { id: `${name}-${index}`, name })
    .filter(Boolean) as AttachmentItem[];
}

function formatAttachmentDetail(item: AttachmentItem) {
  const type = item.type || getFileExtension(item.name) || "Document";
  const size = typeof item.size === "number" ? formatFileSize(item.size) : "";

  return [type, size].filter(Boolean).join(" · ");
}

function getFileExtension(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toUpperCase() : "";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDisplayDate(value: string) {
  const date = parseLocalDate(value);

  if (!date) return "Automatically calculated";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isValidAmountValue(value: string) {
  return value.trim() !== "" && Number(value) > 0;
}

function calculateProratedRent(startDate: string, monthlyRent: string) {
  const details = getProrationDetails(startDate, monthlyRent);

  return details ? details.amount.toFixed(2) : "";
}

function getProrationDetails(startDate: string, monthlyRent: string) {
  const rent = Number(monthlyRent);
  const start = parseLocalDate(startDate);

  if (!start || !Number.isFinite(rent) || rent <= 0 || start.getDate() === 1) {
    return null;
  }

  const totalDays = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    0
  ).getDate();
  const daysCharged = totalDays - start.getDate() + 1;
  const amount = Math.round((rent / totalDays) * daysCharged * 100) / 100;
  const end = new Date(start.getFullYear(), start.getMonth(), totalDays);

  return {
    rent,
    start,
    end,
    totalDays,
    daysCharged,
    amount,
    rangeLabel: `${formatMonthDay(start)}–${formatMonthDay(end)}`,
  };
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getNextFirstOfMonthDate() {
  const today = new Date();
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return formatDateInput(nextFirst);
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function isNewLeaseStartAllowed(value: string) {
  const start = parseLocalDate(value);
  if (!start) return false;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const earliestAllowed = new Date(todayStart);
  earliestAllowed.setDate(todayStart.getDate() - 15);

  return start >= earliestAllowed;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
