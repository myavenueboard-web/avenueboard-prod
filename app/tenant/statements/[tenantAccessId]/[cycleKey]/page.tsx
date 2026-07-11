"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/tenant/tenantFormatters";
import StatementActionBar from "@/components/StatementActionBar";

type TenantAccessRecord = {
  id: string;
  tenant_profile_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  invite_status: string | null;
};

type RentPaymentRecord = {
  id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  payment_method_id: string | null;
  amount: number | null;
  period_label: string | null;
  rent_cycle_key: string | null;
  rent_cycle_month_label: string | null;
  rent_amount_cents: number | null;
  tenant_service_fee_cents: number | null;
  total_amount_cents: number | null;
  source: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PropertyRecord = {
  id: string;
  owner_profile_id: string | null;
  property_label: string | null;
  street_address: string | null;
  city: string | null;
  state_name: string | null;
  zip: string | null;
  unit_name: string | null;
};

type LeaseRecord = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | null;
  rent_due_day: string | null;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone?: string | null;
};

type PaymentMethodRecord = {
  id: string;
  tenant_access_id: string | null;
  lease_id: string | null;
  property_id: string | null;
  autopay_status: string | null;
  autopay_enrolled: boolean | null;
  brand: string | null;
  last4: string | null;
  is_default: boolean | null;
};

type StatementData = {
  access: TenantAccessRecord;
  payment: RentPaymentRecord | null;
  property: PropertyRecord | null;
  lease: LeaseRecord | null;
  tenant: ProfileRecord;
  landlord: ProfileRecord | null;
  paymentMethod: PaymentMethodRecord | null;
};

