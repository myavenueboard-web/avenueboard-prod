"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import {
  getLeaseFirstPaymentCycleDate,
  getLeasePaymentAmountForCycle,
  parseLocalDate,
  type LeaseAmountLike,
} from "@/lib/leasePaymentAmounts";
import {
  findCollectedPaymentForCycle,
  getActualRentAmount,
  type RentPaymentClassificationRecord,
} from "@/lib/rentPaymentClassification";
import { LandlordMobileHome } from "@/components/mobile/landlord/LandlordMobileDashboard";
import {
  deleteLandlordPropertyCascade,
  getDeletePropertyErrorMessage,
} from "@/lib/dashboard/deleteLandlordProperty";
import {
  getPropertyActionState,
  isCurrentActiveLease as isDashboardCurrentActiveLease,
  selectRelevantLease,
} from "@/lib/dashboard/landlordDashboardLogic";

type ActivityLog = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type DashboardProperty = {
  id: string;
  property_label: string;
  street_address: string;
  city: string;
  state_name: string;
  zip: string;
  bank_status: string | null;
  status: string | null;
  leases?: {
    id: string;
    start_date: string | null;
    end_date: string;
    monthly_rent: number;
    rent_due_day: string;
    lease_setup_type?: string | null;
    payment_tracking_start_date?: string | null;
    lease_status: string | null;
    payment_status: string | null;
    ended_at?: string | null;
    lease_amounts?: Array<LeaseAmountLike & { id?: string }>;
    lease_tenants?: {
      first_name: string;
      last_name: string;
      tenant_role: string;
    }[];
  }[];
};

type DashboardRentPayment = RentPaymentClassificationRecord;

type PayoutMonthMetric = {
  key: string;
  label: string;
  expected: number;
  collected: number;
  paid: number;
  pending: number;
  late: number;
  percent: number;
  status: "paid" | "partial" | "late" | "upcoming" | "empty" | "future";
};

type PayoutPerformanceMetrics = {
  collectionRate: number;
  totalCollected: number;
  totalExpected: number;
  collectedDisplay: string;
  expectedDisplay: string;
  calculationSummary: string;
  tooltipText: string;
  paidCount: number;
  pendingCount: number;
  lateCount: number;
  months: PayoutMonthMetric[];
  oldestLabel: string;
  newestLabel: string;
  hasExpectedRent: boolean;
  debugSummary: PayoutPerformanceDebugSummary;
};

type PayoutObligationStatus = "paid" | "pending" | "late";

type PayoutObligation = {
  propertyId: string;
  propertyName: string;
  leaseId: string;
  leaseStartDate: Date;
  monthKey: string;
  expected: number;
  collected: number;
  dueDate: Date;
  status: PayoutObligationStatus;
};

