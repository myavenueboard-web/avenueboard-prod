"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

type TenantLease = {
  id: string;
  tenant_access_id: string;
  property_id: string;
  lease_id: string;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  unit_name: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  rent_due_day: string | null;
};

type LeaseDocument = {
  id: string;
  lease_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  created_at?: string | null;
};

type PaymentMethod = {
  id: string;
  lease_id: string;
  brand: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  is_default: boolean | null;
};

type RentPayment = {
  id: string;
  lease_id: string;
  payment_method_id: string | null;
  amount: number;
  period_label: string | null;
  status: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type UserInfo = {
  name: string;
  email: string;
};

export default function TenantDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<TenantLease[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [hasLandlordRole, setHasLandlordRole] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "Tenant",
    email: "",
  });

  useEffect(() => {
    async function loadTenantDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();

        setUserInfo({
          name:
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Tenant",
          email: user.email || profile?.email || "",
        });

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("profile_id", profile.id);

        setHasLandlordRole(
          (roleData || []).some((item) => item.role === "landlord")
        );

        const { data: accessData, error: accessError } = await supabase
          .from("tenant_access")
          .select("id, property_id, lease_id")
          .eq("tenant_profile_id", profile.id);

        if (accessError) {
          console.error("Tenant access load error:", accessError);
          return;
        }

        const accessRows = accessData || [];

        if (accessRows.length === 0) {
          setLeases([]);
          return;
        }

        const propertyIds = accessRows.map((item) => item.property_id);
        const leaseIds = accessRows.map((item) => item.lease_id);

        const [
          { data: propertyData },
          { data: leaseData },
          { data: docData },
          { data: paymentMethodData },
          { data: rentPaymentData },
        ] = await Promise.all([
          supabase
            .from("properties")
            .select(
              "id, property_label, street_address, city, state_name, zip, unit_name"
            )
            .in("id", propertyIds),

          supabase
            .from("leases")
            .select("id, start_date, end_date, monthly_rent, rent_due_day")
            .in("id", leaseIds),

          supabase
            .from("lease_documents")
            .select("id, lease_id, file_name, file_url, file_type, created_at")
            .in("lease_id", leaseIds)
            .order("created_at", { ascending: false }),

          supabase
            .from("payment_methods")
            .select("id, lease_id, brand, last4, exp_month, exp_year, is_default")
            .in("lease_id", leaseIds),

          supabase
            .from("rent_payments")
            .select(
              "id, lease_id, payment_method_id, amount, period_label, status, receipt_url, paid_at, created_at"
            )
            .in("lease_id", leaseIds)
            .order("created_at", { ascending: false }),
        ]);

        const propertyMap = new Map(
          (propertyData || []).map((property: any) => [property.id, property])
        );

        const leaseMap = new Map(
          (leaseData || []).map((lease: any) => [lease.id, lease])
        );

        const normalizedLeases: TenantLease[] = accessRows.map((access: any) => {
          const property = propertyMap.get(access.property_id);
          const lease = leaseMap.get(access.lease_id);

          return {
            id: access.id,
            tenant_access_id: access.id,
            property_id: access.property_id,
            lease_id: access.lease_id,
            property_label: property?.property_label || "Property",
            street_address: property?.street_address || "",
            city: property?.city || "",
            state_name: property?.state_name || "",
            zip: property?.zip || "",
            unit_name: property?.unit_name || null,
            start_date: lease?.start_date || null,
            end_date: lease?.end_date || null,
            monthly_rent: Number(lease?.monthly_rent || 0),
            rent_due_day: lease?.rent_due_day || null,
          };
        });

        setLeases(normalizedLeases);
        setDocuments((docData || []) as LeaseDocument[]);
        setPaymentMethods((paymentMethodData || []) as PaymentMethod[]);
        setRentPayments((rentPaymentData || []) as RentPayment[]);
        setSelectedLeaseId(normalizedLeases[0]?.lease_id || "");
      } catch (error) {
        console.error("Tenant dashboard error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTenantDashboard();
  }, [router]);

  const selectedLease =
    leases.find((lease) => lease.lease_id === selectedLeaseId) || leases[0];

  const selectedDocuments = useMemo(() => {
    if (!selectedLease) return [];
    return documents.filter((doc) => doc.lease_id === selectedLease.lease_id);
  }, [documents, selectedLease]);

  const selectedPaymentMethods = useMemo(() => {
    if (!selectedLease) return [];
    return paymentMethods.filter(
      (method) => method.lease_id === selectedLease.lease_id
    );
  }, [paymentMethods, selectedLease]);

  const selectedRentPayments = useMemo(() => {
    if (!selectedLease) return [];
    return rentPayments.filter(
      (payment) => payment.lease_id === selectedLease.lease_id
    );
  }, [rentPayments, selectedLease]);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#F7F6F3] text-sm text-zinc-500">
        Loading tenant portal...
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#F7F6F3] p-3 font-sans text-[#111827]">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <header className="relative flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-100 px-8">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="AvenueBoard" className="h-9 w-auto" />

            <div className="h-9 w-px bg-zinc-200" />

            <div>
              <p className="text-[14px] font-semibold text-zinc-900">
                Tenant Portal
              </p>
              <p className="mt-0.5 text-[12px] text-zinc-400">
                {selectedLease?.property_label || "Rent, lease, and documents"}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 pl-4 text-left transition hover:bg-zinc-50"
            >
              <div>
                <p className="max-w-[180px] truncate text-[13px] font-semibold text-zinc-900">
                  {userInfo.name}
                </p>
                <p className="max-w-[200px] truncate text-[12px] text-zinc-400">
                  {userInfo.email}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-[13px] font-semibold text-white">
                {getInitials(userInfo.name)}
              </div>

              <span className="text-zinc-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[58px] z-20 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                <div className="border-b border-zinc-100 px-4 py-4">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">
                    {userInfo.name}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-zinc-500">
                    {userInfo.email}
                  </p>
                </div>

                {hasLandlordRole && (
                  <button
                    onClick={() => router.push("/select-mode")}
                    className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Switch mode
                  </button>
                )}

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Profile settings
                </button>

                <button className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
                  Support
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/login");
                  }}
                  className="flex h-11 w-full items-center border-t border-zinc-100 px-4 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {leases.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.04em]">
                No active lease access
              </h1>
              <p className="mt-3 max-w-[440px] text-[15px] leading-7 text-zinc-500">
                Your landlord invitation has not been connected yet. Open your
                invite email and accept the invitation to access your tenant
                portal.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <p className="text-[15px] font-medium text-zinc-500">
                {formatToday()}
              </p>

              {leases.length > 1 && (
                <select
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                  className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-zinc-700 outline-none"
                >
                  {leases.map((lease) => (
                    <option key={lease.lease_id} value={lease.lease_id}>
                      {lease.property_label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-5">
              <section className="grid min-h-0 grid-rows-[185px_1fr_220px] gap-5">
                <UpcomingPayment
                  lease={selectedLease}
                  paymentMethods={selectedPaymentMethods}
                />

                <PaymentHistory
                  lease={selectedLease}
                  payments={selectedRentPayments}
                  paymentMethods={selectedPaymentMethods}
                />

                <LeaseActivity documents={selectedDocuments} />
              </section>

              <aside className="grid min-h-0 grid-rows-[1fr_190px_180px] gap-5">
                <LeaseDetails lease={selectedLease} />
                <PaymentMethods paymentMethods={selectedPaymentMethods} />
                <QuickLinks />
              </aside>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function UpcomingPayment({
  lease,
  paymentMethods,
}: {
  lease?: TenantLease;
  paymentMethods: PaymentMethod[];
}) {
  const defaultMethod =
    paymentMethods.find((method) => method.is_default) || paymentMethods[0];

  return (
    <Card>
      <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.03em]">
            Upcoming Payment
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Current billing cycle
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-600">
          Due {lease?.rent_due_day || "—"}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_1.15fr_170px] items-center gap-5 px-6 py-5">
        <div>
          <p className="text-[32px] font-semibold tracking-[-0.06em]">
            ${Number(lease?.monthly_rent || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[13px] text-zinc-500">Amount Due</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-[#FAFAFA] px-5 py-4">
          <div>
            <p className="text-[14px] font-semibold text-zinc-900">
              {defaultMethod
                ? `${formatBrand(defaultMethod.brand)} •••• ${defaultMethod.last4}`
                : "Payment method not set"}
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">
              {defaultMethod
                ? `Expires ${defaultMethod.exp_month || "--"}/${
                    defaultMethod.exp_year || "--"
                  }`
                : "ACH / card setup pending"}
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600">
            Secure
          </span>
        </div>

        <div className="text-center">
          <button className="h-12 w-full rounded-2xl bg-[#B9476D] text-[14px] font-semibold text-white hover:bg-[#A93F64]">
            {defaultMethod ? "Make Payment" : "Set Up Payments"}
          </button>
          <p className="mt-2 text-[12px] text-zinc-400">256-bit SSL</p>
        </div>
      </div>
    </Card>
  );
}

function PaymentHistory({
  lease,
  payments,
  paymentMethods,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
  paymentMethods: PaymentMethod[];
}) {
  return (
    <Card>
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
            Payment History
          </h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            Statements and receipts
          </p>
        </div>

        <select className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-[#B9476D] outline-none">
          <option>Download All</option>
          <option>Current Month</option>
          <option>Last 6 Months</option>
          <option>Last 12 Months</option>
          <option>Full Lease Period</option>
        </select>
      </div>

      <div className="grid shrink-0 grid-cols-[1.4fr_1fr_130px_120px_130px] border-b border-zinc-100 bg-[#FAFAFA] px-5 py-3 text-[13px] text-zinc-500">
        <p>Period</p>
        <p>Method</p>
        <p>Amount</p>
        <p>Status</p>
        <p className="text-right">Receipt</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {payments.length === 0 ? (
          <EmptyPaymentRow amount={lease?.monthly_rent || 0} />
        ) : (
          <div className="divide-y divide-zinc-100">
            {payments.map((payment) => {
              const method = paymentMethods.find(
                (item) => item.id === payment.payment_method_id
              );

              return (
                <div
                  key={payment.id}
                  className="grid grid-cols-[1.4fr_1fr_130px_120px_130px] items-center px-5 py-4 text-[14px]"
                >
                  <p>{payment.period_label || formatDate(payment.paid_at)}</p>
                  <p>
                    {method
                      ? `${formatBrand(method.brand)} •••• ${method.last4}`
                      : "—"}
                  </p>
                  <p>${Number(payment.amount || 0).toLocaleString()}</p>
                  <p>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold capitalize text-emerald-600">
                      {payment.status || "pending"}
                    </span>
                  </p>
                  <div className="text-right">
                    {payment.receipt_url ? (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] font-semibold text-[#B9476D]"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-[13px] text-zinc-400">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function EmptyPaymentRow({ amount }: { amount: number }) {
  return (
    <div className="flex h-full min-h-[150px] items-center justify-center px-5 text-center">
      <div>
        <p className="text-[14px] font-semibold text-zinc-900">
          No payments recorded yet
        </p>
        <p className="mt-2 text-[13px] text-zinc-500">
          Receipts and downloadable statements will appear here.
        </p>
        <p className="mt-4 text-[13px] font-semibold text-zinc-400">
          Expected monthly rent: ${Number(amount || 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function LeaseActivity({ documents }: { documents: LeaseDocument[] }) {
  return (
    <Card>
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
            Lease Activity
          </h2>
          <p className="mt-1 text-[13px] text-zinc-500">
            Shared documents, notices, and uploads
          </p>
        </div>

        <button className="h-10 rounded-2xl border border-zinc-200 bg-white px-5 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50">
          Upload Document
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {documents.length === 0 ? (
          <div className="rounded-2xl bg-orange-50 px-5 py-4">
            <p className="text-[13px] font-semibold text-orange-950">
              No shared activity yet
            </p>
            <p className="mt-2 text-[13px] leading-6 text-orange-900">
              Lease PDFs, receipts, notices, and tenant uploads will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-[14px] font-semibold text-zinc-900">
                    {doc.file_name}
                  </p>
                  <p className="mt-1 text-[12px] text-zinc-400">
                    {doc.file_type || "Document"} · {formatDate(doc.created_at)}
                  </p>
                </div>

                {doc.file_url ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-[12px] text-zinc-400">Stored</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LeaseDetails({ lease }: { lease?: TenantLease }) {
  return (
    <Card>
      <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
          Lease Details
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-4">
          <DetailItem icon="⌂" label="Unit" value={lease?.unit_name || "—"} />
          <DetailItem
            icon="🏢"
            label="Property"
            value={lease?.property_label || "Property"}
          />
          <DetailItem icon="📍" label="Address" value={formatAddress(lease)} />
          <DetailItem
            icon="💳"
            label="Monthly Rent"
            value={`$${Number(lease?.monthly_rent || 0).toLocaleString()}`}
          />
          <DetailItem
            icon="🗓"
            label="Lease Start"
            value={formatDate(lease?.start_date)}
          />
          <DetailItem
            icon="🗓"
            label="Lease End"
            value={formatDate(lease?.end_date)}
          />
        </div>
      </div>
    </Card>
  );
}

function PaymentMethods({
  paymentMethods,
}: {
  paymentMethods: PaymentMethod[];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
          Payment Methods
        </h2>

        <button className="rounded-2xl border border-zinc-200 px-4 py-2 text-[13px] font-semibold text-[#B9476D] hover:bg-zinc-50">
          + Add
        </button>
      </div>

      <div className="p-5">
        {paymentMethods.length === 0 ? (
          <div className="rounded-2xl bg-[#FAFAFA] px-4 py-4">
            <p className="text-[14px] font-semibold text-zinc-900">
              No payment method added
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">
              ACH and card setup will be connected after payment onboarding.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold text-zinc-900">
                    {formatBrand(method.brand)} •••• {method.last4}
                  </p>
                  <p className="mt-1 text-[12px] text-zinc-500">
                    Expires {method.exp_month || "--"}/{method.exp_year || "--"}
                  </p>
                </div>

                {method.is_default && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickLinks() {
  return (
    <Card>
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.03em]">
          Quick Links
        </h2>
      </div>

      <div className="space-y-3 p-5">
        <QuickLink label="Email Landlord" />
        <QuickLink label="View Lease PDF" />
        <QuickLink label="Download Statement" />
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
      {children}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[14px]">
        {icon}
      </div>

      <div>
        <p className="text-[13px] text-zinc-500">{label}</p>
        <p className="mt-0.5 text-[15px] font-semibold leading-5 text-zinc-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickLink({ label }: { label: string }) {
  return (
    <button className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 text-left text-[14px] font-semibold text-zinc-800 hover:bg-zinc-100">
      {label}
      <span className="text-zinc-400">›</span>
    </button>
  );
}

function formatAddress(lease?: TenantLease) {
  if (!lease) return "—";

  return [lease.street_address, lease.city, lease.state_name, lease.zip]
    .filter(Boolean)
    .join(", ");
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatBrand(brand?: string | null) {
  if (!brand) return "Payment Method";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}