export default function TenantRentStatementPage() {
  const router = useRouter();
  const params = useParams<{ tenantAccessId: string; cycleKey: string }>();
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Rent Payment Statement | AvenueBoard";
  }, []);

  useEffect(() => {
    async function loadStatement() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace(
            `/login?returnTo=${encodeURIComponent(
              `/tenant/statements/${params.tenantAccessId}/${params.cycleKey}`
            )}`
          );
          return;
        }

        const profile = await getOrCreateProfile();

        const { data: access, error: accessError } = await supabase
          .from("tenant_access")
          .select("id, tenant_profile_id, property_id, lease_id, invite_status")
          .eq("id", params.tenantAccessId)
          .eq("tenant_profile_id", profile.id)
          .maybeSingle();

        if (accessError) throw accessError;

        if (!access || String(access.invite_status || "").toLowerCase() !== "accepted") {
          setError("This statement is not available for your account.");
          return;
        }

        const [
          { data: payment, error: paymentError },
          { data: property, error: propertyError },
          { data: lease, error: leaseError },
        ] = await Promise.all([
          supabase
            .from("rent_payments")
            .select(
              "id, profile_id, tenant_access_id, property_id, lease_id, payment_method_id, amount, period_label, rent_cycle_key, rent_cycle_month_label, rent_amount_cents, tenant_service_fee_cents, total_amount_cents, source, status, paid_at, created_at, updated_at"
            )
            .eq("tenant_access_id", access.id)
            .eq("lease_id", access.lease_id)
            .eq("rent_cycle_key", params.cycleKey)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("properties")
            .select("id, owner_profile_id, property_label, street_address, city, state_name, zip, unit_name")
            .eq("id", access.property_id)
            .maybeSingle(),
          supabase
            .from("leases")
            .select("id, start_date, end_date, monthly_rent, rent_due_day")
            .eq("id", access.lease_id)
            .maybeSingle(),
        ]);

        if (paymentError) throw paymentError;
        if (propertyError) throw propertyError;
        if (leaseError) throw leaseError;

        const [{ data: landlord }, { data: paymentMethods }] = await Promise.all([
          property?.owner_profile_id
            ? supabase
                .from("profiles")
                .select("id, display_name, email, phone")
                .eq("id", property.owner_profile_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("payment_methods")
            .select(
              "id, tenant_access_id, lease_id, property_id, autopay_status, autopay_enrolled, brand, last4, is_default"
            )
            .eq("tenant_access_id", access.id)
            .eq("lease_id", access.lease_id),
        ]);

        const methods = (paymentMethods || []) as PaymentMethodRecord[];
        const matchedMethod =
          methods.find((method) => method.id === payment?.payment_method_id) ||
          methods.find((method) => method.is_default) ||
          methods[0] ||
          null;

        setStatement({
          access: access as TenantAccessRecord,
          payment: (payment as RentPaymentRecord | null) || null,
          property: (property as PropertyRecord | null) || null,
          lease: (lease as LeaseRecord | null) || null,
          tenant: {
            id: profile.id,
            display_name:
              profile.display_name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "Tenant",
            email: user.email || profile.email || "",
          },
          landlord: (landlord as ProfileRecord | null) || null,
          paymentMethod: matchedMethod,
        });
      } catch (statementError) {
        console.error("Tenant statement load error:", statementError);
        setError("We could not load this statement. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadStatement();
  }, [params.cycleKey, params.tenantAccessId, router]);

  const viewModel = useMemo(() => {
    if (!statement) return null;
    return buildStatementView(statement, params.cycleKey);
  }, [params.cycleKey, statement]);
  const statementNotGenerated = statement && !viewModel;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-8 text-zinc-950">
        <div className="mx-auto max-w-[920px] rounded-[28px] border border-zinc-200 bg-white p-8">
          <p className="text-[14px] font-medium text-zinc-500">Loading statement...</p>
        </div>
      </main>
    );
  }

  if (error || !statement || !viewModel) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 pb-5 pt-3 text-zinc-950">
        <StatementActionBar
          backHref="/tenant"
          backLabel="Back"
          downloadLabel="Download PDF"
        />
        <div className="mx-auto max-w-[920px] rounded-[28px] border border-zinc-200 bg-white p-8">
          <p className="text-[18px] font-semibold text-zinc-950">
            {statementNotGenerated ? "Statement not generated" : "Statement unavailable"}
          </p>
          <p className="mt-2 text-[14px] leading-6 text-zinc-500">
            {statementNotGenerated
              ? "A rent statement is created after a completed payment is available for this month."
              : error || "This statement could not be found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f5] px-5 pb-5 pt-3 text-zinc-950 print:h-auto print:overflow-visible print:bg-white print:px-0 print:py-0">
      <StatementActionBar
        backHref="/tenant"
        backLabel="Back"
        downloadLabel="Download PDF"
        onDownload={() => window.print()}
      />

      <article
        id="tenant-statement-document"
        className="tenant-statement-preview mx-auto flex h-[1123px] w-[794px] flex-col overflow-hidden bg-white px-12 pb-11 pt-8 shadow-[0_18px_70px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200 print:shadow-none print:ring-0"
      >
        <header className="grid grid-cols-[1fr_auto] gap-7 border-b border-zinc-200 pb-7">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              RENT PAYMENT STATEMENT
            </p>
            <h1 className="mt-2.5 text-[40px] font-semibold leading-none tracking-[-0.06em] text-zinc-950">
              {viewModel.rentMonth}
            </h1>
            <dl className="mt-4 grid max-w-[520px] grid-cols-3 gap-3 text-[13px] leading-5 text-zinc-600">
              <StatementMeta label="Statement number" value={viewModel.statementNumber} />
              <StatementMeta label="Payment date" value={viewModel.paymentDate} />
              <StatementMeta label="Rent month" value={viewModel.rentMonth} />
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
            title="Tenant"
            lines={[
              viewModel.tenantName,
              viewModel.tenantEmail,
              viewModel.rentalAddress,
            ]}
          />
          <AddressBlock
            title="Landlord"
            lines={[
              viewModel.landlordName,
              viewModel.landlordEmail,
              viewModel.propertyDetails,
            ]}
          />
        </section>

        <section className="py-7">
          <h2 className="text-[25px] font-medium tracking-[-0.045em] text-zinc-950">
            Description
          </h2>

          <div className="mt-5 overflow-hidden border-t border-zinc-200">
            <StatementLine
              label={`Rent for ${viewModel.rentMonth}`}
              value={formatCurrency(viewModel.rentAmount)}
            />
            <StatementLine
              label="AvenueBoard Platform Fee"
              value={viewModel.platformFeeText}
            />
          </div>

          <div className="ml-auto mt-4 w-full max-w-[320px] pt-1">
            <StatementTotalLine
              label="Subtotal"
              value={formatCurrency(viewModel.subtotal)}
            />
            <StatementTotalLine
              label="Total charged"
              value={formatCurrency(viewModel.total)}
              strong
            />
            <StatementTotalLine
              label="Paid date"
              value={viewModel.paidDate}
              muted
            />
          </div>
        </section>

        <section className="pt-0">
          <div className="max-w-[520px]">
            <h2 className="text-[22px] font-medium tracking-[-0.04em] text-zinc-950">
              Payment Details
            </h2>
            <p className="mt-3 text-[14px] font-medium leading-6 text-zinc-700">
              {viewModel.paymentDetails}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              Payment method: {viewModel.paymentMethod}
            </p>
          </div>
        </section>

        <footer className="mt-auto border-t border-zinc-200 pt-4">
          <p className="text-[11px] leading-5 text-zinc-400">
            This statement is provided by AvenueBoard for record-keeping purposes
            only. It reflects payment information available in AvenueBoard at the
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
          <p key={`${title}-${line}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function StatementLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 border-b border-zinc-200 py-4 last:border-b-0">
      <p className="text-[14px] text-zinc-800">{label}</p>
      <p className="text-right text-[14px] font-medium tabular-nums text-zinc-800">
        {value}
      </p>
    </div>
  );
}

function StatementTotalLine({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 py-1.5">
      <p className={`text-[13px] ${muted ? "text-zinc-500" : "text-zinc-600"}`}>
        {label}
      </p>
      <p
        className={`text-right tabular-nums ${
          muted
            ? "text-[13px] font-medium text-zinc-500"
            : strong
            ? "text-[15px] font-semibold text-zinc-950"
            : "text-[13px] font-medium text-zinc-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function buildStatementView(statement: StatementData, cycleKey: string) {
  const payment = statement.payment;
  if (!payment || !isCompletedPayment(payment.status)) {
    return null;
  }

  const rentAmount =
    centsToDollarsOrNull(payment?.rent_amount_cents) ??
    Number(payment?.amount || statement.lease?.monthly_rent || 0);
  const platformFee =
    centsToDollarsOrNull(payment?.tenant_service_fee_cents) ?? 10;
  const total =
    centsToDollarsOrNull(payment?.total_amount_cents) ??
    rentAmount + platformFee;
  const rentMonth = payment?.rent_cycle_month_label || payment?.period_label || formatCycleLabel(cycleKey);
  const paidDate = payment?.paid_at || payment?.created_at || null;
  const lastFour = statement.paymentMethod?.last4 || "";
  const paidDateText = paidDate ? formatDate(paidDate) : "Payment date unavailable";
  const isAutoPay =
    String(payment?.source || "").toLowerCase().includes("autopay") ||
    statement.paymentMethod?.autopay_enrolled === true ||
    String(statement.paymentMethod?.autopay_status || "").toLowerCase() === "enrolled";

  return {
    statementNumber: buildStatementNumber(cycleKey, payment?.id || statement.access.id),
    paymentDate: paidDateText,
    rentMonth,
    tenantName: statement.tenant.display_name || "Tenant",
    tenantEmail: statement.tenant.email || "Email unavailable",
    rentalAddress: formatAddress(statement.property),
    landlordName: statement.landlord?.display_name || "Property owner",
    landlordEmail: statement.landlord?.email || "Landlord email unavailable",
    propertyDetails: formatPropertyDetails(statement.property),
    rentAmount,
    platformFee,
    platformFeeText:
      platformFee === 0 ? "$0 — absorbed by landlord" : formatCurrency(platformFee),
    subtotal: rentAmount + platformFee,
    total,
    paidDate: paidDateText,
    paymentMethod: formatPaymentMethod(statement.paymentMethod),
    paymentDetails: lastFour
      ? isAutoPay
        ? `Paid via AutoPay through Stripe ending in ****${lastFour}`
        : `Paid online through Stripe ending in ****${lastFour}`
      : `Paid online on ${paidDateText}`,
  };
}

function isCompletedPayment(status?: string | null) {
  return ["paid", "succeeded", "success", "completed", "complete"].includes(
    String(status || "").toLowerCase()
  );
}

function centsToDollarsOrNull(value?: number | null) {
  if (value === null || value === undefined) return null;

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return null;

  return numericValue / 100;
}

function formatCycleLabel(cycleKey: string) {
  const [year, month] = cycleKey.split("-").map(Number);
  if (!year || !month) return "Rent period";

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildStatementNumber(cycleKey: string, id: string) {
  const compactCycle = cycleKey.replace("-", "");
  const suffix = id.replace(/-/g, "").slice(-6).toUpperCase() || "000000";
  return `AB-${compactCycle}-${suffix}`;
}

function formatAddress(property: PropertyRecord | null) {
  const parts = [
    property?.street_address,
    property?.unit_name ? `Unit ${property.unit_name}` : "",
    property?.city,
    property?.state_name,
    property?.zip,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Rental address unavailable";
}

function formatPropertyDetails(property: PropertyRecord | null) {
  const label = property?.property_label || "Property";
  const unit = property?.unit_name ? `Unit ${property.unit_name}` : "";
  return [label, unit].filter(Boolean).join(" · ") || "Property details unavailable";
}

function formatPaymentMethod(method: PaymentMethodRecord | null) {
  if (!method) return "Online payment";

  const brand = method.brand
    ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    : "Payment method";

  return method.last4 ? `${brand} ending in ${method.last4}` : brand;
}