type PayoutPerformanceDebugSummary = {
  activeLeaseCount: number;
  obligations: Array<{
    propertyName: string;
    month: string;
    expected: number;
    collected: number;
    dueDate: string;
    status: PayoutObligationStatus;
  }>;
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
  lateCount: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [rentPayments, setRentPayments] = useState<DashboardRentPayment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [profileId, setProfileId] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [loading, setLoading] = useState(true);
  const [propertyLoadState, setPropertyLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteProperty, setDeleteProperty] =
    useState<DashboardProperty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [payoutInfoOpen, setPayoutInfoOpen] = useState(false);
  const payoutPerformance = useMemo(
    () => getPayoutPerformanceMetrics(properties, rentPayments),
    [properties, rentPayments]
  );

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setPropertyLoadState("loading");

      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);
        setLandlordName(
          profile.display_name || profile.email?.split("@")[0] || "Landlord"
        );

        await supabase.from("user_roles").upsert(
          {
            profile_id: profile.id,
            role: "landlord",
          },
          {
            onConflict: "profile_id,role",
          }
        );

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select(
            `
            *,
            leases (
              id,
              start_date,
              end_date,
              monthly_rent,
              rent_due_day,
              lease_setup_type,
              payment_tracking_start_date,
              lease_status,
              payment_status,
              ended_at,
              lease_amounts (
                id,
                amount_type,
                amount
              ),
              lease_tenants (
                first_name,
                last_name,
                tenant_role
              )
            )
          `
          )
          .eq("owner_profile_id", profile.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (propertyError) {
          if (process.env.NODE_ENV === "development") {
            console.error("Properties load error:", propertyError);
          }
          setProperties([]);
          setRentPayments([]);
          setPropertyLoadState("error");
        } else {
          const loadedProperties = (propertyData || []) as DashboardProperty[];
          setProperties(loadedProperties);
          setPropertyLoadState("ready");

          const leaseIds = loadedProperties.flatMap((property) =>
            (property.leases || []).map((lease) => lease.id)
          );
          const propertyIds = loadedProperties.map((property) => property.id);
          const paymentRows: DashboardRentPayment[] = [];

          if (propertyIds.length > 0) {
            const { data: propertyPayments, error: propertyPaymentError } =
              await supabase
                .from("rent_payments")
                .select("*")
                .in("property_id", propertyIds)
                .order("created_at", { ascending: false });

            if (propertyPaymentError) {
              console.warn(
                "Dashboard property payments load warning:",
                propertyPaymentError
              );
            } else {
              paymentRows.push(
                ...((propertyPayments || []) as DashboardRentPayment[])
              );
            }
          }

          if (leaseIds.length > 0) {
            const { data: leasePayments, error: leasePaymentError } =
              await supabase
                .from("rent_payments")
                .select("*")
                .in("lease_id", leaseIds)
                .order("created_at", { ascending: false });

            if (leasePaymentError) {
              console.warn(
                "Dashboard lease payments load warning:",
                leasePaymentError
              );
            } else {
              paymentRows.push(...((leasePayments || []) as DashboardRentPayment[]));
            }

            const { data: tenantAccessRows, error: tenantAccessError } =
              await supabase
                .from("tenant_access")
                .select("id")
                .in("lease_id", leaseIds);

            if (tenantAccessError) {
              console.warn(
                "Dashboard tenant access load warning:",
                tenantAccessError
              );
            } else {
              const tenantAccessIds = (tenantAccessRows || []).map((row) => row.id);

              if (tenantAccessIds.length > 0) {
                const { data: tenantAccessPayments, error: accessPaymentError } =
                  await supabase
                    .from("rent_payments")
                    .select("*")
                    .in("tenant_access_id", tenantAccessIds)
                    .order("created_at", { ascending: false });

                if (accessPaymentError) {
                  console.warn(
                    "Dashboard tenant access payments load warning:",
                    accessPaymentError
                  );
                } else {
                  paymentRows.push(
                    ...((tenantAccessPayments || []) as DashboardRentPayment[])
                  );
                }
              }
            }
          }

          setRentPayments(mergeDashboardRentPayments(paymentRows));
        }

        const { data: activityData, error: activityError } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (activityError) {
          console.error("Activity load error:", activityError);
        } else {
          setActivities((activityData || []) as ActivityLog[]);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router, dashboardReloadKey]);

  useEffect(() => {
    if (!openMenuId && !payoutInfoOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Element &&
        (target.closest("[data-property-card-menu]") ||
          target.closest("[data-payout-info]"))
      ) {
        return;
      }

      setOpenMenuId(null);
      setPayoutInfoOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setPayoutInfoOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId, payoutInfoOpen]);

  const dashboardNow = useMemo(() => new Date(), []);
  const totalMonthlyRent = properties.reduce((sum, property) => {
    const lease = selectRelevantLease(property.leases, dashboardNow);
    return sum + Number(lease?.monthly_rent || 0);
  }, 0);

  const overviewActiveProperties = getOverviewActiveProperties(properties);
  const overviewMonthlyRent = overviewActiveProperties.reduce(
    (sum, property) =>
      sum +
      (property.leases || []).reduce((leaseSum, lease) => {
        if (!isCurrentOverviewActiveLease(property, lease)) return leaseSum;
        return leaseSum + Number(lease.monthly_rent || 0);
      }, 0),
    0
  );

  const nextDueText = getNextDueText(properties, dashboardNow);

  const activeProperties = properties.filter(
    (property) => property.status === "active"
  ).length;

  const pendingBankCount = properties.filter(
    (property) => property.bank_status !== "connected"
  ).length;

  const actionNeededCount = properties.filter((property) => {
    const lease = selectRelevantLease(property.leases, dashboardNow);
    return getPropertyActionState(property, lease, dashboardNow).actionNeeded;
  }).length;

  const bankStatusValue =
    pendingBankCount === 0
      ? "Ready"
      : `${pendingBankCount} not connected`;
  const payoutTooltipId = "payout-performance-tooltip";

  async function handleDeleteProperty() {
    if (!deleteProperty || deleting) return;

    setDeleting(true);

    try {
      await deleteLandlordPropertyCascade({
        propertyId: deleteProperty.id,
        ownerProfileId: profileId,
        knownLeaseIds: (deleteProperty.leases || []).map((lease) => lease.id),
      });

      setProperties((prev) =>
        prev.filter((item) => item.id !== deleteProperty.id)
      );

      setActivities((prev) =>
        prev.filter((activity) => activity.title !== "Property added")
      );

      setDeleteProperty(null);
      setOpenMenuId(null);
    } catch (error) {
      console.warn("Delete property error:", error);
      alert(getDeletePropertyErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleConnectBank(propertyId: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Please sign in again before connecting your bank account.");
        return;
      }

      const response = await fetch("/api/stripe/connect-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        alert(data.error || "Unable to start Stripe setup. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Stripe connect error:", error);
      alert("Unable to start Stripe setup. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading Board...
      </div>
    );
  }

  return (
    <>
      <LandlordMobileHome
        landlordName={landlordName}
        properties={properties}
        activities={activities}
        totalMonthlyRent={totalMonthlyRent}
        activeProperties={activeProperties}
        pendingBankCount={pendingBankCount}
        actionNeededCount={actionNeededCount}
        onAddProperty={() => router.push("/dashboard/add-property")}
        onOpenProperty={(propertyId) =>
          router.push(`/dashboard/properties/${propertyId}`)
        }
        onConnectBank={handleConnectBank}
      />

      {propertyLoadState === "error" ? (
        <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
          <DashboardLoadError
            onRetry={() => setDashboardReloadKey((current) => current + 1)}
          />
        </div>
      ) : properties.length === 0 ? (
        <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
          <EmptyDashboard onAdd={() => router.push("/dashboard/add-property")} />
        </div>
      ) : (
        <div className="mt-3 hidden min-h-0 gap-4 overflow-visible lg:grid lg:h-[calc(100%-12px)] lg:grid-cols-[1fr_326px] lg:gap-5 lg:overflow-visible">
          <div className="-mt-3 min-h-0 overflow-visible pt-3 lg:overflow-y-auto lg:pr-2">
            <div className="grid grid-cols-1 gap-3.5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onOpen={() =>
                    router.push(`/dashboard/properties/${property.id}`)
                  }
                  onEdit={() =>
                    router.push(`/dashboard/properties/${property.id}?edit=true`)
                  }
                  onDelete={() => {
                    setOpenMenuId(null);
                    setDeleteProperty(property);
                  }}
                  onConnectBank={() => handleConnectBank(property.id)}
                />
              ))}
            </div>
          </div>

          <aside className="grid gap-2.5 pb-5 lg:flex lg:max-h-[calc(100vh-136px)] lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
  <section className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
    <div className="flex items-center justify-between">
      <h3 className="text-[16px] font-semibold tracking-[-0.035em] text-zinc-950">
        Overview
      </h3>

      <span className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-semibold text-zinc-500">
        This Month
      </span>
    </div>

    <div className="mt-3.5 grid grid-cols-2 gap-3">
      <div>
        <p className="text-[11px] font-medium text-zinc-500">Monthly Rent</p>
        <p className="mt-1 text-[23px] font-[800] tracking-[-0.06em] text-zinc-950">
          ${overviewMonthlyRent.toLocaleString()}
        </p>
        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          Stable
        </span>
      </div>

      <div className="border-l border-zinc-100 pl-4">
        <p className="text-[11px] font-medium text-zinc-500">Properties</p>
        <p className="mt-1 text-[23px] font-[800] tracking-[-0.06em] text-zinc-950">
          {properties.length}
        </p>
        <p className="mt-2 text-[11px] font-medium text-zinc-500">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {formatActivePropertiesLabel(overviewActiveProperties.length)}
        </p>
      </div>
    </div>
  </section>

  <section className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
  <div className="flex items-center justify-between">
    <div
      className="relative flex items-center gap-1.5"
      data-payout-info
      onMouseEnter={() => setPayoutInfoOpen(true)}
      onMouseLeave={() => setPayoutInfoOpen(false)}
    >
      <h3 className="text-[16px] font-semibold tracking-[-0.035em] text-zinc-950">
        Payout Performance
      </h3>

      <button
        type="button"
        aria-label="How payout performance is calculated"
        aria-expanded={payoutInfoOpen}
        aria-describedby={payoutInfoOpen ? payoutTooltipId : undefined}
        onClick={() => setPayoutInfoOpen((open) => !open)}
        onFocus={() => setPayoutInfoOpen(true)}
        onBlur={() => setPayoutInfoOpen(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-semibold leading-none text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700 focus:border-zinc-400 focus:outline-none"
      >
        i
      </button>

      {payoutInfoOpen && (
        <div
          id={payoutTooltipId}
          role="tooltip"
          className="absolute left-0 top-7 z-20 w-[286px] rounded-2xl border border-zinc-200 bg-white p-3 text-[11px] font-medium leading-5 text-zinc-600 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
        >
          Collection rate is calculated using active leases only.{" "}
          {payoutPerformance.tooltipText}
        </div>
      )}
    </div>

    <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-white">
      YTD {new Date().getFullYear()}
    </span>
  </div>

  <div className="mt-3.5 rounded-[18px] bg-[#FAFAFA] px-3.5 py-3.5">
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[11px] font-medium text-zinc-500">
          Collection Rate
        </p>
        <p className="mt-1 text-[23px] font-[800] tracking-[-0.06em] text-zinc-950">
          {payoutPerformance.collectionRate}%
        </p>
        <p className="mt-1 text-[10px] font-medium text-zinc-500">
          {payoutPerformance.collectedDisplay} of{" "}
          {payoutPerformance.expectedDisplay} collected
        </p>
      </div>

      <p className="text-right text-[11px] leading-5 text-zinc-500">
        <span className="font-semibold text-emerald-700">
          {payoutPerformance.paidCount}
        </span>{" "}
        paid
        <br />
        <span className="font-semibold text-amber-600">
          {payoutPerformance.lateCount}
        </span>{" "}
        late
      </p>
    </div>

    <div className="mt-3.5 flex h-[48px] items-end justify-between px-1">
      {payoutPerformance.months.map((month) => {
        const barClass =
          month.status === "future"
            ? "bg-zinc-200/60"
            : month.status === "paid"
            ? "bg-emerald-400"
            : month.status === "partial" || month.status === "late"
            ? "bg-amber-400"
            : "bg-zinc-300";
        return (
          <span
            key={month.key}
            title={`${month.label}: ${month.percent}% collected`}
            className={`h-10 w-2.5 rounded-full ${barClass}`}
          />
        );
      })}
    </div>

    <div className="mt-2 flex justify-between text-[10px] font-medium text-zinc-400">
      <span>{payoutPerformance.oldestLabel}</span>
      <span>{payoutPerformance.newestLabel}</span>
    </div>

    {!payoutPerformance.hasExpectedRent && (
      <p className="mt-2 text-[10px] font-medium leading-4 text-zinc-400">
        Performance will appear when an active lease begins.
      </p>
    )}
  </div>

  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3">
    <PerformanceMini
      label="Paid"
      value={`${payoutPerformance.paidCount}`}
      tone="green"
    />
    <PerformanceMini
      label="Pending"
      value={`${payoutPerformance.pendingCount}`}
      tone="neutral"
    />
    <PerformanceMini
      label="Late"
      value={`${payoutPerformance.lateCount}`}
      tone="amber"
    />
  </div>
</section>

  <section className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
    <h3 className="text-[17px] font-semibold tracking-[-0.045em] text-zinc-950">
      At a Glance
    </h3>

    <div className="mt-3 divide-y divide-zinc-100">
      <AtAGlanceRow
        Icon={AlertCircle}
        title="Action Needed"
        value={`${actionNeededCount}`}
        subtitle="Setup, lease, or payment review"
        tone="blue"
      />

      <AtAGlanceRow
        Icon={Landmark}
        title="Bank Status"
        value={bankStatusValue}
        subtitle={pendingBankCount > 0 ? "Connection needed" : "All connected"}
        tone="orange"
      />

      <AtAGlanceRow
        Icon={CalendarDays}
        title="Next Due"
        value={nextDueText}
        subtitle="Upcoming rent cycle"
        tone="neutral"
      />
    </div>
  </section>

</aside>

        </div>
      )}

      {deleteProperty && (
        <DeletePropertyModal
          propertyName={deleteProperty.property_label}
          deleting={deleting}
          onClose={() => {
            if (!deleting) setDeleteProperty(null);
          }}
          onConfirm={handleDeleteProperty}
        />
      )}
    </>
  );
}

