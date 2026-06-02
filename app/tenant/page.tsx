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
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteType, setNoteType] = useState<"private" | "shared">("private");
  const [newNote, setNewNote] = useState("");

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
      <main className="flex h-screen items-center justify-center bg-white text-sm text-zinc-500">
        Loading tenant portal...
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-white font-sans text-[#0F172A]">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-7">
        <div className="flex items-center gap-5">
  <img src="/logo.png" alt="AvenueBoard" className="h-8 w-auto" />

  <div className="h-9 w-px bg-zinc-200" />

  <div>
    <p className="text-[14px] font-semibold tracking-[-0.03em] text-zinc-950">
      Tenant Portal
    </p>
    <p className="mt-0.5 max-w-[360px] truncate text-[12px] font-medium text-zinc-400">

      {selectedLease

        ? `${selectedLease.street_address}${

            selectedLease.unit_name ? `, Unit ${selectedLease.unit_name}` : ""

          }, ${selectedLease.city}, ${selectedLease.state_name} ${selectedLease.zip}`

        : "Property"}

    </p>

  </div>
</div>

        <div className="flex items-center gap-5">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-zinc-50">
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#B9476D]" />
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 17H9m9-6a6 6 0 0 0-12 0c0 3-.8 4.5-2 6h16c-1.2-1.5-2-3-2-6Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 20a2.2 2.2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="h-8 w-px bg-zinc-200" />

          <div className="relative">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-zinc-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-[13px] font-semibold text-white">
                {getInitials(userInfo.name)}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[190px] truncate text-[14px] font-semibold text-zinc-950">
                  {userInfo.name}
                </p>
                <p className="text-[12px] text-zinc-500">Tenant</p>
              </div>

              <span className="text-zinc-400">⌄</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[56px] z-20 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
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
        </div>
      </header>

      {leases.length === 0 ? (
        <div className="flex h-[calc(100vh-76px)] items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-[30px] font-semibold tracking-[-0.05em]">
              No active lease access
            </h1>
            <p className="mt-3 max-w-[460px] text-[15px] leading-7 text-zinc-500">
              Your landlord invitation has not been connected yet. Open your
              invite email and accept the invitation to access your tenant
              portal.
            </p>
          </div>
        </div>
      ) : (
        
        <div className="grid h-[calc(100vh-76px)] grid-cols-[minmax(0,1fr)_405px] gap-4 overflow-hidden bg-white px-4 py-4">
        <div className="grid min-h-0 grid-rows-[390px_285px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentHero
            lease={selectedLease}
            paymentMethods={selectedPaymentMethods}
            firstName={getFirstName(userInfo.name)}
            />

            <NotesDocumentsCard
                documents={selectedDocuments}
                onAddNote={() => setNoteOpen(true)}
            />

            <RecentActivityCard
              lease={selectedLease}
              payments={selectedRentPayments}
              documents={selectedDocuments}
            />
          </div>

          <aside className="grid min-h-0 grid-rows-[430px_minmax(0,1fr)] gap-4 overflow-hidden">
            <PaymentProgressCard
              lease={selectedLease}
              payments={selectedRentPayments}
            />
            <QuickAccessCard />
          </aside>
        </div>
      )}

      {noteOpen && (
  <AddNoteModal
    noteType={noteType}
    setNoteType={setNoteType}
    newNote={newNote}
    setNewNote={setNewNote}
    onClose={() => setNoteOpen(false)}
    onSave={() => {
      setNewNote("");
      setNoteType("private");
      setNoteOpen(false);
    }}
  />
)}

    </main>
  );
}

