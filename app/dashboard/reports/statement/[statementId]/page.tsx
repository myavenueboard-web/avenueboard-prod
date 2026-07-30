"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { getCollectedRentPayments } from "@/lib/rentPaymentClassification";
import StatementActionBar from "@/components/StatementActionBar";

type PropertyItem = {
  id: string;
  property_label: string;
  status?: string | null;
  bank_status?: string | null;
  street_address?: string | null;
  unit_name?: string | null;
  city?: string | null;
  state_name?: string | null;
  zip?: string | null;
};

type LeaseTenantItem = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
  tenant_role?: string | null;
};

type LeaseItem = {
  id: string;
  property_id: string;
  monthly_rent: number;
  rent_due_day?: string | null;
  lease_status?: string | null;
  ended_at?: string | null;
  start_date: string | null;
  end_date: string | null;
  properties?: { property_label: string } | null;
  lease_tenants?: LeaseTenantItem[];
};

type RentPaymentItem = {
  id: string;
  property_id: string | null;
  lease_id: string | null;
  tenant_access_id?: string | null;
  amount: number | null;
  rent_cycle_key?: string | null;
  rent_amount_cents?: number | null;
  tenant_service_fee_cents?: number | null;
  status: string | null;
  period_label: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_charge_id?: string | null;
  payment_intent_id?: string | null;
  charge_id?: string | null;
  payout_id?: string | null;
  stripe_payout_id?: string | null;
  processor_reference?: string | null;
  processor_payment_id?: string | null;
  receipt_url?: string | null;
};

type StatementCollectedPayment = {
  payment: RentPaymentItem;
  amount: number;
  cycleKey: string;
};

type StatementPaymentRef = {
  id: string;
  paidDate: Date | null;
};

type StatementData = {
  statementMonth: string;
  statementPeriod: string;
  statementId: string;
  generatedDate: string;
  propertyName: string;
  propertyAddress: string;
  propertiesIncluded: string;
  landlordName: string;
  landlordEmail: string;
  tenantName: string;
  tenantEmail: string;
  propertyRentLines: Array<{
    id: string;
    descriptor: string;
    tenantFirstName: string;
    due: string;
    paid: string;
    balance: string;
  }>;
  monthlyRent: string;
  amountPaid: string;
  amountDue: string;
  paymentStatus: string;
  statementPaymentLine: string | null;
  remainingBalance: string;
};

type StatementRentRow = {
  id: string;
  descriptor: string;
  tenantFirstName: string;
  dueAmount: number;
  paidAmount: number;
  balanceAmount: number;
  due: string;
  paid: string;
  balance: string;
  paidDates: Date[];
  paymentCount: number;
  rawPaymentCount: number;
  paymentRefs: StatementPaymentRef[];
  hasLatePayment: boolean;
  hasOverdueBalance: boolean;
};

type LeaseObligation = {
  lease: LeaseItem;
  property: PropertyItem | undefined;
  tenant: LeaseTenantItem | null;
  dueAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: Date;
  paidDates: Date[];
  paymentCount: number;
  rawPaymentCount: number;
  paymentRefs: StatementPaymentRef[];
  hasLatePayment: boolean;
  hasOverdueBalance: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: StatementData };

const unavailableStatement: StatementData = {
  statementMonth: "Not available",
  statementPeriod: "Not available",
  statementId: "Not available",
  generatedDate: "Not available",
  propertyName: "Statement data unavailable",
  propertyAddress: "Not available",
  propertiesIncluded: "Not available",
  landlordName: "Not available",
  landlordEmail: "Not available",
  tenantName: "Not available",
  tenantEmail: "Not available",
  propertyRentLines: [],
  monthlyRent: "Not available",
  amountPaid: "$0",
  amountDue: "Not available",
  paymentStatus: "Not available",
  statementPaymentLine: null,
  remainingBalance: "Not available",
};