function EmptyDashboard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-4 rounded-[24px] bg-[#FBFBFB] px-5 py-12 sm:mt-8 sm:px-8 sm:py-16">
      <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
        <div className="relative flex h-[120px] w-[120px] items-center justify-center rounded-full bg-zinc-100 sm:h-[150px] sm:w-[150px]">
          <div className="absolute bottom-7 left-8 h-[62px] w-[38px] rounded-t-xl bg-white shadow-sm sm:bottom-8 sm:left-9 sm:h-[78px] sm:w-[46px]" />
          <div className="absolute bottom-7 right-7 h-[84px] w-[48px] rounded-t-xl bg-white shadow-sm sm:bottom-8 sm:right-8 sm:h-[105px] sm:w-[58px]" />

          <div className="relative z-10 grid grid-cols-2 gap-2.5 opacity-30 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded bg-zinc-300 sm:h-4 sm:w-4"
              />
            ))}
          </div>
        </div>

        <h2 className="mt-7 max-w-[460px] text-[16px] font-medium leading-7 text-zinc-900 sm:mt-8 sm:text-[18px]">
          Welcome to your new rental workspace.
          <br />
          Add your first property to begin managing tenants, leases, and payments
          seamlessly.
        </h2>

        <button
          onClick={onAdd}
          className="mt-7 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-[15px] font-medium text-[#B9476D] transition hover:-translate-y-0.5 hover:shadow-md sm:px-6 sm:text-[17px]"
        >
          <span className="text-[24px] leading-none sm:text-[26px]">+</span>
          Add Property
        </button>
      </div>
    </div>
  );
}

