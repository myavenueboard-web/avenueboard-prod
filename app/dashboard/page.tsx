"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import { LandlordMobileHome } from "@/components/mobile/landlord/LandlordMobileDashboard";

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
    end_date: string;
    monthly_rent: number;
    rent_due_day: string;
    lease_status: string | null;
    payment_status: string | null;
    lease_tenants?: {
      first_name: string;
      last_name: string;
      tenant_role: string;
    }[];
  }[];
};

export default function DashboardPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [landlordName, setLandlordName] = useState("");
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteProperty, setDeleteProperty] =
    useState<DashboardProperty | null>(null);
  const [deleting, setDeleting] = useState(false);
  const paidCount = properties.filter(
  (property) => property.leases?.[0]?.payment_status === "paid"
).length;

const lateCount = properties.filter(
  (property) => property.leases?.[0]?.payment_status === "late"
).length;

const pendingPaymentCount = properties.filter((property) => {
  const status = property.leases?.[0]?.payment_status;
  return !status || status === "pending";
}).length;

const collectionRate =
  properties.length > 0 ? Math.round((paidCount / properties.length) * 100) : 0;

const payoutBarStatuses: Array<"paid" | "late" | "upcoming" | "future"> =
  Array.from({ length: 12 }, (_, index) => {
    if (index === 9 && lateCount > 0) return "late";
    if (index === 10 && pendingPaymentCount > 0) return "upcoming";
    if (index === 11 && paidCount > 0) return "paid";
    return "future";
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
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
              end_date,
              monthly_rent,
              rent_due_day,
              lease_status,
              payment_status,
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
          console.error("Properties load error:", propertyError);
        } else {
          setProperties((propertyData || []) as DashboardProperty[]);
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
  }, [router]);

  const totalMonthlyRent = properties.reduce((sum, property) => {
    const lease = property.leases?.[0];
    return sum + Number(lease?.monthly_rent || 0);
  }, 0);

  const nextDueText =
    properties[0]?.leases?.[0]?.rent_due_day?.replace(" of the Month", "") ||
    "—";

  const activeProperties = properties.filter(
    (property) => property.status === "active"
  ).length;

  const pendingBankCount = properties.filter(
    (property) => property.bank_status !== "connected"
  ).length;

  const actionNeededCount = properties.filter((property) => {
    const lease = property.leases?.[0];
    const paymentStatus = String(lease?.payment_status || "").toLowerCase();
    const bankPending = property.bank_status !== "connected";
    const tenantSetupIncomplete =
      !lease?.lease_tenants || lease.lease_tenants.length === 0;
    const leaseEndingSoon = getLeaseStatus(lease?.end_date).label === "Ending Soon";
    const paymentIssue = ["late", "failed", "declined"].includes(paymentStatus);

    return bankPending || tenantSetupIncomplete || leaseEndingSoon || paymentIssue;
  }).length;

  const bankStatusValue =
    pendingBankCount === 0
      ? "Ready"
      : `${pendingBankCount} not connected`;

  const averageRent =
    properties.length > 0 ? Math.round(totalMonthlyRent / properties.length) : 0;

  const highestRent = properties.reduce((max, property) => {
    const rent = Number(property.leases?.[0]?.monthly_rent || 0);
    return rent > max ? rent : max;
  }, 0);

  async function handleDeleteProperty() {
    if (!deleteProperty || deleting) return;

    setDeleting(true);

    try {
      const leaseIds = (deleteProperty.leases || []).map((lease) => lease.id);

      await supabase
        .from("activity_logs")
        .delete()
        .eq("property_id", deleteProperty.id);

      await supabase.from("expenses").delete().eq("property_id", deleteProperty.id);

      if (leaseIds.length > 0) {
        await supabase.from("lease_tenants").delete().in("lease_id", leaseIds);
        await supabase.from("lease_amounts").delete().in("lease_id", leaseIds);
        await supabase.from("lease_preferences").delete().in("lease_id", leaseIds);
        await supabase.from("lease_documents").delete().in("lease_id", leaseIds);
        await supabase.from("leases").delete().in("id", leaseIds);
      }

      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deleteProperty.id);

      if (error) throw error;

      setProperties((prev) =>
        prev.filter((item) => item.id !== deleteProperty.id)
      );

      setActivities((prev) =>
        prev.filter((activity) => activity.title !== "Property added")
      );

      setDeleteProperty(null);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Delete property error:", error);
      alert("Unable to delete this property. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleConnectBank(propertyId: string) {
    try {
      const response = await fetch("/api/stripe/connect-account", {
        method: "POST",
        headers: {
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
        Loading dashboard...
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

      {properties.length === 0 ? (
        <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
          <EmptyDashboard onAdd={() => router.push("/dashboard/add-property")} />
        </div>
      ) : (
        <div className="mt-3 hidden min-h-0 gap-4 overflow-visible lg:grid lg:h-[calc(100%-12px)] lg:grid-cols-[1fr_326px] lg:gap-5 lg:overflow-hidden">
          <div className="min-h-0 overflow-visible lg:overflow-y-auto lg:pr-2">
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
          ${totalMonthlyRent.toLocaleString()}
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
          Active {activeProperties}
        </p>
      </div>
    </div>
  </section>

  <section className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
  <div className="flex items-center justify-between">
    <h3 className="text-[16px] font-semibold tracking-[-0.035em] text-zinc-950">
      Payout Performance
    </h3>

    <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-white">
      12 Months
    </span>
  </div>

  <div className="mt-3.5 rounded-[18px] bg-[#FAFAFA] px-3.5 py-3.5">
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[11px] font-medium text-zinc-500">
          Collection Rate
        </p>
        <p className="mt-1 text-[23px] font-[800] tracking-[-0.06em] text-zinc-950">
          {collectionRate}%
        </p>
      </div>

      <p className="text-right text-[11px] leading-5 text-zinc-500">
        <span className="font-semibold text-emerald-700">{paidCount}</span> paid
        <br />
        <span className="font-semibold text-amber-600">{lateCount}</span> late
      </p>
    </div>

    <div className="mt-3.5 flex h-[48px] items-end gap-1.5">
      {payoutBarStatuses.map(
        (status, index) => {
          const barClass =
            status === "paid"
              ? "bg-emerald-400"
              : status === "late"
              ? "bg-amber-400"
              : "bg-zinc-300";

          return (
            <span
              key={index}
              className={`h-full flex-1 rounded-full ${barClass}`}
            />
          );
        }
      )}
    </div>

    <div className="mt-2 flex justify-between text-[10px] font-medium text-zinc-400">
      <span>Jan</span>
      <span>Dec</span>
    </div>
  </div>

  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3">
    <PerformanceMini label="Paid" value={`${paidCount}`} tone="green" />
    <PerformanceMini label="Pending" value={`${pendingPaymentCount}`} tone="neutral" />
    <PerformanceMini label="Late" value={`${lateCount}`} tone="amber" />
  </div>
</section>

  <section className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
  <h3 className="text-[16px] font-semibold tracking-[-0.035em] text-zinc-950">
    Quick Summary
  </h3>

  <div className="mt-3.5 space-y-2">
    <CompactSummaryRow
      label="Total Properties"
      value={`${properties.length}`}
      subtext="Total active portfolio"
      tone="green"
    />

    <CompactSummaryRow
      label="Action Needed"
      value={`${actionNeededCount}`}
      subtext="Setup, lease, or payment review"
      tone={actionNeededCount > 0 ? "amber" : "green"}
    />

    <CompactSummaryRow
      label="Bank Status"
      value={bankStatusValue}
      subtext={pendingBankCount > 0 ? "Connection needed" : "All connected"}
      tone={pendingBankCount > 0 ? "amber" : "green"}
    />

    <CompactSummaryRow
      label="Next Due"
      value={nextDueText}
      subtext="Upcoming rent cycle"
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

function CompactSummaryRow({
  label,
  value,
  subtext,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  tone: "green" | "amber" | "neutral";
}) {
  const dotClass =
    tone === "green"
      ? "bg-emerald-500"
      : tone === "amber"
      ? "bg-amber-500"
      : "bg-zinc-500";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50/70 px-3.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />

        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-zinc-800">{label}</p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
            {subtext}
          </p>
        </div>
      </div>

      <p className="shrink-0 text-[16px] font-[800] tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
      <p className="text-[13px] text-zinc-500">{label}</p>

      <p
        className={`text-[15px] font-semibold ${
          warning ? "text-amber-600" : "text-zinc-900"
        }`}
      >
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
  const lease = property.leases?.[0];
  const leaseStatus = getLeaseStatus(lease?.end_date);

  const primaryTenant = lease?.lease_tenants?.find(
    (tenant) => tenant.tenant_role === "primary"
  );

  const tenantName = primaryTenant
    ? `${primaryTenant.first_name} ${primaryTenant.last_name}`
    : "Tenant not added";

  const rent = Number(lease?.monthly_rent || 0);
  const bankConnected = property.bank_status === "connected";

  const borderColor =
    leaseStatus.label === "Expired"
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
      className={`group relative cursor-pointer rounded-[20px] border border-zinc-200 border-l-[4px] ${borderColor} bg-white/95 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.075)]`}
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

        <div className="relative shrink-0">
          <button
            type="button"
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
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${leaseStatus.badgeClass}`}
        >
          {leaseStatus.label}
        </span>

        {!bankConnected && (
          <span className="rounded-full bg-blue-50/60 px-3 py-1 text-[10px] font-semibold text-blue-600">
            Action Needed
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
            className="h-[36px] flex-1 rounded-2xl bg-[#B9476D] text-[12px] font-semibold text-white transition hover:bg-[#A93F64]"
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

function ActivityItem({
  title,
  text,
  warning = false,
}: {
  title: string;
  text: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            warning ? "bg-amber-500" : "bg-[#B9476D]"
          }`}
        />

        <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
      </div>

      <p className="mt-2 text-[12px] leading-5 text-zinc-500">{text}</p>
    </div>
  );
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
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