function PaymentHero({
  lease,
  paymentMethods,
  firstName,
}: {
  lease?: TenantLease;
  paymentMethods: PaymentMethod[];
  firstName: string;
}) {
  const defaultMethod =
    paymentMethods.find((method) => method.is_default) || paymentMethods[0];

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5">
      <div className="grid h-full grid-rows-[150px_minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_310px] items-center gap-6">
          <div>
            <p className="text-[18px] font-medium tracking-[-0.03em] text-slate-800">
              Good afternoon, {firstName}
            </p>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Total Due
            </p>

            <div className="mt-1 flex items-end gap-8">
              <h1 className="text-[52px] font-[600] leading-none tracking-[-0.075em] text-slate-950">
                ${Number(lease?.monthly_rent || 0).toLocaleString()}
              </h1>

              <div className="mb-1 flex items-center gap-5">
                <div className="h-12 w-px bg-zinc-200" />

                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                    ⓘ{" "}
                    {defaultMethod
                      ? `${formatBrand(defaultMethod.brand)} •••• ${defaultMethod.last4}`
                      : "Auto-pay not enrolled"}
                  </p>

                  <p className="mt-1 text-[14px] font-semibold text-zinc-900">
                    Due on {formatDueDate(lease?.rent_due_day)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="group flex h-[48px] w-full items-center justify-center gap-6 rounded-xl bg-[#0F172A] text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5">
              Pay Rent
              <span className="transition group-hover:translate-x-1">→</span>
            </button>

            <button className="h-[48px] w-full rounded-xl border border-zinc-300 bg-white text-[13px] font-semibold text-zinc-950 transition hover:bg-zinc-50">
              Setup Autopay
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-4">
          <AvenuePerksCard />
          <CreditBuildingCard />
          <LeaseStatusCard lease={lease} />
        </div>
      </div>
    </section>
  );
}

function AvenuePerksCard() {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3">
          <IconBox>✦</IconBox>

          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
              Avenue Perks
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              Exclusive benefits for residents.
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-end gap-2">
            <p className="text-[30px] font-semibold tracking-[-0.06em]">3</p>
            <p className="pb-1 text-[12px] text-zinc-500">
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
    </DashboardCard>
  );
}

function CreditBuildingCard() {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[17px] text-emerald-700">
              ✓
            </div>

            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
                Credit Building
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                Build credit with on-time rent.
              </p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            Active
          </span>
        </div>

        <div className="mt-auto">
          <p className="text-[12px] text-zinc-500">Reporting to 3 bureaus</p>

          <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
            <span className="text-indigo-700">Experian</span>
            <span className="text-red-700">Equifax</span>
            <span className="text-sky-600">TransUnion</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function LeaseStatusCard({ lease }: { lease?: TenantLease }) {
  const monthsRemaining = getMonthsRemaining(lease?.end_date);

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-[17px] text-indigo-700">
            ⌂
          </div>

          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.03em]">
              Lease Status
            </h3>
            <p className="mt-1 text-[12px] text-zinc-500">Active lease</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[12px] font-semibold text-zinc-900">
            Unit {lease?.unit_name || "—"}
          </p>
          <p className="mt-0.5 max-w-[120px] truncate text-[11px] text-zinc-500">
            {lease?.property_label || "Property"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[30px] font-semibold tracking-[-0.06em]">
          {monthsRemaining}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-zinc-500">
          months remaining
        </p>
      </div>

      <div className="mt-3 h-2 rounded-full bg-zinc-100">
        <div className="h-2 w-[46%] rounded-full bg-slate-950" />
      </div>

      <CardFooter label="View lease" />
    </DashboardCard>
  );
}

function NotesDocumentsCard({
  documents,
  onAddNote,
}: {
  documents: LeaseDocument[];
  onAddNote: () => void;
}) {
  const visibleDocs = documents.slice(0, 2);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)] gap-5">
        <div className="flex min-h-0 flex-col pr-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                Notes
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-500">
                0
              </span>

              <button
                onClick={onAddNote}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50"
              >
                + Add
              </button>
            </div>

            <button className="text-[13px] font-semibold text-zinc-950">
              View all notes →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <NotePreview
              type="Private Note"
              text="Save personal reminders about your lease, rent, maintenance, or home."
              variant="private"
            />

            <NotePreview
              type="Shared Note"
              text="Messages and updates shared with your landlord will appear here."
              variant="shared"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-l border-zinc-100 pl-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                Property Documents
              </h2>

              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-500">
                {documents.length}
              </span>

              <button className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#B9476D] hover:bg-zinc-50">
                Upload
              </button>
            </div>

            <button className="text-[13px] font-semibold text-zinc-950">
              View all →
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {visibleDocs.length > 0 ? (
              visibleDocs.map((doc) => <DocumentTile key={doc.id} doc={doc} />)
            ) : (
              <>
                <DocumentPlaceholder
                  title="Lease Agreement.pdf"
                  date="Available after upload"
                />
                <DocumentPlaceholder
                  title="House Rules.pdf"
                  date="Available after upload"
                />
              </>
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
}: {
  type: string;
  text: string;
  variant: "private" | "shared";
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
    <div className={`rounded-2xl border px-4 py-4 ${styles}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <p className="min-w-0 text-[13px] leading-6 text-zinc-800">
          {text}
        </p>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badge}`}
        >
          {type}
        </span>
      </div>
    </div>
  );
}