function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-4 rounded-[24px] bg-[#FBFBFB] px-5 py-12 sm:mt-8 sm:px-8 sm:py-16">
      <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[22px] font-semibold text-zinc-500 shadow-sm">
          !
        </div>

        <h2 className="mt-6 text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
          We couldn’t load your properties.
        </h2>
        <p className="mt-2 max-w-[420px] text-[13px] leading-6 text-zinc-500">
          Please refresh and try again.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-[14px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function AtAGlanceRow({
  Icon,
  title,
  value,
  subtitle,
  tone,
}: {
  Icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  tone: "blue" | "orange" | "neutral";
}) {
  const iconClass =
    tone === "blue"
      ? "text-blue-600"
      : tone === "orange"
      ? "text-orange-500"
      : "text-zinc-500";

  return (
    <div className="group flex items-center gap-3 py-3.5">
      <Icon className={`h-6 w-6 shrink-0 ${iconClass}`} strokeWidth={2} />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-zinc-950">{title}</p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-500">
          {subtitle}
        </p>
      </div>

      <p className="shrink-0 text-right text-[13px] font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function PropertyCard({
  property,
  openMenuId,
  setOpenMenuId,
  onOpen,
  onEdit,
  onDelete,
  onConnectBank,
}: {
  property: DashboardProperty;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConnectBank: () => void;
}) {
  const lease = selectRelevantLease(property.leases);
  const leaseStatus = getLeaseStatus(lease?.end_date);
  const actionState = getPropertyActionState(property, lease);

  const primaryTenant = lease?.lease_tenants?.find(
    (tenant) => String(tenant.tenant_role || "").toLowerCase() === "primary"
  );

  const tenantName = primaryTenant
    ? `${primaryTenant.first_name} ${primaryTenant.last_name}`
    : "Tenant not added";

  const rent = Number(lease?.monthly_rent || 0);
  const bankConnected = property.bank_status === "connected";
  const actionNeeded = actionState.actionNeeded;

  const borderColor =
    actionNeeded
      ? "border-l-[#2563EB]"
      : leaseStatus.label === "Expired"
      ? "border-l-red-400"
      : leaseStatus.label === "Ending Soon"
      ? "border-l-blue-400"
      : "border-l-emerald-400";

  const rentColor =
    leaseStatus.label === "Expired"
      ? "text-red-500"
      : leaseStatus.label === "Ending Soon"
      ? "text-blue-600"
      : "text-emerald-600";

  return (
    <div
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${property.property_label || "property"}`}
      className={`group relative cursor-pointer rounded-[20px] border border-zinc-200 border-l-[4px] ${borderColor} bg-white/95 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-sm transition hover:z-[60] hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.075)] focus-within:z-[60] focus:outline-none focus:ring-4 focus:ring-zinc-100`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-semibold tracking-[-0.035em] text-zinc-900">
            {property.property_label}
          </h3>

          <p className="mt-1 line-clamp-1 text-[12px] text-zinc-500">
            {property.street_address}, {property.city}
          </p>
        </div>

        <div className="relative shrink-0" data-property-card-menu>
          <button
            type="button"
            aria-label={`More options for ${property.property_label || "property"}`}
            aria-haspopup="menu"
            aria-expanded={openMenuId === property.id}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === property.id ? null : property.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ⋯
          </button>

          {openMenuId === property.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-9 z-50 w-[170px] rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
            >
              <button
                onClick={onEdit}
                className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Edit Property
              </button>

              <button
                onClick={onDelete}
                className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
              >
                Delete Property
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <p
          className={`text-[22px] font-semibold tracking-[-0.045em] ${rentColor}`}
        >
          ${rent.toLocaleString()}
          <span className="ml-1 text-[13px] font-medium text-zinc-400">
            /mo
          </span>
        </p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <InfoLine label="Tenant" value={tenantName} />
        <InfoLine label="Due" value={lease?.rent_due_day || "—"} />
        <InfoLine
          label="Bank"
          value={bankConnected ? "Verified" : "Bank pending"}
          warning={!bankConnected}
          success={bankConnected}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {actionNeeded ? (
          <span className="rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold text-[#2563EB]">
            Action Needed
          </span>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${leaseStatus.badgeClass}`}
          >
            {leaseStatus.label}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="h-[36px] flex-1 rounded-2xl border border-zinc-200 bg-white text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          View
        </button>

        {!bankConnected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnectBank();
            }}
            className="h-[36px] flex-1 rounded-2xl bg-[#2563EB] text-[12px] font-semibold text-white transition hover:bg-[#1D4ED8]"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  warning = false,
  success = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-zinc-400">{label}</span>

      <span
        className={`truncate text-right font-semibold ${
          warning
            ? "text-amber-600"
            : success
            ? "text-emerald-600"
            : "text-zinc-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PerformanceMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "neutral";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-600"
      : "text-zinc-600";

  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2.5">
      <p className="text-[10px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-[17px] font-[800] tracking-[-0.04em] ${color}`}>
        {value}
      </p>
    </div>
  );
}