export default function RentStatementPrintPage() {
  const params = useParams<{ statementId: string }>();
  const searchParams = useSearchParams();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [hasPrinted, setHasPrinted] = useState(false);

  const statementMonth = useMemo(() => {
    const monthKey = searchParams.get("month") || params.statementId;
    return parseStatementMonth(monthKey);
  }, [params.statementId, searchParams]);

  const selectedProperty = searchParams.get("property") || "all";
  const shouldPrint = searchParams.get("print") === "true";

  useEffect(() => {
    let cancelled = false;

    async function loadStatement() {
      try {
        setLoadState({ status: "loading" });

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoadState({
            status: "error",
            message: "Please sign in to view this statement.",
          });
          return;
        }

        const profile = await getOrCreateProfile();
        const profileInfo = profile as {
          display_name?: string | null;
          name?: string | null;
          full_name?: string | null;
          email?: string | null;
        };
        const landlord = {
          name:
            profileInfo.display_name ||
            profileInfo.name ||
            profileInfo.full_name ||
            userData.user.user_metadata?.name ||
            userData.user.user_metadata?.full_name ||
            "Not available",
          email: profileInfo.email || userData.user.email || "Not available",
        };

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, property_label, status, bank_status, street_address, unit_name, city, state_name, zip")
          .eq("owner_profile_id", profile.id)
          .order("created_at", { ascending: false });

        if (propertyError) {
          logStatementLoadError("properties query failed", propertyError);
          if (!cancelled) {
            setLoadState({
              status: "ready",
              data: {
                ...unavailableStatement,
                statementMonth: formatMonthYear(statementMonth),
                generatedDate: formatDate(new Date()),
                landlordName: landlord.name,
                landlordEmail: landlord.email,
              },
            });
          }
          return;
        }

        const properties = (propertyData || []) as PropertyItem[];
        const propertyIds =
          selectedProperty !== "all"
            ? properties
                .filter((property) => property.id === selectedProperty)
                .map((property) => property.id)
            : properties.map((property) => property.id);

        if (!propertyIds.length) {
          if (!cancelled) {
            setLoadState({
              status: "ready",
              data: {
                ...unavailableStatement,
                statementMonth: formatMonthYear(statementMonth),
                generatedDate: formatDate(new Date()),
                landlordName: landlord.name,
                landlordEmail: landlord.email,
              },
            });
          }
          return;
        }

        const { data: leaseData, error: leaseError } = await supabase
          .from("leases")
          .select(
            `
            id,
            property_id,
            monthly_rent,
            rent_due_day,
            lease_status,
            ended_at,
            start_date,
            end_date,
            properties (
              property_label
            ),
            lease_tenants (
              id,
              first_name,
              last_name,
              email,
              phone,
              tenant_role
            )
          `
          )
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false });

        if (leaseError) {
          logStatementLoadError("leases query failed", leaseError);
        }

        const leases = normalizeRelatedRows(
          leaseError ? [] : leaseData || []
        ) as unknown as LeaseItem[];
        const leaseIds = leases.map((lease) => lease.id);

        const paymentSelect = `
          id,
          property_id,
          lease_id,
          tenant_access_id,
          amount,
          rent_cycle_key,
          rent_amount_cents,
          tenant_service_fee_cents,
          status,
          period_label,
          paid_at,
          created_at,
          stripe_payment_intent_id,
          stripe_checkout_session_id,
          source,
          receipt_url
        `;

        const paymentSources: RentPaymentItem[][] = [];

        const { data: propertyPaymentData, error: propertyPaymentError } =
          await supabase
            .from("rent_payments")
            .select(paymentSelect)
            .in("property_id", propertyIds)
            .order("created_at", { ascending: false });

        if (propertyPaymentError) {
          logStatementLoadError("property payments query failed", propertyPaymentError);
        } else {
          paymentSources.push((propertyPaymentData || []) as RentPaymentItem[]);
        }

        if (leaseIds.length) {
          const { data: leasePaymentData, error: leasePaymentError } = await supabase
            .from("rent_payments")
            .select(paymentSelect)
            .in("lease_id", leaseIds)
            .order("created_at", { ascending: false });

          if (leasePaymentError) {
            logStatementLoadError("lease payments query failed", leasePaymentError);
          } else {
            paymentSources.push((leasePaymentData || []) as RentPaymentItem[]);
          }

          const { data: tenantAccessData, error: tenantAccessError } = await supabase
            .from("tenant_access")
            .select("id")
            .in("property_id", propertyIds)
            .in("lease_id", leaseIds);

          if (tenantAccessError) {
            logStatementLoadError("tenant access query failed", tenantAccessError);
          }

          const tenantAccessIds = tenantAccessError
            ? []
            : (tenantAccessData || []).map((row) => row.id);
          if (tenantAccessIds.length) {
            const { data: tenantPaymentData, error: tenantPaymentError } =
              await supabase
                .from("rent_payments")
                .select(paymentSelect)
                .in("tenant_access_id", tenantAccessIds)
                .order("created_at", { ascending: false });

            if (tenantPaymentError) {
              logStatementLoadError(
                "tenant access payments query failed",
                tenantPaymentError
              );
            } else {
              paymentSources.push((tenantPaymentData || []) as RentPaymentItem[]);
            }
          }
        }

        const payments = mergeRentPayments(paymentSources.flat());
        const statement = buildStatementData({
          month: statementMonth,
          selectedProperty,
          properties,
          leases,
          payments,
          landlord,
        });

        if (!cancelled) setLoadState({ status: "ready", data: statement });
      } catch (error) {
        logStatementLoadError("unexpected statement route failure", error);
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: "Unable to load this rent statement.",
          });
        }
      }
    }

    loadStatement();

    return () => {
      cancelled = true;
    };
  }, [selectedProperty, statementMonth]);

  useEffect(() => {
    if (!shouldPrint || loadState.status !== "ready" || hasPrinted) return;

    const timer = window.setTimeout(() => {
      setHasPrinted(true);
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [hasPrinted, loadState.status, shouldPrint]);

  if (loadState.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm font-medium text-slate-500">
        Preparing rent statement...
      </main>
    );
  }

  if (loadState.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-8 text-center text-sm font-medium text-slate-600">
        {loadState.message}
      </main>
    );
  }

  return <RentStatementDocument data={loadState.data} />;
}