function RecentActivityCard({
  lease,
  payments,
  documents,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
  documents: LeaseDocument[];
}) {
  const latestPayment = payments[0];
  const latestDocument = documents[0];

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.035em]">
            Recent Activity
          </h2>
        </div>

        <button className="text-[13px] font-semibold text-zinc-950">
          View all activity →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 divide-x divide-zinc-100">
        <ActivityMini
          icon="✓"
          title={latestPayment ? "Rent payment received" : "Rent payment pending"}
          subtitle={latestPayment?.period_label || "No payment recorded yet"}
          amount={`$${Number(
            latestPayment?.amount || lease?.monthly_rent || 0
          ).toLocaleString()}.00`}
          iconClass="bg-slate-950 text-white"
          amountClass="text-emerald-600"
        />

        <ActivityMini
          icon="○"
          title="Upcoming rent due"
          subtitle={formatDueDate(lease?.rent_due_day)}
          amount={`$${Number(lease?.monthly_rent || 0).toLocaleString()}.00`}
          iconClass="bg-white border border-slate-950 text-slate-950"
          amountClass="text-zinc-600"
        />

        <ActivityMini
          icon="▥"
          title="Credit reporting active"
          subtitle="Your payments are being reported."
          badge="Active"
          iconClass="bg-emerald-600 text-white"
        />

        <ActivityMini
          icon="⧉"
          title={latestDocument ? "New document shared" : "Documents ready"}
          subtitle={latestDocument?.file_name || "Shared files will appear here."}
          amount={latestDocument ? formatDate(latestDocument.created_at) : ""}
          iconClass="bg-zinc-100 text-zinc-700"
          amountClass="text-zinc-500"
        />
      </div>
    </section>
  );
}

