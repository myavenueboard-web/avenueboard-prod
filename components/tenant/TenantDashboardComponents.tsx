"use client";

import type React from "react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  FileText,
  Home,
  Mail,
  StickyNote,
  Trash2,
} from "lucide-react";
import type {
  LeaseDocument,
  PaymentMethod,
  PropertyContact,
  PropertyNote,
  RentPayment,
  TenantActivity,
  TenantLease,
  UserInfo,
} from "@/lib/tenant/tenantTypes";
import {
  formatBrand,
  formatCurrency,
  formatDate,
  formatFileSize,
  getFileLabel,
  getMonthsRemaining,
  getTimeBasedGreeting,
} from "@/lib/tenant/tenantFormatters";
import {
  findCollectedPaymentForCycle,
  getPaymentMonthKey,
} from "@/lib/rentPaymentClassification";

type PaymentProgressStatus = "paid" | "upcoming" | "late" | "future";
type PaymentProgressRow = {
  id: string;
  month: string;
  year: number;
  cycleDate: Date;
  amount: number;
  status: PaymentProgressStatus;
  subtext: string;
};
type PaymentSummaryState = {
  label: string;
  amount: string;
  subtext: string;
  messageTone: "error" | "neutral";
};
const paymentHistoryGridTemplate = "56px 1.8fr 1fr 1.25fr 0.9fr 0.8fr";