function getNextDueText(properties: DashboardProperty[], now = new Date()) {
  const nextDue = properties
    .flatMap((property) =>
      (property.leases || [])
        .filter((lease) => isCurrentOverviewActiveLease(property, lease))
        .map((lease) => getNextDueDateForLease(lease, now))
    )
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return nextDue ? formatOrdinalDay(nextDue.getDate()) : "Not scheduled";
}

function getNextDueDateForLease(
  lease: NonNullable<DashboardProperty["leases"]>[number],
  now = new Date()
) {
  if (!lease.start_date || !lease.end_date) return null;

  const today = startOfDay(now);
  const leaseStart = startOfDay(parseLocalDate(lease.start_date));
  const leaseEnd = startOfDay(parseLocalDate(lease.end_date));
  const dueDay = Number(String(lease.rent_due_day || "1").match(/\d+/)?.[0] || 1);
  let dueDate = buildDueDate(today.getFullYear(), today.getMonth(), dueDay);

  if (dueDate < today) {
    dueDate = buildDueDate(today.getFullYear(), today.getMonth() + 1, dueDay);
  }

  while (dueDate < leaseStart) {
    dueDate = buildDueDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDay);
  }

  return dueDate <= leaseEnd ? dueDate : null;
}

function buildDueDate(year: number, month: number, dueDay: number) {
  const normalizedMonth = new Date(year, month, 1);
  return new Date(
    normalizedMonth.getFullYear(),
    normalizedMonth.getMonth(),
    Math.min(dueDay, getLastDayOfMonth(normalizedMonth))
  );
}