function PaymentProgressCard({
  lease,
  payments,
}: {
  lease?: TenantLease;
  payments: RentPayment[];
}) {
  const rows = buildPaymentProgress(lease, payments);

  return (
    <section className="min-h-0 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <h2 className="text-[17px] font-semibold tracking-[-0.035em]">
          Payment Progress
        </h2>

        <select className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] font-semibold outline-none">
          <option>2026</option>
        </select>
      </div>

      <div className="mt-5 space-y-6">
        {rows.map((item, index) => (
          <div key={item.month} className="grid grid-cols-[26px_1fr_auto] gap-3">
            <div className="relative flex justify-center">
              {index < rows.length - 1 && (
                <span className="absolute top-7 h-[46px] w-px bg-zinc-200" />
              )}
              <span
                className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  item.status === "paid"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : item.status === "upcoming"
                    ? "border-slate-950 bg-white text-slate-950"
                    : "border-zinc-300 bg-white text-zinc-400"
                }`}
              >
                {item.status === "paid" ? "✓" : ""}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-zinc-950">
                  {item.month}
                </p>

                {item.status === "upcoming" && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600">
                    Upcoming
                  </span>
                )}
              </div>

              <p className="mt-1 text-[12px] text-zinc-500">{item.subtext}</p>
            </div>

            <p
              className={`text-[13px] font-semibold ${
                item.status === "paid" ? "text-emerald-600" : "text-zinc-700"
              }`}
            >
              ${Number(lease?.monthly_rent || 0).toLocaleString()}.00
            </p>
          </div>
        ))}
      </div>

      <button className="mt-5 flex items-center gap-3 text-[13px] font-semibold text-zinc-950">
        View payment history <span>→</span>
      </button>
    </section>
  );
}

function QuickAccessCard() {
  return (
    <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-none">
      <h2 className="text-[17px] font-semibold tracking-[-0.035em]">
        Quick Access
      </h2>

      <div className="mt-4 space-y-3">
        <QuickAccessItem
          title="Payment Methods"
          subtitle="Manage cards & bank accounts"
          icon="▣"
        />
        <QuickAccessItem
          title="Lease Details"
          subtitle="View your lease information"
          icon="⧉"
        />
        <QuickAccessItem
          title="Contact Support"
          subtitle="Get help from our team"
          icon="◉"
        />
      </div>
    </section>
  );
}

function DashboardCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-0 overflow-hidden rounded-[22px] border border-zinc-200 bg-gradient-to-b from-white to-[#FAFAFA] p-4 shadow-none">
      {children}
    </section>
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
      <button className="flex w-full items-center justify-between text-[12px] font-semibold text-zinc-950">
        {label}
        <span className="text-zinc-500">›</span>
      </button>
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

function DocumentTile({ doc }: { doc: LeaseDocument }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[12px]">
          PDF
        </div>

        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-zinc-950">
            {doc.file_name}
          </p>
          <p className="mt-1 truncate text-[11px] text-zinc-500">
            {formatDate(doc.created_at)}
          </p>
        </div>
      </div>

      <span className="text-zinc-600">⇩</span>
    </div>
  );
}

function ActivityMini({
  icon,
  title,
  subtitle,
  amount,
  badge,
  iconClass,
  amountClass = "text-zinc-600",
}: {
  icon: string;
  title: string;
  subtitle: string;
  amount?: string;
  badge?: string;
  iconClass: string;
  amountClass?: string;
}) {
  return (
    <div className="px-4 first:pl-0 last:pr-0">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${iconClass}`}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-zinc-950">
            {title}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">
            {subtitle}
          </p>

          {amount && (
            <p className={`mt-1 text-[11px] font-semibold ${amountClass}`}>
              {amount}
            </p>
          )}

          {badge && (
            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAccessItem({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl px-1 py-1 text-left">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-[15px]">
          {icon}
        </span>

        <div>
          <p className="text-[13px] font-semibold text-zinc-950">{title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <span className="text-zinc-400">›</span>
    </button>
  );
}

function buildPaymentProgress(lease?: TenantLease, payments: RentPayment[] = []) {
  const rent = Number(lease?.monthly_rent || 0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);

  return [0, 1, 2, 3].map((offset) => {
    const date = new Date(base.getFullYear(), base.getMonth() + offset - 1, 1);
    const month = date.toLocaleDateString("en-US", { month: "long" });

    const paidPayment = payments.find((payment) =>
      String(payment.period_label || "")
        .toLowerCase()
        .includes(month.toLowerCase())
    );

    const status = paidPayment ? "paid" : offset === 1 ? "upcoming" : "future";

    return {
      month,
      amount: rent,
      status,
      subtext:
        status === "paid" ? `Paid on ${month} 1` : `Due on ${month} 1`,
    };
  });
}

function formatDueDate(rentDueDay?: string | null) {
  const day = String(rentDueDay || "1st of the Month").match(/\d+/)?.[0] || "1";
  return `June ${day}, 2026`;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
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

function getFirstName(name: string) {
  return name.split(" ").filter(Boolean)[0] || "there";
}

function formatBrand(brand?: string | null) {
  if (!brand) return "Payment Method";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function getMonthsRemaining(endDate?: string | null) {
  if (!endDate) return 0;

  const end = new Date(endDate);
  const today = new Date();

  const months =
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth());

  return Math.max(months, 0);
}

function AddNoteModal({
  noteType,
  setNoteType,
  newNote,
  setNewNote,
  onClose,
  onSave,
}: {
  noteType: "private" | "shared";
  setNoteType: (value: "private" | "shared") => void;
  newNote: string;
  setNewNote: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.04em]">
              Add Note
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">
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

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentPlaceholder({
  title,
  date,
}: {
  title: string;
  date: string;
}) {
  return (
    <div className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[11px] font-semibold text-red-500">
          PDF
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-zinc-950">
            {title}
          </p>
          <p className="mt-1 truncate text-[12px] text-zinc-500">{date}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-60 transition group-hover:opacity-100">
        <button className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950">
          View
        </button>
        <span className="text-zinc-300">/</span>
        <button className="text-[12px] font-semibold text-zinc-600 hover:text-zinc-950">
          Download
        </button>
      </div>
    </div>
  );
}