export function PaymentHero({
  lease,
  paymentMethods,
  rentPayments,
  leaseDocuments,
  propertyContact,
  userInfo,
  firstName,
  paymentAction,
  paymentActionError,
  onPayNow,
  onSetupAutoPay,
  onDisableAutoPay,
}: {
  lease?: TenantLease;
  paymentMethods: PaymentMethod[];
  rentPayments: RentPayment[];
  leaseDocuments: LeaseDocument[];
  propertyContact: PropertyContact | null;
  userInfo: UserInfo;
  firstName: string;
  paymentAction?: "pay-now" | "autopay" | null;
  paymentActionError?: string;
  onPayNow?: () => void;
  onSetupAutoPay?: () => void;
  onDisableAutoPay?: () => Promise<boolean>;
}) {
  const [leaseDetailsOpen, setLeaseDetailsOpen] = useState(false);
  const [autoPayManagerOpen, setAutoPayManagerOpen] = useState(false);
  const activePaymentMethods = paymentMethods.filter(
    (method) =>
      method.autopay_enrolled !== false &&
      String(method.autopay_status || "").toLowerCase() !== "disabled"
  );
  const defaultMethod =
    activePaymentMethods.find((method) => method.is_default) ||
    activePaymentMethods[0] ||
    paymentMethods.find((method) => method.is_default) ||
    paymentMethods[0];
  const greeting = getTimeBasedGreeting();
  const rentUnavailable = !lease || Number(lease.monthly_rent || 0) <= 0;
  const leaseEnded = isTenantLeaseEnded(lease);
  const payNowEligibility = getPayNowEligibility(lease, rentPayments);
  const paymentDisabled =
    Boolean(paymentAction) ||
    rentUnavailable ||
    leaseEnded ||
    !payNowEligibility.canPay;
  const autoPayEnrolled = Boolean(
    !leaseEnded &&
    defaultMethod &&
      defaultMethod.autopay_enrolled !== false &&
      String(defaultMethod.autopay_status || "").toLowerCase() !== "disabled"
  );
  const paymentMethodLabel = defaultMethod
    ? `${formatBrand(defaultMethod.brand)} ending in ${defaultMethod.last4 || "0000"}`
    : "Auto-pay not enrolled";
  const paymentSummary = buildPaymentSummaryState(lease, rentPayments);
  const actionMessage =
    leaseEnded
      ? "Online rent payments are no longer available for this lease."
      : paymentActionError === "You have no payment due at this time."
      ? "No payment due at this time."
      : paymentActionError || (!payNowEligibility.canPay && !rentUnavailable
        ? "No payment due at this time."
        : "");
  const actionMessageIsNeutral = Boolean(
    leaseEnded ||
      (actionMessage &&
      actionMessage.toLowerCase().includes("no") &&
      actionMessage.toLowerCase().includes("payment") &&
      actionMessage.toLowerCase().includes("due"))
  );

  return (
    <>
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5">
      <div className="grid h-full grid-rows-[150px_minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_310px] items-center gap-6">
          <div className="translate-x-5">
            <p className="text-[18px] font-medium tracking-[-0.04em] text-slate-800">
              {greeting}, {firstName}
            </p>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] leading-4 text-zinc-500">
              {paymentSummary.label}
            </p>

            <div className="mt-1 flex items-end gap-8">
              <h1 className="text-[52px] font-[600] leading-none tracking-[-0.075em] text-slate-950">
                {paymentSummary.amount}
              </h1>

              <div className="mb-1 flex items-center gap-5">
                <div className="h-12 w-px bg-zinc-200" />

                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-medium leading-5 text-zinc-500">
                    ⓘ{" "}
                    {autoPayEnrolled ? "AutoPay Active" : "Auto-pay not enrolled"}
                  </p>

                  <p className="mt-1 text-[14px] font-semibold leading-5 text-zinc-900">
                    {autoPayEnrolled
                      ? paymentMethodLabel
                      : paymentSummary.subtext}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 -translate-x-6">
            <button
              type="button"
              onClick={onPayNow}
              disabled={paymentDisabled}
              className="group flex h-[48px] w-full items-center justify-center gap-6 rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {paymentAction === "pay-now" ? "Redirecting..." : "Pay Now"}
              <span className="transition group-hover:translate-x-1">→</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoPayManagerOpen(true)}
              disabled={Boolean(paymentAction) || !lease || leaseEnded}
              className="h-[48px] w-full rounded-xl border border-zinc-300 bg-white text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentAction === "autopay"
                ? "Redirecting..."
                : autoPayEnrolled
                ? "Manage AutoPay"
                : "Set up AutoPay"}
            </button>
            {(actionMessage || rentUnavailable) && (
              <p
                className={`text-[12px] font-medium leading-5 ${
                  actionMessageIsNeutral
                    ? "text-zinc-500"
                    : actionMessage || rentUnavailable
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {actionMessage ||
                  "Rent amount is unavailable for this lease."}
              </p>
            )}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-4">
          <AvenuePerksCard />
          <CreditBuildingCard />
          <LeaseDetailsCard lease={lease} onClick={() => setLeaseDetailsOpen(true)} />
        </div>
      </div>
    </section>

    {leaseDetailsOpen && (
      <LeaseDetailsModal
        lease={lease}
        payments={rentPayments}
        leaseDocuments={leaseDocuments}
        propertyContact={propertyContact}
        userInfo={userInfo}
        onClose={() => setLeaseDetailsOpen(false)}
      />
    )}
    {autoPayManagerOpen && (
      <AutoPayManagementModal
        lease={lease}
        paymentMethod={defaultMethod}
        autoPayActive={autoPayEnrolled}
        nextEligiblePaymentDate={getNextEligiblePaymentDate(lease, rentPayments)}
        replacing={paymentAction === "autopay"}
        onClose={() => setAutoPayManagerOpen(false)}
        onReplacePaymentMethod={() => onSetupAutoPay?.()}
        onDisableAutoPay={onDisableAutoPay}
      />
    )}
    </>
  );
}

function AutoPayManagementModal({
  lease,
  paymentMethod,
  autoPayActive,
  nextEligiblePaymentDate,
  replacing,
  onClose,
  onReplacePaymentMethod,
  onDisableAutoPay,
}: {
  lease?: TenantLease;
  paymentMethod?: PaymentMethod;
  autoPayActive: boolean;
  nextEligiblePaymentDate: string;
  replacing: boolean;
  onClose: () => void;
  onReplacePaymentMethod: () => void;
  onDisableAutoPay?: () => Promise<boolean>;
}) {
  const [disabling, setDisabling] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const methodLabel = paymentMethod
    ? `${formatBrand(paymentMethod.brand)} ending in ${paymentMethod.last4 || "0000"}`
    : "No payment method saved";

  async function handleDisable() {
    if (!onDisableAutoPay || disabling) return;

    setDisabling(true);
    setMessage(null);
    const ok = await onDisableAutoPay();
    setDisabling(false);

    setMessage(
      ok
        ? {
            type: "success",
            text: "AutoPay has been turned off for this lease.",
          }
        : {
            type: "error",
            text: "Unable to disable AutoPay right now. Please try again.",
          }
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close AutoPay management"
      />
      <section className="relative w-full max-w-[560px] rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-[25px] font-medium tracking-[-0.05em] text-zinc-950">
              Manage AutoPay
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-6 text-zinc-500">
              Review payment setup for {lease?.property_label || "this rental"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[20px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-6 divide-y divide-zinc-100 border-y border-zinc-100">
          <AutoPayDetailRow
            label="AutoPay status"
            value={autoPayActive ? "Active" : "Not active"}
            valueClass={autoPayActive ? "text-emerald-700" : "text-zinc-700"}
          />
          <AutoPayDetailRow label="Payment method" value={methodLabel} />
          <AutoPayDetailRow
            label="Next eligible payment"
            value={nextEligiblePaymentDate}
          />
        </div>

        {message && (
          <p
            className={`mt-5 rounded-2xl border px-4 py-3 text-[13px] font-medium leading-5 ${
              message.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-red-100 bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            onClick={onReplacePaymentMethod}
            disabled={replacing || !lease}
            className="h-12 rounded-2xl bg-[#0F172A] text-[14px] font-semibold text-white transition hover:bg-[#182338] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {replacing
              ? "Redirecting..."
              : autoPayActive
              ? "Replace payment method"
              : "Enable AutoPay / Set up AutoPay"}
          </button>

          {autoPayActive && (
            <button
              type="button"
              onClick={handleDisable}
              disabled={disabling || replacing}
              className="h-12 rounded-2xl border border-red-100 bg-white text-[14px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disabling ? "Disabling..." : "Disable AutoPay"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function AutoPayDetailRow({
  label,
  value,
  valueClass = "text-zinc-950",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-5 py-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className={`min-w-0 truncate text-[14px] font-semibold ${valueClass}`}>
        {value || "Not available"}
      </p>
    </div>
  );
}

function AvenuePerksCard() {
  function openAvenuePerks() {
    window.location.href = "/member-benefits?section=avenue-perks";
  }

  return (
    <button
      type="button"
      onClick={openAvenuePerks}
      aria-label="Open Avenue Perks"
      className="group min-h-0 cursor-pointer overflow-hidden rounded-[22px] border border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] p-4 text-left shadow-none transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <IconBox>✦</IconBox>

            <div>
              <h3 className="text-[15px] font-medium tracking-[-0.04em]">
                Avenue Perks
              </h3>
              <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                Exclusive benefits for residents.
              </p>
            </div>
          </div>

          <span className="shrink-0 text-[12px] font-semibold text-zinc-900 transition group-hover:text-zinc-700">
            View →
          </span>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-2">
            <p className="text-[30px] font-semibold tracking-[-0.06em]">3</p>
            <p className="pb-1 text-[12px] leading-5 text-zinc-500">
              benefits available
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <BenefitBubble label="S" className="bg-slate-950 text-white" />
            <BenefitBubble
              label="hulu"
              className="bg-black text-[10px] text-green-400"
            />
            <BenefitBubble
              label="Uber"
              className="bg-slate-950 text-[10px] text-white"
            />
            <BenefitBubble
              label="+3"
              className="bg-zinc-100 text-[10px] text-zinc-700"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function CreditBuildingCard() {
  function openCreditBuilding() {
    window.location.href = "/member-benefits?section=credit-building";
  }

  return (
    <button
      type="button"
      onClick={openCreditBuilding}
      aria-label="Open Credit Building"
      className="group min-h-0 cursor-pointer overflow-hidden rounded-[22px] border border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] p-4 text-left shadow-none transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[17px] text-emerald-700">
              ✓
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.04em]">
                Credit Building
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-normal text-emerald-700">
                  Active
                </span>
              </h3>
              <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
                Build credit with on-time rent.
              </p>
            </div>
          </div>

          <span className="shrink-0 text-[12px] font-semibold text-zinc-900 transition group-hover:text-zinc-700">
            View →
          </span>
        </div>

        <div className="mt-auto">
          <p className="text-[12px] font-medium leading-5 text-zinc-500">
            Reporting to 3 bureaus
          </p>

          <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
            <span className="text-indigo-700">Experian</span>
            <span className="text-red-700">Equifax</span>
            <span className="text-sky-600">TransUnion</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function LeaseDetailsCard({
  lease,
  onClick,
}: {
  lease?: TenantLease;
  onClick: () => void;
}) {
  const monthsRemaining = getMonthsRemaining(lease?.end_date);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Lease Details"
      className="group min-h-0 cursor-pointer overflow-hidden rounded-[22px] border border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] p-4 text-left shadow-none transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <FileCheck2 size={18} strokeWidth={1.9} aria-hidden="true" />
          </div>

          <div>
            <h3 className="text-[15px] font-medium tracking-[-0.04em]">
              Lease Details
            </h3>
            <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">Active lease</p>
          </div>
        </div>

        <span className="shrink-0 text-[12px] font-semibold text-zinc-900 transition group-hover:text-zinc-700">
          View →
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[30px] font-semibold tracking-[-0.06em]">
          {monthsRemaining}
        </p>
        <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
          months remaining
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-zinc-100">
        <div className="h-2 w-[46%] rounded-full bg-slate-950" />
      </div>
    </button>
  );
}

function LeaseDetailsModal({
  lease,
  payments,
  leaseDocuments,
  propertyContact,
  userInfo,
  onClose,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
  leaseDocuments: LeaseDocument[];
  propertyContact: PropertyContact | null;
  userInfo: UserInfo;
  onClose: () => void;
}) {
  const monthsRemaining = getMonthsRemaining(lease?.end_date);
  const nextEligiblePaymentDate = getNextEligiblePaymentDate(lease, payments);
  const progressPercent = getLeaseProgressPercent(lease);
  const propertyAddress = formatLeaseAddress(lease);
  const primaryLeaseDocument =
    leaseDocuments.find((doc) => doc.file_type?.includes("pdf")) ||
    leaseDocuments[0] ||
    null;
  const landlordName = propertyContact?.display_name || "Not available";
  const landlordEmail = propertyContact?.email || "Not available";
  const tenantName = userInfo.name || "Not available";
  const tenantEmail = userInfo.email || "Not available";
  const optionalTimelineRows = [
    {
      label: "Lease added to AvenueBoard",
      value: lease?.lease_created_at,
    },
    {
      label: "Resident invite sent",
      value: lease?.tenant_access_created_at,
    },
    {
      label: "Resident Board created",
      value: userInfo.created_at || lease?.tenant_access_created_at,
    },
  ].filter((row) => Boolean(row.value));

  return (
    <LargeTenantModal
      title="Lease Details"
      count={monthsRemaining}
      eyebrow="View your current lease, property, and access details."
      panelClassName="h-[86vh] w-[min(1280px,94vw)] min-h-[640px] rounded-[28px]"
      onClose={onClose}
    >
      <div className="space-y-7">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                Lease Overview
              </p>
              <h3 className="mt-3 text-[31px] font-medium leading-none tracking-[-0.06em] text-zinc-950">
                {lease?.property_label || "Property"}
              </h3>
              <p className="mt-3 max-w-[760px] text-[14px] font-medium leading-6 text-zinc-500">
                {propertyAddress}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[42px] font-semibold leading-none tracking-[-0.07em] text-zinc-950">
                {monthsRemaining}
              </p>
              <p className="mt-1 text-[12px] font-medium text-zinc-500">
                months remaining
              </p>
              <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                Active lease
              </p>
            </div>
          </div>

          <div className="mt-6 h-2 rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full bg-slate-950"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-4 gap-x-8 gap-y-5 border-t border-zinc-100 pt-5">
            <LeaseDetailField label="Unit" value={lease?.unit_name || "Not available"} />
            <LeaseDetailField
              label="Monthly rent"
              value={formatCurrency(Number(lease?.monthly_rent || 0))}
            />
            <LeaseDetailField label="Lease status" value="Active" />
            <LeaseDetailField
              label="Next eligible payment"
              value={nextEligiblePaymentDate}
            />
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] gap-8">
          <section>
            <LeaseSectionTitle
              title="Lease Timeline"
              subtitle="Important dates and payment cadence for this lease."
            />
            <div className="mt-4 divide-y divide-zinc-100 border-y border-zinc-100">
              <LeaseDetailRow label="Lease start date" value={formatDate(lease?.start_date)} />
              <LeaseDetailRow label="Lease end date" value={formatDate(lease?.end_date)} />
              <LeaseDetailRow
                label="Rent due day"
                value={getRentDueDayLabel(lease?.rent_due_day)}
              />
              <LeaseDetailRow
                label="Next eligible payment"
                value={nextEligiblePaymentDate}
              />
              {optionalTimelineRows.map((row) => (
                <LeaseDetailRow
                  key={row.label}
                  label={row.label}
                  value={formatDate(row.value)}
                />
              ))}
            </div>
          </section>

          <div className="space-y-8">
            <section>
              <LeaseSectionTitle
                title="People / Access"
                subtitle="Contacts connected to this rental workspace."
              />
              <div className="mt-4 divide-y divide-zinc-100 border-y border-zinc-100">
                <LeaseDetailRow label="Tenant name" value={tenantName} />
                <LeaseDetailRow label="Tenant email" value={tenantEmail} />
                <LeaseDetailRow label="Landlord name" value={landlordName} />
                <LeaseDetailRow label="Landlord email" value={landlordEmail} />
              </div>
            </section>

            <section>
              <LeaseSectionTitle
                title="Documents"
                subtitle="Lease files shared in AvenueBoard."
              />
              <div className="mt-4 border-y border-zinc-100 py-4">
                {primaryLeaseDocument ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-zinc-950">
                        {primaryLeaseDocument.file_name || "Lease document"}
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-zinc-500">
                        Uploaded {formatNullableDate(primaryLeaseDocument.created_at)}
                      </p>
                    </div>
                    {primaryLeaseDocument.file_url ? (
                      <a
                        href={primaryLeaseDocument.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-[12px] font-semibold text-zinc-950 transition hover:text-zinc-600"
                      >
                        View lease document →
                      </a>
                    ) : (
                      <span className="shrink-0 text-[12px] font-medium text-zinc-400">
                        File unavailable
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] font-medium leading-6 text-zinc-500">
                    No lease document uploaded yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </LargeTenantModal>
  );
}

function LeaseSectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h3 className="text-[18px] font-medium tracking-[-0.045em] text-zinc-950">
        {title}
      </h3>
      <p className="mt-1 text-[13px] font-medium leading-6 text-zinc-500">
        {subtitle}
      </p>
    </div>
  );
}

function LeaseDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[14px] font-semibold text-zinc-950">
        {value || "Not available"}
      </p>
    </div>
  );
}

function LeaseDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(150px,0.62fr)_minmax(0,1fr)] gap-6 py-3.5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
        {label}
      </p>
      <p className="min-w-0 truncate text-[14px] font-semibold text-zinc-950">
        {value || "Not available"}
      </p>
    </div>
  );
}