function formatOrdinalDay(day: number) {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
      ? "st"
      : day % 10 === 2
      ? "nd"
      : day % 10 === 3
      ? "rd"
      : "th";
  return `${day}${suffix}`;
}

function getPayoutPerformanceMetrics(
  properties: DashboardProperty[],
  rentPayments: DashboardRentPayment[]
): PayoutPerformanceMetrics {
  const months = buildYearToDatePayoutMonths();
  const today = new Date();
  const currentMonth = startOfMonth(today);
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  let activeLeaseCount = 0;
  const activeLeaseStarts: Date[] = [];
  const obligations: PayoutObligation[] = [];
  const monthMetrics = months.map((month) => ({
    key: getMonthKey(month),
    label: formatCompactMonth(month),
    expected: 0,
    collected: 0,
    paid: 0,
    pending: 0,
    late: 0,
    percent: 0,
    status:
      month > currentMonth
        ? ("future" as PayoutMonthMetric["status"])
        : ("empty" as PayoutMonthMetric["status"]),
  }));

  properties.forEach((property) => {
    (property.leases || []).forEach((lease) => {
      if (!isPayoutEligibleLease(property, lease)) return;
      if (!lease.start_date || !lease.end_date) return;

      const leaseStartDate = parseLocalDate(lease.start_date);
      const monthlyRent = Number(lease.monthly_rent || 0);
      if (!monthlyRent) return;
      activeLeaseCount += 1;
      activeLeaseStarts.push(leaseStartDate);

      const firstCycleDate =
        getLeaseFirstPaymentCycleDate({
          startDate: lease.start_date,
          paymentTrackingStartDate: lease.payment_tracking_start_date,
          leaseSetupType: lease.lease_setup_type,
          leaseAmounts: lease.lease_amounts || [],
        }) || startOfMonth(parseLocalDate(lease.start_date));
      const leaseEndMonth = startOfMonth(parseLocalDate(lease.end_date));
      const dueDay = Number(String(lease.rent_due_day || "1").match(/\d+/)?.[0] || 1);
      const leasePayments = rentPayments.filter((payment) =>
        paymentBelongsToLeaseOrProperty(payment, lease.id, property.id)
      );

      monthMetrics.forEach((month) => {
        const cycleDate = parseMonthKey(month.key);
        if (cycleDate > currentMonth) return;
        if (cycleDate < firstCycleDate || cycleDate > leaseEndMonth) return;

        const expectedAmount = getLeasePaymentAmountForCycle({
          cycleDate,
          firstCycleDate,
          monthlyRent,
          leaseSetupType: lease.lease_setup_type,
          leaseAmounts: lease.lease_amounts || [],
        });
        if (!expectedAmount) return;

        const collectedPayment = findCollectedPaymentForCycle(
          leasePayments,
          cycleDate
        );
        const collectedAmount = collectedPayment
          ? getActualRentAmount(collectedPayment)
          : 0;
        const fullyPaid = collectedAmount >= expectedAmount;
        const dueDate = new Date(
          cycleDate.getFullYear(),
          cycleDate.getMonth(),
          Math.min(dueDay, getLastDayOfMonth(cycleDate))
        );
        const status: PayoutObligationStatus = fullyPaid
          ? "paid"
          : dueDate < todayStart
          ? "late"
          : "pending";

        obligations.push({
          propertyId: property.id,
          propertyName: property.property_label || "Property",
          leaseId: lease.id,
          leaseStartDate,
          monthKey: month.key,
          expected: expectedAmount,
          collected: Math.min(collectedAmount, expectedAmount),
          dueDate,
          status,
        });
      });
    });
  });

  obligations.forEach((obligation) => {
    const month = monthMetrics.find((item) => item.key === obligation.monthKey);
    if (!month) return;

    month.expected += obligation.expected;
    month.collected += obligation.collected;
    if (obligation.status === "paid") {
      month.paid += 1;
    } else if (obligation.status === "late") {
      month.late += 1;
    } else {
      month.pending += 1;
    }
  });

  let totalExpected = 0;
  let totalCollected = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let lateCount = 0;

  monthMetrics.forEach((month) => {
    totalExpected += month.expected;
    totalCollected += month.collected;
    paidCount += month.paid;
    pendingCount += month.pending;
    lateCount += month.late;

    month.percent = month.expected
      ? Math.min(100, Math.round((month.collected / month.expected) * 100))
      : 0;

    if (month.status === "future") {
      return;
    }

    if (!month.expected) {
      month.status = "empty";
    } else if (month.late > 0) {
      month.status = "late";
    } else if (month.pending === 0 && month.paid > 0) {
      month.status = "paid";
    } else {
      month.status = "empty";
    }
  });

  const collectionRate = totalExpected
    ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
    : 0;
  const calculationSummary = `${formatDashboardCurrency(
    totalCollected
  )} collected out of ${formatDashboardCurrency(
    totalExpected
  )} expected year to date = ${collectionRate}%.`;

  return {
    collectionRate,
    totalCollected,
    totalExpected,
    collectedDisplay: formatDashboardCurrency(totalCollected),
    expectedDisplay: formatDashboardCurrency(totalExpected),
    calculationSummary,
    tooltipText: buildPayoutTooltipText({
      activeLeaseCount,
      activeLeaseStarts,
      obligations,
      calculationSummary,
    }),
    paidCount,
    pendingCount,
    lateCount,
    months: monthMetrics,
    oldestLabel: monthMetrics[0]?.label || "",
    newestLabel: monthMetrics[monthMetrics.length - 1]?.label || "",
    hasExpectedRent: totalExpected > 0,
    debugSummary: {
      activeLeaseCount,
      obligations: obligations.map((obligation) => ({
        propertyName: obligation.propertyName,
        month: obligation.monthKey,
        expected: obligation.expected,
        collected: obligation.collected,
        dueDate: formatDateKey(obligation.dueDate),
        status: obligation.status,
      })),
      totalExpected,
      totalCollected,
      collectionRate,
      paidCount,
      pendingCount,
      lateCount,
    },
  };
}