function RentStatementDocument({ data }: { data: StatementData }) {
  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f5] px-5 pb-5 pt-3 text-zinc-950 print:h-auto print:overflow-visible print:bg-white print:px-0 print:py-0">
      <StatementActionBar
        backHref="/dashboard/reports"
        backLabel="Back"
        downloadLabel="Download PDF"
        onDownload={() => window.print()}
      />

      <article
        id="landlord-statement-document"
        className="tenant-statement-preview mx-auto flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white px-12 pb-11 pt-8 shadow-[0_18px_70px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200 print:shadow-none print:ring-0"
      >
        <header className="grid grid-cols-[1fr_auto] gap-7 border-b border-zinc-200 pb-7">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              RENT STATEMENT
            </p>
            <h1 className="mt-2.5 text-[40px] font-semibold leading-none tracking-[-0.06em] text-zinc-950">
              {data.statementMonth}
            </h1>
            <dl className="mt-4 grid max-w-[520px] grid-cols-3 gap-3 text-[13px] leading-5 text-zinc-600">
              <StatementMeta label="Statement number" value={data.statementId} />
              <StatementMeta label="Generated date" value={data.generatedDate} />
              <StatementMeta label="Status" value={data.paymentStatus} />
            </dl>
          </div>

          <div className="flex flex-col items-end">
            <Image
              src="/logo.png"
              alt="AvenueBoard"
              width={220}
              height={57}
              priority
              className="h-auto w-[220px]"
            />
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 border-b border-zinc-200 py-7">
          <AddressBlock
            title="Property"
            lines={[data.propertyName, data.propertyAddress, data.propertiesIncluded].filter(Boolean)}
          />
          <AddressBlock
            title="Landlord"
            lines={[data.landlordName, data.landlordEmail, data.tenantName]}
          />
        </section>

        <section className="py-7">
          <h2 className="text-[25px] font-medium tracking-[-0.045em] text-zinc-950">
            Rent Charges
          </h2>

          {data.propertyRentLines.length > 0 ? (
            <div className="mt-5 overflow-hidden border-t border-zinc-200">
              <StatementTableHeader />
              {data.propertyRentLines.map((line) => (
                <StatementLine
                  key={line.id}
                  label={`Rent - ${line.descriptor} - ${line.tenantFirstName}`}
                  due={line.due}
                  paid={line.paid}
                  balance={line.balance}
                />
              ))}
              <StatementSummary
                paid={data.amountPaid}
                pending={data.remainingBalance}
                note={data.statementPaymentLine}
              />
            </div>
          ) : (
            <p className="mt-5 border-t border-zinc-200 pt-5 text-[14px] leading-6 text-zinc-500">
              No active rent obligations for this statement period.
            </p>
          )}
        </section>

        <section className="pt-0">
          <div className="max-w-[520px]">
            <h2 className="text-[22px] font-medium tracking-[-0.04em] text-zinc-950">
              Statement Details
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-6 text-zinc-700">
              Statement period: {data.statementPeriod}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              Generated on {data.generatedDate}
            </p>
          </div>
        </section>

        <footer className="mt-auto border-t border-zinc-200 pt-4">
          <p className="text-[11px] leading-5 text-zinc-400">
            This statement is provided by AvenueBoard for record-keeping purposes
            only. It reflects rent information available in AvenueBoard at the
            time this statement was generated. This statement is not a tax document,
            bank statement, credit report, lending document, legal notice, or legal
            advice. For official accounting, tax, legal, lending, or financial
            matters, please consult a qualified professional.
          </p>
        </footer>
      </article>

      <style jsx global>{`
        @media screen {
          .tenant-statement-preview {
            transform: scale(0.76);
            transform-origin: top center;
          }
        }

        @media screen and (max-height: 860px) {
          .tenant-statement-preview {
            transform: scale(0.7);
          }
        }

        @media screen and (max-height: 780px) {
          .tenant-statement-preview {
            transform: scale(0.64);
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          .tenant-statement-preview {
            width: 210mm !important;
            height: 297mm !important;
            transform: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatementMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-zinc-800">{value}</dd>
    </div>
  );
}

function AddressBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {title}
      </h2>
      <div className="mt-4 space-y-1.5 text-[14px] leading-6 text-zinc-700">
        {lines.map((line) => (
          <p key={`${title}-${line}`}>{line || "Not available"}</p>
        ))}
      </div>
    </div>
  );
}

function StatementTableHeader() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] gap-4 border-b border-zinc-200 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
      <p>Description</p>
      <p className="text-right">Due</p>
      <p className="text-right">Paid</p>
      <p className="text-right">Balance</p>
    </div>
  );
}

function StatementLine({
  label,
  due,
  paid,
  balance,
}: {
  label: string;
  due: string;
  paid: string;
  balance: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] gap-4 border-b border-zinc-200 py-4 text-[14px] text-zinc-800">
      <p className="text-[14px] text-zinc-800">{label}</p>
      <p className="text-right font-medium tabular-nums">{due}</p>
      <p className="text-right font-medium tabular-nums">{paid}</p>
      <p className="text-right font-medium tabular-nums">{balance}</p>
    </div>
  );
}

function StatementSummary({
  paid,
  pending,
  note,
}: {
  paid: string;
  pending: string;
  note: string | null;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] gap-4 pb-4 pt-5">
      <div className="col-start-3 col-span-2">
        <p className="text-right text-[13px] font-semibold text-zinc-800">
          Summary
        </p>
        <dl className="mt-2 space-y-1.5 text-[13px]">
          <div className="flex items-center justify-between gap-6">
            <dt className="text-zinc-500">Paid</dt>
            <dd className="font-semibold tabular-nums text-zinc-950">{paid}</dd>
          </div>
          <div className="flex items-center justify-between gap-6">
            <dt className="text-zinc-500">Pending</dt>
            <dd className="font-semibold tabular-nums text-zinc-950">{pending}</dd>
          </div>
        </dl>
        {note ? (
          <p className="mt-2 text-right text-[12px] leading-5 text-zinc-500">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function buildStatementData({
  month,
  selectedProperty,
  properties,
  leases,
  payments,
  landlord,
}: {
  month: Date;
  selectedProperty: string;
  properties: PropertyItem[];
  leases: LeaseItem[];
  payments: RentPaymentItem[];
  landlord: { name: string; email: string };
}): StatementData {
  const monthPayments = payments.filter((payment) =>
    paymentBelongsToStatementMonth(payment, month)
  );
  const collectedPayments = getCollectedRentPayments(monthPayments);

  if (selectedProperty === "all") {
    const monthLeases = getActiveStatementLeases({ leases, properties, month });
    const rentRows = getStatementRentRows({
      month,
      leases: monthLeases,
      properties,
      collectedPayments,
    });
    warnForUnmatchedStatementPayments({
      month,
      selectedProperty,
      leases: monthLeases,
      collectedPayments,
    });
    const monthlyRent = rentRows.reduce((sum, row) => sum + row.dueAmount, 0);
    const amountPaid = rentRows.reduce((sum, row) => sum + row.paidAmount, 0);
    const remainingBalance = Math.max(monthlyRent - amountPaid, 0);
    const paymentStatus = getStatementPaymentStatus(rentRows);
    const statementPaymentLine = getStatementPaymentLine(rentRows, month);
    const activePropertyCount = getActivePropertyCount(rentRows);
    const activeTenantCount = getActiveTenantCount(monthLeases);

    return {
      statementMonth: formatMonthYear(month),
      statementPeriod: formatStatementPeriod(month),
      statementId: `RS-${formatCycleKey(month)}`,
      generatedDate: formatDate(new Date()),
      propertyName: formatActivePropertyCount(activePropertyCount),
      propertyAddress: "",
      propertiesIncluded: "",
      landlordName: landlord.name || "Not available",
      landlordEmail: landlord.email || "Not available",
      tenantName: formatActiveTenantCount(activeTenantCount),
      tenantEmail: "",
      propertyRentLines: rentRows.map(formatStatementRentLine),
      monthlyRent: monthlyRent > 0 ? formatCurrency(monthlyRent) : "Not available",
      amountPaid: formatCurrency(amountPaid),
      amountDue: formatCurrency(remainingBalance),
      paymentStatus,
      statementPaymentLine,
      remainingBalance: formatCurrency(remainingBalance),
    };
  }

  const selectedPropertyId =
    selectedProperty ||
    collectedPayments[0]?.payment.property_id ||
    monthPayments[0]?.property_id ||
    selectStatementLeaseForMonth(leases, month)?.property_id ||
    properties[0]?.id ||
    "";
  const propertyLeases = getActiveStatementLeases({
    leases: leases.filter((lease) =>
      selectedPropertyId ? lease.property_id === selectedPropertyId : true
    ),
    properties,
    month,
  });
  const leasePayments = monthPayments.filter((payment) => {
    if (propertyLeases.some((item) => payment.lease_id === item.id)) return true;
    if (selectedPropertyId && payment.property_id === selectedPropertyId) return true;
    return false;
  });
  const collectedLeasePayments = getCollectedRentPayments(leasePayments);
  const rentRows = getStatementRentRows({
    month,
    leases: propertyLeases,
    properties,
    collectedPayments: collectedLeasePayments,
  });
  warnForUnmatchedStatementPayments({
    month,
    selectedProperty,
    leases: propertyLeases,
    collectedPayments: collectedLeasePayments,
  });
  const activePropertyCount = getActivePropertyCount(rentRows);
  const activeTenantCount = getActiveTenantCount(propertyLeases);
  const amountPaid = rentRows.reduce((sum, row) => sum + row.paidAmount, 0);
  const monthlyRent = rentRows.reduce((sum, row) => sum + row.dueAmount, 0);
  const remainingBalance = Math.max(monthlyRent - amountPaid, 0);
  const paymentStatus = getStatementPaymentStatus(rentRows);
  const statementPaymentLine = getStatementPaymentLine(rentRows, month);

  return {
    statementMonth: formatMonthYear(month),
    statementPeriod: formatStatementPeriod(month),
    statementId: `RS-${formatCycleKey(month)}-${selectedPropertyId.slice(0, 6) || "property"}`,
    generatedDate: formatDate(new Date()),
    propertyName: formatActivePropertyCount(activePropertyCount),
    propertyAddress: "",
    propertiesIncluded: "",
    landlordName: landlord.name || "Not available",
    landlordEmail: landlord.email || "Not available",
    tenantName: formatActiveTenantCount(activeTenantCount),
    tenantEmail: "",
    propertyRentLines: rentRows.map(formatStatementRentLine),
    monthlyRent: monthlyRent > 0 ? formatCurrency(monthlyRent) : "Not available",
    amountPaid: formatCurrency(amountPaid),
    amountDue: formatCurrency(remainingBalance),
    paymentStatus,
    statementPaymentLine,
    remainingBalance: formatCurrency(remainingBalance),
  };
}

function selectStatementLeaseForMonth(leases: LeaseItem[], month: Date) {
  return (
    leases.find((lease) => statementLeaseOverlapsMonth(lease, month)) ||
    leases[0] ||
    null
  );
}

function getActiveStatementLeases({
  leases,
  properties,
  month,
}: {
  leases: LeaseItem[];
  properties: PropertyItem[];
  month: Date;
}) {
  return leases.filter((lease) => {
    const property = properties.find((item) => item.id === lease.property_id);
    return isActiveStatementLease(lease, property, month);
  });
}

function isActiveStatementLease(
  lease: LeaseItem,
  property: PropertyItem | undefined,
  month: Date
) {
  if (!statementLeaseOverlapsMonth(lease, month)) return false;
  if (Number(lease.monthly_rent || 0) <= 0) return false;
  if (!selectPrimaryTenant(lease.lease_tenants || [])) return false;
  if (!isStatementPropertyActive(property)) return false;

  const leaseStatus = String(lease.lease_status || "").toLowerCase();
  const inactiveStatuses = [
    "draft",
    "ended",
    "expired",
    "inactive",
    "terminated",
    "cancelled",
    "canceled",
  ];

  if (lease.ended_at || inactiveStatuses.includes(leaseStatus)) return false;
  return true;
}

function isStatementPropertyActive(property: PropertyItem | undefined) {
  if (!property) return false;
  const propertyStatus = String(property.status || "active").toLowerCase();
  const bankStatus = String(property.bank_status || "").toLowerCase();
  return propertyStatus === "active" && bankStatus === "connected";
}

function getActivePropertyCount(rows: StatementRentRow[]) {
  return new Set(rows.map((row) => row.id)).size;
}

function getActiveTenantCount(leases: LeaseItem[]) {
  return new Set(
    leases
      .map((lease) => selectPrimaryTenant(lease.lease_tenants || []))
      .filter(Boolean)
      .map((tenant) => tenant!.id)
  ).size;
}

function formatActivePropertyCount(count: number) {
  return `${count} Active ${count === 1 ? "Property" : "Properties"}`;
}

function formatActiveTenantCount(count: number) {
  return `${count} Active ${count === 1 ? "Tenant" : "Tenants"}`;
}

function getStatementRentRows({
  month,
  leases,
  properties,
  collectedPayments,
}: {
  month: Date;
  leases: LeaseItem[];
  properties: PropertyItem[];
  collectedPayments: StatementCollectedPayment[];
}): StatementRentRow[] {
  const obligations = leases
    .filter((lease) => Number(lease.monthly_rent || 0) > 0)
    .map((lease) =>
      buildLeaseObligation({
        month,
        lease,
        property: properties.find((item) => item.id === lease.property_id),
        collectedPayments: getPaymentsForLeaseObligation(
          lease,
          leases,
          collectedPayments
        ),
      })
    );

  const rowsByProperty = obligations.reduce((map, obligation) => {
    const propertyId = obligation.lease.property_id || obligation.lease.id;
    const existing = map.get(propertyId);
    if (!existing) {
      map.set(propertyId, obligation);
      return map;
    }

    map.set(propertyId, combineLeaseObligations(existing, obligation));
    return map;
  }, new Map<string, LeaseObligation>());

  return Array.from(rowsByProperty.entries()).map(([propertyId, obligation]) =>
    formatStatementRentRow(propertyId, obligation)
  );
}

function buildLeaseObligation({
  month,
  lease,
  property,
  collectedPayments,
}: {
  month: Date;
  lease: LeaseItem;
  property: PropertyItem | undefined;
  collectedPayments: StatementCollectedPayment[];
}): LeaseObligation {
  const dueAmount = normalizeMoney(Number(lease.monthly_rent || 0));
  const rawPaidAmount = normalizeMoney(
    collectedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );
  const paidAmount = Math.min(rawPaidAmount, dueAmount);
  const balanceAmount = Math.max(dueAmount - paidAmount, 0);
  const dueDate = getLeaseDueDate(lease, month);
  const paidDates = collectedPayments
    .map((item) => parseLocalDate(item.payment.paid_at || ""))
    .filter(isDateValue)
    .sort((a, b) => b.getTime() - a.getTime());
  const paymentRefs = getUniqueStatementPaymentRefs(collectedPayments);
  const latestPaidDate = paidDates[0] || null;
  const isFullyPaid = dueAmount > 0 && balanceAmount <= 0;
  const today = startOfDay(new Date());
  const hasLatePayment = Boolean(
    isFullyPaid && (!latestPaidDate || startOfDay(latestPaidDate) > dueDate)
  );
  const hasOverdueBalance = Boolean(balanceAmount > 0 && today > dueDate);

  return {
    lease,
    property,
    tenant: selectPrimaryTenant(lease.lease_tenants || []),
    dueAmount,
    paidAmount,
    balanceAmount,
    dueDate,
    paidDates,
    paymentCount: paymentRefs.length,
    rawPaymentCount: collectedPayments.length,
    paymentRefs,
    hasLatePayment,
    hasOverdueBalance,
  };
}

function combineLeaseObligations(
  first: LeaseObligation,
  second: LeaseObligation
): LeaseObligation {
  return {
    ...first,
    dueAmount: first.dueAmount + second.dueAmount,
    paidAmount: first.paidAmount + second.paidAmount,
    balanceAmount: first.balanceAmount + second.balanceAmount,
    dueDate: first.dueDate > second.dueDate ? first.dueDate : second.dueDate,
    paidDates: [...first.paidDates, ...second.paidDates].sort(
      (a, b) => b.getTime() - a.getTime()
    ),
    paymentRefs: getUniqueStatementPaymentRefsFromRefs([
      ...first.paymentRefs,
      ...second.paymentRefs,
    ]),
    paymentCount: getUniqueStatementPaymentRefsFromRefs([
      ...first.paymentRefs,
      ...second.paymentRefs,
    ]).length,
    rawPaymentCount: first.rawPaymentCount + second.rawPaymentCount,
    hasLatePayment: first.hasLatePayment || second.hasLatePayment,
    hasOverdueBalance: first.hasOverdueBalance || second.hasOverdueBalance,
  };
}

function formatStatementRentRow(
  propertyId: string,
  obligation: LeaseObligation
): StatementRentRow {
  return {
    id: propertyId,
    descriptor:
      obligation.property?.property_label ||
      getAddressFirstLine(obligation.property) ||
      obligation.lease.properties?.property_label ||
      "Property",
    tenantFirstName: getTenantFirstName(obligation.tenant),
    dueAmount: obligation.dueAmount,
    paidAmount: obligation.paidAmount,
    balanceAmount: obligation.balanceAmount,
    due: formatCurrency(obligation.dueAmount),
    paid: formatCurrency(obligation.paidAmount),
    balance: formatCurrency(obligation.balanceAmount),
    paidDates: obligation.paidDates,
    paymentCount: obligation.paymentCount,
    rawPaymentCount: obligation.rawPaymentCount,
    paymentRefs: obligation.paymentRefs,
    hasLatePayment: obligation.hasLatePayment,
    hasOverdueBalance: obligation.hasOverdueBalance,
  };
}

function formatStatementRentLine(row: StatementRentRow) {
  return {
    id: row.id,
    descriptor: row.descriptor,
    tenantFirstName: row.tenantFirstName,
    due: row.due,
    paid: row.paid,
    balance: row.balance,
  };
}

function getPaymentsForLeaseObligation(
  lease: LeaseItem,
  leases: LeaseItem[],
  collectedPayments: StatementCollectedPayment[]
) {
  const propertyLeaseCount = leases.filter(
    (item) => item.property_id === lease.property_id
  ).length;

  return collectedPayments.filter((item) => {
    const payment = item.payment;
    if (payment.lease_id) return payment.lease_id === lease.id;
    if (payment.property_id) {
      return payment.property_id === lease.property_id && propertyLeaseCount === 1;
    }
    return false;
  });
}

function warnForUnmatchedStatementPayments({
  month,
  selectedProperty,
  leases,
  collectedPayments,
}: {
  month: Date;
  selectedProperty: string;
  leases: LeaseItem[];
  collectedPayments: StatementCollectedPayment[];
}) {
  if (!isRentStatementDebugEnabled()) return;

  const unmatchedPayments = collectedPayments.filter((item) => {
    const payment = item.payment;
    if (payment.lease_id) {
      return !leases.some((lease) => lease.id === payment.lease_id);
    }
    if (payment.property_id) {
      const propertyLeaseCount = leases.filter(
        (lease) => lease.property_id === payment.property_id
      ).length;
      return propertyLeaseCount !== 1;
    }
    return true;
  });

  if (!unmatchedPayments.length) return;

  console.warn("Rent statement skipped unmatched payment allocation", {
    statementMonth: formatCycleKey(month),
    selectedProperty,
    payments: unmatchedPayments.map((item) => ({
      id: item.payment.id,
      lease_id: item.payment.lease_id,
      property_id: item.payment.property_id,
      tenant_access_id: item.payment.tenant_access_id,
      amount: item.amount,
      period_label: item.payment.period_label,
      rent_cycle_key: item.payment.rent_cycle_key,
    })),
  });
}

function getLeaseDueDate(lease: LeaseItem, month: Date) {
  const dueDay = parseRentDueDay(lease.rent_due_day);
  const lastDay = endOfMonth(month).getDate();
  return startOfDay(
    new Date(month.getFullYear(), month.getMonth(), Math.min(dueDay, lastDay))
  );
}

function statementLeaseOverlapsMonth(lease: LeaseItem, month: Date) {
  const leaseStart = parseLocalDate(lease.start_date || "");
  const leaseEnd = parseLocalDate(lease.end_date || "");
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = endOfMonth(month);

  if (leaseStart && leaseStart > monthEnd) return false;
  if (leaseEnd && leaseEnd < monthStart) return false;
  return true;
}

function paymentBelongsToStatementMonth(payment: RentPaymentItem, month: Date) {
  const targetKey = formatCycleKey(month);
  if (normalizeCycleKey(payment.rent_cycle_key) === targetKey) return true;

  const periodMonth = parsePeriodMonth(payment.period_label);
  if (periodMonth && formatCycleKey(periodMonth) === targetKey) return true;

  return [payment.paid_at, payment.created_at].some((value) => {
    const parsed = parseLocalDate(value || "");
    return Boolean(parsed && formatCycleKey(parsed) === targetKey);
  });
}

function parseStatementMonth(value?: string | null) {
  const [yearValue, monthValue] = String(value || "").split("-").map(Number);
  if (
    Number.isInteger(yearValue) &&
    Number.isInteger(monthValue) &&
    yearValue > 2000 &&
    monthValue >= 1 &&
    monthValue <= 12
  ) {
    return new Date(yearValue, monthValue - 1, 1);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function parsePeriodMonth(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(`1 ${value}`);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }

  return null;
}

function normalizeCycleKey(value?: string | null) {
  if (!value) return "";
  const match = value.match(/(\d{4})[-/](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function formatCycleKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isRentStatementDebugEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_RENT_STATEMENT_DEBUG === "true"
  );
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const [datePart] = value.split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isDateValue(value: Date | null): value is Date {
  return Boolean(value && !Number.isNaN(value.getTime()));
}

function normalizeRelatedRows<T>(rows: T[]): T[] {
  return rows.map((row) => {
    const next = { ...(row as Record<string, unknown>) };
    Object.keys(next).forEach((key) => {
      if (Array.isArray(next[key]) && next[key].length === 1) {
        next[key] = next[key][0];
      }
    });
    return next as T;
  });
}

function mergeRentPayments(payments: RentPaymentItem[]) {
  return Array.from(
    payments
      .reduce((map, payment) => {
        if (payment.id) map.set(payment.id, payment);
        return map;
      }, new Map<string, RentPaymentItem>())
      .values()
  );
}

function normalizeTenants(value: unknown): LeaseTenantItem[] {
  if (Array.isArray(value)) return value as LeaseTenantItem[];
  if (value && typeof value === "object") return [value as LeaseTenantItem];
  return [];
}

function selectPrimaryTenant(tenants: unknown) {
  const tenantList = normalizeTenants(tenants);

  return (
    tenantList.find(
      (tenant) => String(tenant.tenant_role || "").toLowerCase() === "primary"
    ) ||
    tenantList[0] ||
    null
  );
}

function getTenantName(tenant: LeaseTenantItem) {
  return `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Tenant";
}