export function NotesDocumentsCard({
  notes,
  notesLoading,
  noteError,
  documents,
  documentsLoading,
  documentError,
  uploadingDocument,
  fileInputRef,
  profileId,
  deletingNoteId,
  deletingDocumentId,
  onAddNote,
  onDocumentUpload,
  onViewDocument,
  onDownloadDocument,
  onDeleteNote,
  onDeleteDocument,
  onViewAllNotes,
  onViewAllDocuments,
}: {
  notes: PropertyNote[];
  notesLoading: boolean;
  noteError: string;
  documents: LeaseDocument[];
  documentsLoading: boolean;
  documentError: string;
  uploadingDocument: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  profileId: string;
  deletingNoteId: string;
  deletingDocumentId: string;
  onAddNote: () => void;
  onDocumentUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewDocument: (doc: LeaseDocument) => void;
  onDownloadDocument: (doc: LeaseDocument) => void;
  onDeleteNote: (note: PropertyNote) => void;
  onDeleteDocument: (doc: LeaseDocument) => void;
  onViewAllNotes: () => void;
  onViewAllDocuments: () => void;
}) {
  const visibleDocs = documents.slice(0, 2);
  const visibleNotes = notes.slice(0, 3);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] gap-5">
        <div className="flex min-h-0 flex-col pr-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium tracking-[-0.045em] text-zinc-950">
                Notes
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold leading-5 text-zinc-500">
                {notes.length}
              </span>

              <button
                onClick={onAddNote}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50"
              >
                + Add
              </button>
            </div>

            <button
              onClick={onViewAllNotes}
              className="text-[13px] font-semibold leading-5 text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
            >
              View all notes →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {notesLoading ? (
              <SectionState
                title="Loading notes"
                subtitle="Preparing your private lease space."
              />
            ) : noteError ? (
              <SectionState title="Notes unavailable" subtitle={noteError} />
            ) : visibleNotes.length > 0 ? (
              visibleNotes.map((note) => {
                const tenantOwned =
                  note.profile_id === profileId &&
                  note.created_by_role === "tenant";

                return (
                  <NotePreview
                    key={note.id}
                    type={
                      note.note_type === "private" ? "Private Note" : "Shared Note"
                    }
                    text={note.text}
                    variant={note.note_type}
                    createdAt={note.created_at}
                    author={note.created_by_role}
                    canDelete={tenantOwned}
                    deleting={deletingNoteId === note.id}
                    onDelete={() => onDeleteNote(note)}
                  />
                );
              })
            ) : (
              <SectionState
                title="No notes yet"
                subtitle="Keep private reminders or share updates here."
              />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-l border-zinc-200 pl-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium tracking-[-0.045em] text-zinc-950">
                Property Documents
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold leading-5 text-zinc-500">
                {documents.length}
              </span>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDocument}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50 disabled:opacity-60"
              >
                {uploadingDocument ? "Uploading" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={onDocumentUpload}
              />
            </div>

            <button
              onClick={onViewAllDocuments}
              className="text-[13px] font-semibold leading-5 text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
            >
              View all →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {documentsLoading ? (
              <SectionState
                title="Loading documents"
                subtitle="Checking your shared lease files."
              />
            ) : documentError ? (
              <SectionState title="Document action needed" subtitle={documentError} />
            ) : visibleDocs.length > 0 ? (
              visibleDocs.map((doc) => {
                const tenantOwned = doc.uploaded_by_profile_id === profileId;

                return (
                  <DocumentTile
                    key={doc.id}
                    doc={doc}
                    canDelete={tenantOwned}
                    deleting={deletingDocumentId === doc.id}
                    onView={() => onViewDocument(doc)}
                    onDownload={() => onDownloadDocument(doc)}
                    onDelete={() => onDeleteDocument(doc)}
                  />
                );
              })
            ) : (
              <SectionState
                title="No documents yet"
                subtitle="Lease files and shared uploads will live here."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NotePreview({
  type,
  text,
  variant,
  createdAt,
  author,
  canDelete,
  deleting,
  onDelete,
}: {
  type: string;
  text: string;
  variant: "private" | "shared";
  createdAt?: string | null;
  author?: "landlord" | "tenant";
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const styles =
    variant === "private"
      ? "border-[#FFE1A8] bg-[#FFF8EA]"
      : "border-[#D4E9FF] bg-[#EFF7FF]";

  const badge =
    variant === "private"
      ? "bg-[#FFE8B8] text-[#8A5A00]"
      : "bg-[#DCEEFF] text-[#1D5F9F]";

  return (
    <div className={`group relative min-h-[86px] rounded-2xl border px-4 py-4 ${styles}`}>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badge}`}
        >
          {type}
        </span>

        {canDelete ? (
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete note"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-zinc-400 opacity-0 transition-all duration-200 hover:bg-white hover:text-red-500 disabled:opacity-50 group-hover:opacity-100"
          >
            {deleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
            ) : (
              <TrashIcon />
            )}
          </button>
        ) : (
          <span className="h-8 w-8" />
        )}
      </div>

      <p className="min-w-0 pr-40 text-[13px] font-medium leading-5 tracking-[-0.01em] text-zinc-900">
        {text}
      </p>

      <div className="mt-3">
        <p className="min-w-0 text-[12px] font-medium leading-5 text-zinc-500">
          {formatDate(createdAt)} •{" "}
          {author === "landlord" ? "Created by landlord" : "Created by tenant"}
          {variant === "shared" && (
            <>
              {" "}•{" "}
              {author === "landlord" ? "Shared with tenant" : "Shared with landlord"}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SectionState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] px-4 py-5">
      <p className="text-[13px] font-medium leading-5 text-zinc-950">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-zinc-500">{subtitle}</p>
    </div>
  );
}

export function ViewAllNotesModal({
  notes,
  loading,
  error,
  profileId,
  deletingNoteId,
  onClose,
  onDeleteNote,
}: {
  notes: PropertyNote[];
  loading: boolean;
  error: string;
  profileId: string;
  deletingNoteId: string;
  onClose: () => void;
  onDeleteNote: (note: PropertyNote) => void;
}) {
  return (
    <LargeTenantModal
      title="Notes"
      count={notes.length}
      eyebrow="Private reminders and shared lease updates"
      onClose={onClose}
    >
      {loading ? (
        <SectionState
          title="Loading notes"
          subtitle="Preparing your private lease space."
        />
      ) : error ? (
        <SectionState title="Notes unavailable" subtitle={error} />
      ) : notes.length > 0 ? (
        <div className="grid gap-3">
          {notes.map((note) => {
            const tenantOwned =
              note.profile_id === profileId && note.created_by_role === "tenant";

            return (
              <NotePreview
                key={note.id}
                type={
                  note.note_type === "private" ? "Private Note" : "Shared Note"
                }
                text={note.text}
                variant={note.note_type}
                createdAt={note.created_at}
                author={note.created_by_role}
                canDelete={tenantOwned}
                deleting={deletingNoteId === note.id}
                onDelete={() => onDeleteNote(note)}
              />
            );
          })}
        </div>
      ) : (
        <SectionState
          title="No notes yet"
          subtitle="Keep private reminders or share updates here."
        />
      )}
    </LargeTenantModal>
  );
}

export function ViewAllDocumentsModal({
  documents,
  loading,
  error,
  profileId,
  deletingDocumentId,
  onClose,
  onViewDocument,
  onDownloadDocument,
  onDeleteDocument,
}: {
  documents: LeaseDocument[];
  loading: boolean;
  error: string;
  profileId: string;
  deletingDocumentId: string;
  onClose: () => void;
  onViewDocument: (doc: LeaseDocument) => void;
  onDownloadDocument: (doc: LeaseDocument) => void;
  onDeleteDocument: (doc: LeaseDocument) => void;
}) {
  return (
    <LargeTenantModal
      title="Property Documents"
      count={documents.length}
      eyebrow="Lease files, shared uploads, and resident documents"
      onClose={onClose}
    >
      {loading ? (
        <SectionState
          title="Loading documents"
          subtitle="Checking your shared lease files."
        />
      ) : error ? (
        <SectionState title="Document action needed" subtitle={error} />
      ) : documents.length > 0 ? (
        <div className="grid gap-3">
          {documents.map((doc) => {
            const tenantOwned = doc.uploaded_by_profile_id === profileId;

            return (
              <DocumentTile
                key={doc.id}
                doc={doc}
                canDelete={tenantOwned}
                deleting={deletingDocumentId === doc.id}
                onView={() => onViewDocument(doc)}
                onDownload={() => onDownloadDocument(doc)}
                onDelete={() => onDeleteDocument(doc)}
              />
            );
          })}
        </div>
      ) : (
        <SectionState
          title="No documents yet"
          subtitle="Lease files and shared uploads will live here."
        />
      )}
    </LargeTenantModal>
  );
}

export function ViewMoreActivitiesModal({
  activities,
  onClose,
}: {
  activities: TenantActivity[];
  onClose: () => void;
}) {
  return (
    <LargeTenantModal
      title="Recent Activity"
      count={activities.length}
      eyebrow=""
      onClose={onClose}
    >
      {activities.length > 0 ? (
        <div className="grid gap-3">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <SectionState
          title="No recent activity"
          subtitle="Payments, notes, and document updates will appear here."
        />
      )}
    </LargeTenantModal>
  );
}

function LargeTenantModal({
  title,
  count,
  eyebrow,
  panelClassName,
  onClose,
  children,
}: {
  title: string;
  count: number;
  eyebrow: string;
  panelClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/30 px-5 py-6 backdrop-blur-sm">
      <div
        className={`flex h-[72vh] w-[min(1120px,92vw)] min-h-[520px] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.28)] ${
          panelClassName || ""
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-zinc-200 px-7 py-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[25px] font-medium tracking-[-0.045em] text-zinc-950">
                {title}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold leading-5 text-zinc-500">
                {count}
              </span>
            </div>
            <p className="mt-1 text-[13px] font-medium leading-6 text-zinc-500">{eyebrow}</p>
          </div>

          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[20px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

export function RecentActivityCard({
  activities,
  onViewMore,
}: {
  activities: TenantActivity[];
  onViewMore: () => void;
}) {
  const visibleActivities = activities.slice(0, 4);
  const emptySlots = Math.max(0, 4 - visibleActivities.length);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-none">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-[20px] font-medium tracking-[-0.045em] text-slate-950">
            Recent Activity
          </h2>
        </div>

        <button
          onClick={onViewMore}
          className="text-[12.5px] font-semibold leading-5 text-slate-950 transition hover:text-slate-700 active:scale-[0.96]"
        >
          View more activity →
        </button>
      </div>

      {visibleActivities.length > 0 ? (
        <div className="grid grid-cols-4 divide-x divide-zinc-200 px-3 py-1">
          {visibleActivities.map((activity) => (
            <ActivityMini key={activity.id} activity={activity} />
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-activity-${index}`} className="min-h-[78px]" />
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <SectionState
            title="No recent activity"
            subtitle="Payments, notes, and document updates will appear here."
          />
        </div>
      )}
    </section>
  );
}

export function PaymentProgressCard({
  lease,
  payments,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const progressListRef = useRef<HTMLDivElement | null>(null);
  const rows = buildPaymentProgress(lease, payments);
  const leaseEndDate = lease?.end_date || lease?.start_date || null;
  const finalRows = rows.filter((row) => {
    if (!leaseEndDate) return true;
    if (!row.cycleDate) return false;

    const leaseEndMonth = getLeaseCoveredEndMonthStart(
      lease?.start_date || leaseEndDate,
      leaseEndDate
    );
    const rowCycleMonth = startOfPaymentMonth(row.cycleDate);

    return rowCycleMonth <= leaseEndMonth;
  });
  const summary = buildPaymentProgressSummary(finalRows);
  const visibleStartIndex = getPaymentProgressVisibleStartIndex(finalRows);
  const visibleStartRowId = finalRows[visibleStartIndex]?.id || "";
  const rowSignature = finalRows
    .map((row) => `${row.id}:${row.status}`)
    .join("|");

  useEffect(() => {
    const list = progressListRef.current;

    if (!list || finalRows.length <= 5 || visibleStartIndex < 0) return;

    window.requestAnimationFrame(() => {
      const visibleStartRow = list.querySelector<HTMLElement>(
        `[data-payment-row-id="${visibleStartRowId}"]`
      );

      if (!visibleStartRow || list.scrollHeight <= list.clientHeight) return;

      const listRect = list.getBoundingClientRect();
      const rowRect = visibleStartRow.getBoundingClientRect();

      list.scrollTop = Math.max(
        0,
        rowRect.top - listRect.top + list.scrollTop
      );
    });
  }, [finalRows.length, rowSignature, visibleStartIndex, visibleStartRowId]);

  return (
    <>
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <h2 className="text-[18px] font-medium tracking-[-0.045em] text-zinc-950">
          Payment Progress
        </h2>

        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 text-[13px] font-semibold leading-5 text-zinc-950 transition-transform duration-150 active:scale-[0.96]"
        >
          All Statements <span>→</span>
        </button>
      </div>

      <div
        ref={progressListRef}
        className="mt-5 max-h-[304px] space-y-4 overflow-y-auto pr-1"
      >
        {finalRows.map((item, index) => {
          return (
          <div
            key={item.id}
            data-payment-row-id={item.id}
            className="grid grid-cols-[28px_minmax(0,1fr)_minmax(42px,96px)_auto] items-center gap-3"
          >
            <div className="relative flex justify-center">
              {index < finalRows.length - 1 && (
                <span className="absolute top-8 h-[42px] w-px bg-zinc-200" />
              )}
              <span
                className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  item.status === "paid"
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.22)]"
                    : item.status === "late"
                    ? "border-amber-500 bg-white text-amber-600"
                    : item.status === "upcoming"
                    ? "border-slate-950 bg-white text-slate-950"
                    : "border-zinc-300 bg-white text-zinc-400"
                }`}
              >
                {item.status === "paid" ? "✓" : item.status === "late" ? "!" : ""}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold leading-5 text-zinc-950">
                  {item.month}
                </p>

                {item.status === "upcoming" && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold leading-4 text-zinc-600">
                    Upcoming
                  </span>
                )}
                {item.status === "late" && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold leading-4 text-amber-700">
                    Late
                  </span>
                )}
              </div>

              <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">{item.subtext}</p>
            </div>

            <div className="h-px min-w-0 bg-zinc-100" />

            <p
              className={`text-[13px] font-semibold leading-5 tabular-nums ${
                item.status === "paid"
                  ? "text-emerald-600"
                  : item.status === "late"
                  ? "text-amber-700"
                  : "text-zinc-700"
              }`}
            >
              {formatCurrency(item.amount)}
            </p>
          </div>
        );
        })}
      </div>

      <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <PaymentSummaryItem label="Paid" count={summary.paid} dotClass="bg-emerald-500" countClass="text-emerald-600" />
        <PaymentSummaryItem label="Upcoming" count={summary.upcoming} dotClass="bg-blue-500" countClass="text-blue-600" />
        <PaymentSummaryItem label="Late" count={summary.late} dotClass="bg-amber-500" countClass="text-amber-600" />
        <PaymentSummaryItem label="Future" count={summary.future} dotClass="bg-zinc-300" countClass="text-zinc-500" />
      </div>
    </section>

    {historyOpen && (
      <PaymentHistoryModal
        lease={lease}
        rows={finalRows}
        summary={summary}
        onClose={() => setHistoryOpen(false)}
      />
    )}
    </>
  );
}

function PaymentSummaryItem({
  label,
  count,
  dotClass,
  countClass,
}: {
  label: string;
  count: number;
  dotClass: string;
  countClass: string;
}) {
  return (
    <div className="border-r border-zinc-200 px-3 py-3 last:border-r-0">
      <div className="flex items-center gap-2">
        <span className={`aspect-square h-2 shrink-0 rounded-full ${dotClass}`} />
        <p className="text-[11px] font-semibold leading-4 text-zinc-500">{label}</p>
      </div>
      <p className={`mt-2 text-[25px] font-semibold leading-none tracking-[-0.05em] ${countClass}`}>
        {count}
      </p>
    </div>
  );
}

function PaymentHistoryModal({
  lease,
  rows,
  summary,
  onClose,
}: {
  lease?: TenantLease;
  rows: PaymentProgressRow[];
  summary: ReturnType<typeof buildPaymentProgressSummary>;
  onClose: () => void;
}) {
  const [unavailableStatementRowId, setUnavailableStatementRowId] = useState<
    string | null
  >(null);
  const nextRow =
    rows.find((row) => row.status === "upcoming") ||
    rows.find((row) => row.status === "late") ||
    rows.find((row) => row.status === "future") ||
    rows[0];
  const totalPaid = getPaymentTotal(rows, "paid");
  const totalLate = getPaymentTotal(rows, "late");
  const completionPercent = rows.length
    ? Math.round((summary.paid / rows.length) * 100)
    : 0;

  useEffect(() => {
    if (!unavailableStatementRowId) return;

    const timeoutId = window.setTimeout(() => {
      setUnavailableStatementRowId(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [unavailableStatementRowId]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div
        className="flex h-[90vh] w-[min(1320px,96vw)] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_34px_110px_rgba(15,23,42,0.28)]"
        onClick={() => setUnavailableStatementRowId(null)}
      >
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-zinc-200 px-7 py-6">
          <div>
            <h2 className="text-[27px] font-medium tracking-[-0.055em] text-zinc-950">
              Payment History Report
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-zinc-500">
              {lease?.property_label || "Property"} · {formatDate(lease?.start_date)} to{" "}
              {formatDate(lease?.end_date)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              aria-label="Close payment history"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[20px] text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FBFBFA] px-7 py-6">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-0">
              <div className="border-r border-zinc-200 p-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Monthly rent
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <p className="text-[44px] font-semibold leading-none tracking-[-0.075em] text-slate-950">
                    {formatCurrency(Number(lease?.monthly_rent || 0))}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                    {completionPercent}% complete
                  </span>
                </div>
                <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-zinc-500">
                  View the lease schedule and download a clean monthly statement
                  from any installment below.
                </p>

                <PaymentStatusDistribution rows={rows} />
              </div>

              <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200">
                <PaymentReportMetric
                  label="Next statement"
                  value={nextRow ? `${nextRow.month} ${nextRow.year}` : "—"}
                  accentClass="text-slate-950"
                />
                <PaymentReportMetric
                  label="Action needed"
                  value={formatCurrency(totalLate)}
                  accentClass="text-amber-700"
                />
                <PaymentReportMetric
                  label="Paid total"
                  value={formatCurrency(totalPaid)}
                  accentClass="text-emerald-600"
                />
                <PaymentReportMetric
                  label="Statements"
                  value={String(rows.length)}
                  accentClass="text-slate-950"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <PaymentSummaryItem label="Paid" count={summary.paid} dotClass="bg-emerald-500" countClass="text-emerald-600" />
            <PaymentSummaryItem label="Upcoming" count={summary.upcoming} dotClass="bg-blue-500" countClass="text-blue-600" />
            <PaymentSummaryItem label="Late" count={summary.late} dotClass="bg-amber-500" countClass="text-amber-600" />
            <PaymentSummaryItem label="Future" count={summary.future} dotClass="bg-zinc-300" countClass="text-zinc-500" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div
              className="grid items-center border-b border-zinc-200 bg-zinc-50/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400"
              style={{ gridTemplateColumns: paymentHistoryGridTemplate }}
            >
              <span className="justify-self-center"> </span>
              <span className="justify-self-start">Installment</span>
              <span className="justify-self-start">Status</span>
              <span className="justify-self-start">Due detail</span>
              <span className="justify-self-start">Amount</span>
              <span className="justify-self-start">Statement</span>
            </div>
            {rows.map((row) => (
              <PaymentHistoryRow
                key={row.id}
                lease={lease}
                row={row}
                statementNoticeOpen={unavailableStatementRowId === row.id}
                onUnavailableStatement={() =>
                  setUnavailableStatementRowId(row.id)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentHistoryRow({
  lease,
  row,
  statementNoticeOpen,
  onUnavailableStatement,
}: {
  lease?: TenantLease;
  row: PaymentProgressRow;
  statementNoticeOpen: boolean;
  onUnavailableStatement: () => void;
}) {
  const detail = getPaymentProgressDetail(row);
  const statementAvailable = row.status === "paid";

  return (
    <div className="border-b border-zinc-200 px-5 py-4 last:border-b-0">
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: paymentHistoryGridTemplate }}
      >
        <div className="flex justify-self-center">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
              row.status === "paid"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : row.status === "late"
                ? "border-amber-500 bg-white text-amber-600"
                : row.status === "upcoming"
                ? "border-blue-100 bg-blue-50 text-blue-600"
                : "border-zinc-200 bg-zinc-50 text-zinc-500"
            }`}
          >
            {row.status === "paid" ? "✓" : row.status === "late" ? "!" : ""}
          </span>
        </div>

        <div className="min-w-0 justify-self-start">
          <p className="truncate text-[14px] font-semibold text-zinc-950">
            {row.month} {row.year}
          </p>
          <p className="mt-1 truncate text-[12px] text-zinc-500">
            Rent installment
          </p>
        </div>

        <span
          className={`w-fit justify-self-start rounded-full px-4 py-2 text-[12px] font-semibold ${detail.className}`}
        >
          {detail.label}
        </span>

        <p className="min-w-0 justify-self-start truncate text-[12px] font-medium text-zinc-500">
          {row.subtext}
        </p>

        <p
          className={`justify-self-start text-left text-[14px] font-semibold ${
            row.status === "paid"
              ? "text-emerald-600"
              : row.status === "late"
              ? "text-amber-700"
              : "text-zinc-800"
          }`}
        >
          {formatCurrency(row.amount)}
        </p>

        <div className="relative justify-self-start text-left">
          {statementAvailable ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (!lease?.tenant_access_id) return;
                window.open(
                  `/tenant/statements/${lease.tenant_access_id}/${row.id}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="text-[12px] font-semibold text-zinc-600 transition hover:text-zinc-950"
            >
              Download
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUnavailableStatement();
              }}
              className="text-[12px] font-semibold text-zinc-500 transition hover:text-zinc-800"
            >
              Download
            </button>
          )}

          {statementNoticeOpen && !statementAvailable && (
            <div className="absolute right-0 top-7 z-30 w-[310px] rounded-2xl border border-amber-100 bg-white px-4 py-3 text-left shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
              <p className="text-[12px] font-semibold text-amber-800">
                Statement not generated yet.
              </p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                A rent statement will be available after a completed payment is
                recorded for this month.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentReportMetric({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="min-h-[118px] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className={`mt-4 text-[25px] font-semibold leading-none tracking-[-0.05em] ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}

function PaymentStatusDistribution({ rows }: { rows: PaymentProgressRow[] }) {
  const summary = buildPaymentProgressSummary(rows);
  const segments = [
    { key: "paid", value: summary.paid, className: "bg-emerald-500" },
    { key: "upcoming", value: summary.upcoming, className: "bg-blue-500" },
    { key: "late", value: summary.late, className: "bg-amber-500" },
    { key: "future", value: summary.future, className: "bg-zinc-300" },
  ];
  const total = rows.length || 1;

  return (
    <div className="mt-7">
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-zinc-500">
        <span>Paid {summary.paid}</span>
        <span>Upcoming {summary.upcoming}</span>
        <span>Late {summary.late}</span>
        <span>Future {summary.future}</span>
      </div>
    </div>
  );
}

function getPaymentProgressDetail(item: PaymentProgressRow) {
  if (item.status === "paid") {
    return {
      label: "Complete",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (item.status === "late") {
    return {
      label: "Action needed",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (item.status === "upcoming") {
    return {
      label: "Next due",
      className: "bg-zinc-100 text-zinc-600",
    };
  }

  return {
    label: "Scheduled",
    className: "bg-zinc-50 text-zinc-500",
  };
}

function getPaymentTotal(rows: PaymentProgressRow[], status: PaymentProgressStatus) {
  return rows
    .filter((row) => row.status === status)
    .reduce((total, row) => total + row.amount, 0);
}

export function QuickAccessCard({
  propertyContact,
}: {
  propertyContact?: PropertyContact | null;
}) {
  const contactName =
    propertyContact?.display_name ||
    propertyContact?.email?.split("@")[0] ||
    "Landlord";
  const contactEmail = propertyContact?.email || "";
  const contactRoleLabel = "Owner";
  const mailHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(
        "Tenant inquiry"
      )}`
    : undefined;

  return (
    <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium tracking-[-0.045em] text-slate-950">
          Property Contact
        </h2>
        <Link
          href="/help-center?section=faq"
          className="text-[12px] font-semibold text-zinc-500 transition hover:text-zinc-900 hover:underline hover:underline-offset-4"
        >
          Need Help?
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white bg-gradient-to-br from-slate-950 to-slate-700 text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/10">
          <span className="text-[19px] font-semibold tracking-[-0.04em]">
            {getContactInitials(contactName)}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-50 text-blue-600">
            <Home size={13} strokeWidth={2.1} />
          </span>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-[-0.04em] text-slate-950">
            {contactName}
          </p>
          <p className="mt-1 truncate text-[12px] font-medium leading-5 text-zinc-500">
            {contactRoleLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ManagerContactRow
          icon={<Mail size={16} strokeWidth={2} />}
          value={contactEmail || "Landlord email unavailable"}
        />
      </div>

      <div className="mt-4 border-t border-zinc-200 pt-4">
        <p className="text-[13px] font-semibold leading-5 tracking-[-0.02em] text-slate-950">
          Need help with the property?
        </p>
        <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-500">
          Email your landlord directly and they can follow up with you.
        </p>

        <a
          href={mailHref}
          aria-disabled={!contactEmail}
          className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white text-[13px] font-semibold text-slate-950 transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <Mail size={16} strokeWidth={2} />
          Email Landlord
          <ArrowRight size={16} strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}

function getContactInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AB";
}

function ManagerContactRow({
  icon,
  value,
  muted,
}: {
  icon: React.ReactNode;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-blue-600">
        {icon}
      </span>
      <p
        className={`min-w-0 truncate text-[12px] leading-5 ${
          muted ? "text-zinc-500" : "font-medium text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[17px]">
      {children}
    </div>
  );
}

function CardFooter({ label }: { label: string }) {
  return (
    <div className="mt-3">
      <div className="flex w-full items-center justify-between text-[12px] font-semibold text-zinc-950">
        {label}
        <span className="text-zinc-500">›</span>
      </div>
    </div>
  );
}

function BenefitBubble({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function DocumentTile({
  doc,
  canDelete,
  deleting,
  onView,
  onDownload,
  onDelete,
}: {
  doc: LeaseDocument;
  canDelete: boolean;
  deleting: boolean;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[11px] font-semibold uppercase text-zinc-600">
          {getFileLabel(doc.file_name, doc.file_type)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-5 text-zinc-950">
            {doc.file_name}
          </p>
          <p className="mt-1 truncate text-[11px] leading-4 text-zinc-500">
            {formatDate(doc.created_at)}
            {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onView}
          className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950"
        >
          View
        </button>
        <span className="text-zinc-300">/</span>
        <button
          onClick={onDownload}
          className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Download
        </button>
        {canDelete && (
          <>
            <span className="text-zinc-300">/</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete document"
              className="text-[12px] font-semibold text-zinc-600 hover:text-[#B9476D] disabled:opacity-50"
            >
              {deleting ? "Deleting" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({
  activity,
  size,
}: {
  activity: TenantActivity;
  size: "sm" | "md";
}) {
  const Icon =
    activity.icon === "payment-success"
      ? CheckCircle2
      : activity.icon === "payment-alert"
      ? AlertCircle
      : activity.icon === "payment-pending"
      ? CircleDot
      : activity.icon === "document"
      ? FileText
      : activity.icon === "delete"
      ? Trash2
      : StickyNote;

  return (
    <span
      className={`flex shrink-0 items-center justify-center border transition ${
        size === "sm" ? "h-9 w-9 rounded-2xl" : "h-10 w-10 rounded-full"
      } ${activity.iconClass}`}
    >
      <Icon
        size={size === "sm" ? 17 : 17}
        strokeWidth={size === "sm" ? 1.8 : 2.15}
        aria-hidden="true"
      />
    </span>
  );
}

function ActivityMini({ activity }: { activity: TenantActivity }) {
  return (
    <div className="group min-h-[78px] px-3 py-3.5 transition hover:bg-zinc-50/60">
      <div className="flex items-start gap-3">
        <ActivityIcon activity={activity} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold leading-5 text-slate-950">
              {activity.title}
            </p>
            {activity.badge && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${
                  activity.badgeClass || "bg-zinc-100 text-zinc-600"
                }`}
              >
                {activity.badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-5 text-zinc-500">
            {activity.subtitle}
          </p>

          <p className="mt-1 truncate text-[11.5px] font-medium leading-4 text-zinc-400">
            {formatDate(activity.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: TenantActivity }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <ActivityIcon activity={activity} size="md" />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-zinc-950">
              {activity.title}
            </p>
            {activity.badge && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-4 ${
                  activity.badgeClass || "bg-zinc-100 text-zinc-600"
                }`}
              >
                {activity.badge}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] font-medium leading-5 text-zinc-500">
            {activity.subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {activity.amount && (
          <p
            className={`text-[12px] font-semibold leading-5 tabular-nums ${
              activity.amountClass || "text-zinc-700"
            }`}
          >
            {activity.amount}
          </p>
        )}
        <p className="mt-1 text-[11px] font-medium leading-4 text-zinc-500">
          {formatDate(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

function buildPaymentProgress(
  lease?: TenantLease,
  payments: RentPayment[] = []
): PaymentProgressRow[] {
  const rent = Number(lease?.monthly_rent || 0);
  const leaseStartValue =
    getLeasePaymentCycleStartValue(lease) || new Date().toISOString();
  const leaseEndValue = lease?.end_date || lease?.start_date || new Date().toISOString();
  const cycles = getLeaseRentCycleMonths(leaseStartValue, leaseEndValue);
  const start = cycles[0] || getLeaseFirstRentCycleMonthStart(leaseStartValue);
  const end =
    cycles[cycles.length - 1] || getLeaseLastRentCycleMonthStart(leaseEndValue);
  const dueDay = getRentDueDayNumber(lease?.rent_due_day);
  const today = new Date();
  const firstUpcomingKey = getFirstUpcomingPaymentKey(start, end, dueDay, payments);
  const rows: PaymentProgressRow[] = [];

  for (const cursor of cycles) {
    const month = cursor.toLocaleDateString("en-US", { month: "long" });
    const year = cursor.getFullYear();
    const dueDate = new Date(year, cursor.getMonth(), dueDay);
    const paidPayment = findPaymentForMonth(payments, cursor);
    const paymentKey = getPaymentMonthKey(cursor);

    const status: PaymentProgressStatus = paidPayment
      ? "paid"
      : dueDate < today
      ? "late"
      : paymentKey === firstUpcomingKey
      ? "upcoming"
      : "future";

    rows.push({
      id: paymentKey,
      month,
      year,
      cycleDate: new Date(cursor),
      amount: Number(paidPayment?.amount || rent),
      status,
      subtext:
        status === "paid"
          ? `Paid on ${formatPaymentProgressDate(
              paidPayment?.paid_at || paidPayment?.created_at
            )}`
          : `Due on ${formatPaymentProgressDate(dueDate)}`,
    });
  }

  return rows;
}

function buildPaymentProgressSummary(
  rows: ReturnType<typeof buildPaymentProgress>
) {
  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.status]: summary[row.status] + 1,
    }),
    {
      paid: 0,
      upcoming: 0,
      late: 0,
      future: 0,
    }
  );
}

function getNextEligiblePaymentDate(
  lease?: TenantLease,
  payments: RentPayment[] = []
) {
  if (isTenantLeaseEnded(lease)) {
    return "Lease ended";
  }

  const rows = filterPaymentProgressRowsByLeaseEnd(
    buildPaymentProgress(lease, payments),
    lease
  );

  if (rows.length === 0) {
    return "No upcoming payment";
  }

  const nextPaymentRow =
    rows.find((row) => row.status === "late") ||
    rows.find((row) => row.status === "upcoming") ||
    rows.find((row) => row.status === "future");

  if (!nextPaymentRow) {
    return "No upcoming payment";
  }

  return formatPaymentProgressDate(
    new Date(
      nextPaymentRow.cycleDate.getFullYear(),
      nextPaymentRow.cycleDate.getMonth(),
      getRentDueDayNumber(lease?.rent_due_day)
    )
  );
}

function getPayNowEligibility(
  lease?: TenantLease,
  payments: RentPayment[] = []
) {
  if (!lease || Number(lease.monthly_rent || 0) <= 0 || isTenantLeaseEnded(lease)) {
    return {
      canPay: false,
      row: null as PaymentProgressRow | null,
    };
  }

  const rows = filterPaymentProgressRowsByLeaseEnd(
    buildPaymentProgress(lease, payments),
    lease
  );
  const today = new Date();
  const currentCycle = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxEarlyCycle = new Date(
    currentCycle.getFullYear(),
    currentCycle.getMonth() + 1,
    1
  );
  const payableRow =
    rows.find(
      (row) =>
        row.status !== "paid" &&
        startOfPaymentMonth(row.cycleDate) <= currentCycle
    ) ||
    rows.find(
      (row) =>
        row.status !== "paid" &&
        getPaymentMonthKey(row.cycleDate) === getPaymentMonthKey(maxEarlyCycle)
    ) ||
    null;

  return {
    canPay: Boolean(payableRow),
    row: payableRow,
  };
}

function formatLeaseAddress(lease?: TenantLease) {
  if (!lease) return "Not available";

  const address = [
    lease.street_address,
    lease.unit_name ? `Unit ${lease.unit_name}` : "",
    lease.city,
    lease.state_name,
    lease.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return address || "Not available";
}

function formatNullableDate(value?: string | null) {
  return value ? formatDate(value) : "Not available";
}

function getRentDueDayLabel(value?: string | null) {
  const day = getRentDueDayNumber(value);
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  return `${day}${suffix} of each month`;
}

function getLeaseProgressPercent(lease?: TenantLease) {
  if (!lease?.start_date || !lease?.end_date) return 0;

  const start = new Date(lease.start_date).getTime();
  const end = new Date(lease.end_date).getTime();
  const today = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((today - start) / (end - start)) * 100));
}

function filterPaymentProgressRowsByLeaseEnd(
  rows: PaymentProgressRow[],
  lease?: TenantLease
) {
  const leaseEndValue = lease?.end_date || lease?.start_date;
  const leaseStartValue = getLeasePaymentCycleStartValue(lease) || leaseEndValue;

  if (!leaseEndValue || !leaseStartValue) return rows;

  const leaseEndMonth = getLeaseCoveredEndMonthStart(
    leaseStartValue,
    leaseEndValue
  );

  return rows.filter((row) => row.cycleDate <= leaseEndMonth);
}

function getLeasePaymentCycleStartValue(lease?: TenantLease) {
  return lease?.payment_tracking_start_date || lease?.start_date || null;
}

function isTenantLeaseEnded(lease?: TenantLease | null) {
  return (
    Boolean(lease?.ended_at) ||
    ["ended", "inactive", "terminated"].includes(
      String(lease?.lease_status || "").toLowerCase()
    )
  );
}

function getPaymentProgressVisibleStartIndex(rows: PaymentProgressRow[]) {
  if (rows.length <= 5) return 0;

  const currentCycleKey = getPaymentMonthKey(new Date());
  const firstUpcomingIndex = rows.findIndex((row) => row.status === "upcoming");
  if (firstUpcomingIndex >= 0) {
    return Math.max(0, firstUpcomingIndex - 3);
  }

  const firstLateIndex = rows.findIndex((row) => row.status === "late");
  if (firstLateIndex >= 0) {
    return Math.max(0, firstLateIndex - 3);
  }

  const currentMonthIndex = rows.findIndex((row) => row.id === currentCycleKey);
  if (currentMonthIndex >= 0) {
    return Math.max(0, currentMonthIndex - 3);
  }

  const latestPaidIndex = rows.findLastIndex((row) => row.status === "paid");
  if (latestPaidIndex >= 0) {
    return Math.max(0, latestPaidIndex - 4);
  }

  return Math.max(0, rows.length - 5);
}

function buildPaymentSummaryState(
  lease?: TenantLease,
  payments: RentPayment[] = []
): PaymentSummaryState {
  const rent = Number(lease?.monthly_rent || 0);

  if (isTenantLeaseEnded(lease)) {
    return {
      label: "Lease ended",
      amount: "Ended",
      subtext: "Online rent payments are no longer available for this lease.",
      messageTone: "neutral",
    };
  }

  if (!lease || rent <= 0) {
    return {
      label: "Amount Due",
      amount: "$0",
      subtext: "Rent amount is unavailable",
      messageTone: "error",
    };
  }

  const leaseStartValue =
    getLeasePaymentCycleStartValue(lease) || new Date().toISOString();
  const leaseEndValue = lease.end_date || lease.start_date || new Date().toISOString();
  const allCycles = getLeaseRentCycleMonths(leaseStartValue, leaseEndValue);
  const today = new Date();
  const currentCycle = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxEarlyCycle = new Date(
    currentCycle.getFullYear(),
    currentCycle.getMonth() + 1,
    1
  );
  const cycles = allCycles.filter((cycle) => cycle <= maxEarlyCycle);

  const oldestUnpaidCurrentOrPast = cycles.find(
    (cycle) => cycle <= currentCycle && !findPaymentForMonth(payments, cycle)
  );

  if (oldestUnpaidCurrentOrPast) {
    const isCurrent = getPaymentMonthKey(oldestUnpaidCurrentOrPast) === getPaymentMonthKey(currentCycle);

    return {
      label: "Amount Due",
      amount: formatCurrency(rent),
      subtext: isCurrent
        ? `Due on ${formatSummaryDueDate(oldestUnpaidCurrentOrPast)}`
        : `Due for ${formatPaymentMonthLabel(oldestUnpaidCurrentOrPast)}`,
      messageTone: "error",
    };
  }

  const eligibleFuture = cycles.find(
    (cycle) =>
      cycle > currentCycle &&
      cycle <= maxEarlyCycle &&
      !findPaymentForMonth(payments, cycle)
  );

  if (eligibleFuture) {
    return {
      label: "Next Eligible Payment",
      amount: formatCurrency(rent),
      subtext: `${formatPaymentMonthLabel(eligibleFuture)} rent can be paid early`,
      messageTone: "neutral",
    };
  }

  const paidCycles = cycles.filter((cycle) => findPaymentForMonth(payments, cycle));
  const paidThrough = paidCycles[paidCycles.length - 1] || currentCycle;
  const nextEligible = new Date(
    paidThrough.getFullYear(),
    paidThrough.getMonth() + 1,
    1
  );

  return {
    label: "Rent Paid Through",
    amount: formatPaymentMonthLabel(paidThrough),
    subtext: `Next eligible payment starts ${formatSummaryDueDate(nextEligible)}`,
    messageTone: "neutral",
  };
}

function getLeaseFirstRentCycleMonthStart(value: string) {
  const { year, monthIndex, day } = getLocalDateParts(value);
  return new Date(year, day === 1 ? monthIndex : monthIndex + 1, 1);
}

function getLeaseLastRentCycleMonthStart(value: string) {
  const { year, monthIndex } = getLocalDateParts(value);
  return new Date(year, monthIndex, 1);
}

function getLeaseRentCycleMonths(startValue: string, endValue: string) {
  const firstCycleMonth = getLeaseFirstRentCycleMonthStart(startValue);
  const leaseEndMonth = getLeaseCoveredEndMonthStart(startValue, endValue);
  const cycles: Date[] = [];

  for (
    let cursor = new Date(firstCycleMonth);
    cursor <= leaseEndMonth;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    if (cursor <= leaseEndMonth) {
      cycles.push(new Date(cursor));
    }
  }

  return cycles;
}

function getLeaseCoveredEndMonthStart(startValue: string, endValue: string) {
  const startParts = getLocalDateParts(startValue);
  const endParts = getLocalDateParts(endValue);
  const endMonth = new Date(endParts.year, endParts.monthIndex, 1);
  const firstCycleMonth = getLeaseFirstRentCycleMonthStart(startValue);
  const isAnniversaryBoundary =
    startParts.day === 1 &&
    endParts.day === 1 &&
    endMonth > firstCycleMonth;

  if (isAnniversaryBoundary) {
    return new Date(endParts.year, endParts.monthIndex - 1, 1);
  }

  return endMonth;
}

function startOfPaymentMonth(value: Date | string) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  const { year, monthIndex } = getLocalDateParts(value);
  return new Date(year, monthIndex, 1);
}

function formatPaymentProgressDate(value?: Date | string | null) {
  if (!value) return "—";

  const date =
    value instanceof Date
      ? value
      : (() => {
          const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

          if (match) {
            return new Date(
              Number(match[1]),
              Number(match[2]) - 1,
              Number(match[3])
            );
          }

          return new Date(value);
        })();

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLocalDateParts(value: string) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return {
      year: Number(match[1]),
      monthIndex: Number(match[2]) - 1,
      day: Number(match[3]),
    };
  }

  const date = new Date(value);
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
  };
}

function getRentDueDayNumber(rentDueDay?: string | null) {
  const parsed = Number(String(rentDueDay || "").match(/\d+/)?.[0] || 1);
  return Math.min(Math.max(parsed, 1), 28);
}

function formatPaymentMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatSummaryDueDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function findPaymentForMonth(payments: RentPayment[], date: Date) {
  return findCollectedPaymentForCycle(payments, date);
}

function getFirstUpcomingPaymentKey(
  start: Date,
  end: Date,
  dueDay: number,
  payments: RentPayment[]
) {
  const today = new Date();

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const dueDate = new Date(cursor.getFullYear(), cursor.getMonth(), dueDay);

    if (!findPaymentForMonth(payments, cursor) && dueDate >= today) {
      return getPaymentMonthKey(cursor);
    }
  }

  return "";
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4h6m-8 5h10m-9 0 .6 10.2A2 2 0 0 0 10.6 21h2.8a2 2 0 0 0 2-1.8L16 9M10 9v8m4-8v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfirmDeleteModal({
  title,
  body,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-[22px] font-medium tracking-[-0.04em]">
              {title}
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-6 text-zinc-500">{body}</p>
          </div>

          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddNoteModal({
  noteType,
  setNoteType,
  newNote,
  setNewNote,
  onClose,
  onSave,
  saving,
  error,
}: {
  noteType: "private" | "shared";
  setNoteType: (value: "private" | "shared") => void;
  newNote: string;
  setNewNote: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-medium tracking-[-0.04em]">
              Add Note
            </h2>
            <p className="mt-1 text-[13px] font-medium leading-5 text-zinc-500">
              Save a private note or share an update with your landlord.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => setNoteType("private")}
            className={`h-[64px] rounded-2xl border text-[14px] font-semibold ${
              noteType === "private"
                ? "border-[#E7BD64] bg-[#FFF8EA] text-[#8A5A00]"
                : "border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            Private Note
          </button>

          <button
            onClick={() => setNoteType("shared")}
            className={`h-[64px] rounded-2xl border text-[14px] font-semibold ${
              noteType === "shared"
                ? "border-[#B9D8FF] bg-[#EFF7FF] text-[#1D5F9F]"
                : "border-zinc-200 bg-white text-zinc-600"
            }`}
          >
            Shared Note
          </button>
        </div>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your note..."
          className="mt-5 min-h-[150px] w-full rounded-[22px] border border-zinc-200 bg-[#FAFAFA] p-4 text-[14px] leading-6 outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
        />

        {error && (
          <p className="mt-3 rounded-2xl bg-[#FFF7FA] px-4 py-3 text-[13px] font-medium text-[#9F3D5F]">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving || !newNote.trim()}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