function buildYearToDatePayoutMonths() {
  const current = startOfMonth(new Date());
  return Array.from({ length: 12 }, (_, index) => {
    return new Date(current.getFullYear(), index, 1);
  });
}

function buildPayoutTooltipText({
  activeLeaseCount,
  activeLeaseStarts,
  obligations,
  calculationSummary,
}: {
  activeLeaseCount: number;
  activeLeaseStarts: Date[];
  obligations: PayoutObligation[];
  calculationSummary: string;
}) {
  if (activeLeaseCount === 1 && activeLeaseStarts[0]) {
    const includedMonths = formatIncludedMonthList(
      obligations.map((obligation) => obligation.monthKey)
    );
    return `This lease began ${formatLongDate(
      activeLeaseStarts[0]
    )}, so ${includedMonths || "eligible lease months"} are included year to date. ${calculationSummary} Future lease months are excluded.`;
  }

  return `Payout Performance is based on monthly rent obligations for active leases from January 1 through the current month, limited by each lease's start and end dates. ${calculationSummary} Action Needed, inactive, and expired leases are excluded.`;
}

function formatIncludedMonthList(monthKeys: string[]) {
  const uniqueMonths = Array.from(new Set(monthKeys)).sort();
  const labels = uniqueMonths.map((key) =>
    parseMonthKey(key).toLocaleDateString("en-US", { month: "long" })
  );

  if (labels.length <= 2) return labels.join(" and ");
  if (labels.length <= 4) {
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }

  return `${labels[0]} through ${labels[labels.length - 1]}`;
}