function getTenantFirstName(tenant?: LeaseTenantItem | null) {
  if (!tenant) return "Not available";
  return tenant.first_name || getTenantName(tenant).split(" ")[0] || "Not available";
}

function getStatementPaymentStatus(rows: StatementRentRow[]) {
  if (!rows.length) return "No Active Obligations";

  const totalDue = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const totalBalance = rows.reduce((sum, row) => sum + row.balanceAmount, 0);

  if (totalDue <= 0) return "Unpaid";

  if (totalBalance <= 0) {
    return rows.some((row) => row.hasLatePayment) ? "Paid • Late" : "Paid • On Time";
  }

  if (rows.some((row) => row.hasOverdueBalance)) {
    return totalPaid > 0 ? "Partially Paid • Late" : "Overdue";
  }

  return totalPaid > 0 ? "Partially Paid" : "Unpaid";
}

function getStatementPaymentLine(rows: StatementRentRow[], month: Date) {
  const paidRows = rows.filter((row) => row.paidAmount > 0);
  const uniquePaymentRefs = getUniqueStatementPaymentRefsFromRefs(
    paidRows.flatMap((row) => row.paymentRefs)
  );
  const paymentCount = uniquePaymentRefs.length;
  const latestPaymentDate = uniquePaymentRefs.find((payment) => payment.paidDate)
    ?.paidDate;
  const displayedPaymentNote = latestPaymentDate
    ? `${paymentCount > 1 ? "Last payment" : "Payment"} made on ${formatDate(latestPaymentDate)}`
    : null;

  if (isRentStatementDebugEnabled()) {
    console.log("Rent statement payment note", {
      statementMonth: formatCycleKey(month),
      includedPropertyIds: rows.map((row) => row.id),
      rawPaymentCount: paidRows.reduce((sum, row) => sum + row.rawPaymentCount, 0),
      uniqueSuccessfulPaymentIds: uniquePaymentRefs.map((payment) => payment.id),
      finalPaymentCount: paymentCount,
      displayedPaymentNote,
    });
  }

  return displayedPaymentNote;
}