function isPayoutEligibleLease(
  property: DashboardProperty,
  lease: NonNullable<DashboardProperty["leases"]>[number]
) {
  const propertyActive = String(property.status || "").toLowerCase() === "active";
  const bankConnected =
    String(property.bank_status || "").toLowerCase() === "connected";
  const leaseStatus = String(lease.lease_status || "").toLowerCase();
  const tenantSetupComplete = Boolean(lease.lease_tenants?.length);
  const hasActiveStatus = ![
    "draft",
    "ended",
    "expired",
    "inactive",
    "terminated",
    "cancelled",
    "canceled",
  ].includes(leaseStatus);
  const notEnded = !lease.ended_at;

  return (
    propertyActive &&
    bankConnected &&
    tenantSetupComplete &&
    hasActiveStatus &&
    notEnded &&
    isDashboardCurrentActiveLease(lease)
  );
}

function getOverviewActiveProperties(properties: DashboardProperty[]) {
  return properties.filter((property) =>
    (property.leases || []).some((lease) =>
      isCurrentOverviewActiveLease(property, lease)
    )
  );
}

function isCurrentOverviewActiveLease(
  property: DashboardProperty,
  lease: NonNullable<DashboardProperty["leases"]>[number]
) {
  if (!isPayoutEligibleLease(property, lease)) return false;
  if (!lease.start_date || !lease.end_date) return false;

  const today = startOfDay(new Date());
  const startDate = startOfDay(parseLocalDate(lease.start_date));
  const endDate = startOfDay(parseLocalDate(lease.end_date));

  return startDate <= today && endDate >= today;
}

function formatActivePropertiesLabel(count: number) {
  return `${count === 1 ? "Active Property" : "Active Properties"} ${count}`;
}

function paymentBelongsToLeaseOrProperty(
  payment: DashboardRentPayment,
  leaseId: string,
  propertyId: string
) {
  return payment.lease_id === leaseId || payment.property_id === propertyId;
}

function mergeDashboardRentPayments(payments: DashboardRentPayment[]) {
  const paymentMap = new Map<string, DashboardRentPayment>();
  payments.forEach((payment) => {
    if (!payment?.id) return;
    paymentMap.set(payment.id, payment);
  });
  return Array.from(paymentMap.values());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompactMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function getLastDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function DeletePropertyModal({
  propertyName,
  deleting,
  onClose,
  onConfirm,
}: {
  propertyName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[22px] font-semibold text-red-600">
          !
        </div>

        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete property?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This will permanently delete{" "}
          <span className="font-semibold text-zinc-900">{propertyName}</span>{" "}
          and its related history. This action cannot be undone.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Go Back
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getLeaseStatus(endDate?: string | null) {
  if (!endDate) {
    return {
      label: "Active",
      badgeClass:
        "bg-emerald-50 text-emerald-700 border border-emerald-100",
      buttonClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      showExtend: false,
    };
  }

  const today = new Date();
  const leaseEnd = new Date(endDate);

  today.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Expired",
      badgeClass: "bg-red-50 text-red-700 border border-red-100",
      buttonClass: "bg-red-50 text-red-700 hover:bg-red-100",
      showExtend: true,
    };
  }

  if (diffDays <= 60) {
    return {
      label: "Ending Soon",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
      buttonClass: "bg-amber-50 text-amber-700 hover:bg-amber-100",
      showExtend: true,
    };
  }

  return {
    label: "Active",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-100",
    buttonClass: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    showExtend: false,
  };
}