function getUniqueStatementPaymentRefs(
  payments: StatementCollectedPayment[]
): StatementPaymentRef[] {
  return getUniqueStatementPaymentRefsFromRefs(
    payments.map((item) => ({
      id: getStatementPaymentIdentity(item.payment),
      paidDate: parseLocalDate(item.payment.paid_at || ""),
    }))
  );
}

function getUniqueStatementPaymentRefsFromRefs(
  refs: StatementPaymentRef[]
): StatementPaymentRef[] {
  return Array.from(
    refs
      .reduce((map, ref) => {
        if (!ref.id) return map;
        const existing = map.get(ref.id);
        if (!existing || (!existing.paidDate && ref.paidDate)) {
          map.set(ref.id, ref);
        }
        return map;
      }, new Map<string, StatementPaymentRef>())
      .values()
  ).sort((a, b) => {
    const first = a.paidDate?.getTime() || 0;
    const second = b.paidDate?.getTime() || 0;
    return second - first;
  });
}

function getStatementPaymentIdentity(payment: RentPaymentItem) {
  return (
    payment.stripe_payment_intent_id ||
    payment.payment_intent_id ||
    payment.stripe_charge_id ||
    payment.charge_id ||
    payment.processor_payment_id ||
    payment.processor_reference ||
    payment.stripe_checkout_session_id ||
    payment.payout_id ||
    payment.stripe_payout_id ||
    payment.receipt_url ||
    payment.id
  );
}

function getAddressFirstLine(property?: PropertyItem | null) {
  if (!property) return "";
  return [property.street_address, property.unit_name].filter(Boolean).join(", ");
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function parseRentDueDay(value?: string | null) {
  const parsed = Number(String(value || "").match(/\d+/)?.[0] || 1);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 31);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  if (!date) return "Not available";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatStatementPeriod(date: Date) {
  return `${formatDate(new Date(date.getFullYear(), date.getMonth(), 1))} - ${formatDate(endOfMonth(date))}`;
}

function logStatementLoadError(label: string, error: unknown) {
  console.error(`Rent statement print load error: ${label}`, {
    message: getErrorField(error, "message"),
    name: getErrorField(error, "name"),
    stack: getErrorField(error, "stack"),
    code: getErrorField(error, "code"),
    details: getErrorField(error, "details"),
    hint: getErrorField(error, "hint"),
    raw: error,
  });
}

function getErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
