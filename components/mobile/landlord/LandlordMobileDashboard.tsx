"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Menu,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  StickyNote,
  Upload,
  Users,
} from "lucide-react";

export type LandlordMobileTenant = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tenant_role?: string | null;
  invite_status?: string | null;
};

export type LandlordMobileLease = {
  id?: string;
  start_date?: string | null;
  end_date?: string | null;
  monthly_rent?: number | null;
  rent_due_day?: string | null;
  lease_status?: string | null;
  payment_status?: string | null;
  lease_tenants?: LandlordMobileTenant[];
};

export type LandlordMobileProperty = {
  id: string;
  property_label: string;
  street_address?: string | null;
  city?: string | null;
  state_name?: string | null;
  zip?: string | null;
  bank_status?: string | null;
  status?: string | null;
  leases?: LandlordMobileLease[];
};

export type LandlordMobileActivity = {
  id: string;
  activity_type?: string | null;
  title: string;
  description?: string | null;
  created_at: string;
};

export type LandlordMobileNote = {
  id: string;
  text: string;
  type: "private" | "shared";
  created_at: string;
  created_by_role?: "landlord" | "tenant";
};

export type LandlordMobileDocument = {
  id: string;
  created_at?: string | null;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
};

type MobileTab = "home" | "properties" | "payments" | "activity" | "more";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getFirstName(name?: string | null) {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function formatCurrency(value?: number | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(property?: LandlordMobileProperty | null) {
  if (!property) return "";

  return [property.street_address, property.city, property.state_name, property.zip]
    .filter(Boolean)
    .join(", ");
}

function getLeaseStatus(endDate?: string | null) {
  if (!endDate) return "Active";

  const today = new Date();
  const leaseEnd = new Date(endDate);
  today.setHours(0, 0, 0, 0);
  leaseEnd.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "Expired";
  if (diffDays <= 60) return "Ending Soon";
  return "Active";
}

function getPrimaryTenant(lease?: LandlordMobileLease | null) {
  const tenants = [...(lease?.lease_tenants || [])].sort((a, b) => {
    const aPrimary = a.tenant_role?.toLowerCase() === "primary";
    const bPrimary = b.tenant_role?.toLowerCase() === "primary";

    if (aPrimary && !bPrimary) return -1;
    if (!aPrimary && bPrimary) return 1;
    return 0;
  });

  return tenants[0];
}

function getTenantName(tenant?: LandlordMobileTenant | null) {
  if (!tenant) return "Tenant not added";

  return [tenant.first_name, tenant.last_name].filter(Boolean).join(" ") || "Tenant";
}

function getTenantInitials(tenant?: LandlordMobileTenant | null) {
  const first = tenant?.first_name?.[0] || "";
  const last = tenant?.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "T";
}

function getPrimaryCta({
  properties,
  pendingBankCount,
}: {
  properties: LandlordMobileProperty[];
  pendingBankCount: number;
}) {
  if (properties.length === 0) return "Add Property";
  if (pendingBankCount > 0) return "Connect Bank";

  const firstLease = properties[0]?.leases?.[0];
  if (!firstLease?.lease_tenants?.length) return "Invite Tenant";

  return "View Property";
}

function getActivityTone(activity: LandlordMobileActivity) {
  const key = `${activity.activity_type || ""} ${activity.title || ""}`.toLowerCase();

  if (key.includes("delete") || key.includes("removed")) {
    return {
      Icon: FileText,
      shell: "border-rose-200 bg-rose-50 text-rose-600",
    };
  }

  if (key.includes("payment") || key.includes("rent")) {
    return {
      Icon: DollarSign,
      shell: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (key.includes("tenant") || key.includes("invite")) {
    return {
      Icon: Users,
      shell: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (key.includes("note")) {
    return {
      Icon: StickyNote,
      shell: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (key.includes("document") || key.includes("file")) {
    return {
      Icon: FileText,
      shell: "border-zinc-200 bg-zinc-50 text-zinc-700",
    };
  }

  return {
    Icon: Home,
    shell: "border-zinc-200 bg-zinc-50 text-slate-700",
  };
}

function MobilePageShell({
  active,
  onTabChange,
  children,
}: {
  active: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-950 lg:hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <div className="flex-1 px-4 pb-[112px] pt-4">
          {children}
        </div>
      </div>
      <MobileBottomNav active={active} onTabChange={onTabChange} />
    </div>
  );
}

function MobileBottomNav({
  active,
  onTabChange,
}: {
  active: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  const items: Array<{ id: MobileTab; label: string; Icon: typeof Home }> = [
    { id: "home", label: "Home", Icon: Home },
    { id: "properties", label: "Properties", Icon: Building2 },
    { id: "payments", label: "Payments", Icon: CreditCard },
    { id: "activity", label: "Activity", Icon: Activity },
    { id: "more", label: "More", Icon: Menu },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-zinc-200 bg-white/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[430px] grid-cols-5">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1.5 text-[11px] font-semibold ${
              active === id ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function MobileHeader({
  landlordName,
  subtitle = "Your rental workspace",
}: {
  landlordName?: string | null;
  subtitle?: string;
}) {
  const firstName = getFirstName(landlordName);
  const openAssistant = () => {
    window.dispatchEvent(new CustomEvent("avenueboard:open-assistant"));
  };

  return (
    <header className="mb-5">
      <div className="flex items-center justify-between">
        <img src="/logo.png" alt="AvenueBoard" className="h-7 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-slate-700">
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={openAssistant}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-slate-700"
          >
            <Bot className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[17px] font-medium tracking-[-0.03em] text-slate-500">
          {getGreeting()},
        </p>
        <h1 className="mt-1 text-[30px] font-semibold leading-[1.05] tracking-[-0.06em] text-slate-950">
          {firstName || "Landlord"}
        </h1>
        <p className="mt-3 text-[13px] font-medium leading-5 text-slate-500">
          {subtitle}
        </p>
      </div>
    </header>
  );
}

function MobileCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[24px] border border-zinc-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.045)] ${className}`}
    >
      {children}
    </section>
  );
}

function MobileSectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[19px] font-semibold tracking-[-0.045em] text-slate-950">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-500">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

export function LandlordMobileHome({
  landlordName,
  properties,
  activities,
  totalMonthlyRent,
  activeProperties,
  pendingBankCount,
  actionNeededCount,
  onAddProperty,
  onOpenProperty,
  onConnectBank,
}: {
  landlordName?: string | null;
  properties: LandlordMobileProperty[];
  activities: LandlordMobileActivity[];
  totalMonthlyRent: number;
  activeProperties: number;
  pendingBankCount: number;
  actionNeededCount: number;
  onAddProperty: () => void;
  onOpenProperty: (propertyId: string) => void;
  onConnectBank: (propertyId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const primaryProperty = properties[0];
  const primaryLease = primaryProperty?.leases?.[0];
  const bankReady = pendingBankCount === 0 && properties.length > 0;
  const primaryCta = getPrimaryCta({ properties, pendingBankCount });
  const ctaProperty = properties.find((property) => property.bank_status !== "connected") || primaryProperty;

  function handlePrimaryAction() {
    if (primaryCta === "Add Property") {
      onAddProperty();
      return;
    }

    if (primaryCta === "Connect Bank" && ctaProperty) {
      onConnectBank(ctaProperty.id);
      return;
    }

    if (primaryProperty) onOpenProperty(primaryProperty.id);
  }

  return (
    <MobilePageShell active={activeTab} onTabChange={setActiveTab}>
      {activeTab === "home" && (
        <>
          <MobileHeader landlordName={landlordName} />

          <div className="space-y-4">
            <MobileCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Due This Month
                  </p>
                  <p className="mt-1 text-[32px] font-semibold tracking-[-0.07em] text-slate-950">
                    {formatCurrency(totalMonthlyRent)}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-slate-500">
                    {properties.length > 0
                      ? `${activeProperties} active ${
                          activeProperties === 1 ? "property" : "properties"
                        }`
                      : "Add your first property to begin"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                    actionNeededCount > 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {actionNeededCount > 0 ? `${actionNeededCount} action` : "Ready"}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePrimaryAction}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#33435F] text-[14px] font-semibold text-white transition active:scale-[0.98]"
              >
                {primaryCta}
                <ChevronRight className="h-4 w-4" />
              </button>
            </MobileCard>

            {primaryProperty && (
              <div className="grid grid-cols-2 gap-3">
                <MobileMiniMetric
                  Icon={ShieldCheck}
                  label="Bank Status"
                  value={bankReady ? "Verified" : "Pending"}
                  subtext={bankReady ? "Ready" : "Action needed"}
                  tone={bankReady ? "green" : "amber"}
                />
                <MobileMiniMetric
                  Icon={CalendarDays}
                  label="Lease Ends"
                  value={formatDate(primaryLease?.end_date)}
                  subtext={getLeaseStatus(primaryLease?.end_date)}
                  tone="blue"
                />
              </div>
            )}

            <WorkspaceStatusCard
              ready={bankReady}
              onConnectBank={() => ctaProperty && onConnectBank(ctaProperty.id)}
            />

            {primaryProperty && (
              <section>
                <MobileSectionHeader title="Active Property" />
                <MobilePropertyPreviewCard
                  property={primaryProperty}
                  onOpen={() => onOpenProperty(primaryProperty.id)}
                />
              </section>
            )}

            {activities.length > 0 && (
              <MobileActivityPreview activities={activities.slice(0, 4)} />
            )}
          </div>
        </>
      )}

      {activeTab === "properties" && (
        <MobilePropertiesTab
          properties={properties}
          onAddProperty={onAddProperty}
          onOpenProperty={onOpenProperty}
        />
      )}

      {activeTab === "payments" && (
        <MobilePaymentsTab
          properties={properties}
          totalMonthlyRent={totalMonthlyRent}
          pendingBankCount={pendingBankCount}
          onConnectBank={(propertyId) => onConnectBank(propertyId)}
        />
      )}

      {activeTab === "activity" && (
        <MobileActivityTab activities={activities} />
      )}

      {activeTab === "more" && (
        <MobileMoreTab landlordName={landlordName} />
      )}
    </MobilePageShell>
  );
}

function MobileMiniMetric({
  Icon,
  label,
  value,
  subtext,
  tone,
}: {
  Icon: typeof ShieldCheck;
  label: string;
  value: string;
  subtext: string;
  tone: "green" | "blue" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-blue-50 text-blue-700";

  return (
    <MobileCard className="p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[12px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[17px] font-semibold tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-[12px] font-medium text-slate-500">{subtext}</p>
    </MobileCard>
  );
}

function MobilePropertiesTab({
  properties,
  onAddProperty,
  onOpenProperty,
}: {
  properties: LandlordMobileProperty[];
  onAddProperty: () => void;
  onOpenProperty: (propertyId: string) => void;
}) {
  return (
    <div>
      <MobileTabTitle
        title="Properties"
        action={
          <button
            type="button"
            onClick={onAddProperty}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-[#33435F] px-4 text-[13px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      />

      <div className="space-y-3">
        {properties.length === 0 ? (
          <MobileEmptyState
            title="No properties yet"
            subtitle="Create your first rental workspace to manage leases, tenants, and payments."
            actionLabel="Add Property"
            onAction={onAddProperty}
          />
        ) : (
          properties.map((property) => (
            <MobilePropertyCard
              key={property.id}
              property={property}
              onOpen={() => onOpenProperty(property.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MobilePaymentsTab({
  properties,
  totalMonthlyRent,
  pendingBankCount,
  onConnectBank,
}: {
  properties: LandlordMobileProperty[];
  totalMonthlyRent: number;
  pendingBankCount: number;
  onConnectBank: (propertyId: string) => void;
}) {
  const paidCount = properties.filter(
    (property) => property.leases?.[0]?.payment_status === "paid"
  ).length;
  const lateCount = properties.filter(
    (property) => property.leases?.[0]?.payment_status === "late"
  ).length;
  const upcomingCount = properties.filter((property) => {
    const status = property.leases?.[0]?.payment_status;
    return !status || status === "pending";
  }).length;
  const futureCount = Math.max(properties.length - paidCount - lateCount - upcomingCount, 0);
  const pendingProperty = properties.find(
    (property) => property.bank_status !== "connected"
  );

  return (
    <div>
      <MobileTabTitle
        title="Payments"
        action={
          <button
            type="button"
            className="text-[13px] font-semibold text-slate-900"
          >
            All History
          </button>
        }
      />

      <MobileCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.045em] text-slate-950">
              Payout Performance
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-slate-500">
              Portfolio rent collection overview.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            This Month
          </span>
        </div>

        <div className="mt-4 rounded-[20px] bg-zinc-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Expected rent
          </p>
          <p className="mt-1 text-[30px] font-semibold tracking-[-0.07em] text-slate-950">
            {formatCurrency(totalMonthlyRent)}
          </p>
          <div className="mt-4 flex h-[46px] items-end gap-1.5">
            {properties.slice(0, 12).map((property) => {
              const status = String(property.leases?.[0]?.payment_status || "future").toLowerCase();
              const barClass =
                status === "paid"
                  ? "bg-emerald-400"
                  : status === "late"
                  ? "bg-amber-400"
                  : status === "pending" || status === "upcoming"
                  ? "bg-blue-400"
                  : "bg-zinc-300";

              return (
                <span
                  key={property.id}
                  className={`h-full flex-1 rounded-full ${barClass}`}
                />
              );
            })}
            {properties.length === 0 &&
              Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className="h-full flex-1 rounded-full bg-zinc-300"
                />
              ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-[18px] border border-zinc-200 bg-white">
          <MobilePaymentStat label="Paid" value={paidCount} tone="green" />
          <MobilePaymentStat label="Upcoming" value={upcomingCount} tone="blue" />
          <MobilePaymentStat label="Late" value={lateCount} tone="amber" />
          <MobilePaymentStat label="Future" value={futureCount} tone="neutral" />
        </div>
      </MobileCard>

      <div className="mt-4">
        <MobileSectionHeader title="Payment History" />
        <div className="space-y-3">
        {properties.map((property) => {
          const lease = property.leases?.[0];
          const status = lease?.payment_status || "upcoming";

          return (
            <MobileCard key={property.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-950">
                  {property.property_label}
                </p>
                <p className="mt-1 truncate text-[12.5px] font-medium text-slate-500">
                  Due on {lease?.rent_due_day || "—"}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-500">
                {status}
              </span>
              <p className="shrink-0 text-[14px] font-semibold text-slate-950">
                {formatCurrency(lease?.monthly_rent)}
              </p>
            </MobileCard>
          );
        })}
        {properties.length === 0 && (
          <MobileEmptyState
            title="No payment history yet"
            subtitle="Property payment previews will appear after your first property is added."
          />
        )}
        </div>
      </div>

      <MobileCard className="mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
              Payment Setup
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-slate-500">
              {pendingBankCount > 0
                ? `${pendingBankCount} ${
                    pendingBankCount === 1 ? "property needs" : "properties need"
                  } bank setup.`
                : "All active workspaces are ready."}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              pendingBankCount > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {pendingBankCount > 0 ? "Action" : "Active"}
          </span>
        </div>

        {pendingProperty && (
          <button
            type="button"
            onClick={() => onConnectBank(pendingProperty.id)}
            className="mt-4 h-11 w-full rounded-[16px] bg-[#33435F] text-[13px] font-semibold text-white"
          >
            Connect Bank
          </button>
        )}
      </MobileCard>
    </div>
  );
}

function MobilePaymentStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue" | "amber" | "neutral";
}) {
  const color =
    tone === "green"
      ? "text-emerald-600"
      : tone === "blue"
      ? "text-blue-600"
      : tone === "amber"
      ? "text-amber-600"
      : "text-zinc-500";

  return (
    <div className="border-r border-zinc-200 px-2 py-3 text-center last:border-r-0">
      <p className="text-[10.5px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-[21px] font-semibold tracking-[-0.05em] ${color}`}>
        {value}
      </p>
    </div>
  );
}

function MobileActivityTab({
  activities,
  onViewAll,
}: {
  activities: LandlordMobileActivity[];
  onViewAll?: () => void;
}) {
  return (
    <div>
      <MobileTabTitle title="Activity" />
      <MobileActivityPreview activities={activities} onViewAll={onViewAll} />
    </div>
  );
}

function MobileMoreTab({ landlordName }: { landlordName?: string | null }) {
  const initials =
    (landlordName || "L")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "L";

  const items = [
    { label: "Profile", Icon: Users, action: () => window.dispatchEvent(new CustomEvent("avenueboard:open-profile")) },
    { label: "Properties", Icon: Building2, action: () => (window.location.href = "/dashboard") },
    { label: "Reports", Icon: Activity, action: () => (window.location.href = "/dashboard/reports") },
    { label: "Expenses", Icon: DollarSign, action: () => (window.location.href = "/dashboard/expenses") },
    { label: "Roadmap", Icon: Menu, action: () => window.dispatchEvent(new CustomEvent("avenueboard:open-assistant")) },
    { label: "Assistant / Support", Icon: Bot, action: () => window.dispatchEvent(new CustomEvent("avenueboard:open-assistant")) },
  ];

  return (
    <div>
      <MobileTabTitle title="More" />

      <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-zinc-200 bg-white p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white">
          {initials}
        </span>
        <div>
          <p className="text-[15px] font-semibold text-slate-950">
            {landlordName || "Landlord"}
          </p>
          <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">Landlord</p>
        </div>
      </div>

      <MobileCard className="overflow-hidden">
        {items.map(({ label, Icon, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="flex min-h-[52px] w-full items-center justify-between border-b border-zinc-200 px-4 text-left last:border-b-0"
          >
            <span className="flex items-center gap-3 text-[14px] font-semibold text-slate-800">
              <Icon className="h-[18px] w-[18px] text-slate-500" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </MobileCard>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("avenueboard:logout"))}
        className="mt-4 flex min-h-[52px] w-full items-center justify-between rounded-[24px] border border-red-100 bg-white px-4 text-left text-[14px] font-semibold text-red-600"
      >
        Logout
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MobileTabTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-h-[42px] items-center justify-between gap-3">
      <h1 className="text-[25px] font-semibold tracking-[-0.055em] text-slate-950">
        {title}
      </h1>
      {action}
    </div>
  );
}

function WorkspaceStatusCard({
  ready,
  onConnectBank,
}: {
  ready: boolean;
  onConnectBank: () => void;
}) {
  if (ready) {
    return (
      <section className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
        <p className="text-[17px] font-semibold tracking-[-0.04em] text-emerald-900">
          Workspace Ready
        </p>
        <p className="mt-2 text-[13px] font-medium leading-5 text-emerald-800">
          Your property workspace is fully configured and ready for rent collection.
        </p>
        <div className="mt-4 space-y-2">
          {["Bank account connected", "Tenant setup complete", "Lease active"].map(
            (item) => (
              <p
                key={item}
                className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4" />
                {item}
              </p>
            )
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-amber-200 bg-amber-50/90 p-4">
      <p className="text-[17px] font-semibold tracking-[-0.04em] text-amber-950">
        Connect Bank Account
      </p>
      <p className="mt-2 text-[13px] font-medium leading-5 text-amber-800">
        Activate rent collection and allow tenants to complete payment setup.
      </p>
      <button
        type="button"
        onClick={onConnectBank}
        className="mt-4 h-11 rounded-[16px] bg-[#33435F] px-5 text-[13px] font-semibold text-white"
      >
        Connect Bank
      </button>
    </section>
  );
}

function MobilePropertyCard({
  property,
  onOpen,
}: {
  property: LandlordMobileProperty;
  onOpen: () => void;
}) {
  const lease = property.leases?.[0];
  const tenantCount = lease?.lease_tenants?.length || 0;
  const rent = Number(lease?.monthly_rent || 0);
  const bankConnected = property.bank_status === "connected";
  const leaseStatus = getLeaseStatus(lease?.end_date);
  const paymentStatus = lease?.payment_status || "Upcoming";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] border border-zinc-200 bg-white p-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.045)] transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold tracking-[-0.045em] text-slate-950">
            {property.property_label}
          </p>
          <p className="mt-1 line-clamp-1 text-[12.5px] font-medium text-slate-500">
            {formatAddress(property) || "Address not added"}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <MobilePropertyStat label="Rent" value={formatCurrency(rent)} />
        <MobilePropertyStat label="Tenants" value={`${tenantCount}`} />
        <MobilePropertyStat
          label="Bank"
          value={bankConnected ? "Ready" : "Pending"}
          warning={!bankConnected}
        />
        <MobilePropertyStat label="Lease" value={leaseStatus} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[16px] bg-zinc-50 px-3 py-2.5">
        <p className="text-[12px] font-semibold text-slate-500">Payment status</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700">
          {paymentStatus}
        </span>
      </div>
    </button>
  );
}

function MobilePropertyPreviewCard({
  property,
  onOpen,
}: {
  property: LandlordMobileProperty;
  onOpen: () => void;
}) {
  const lease = property.leases?.[0];
  const primaryTenant = getPrimaryTenant(lease);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] border border-zinc-200 bg-white p-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.045)] transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[20px] font-semibold tracking-[-0.055em] text-slate-950">
              {property.property_label}
            </p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {getLeaseStatus(lease?.end_date)}
            </span>
          </div>
          <p className="mt-2 line-clamp-1 text-[12.5px] font-medium text-slate-500">
            {formatAddress(property) || "Address not added"}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-zinc-50 px-3.5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Monthly rent
          </p>
          <p className="mt-1 text-[17px] font-semibold tracking-[-0.045em] text-slate-950">
            {formatCurrency(lease?.monthly_rent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Tenant
          </p>
          <p className="mt-1 max-w-[140px] truncate text-[13px] font-semibold text-slate-700">
            {getTenantName(primaryTenant)}
          </p>
        </div>
      </div>
    </button>
  );
}

function MobilePropertyStat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-2 py-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[13px] font-semibold ${
          warning ? "text-amber-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function LandlordMobilePropertyDetail({
  property,
  lease,
  tenants,
  notes,
  documents,
  activities,
  paymentsPreview,
  uploadingDocument,
  onConnectBank,
  onManageTenant,
  onRequestPayment,
  onAddNote,
  onUploadDocument,
  onViewDocuments,
  onViewNotes,
  onViewActivity,
  onViewPayments,
}: {
  property: LandlordMobileProperty;
  lease?: LandlordMobileLease | null;
  tenants: LandlordMobileTenant[];
  notes: LandlordMobileNote[];
  documents: LandlordMobileDocument[];
  activities: LandlordMobileActivity[];
  paymentsPreview?: Array<{ id: string; month: string; status: string; amount: number }>;
  uploadingDocument: boolean;
  onConnectBank: () => void;
  onManageTenant: () => void;
  onRequestPayment: () => void;
  onAddNote: () => void;
  onUploadDocument: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewDocuments: () => void;
  onViewNotes: () => void;
  onViewActivity: () => void;
  onViewPayments: () => void;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const bankConnected = property.bank_status === "connected";
  const primaryTenant = getPrimaryTenant({ ...lease, lease_tenants: tenants });
  const rent = Number(lease?.monthly_rent || 0);

  return (
    <MobilePageShell active={activeTab} onTabChange={setActiveTab}>
      {activeTab === "home" && (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-500">Property</p>
              <h1 className="mt-1 text-[28px] font-semibold leading-[1.05] tracking-[-0.06em] text-slate-950">
                {property.property_label}
              </h1>
              <p className="mt-2 line-clamp-1 text-[12.5px] font-medium text-slate-500">
                {formatAddress(property)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("more")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-slate-700"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <MobileCard className="p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-700">
                  <DollarSign className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-slate-500">
                    Due This Month
                  </p>
                  <p className="mt-1 text-[25px] font-semibold tracking-[-0.06em] text-slate-950">
                    {formatCurrency(rent)}
                  </p>
                  <p className="mt-1 text-[12.5px] font-medium text-slate-500">
                    Due on {lease?.rent_due_day || "—"}
                  </p>
                </div>
              </div>
            </MobileCard>

            <div className="grid grid-cols-2 gap-3">
              <MobileMiniMetric
                Icon={ShieldCheck}
                label="Bank Status"
                value={bankConnected ? "Verified" : "Pending"}
                subtext={bankConnected ? "Ready" : "Action needed"}
                tone={bankConnected ? "green" : "amber"}
              />
              <MobileMiniMetric
                Icon={CalendarDays}
                label="Lease Ends"
                value={formatDate(lease?.end_date)}
                subtext={getLeaseStatus(lease?.end_date)}
                tone="blue"
              />
            </div>

            <WorkspaceStatusCard ready={bankConnected} onConnectBank={onConnectBank} />

            <section>
              <MobileSectionHeader
                title="Tenants"
                count={tenants.length}
                action={
                  <button
                    type="button"
                    onClick={onManageTenant}
                    className="text-[13px] font-semibold text-slate-900"
                  >
                    Manage →
                  </button>
                }
              />
              <MobileTenantCard
                tenant={primaryTenant}
                onRequestPayment={onRequestPayment}
                onManageTenant={onManageTenant}
              />
            </section>

            <MobilePropertyNotesSection
              notes={notes}
              onAddNote={onAddNote}
              onViewNotes={onViewNotes}
            />
            <MobilePropertyDocumentsSection
              documents={documents}
              uploadingDocument={uploadingDocument}
              onUploadDocument={onUploadDocument}
              onViewDocuments={onViewDocuments}
            />
          </div>
        </>
      )}

      {activeTab === "properties" && (
        <div>
          <MobileTabTitle title="Property" />
          <MobilePropertyCard property={property} onOpen={() => setActiveTab("home")} />
          <div className="mt-4">
            <MobileTenantCard
              tenant={primaryTenant}
              onRequestPayment={onRequestPayment}
              onManageTenant={onManageTenant}
            />
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <MobilePropertyPaymentsTab
          paymentsPreview={paymentsPreview || []}
          bankConnected={bankConnected}
          onConnectBank={onConnectBank}
          onViewPayments={onViewPayments}
        />
      )}

      {activeTab === "activity" && (
        <MobileActivityTab activities={activities} onViewAll={onViewActivity} />
      )}

      {activeTab === "more" && <MobileMoreTab />}
    </MobilePageShell>
  );
}

function MobileTenantCard({
  tenant,
  onRequestPayment,
  onManageTenant,
}: {
  tenant?: LandlordMobileTenant | null;
  onRequestPayment: () => void;
  onManageTenant: () => void;
}) {
  if (!tenant) {
    return (
      <MobileEmptyState
        title="No tenant added yet"
        subtitle="Invite a tenant to activate their dashboard access."
        actionLabel="Manage Tenant"
        onAction={onManageTenant}
      />
    );
  }

  return (
    <MobileCard className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-[14px] font-semibold text-white">
          {getTenantInitials(tenant)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
              {getTenantName(tenant)}
            </p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
              {tenant.tenant_role || "Tenant"}
            </span>
          </div>
          <p className="mt-1 truncate text-[12.5px] font-medium text-slate-500">
            {tenant.email || "Email not added"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
              {tenant.invite_status === "accepted" ? "Invite accepted" : "Invite pending"}
            </span>
            {tenant.invite_status === "accepted" && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
                Dashboard enabled
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRequestPayment}
        className="mt-4 h-11 w-full rounded-[16px] bg-slate-100 text-[13px] font-semibold text-slate-950"
      >
        Request Payment
      </button>
    </MobileCard>
  );
}

function MobilePropertyNotesSection({
  notes,
  onAddNote,
  onViewNotes,
}: {
  notes: LandlordMobileNote[];
  onAddNote: () => void;
  onViewNotes: () => void;
}) {
  return (
    <section>
      <MobileSectionHeader
        title="Notes"
        count={notes.length}
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddNote}
              className="text-[13px] font-semibold text-slate-900"
            >
              + Add
            </button>
            <button
              type="button"
              onClick={onViewNotes}
              className="text-[13px] font-semibold text-slate-900"
            >
              All →
            </button>
          </div>
        }
      />
      <div className="space-y-3">
        {notes.length === 0 ? (
          <MobileEmptyState
            title="No notes yet"
            subtitle="Add private reminders or shared tenant updates for this property."
          />
        ) : (
          notes.slice(0, 2).map((note) => <MobileNoteCard key={note.id} note={note} />)
        )}
      </div>
    </section>
  );
}

function MobilePropertyDocumentsSection({
  documents,
  uploadingDocument,
  onUploadDocument,
  onViewDocuments,
}: {
  documents: LandlordMobileDocument[];
  uploadingDocument: boolean;
  onUploadDocument: (event: ChangeEvent<HTMLInputElement>) => void;
  onViewDocuments: () => void;
}) {
  return (
    <section>
      <MobileSectionHeader
        title="Documents"
        count={documents.length}
        action={
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-slate-900">
              <Upload className="h-3.5 w-3.5" />
              {uploadingDocument ? "Uploading" : "Upload"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={onUploadDocument}
                disabled={uploadingDocument}
              />
            </label>
            <button
              type="button"
              onClick={onViewDocuments}
              className="text-[13px] font-semibold text-slate-900"
            >
              View →
            </button>
          </div>
        }
      />
      {documents.length === 0 ? (
        <MobileEmptyState
          title="Store property documents"
          subtitle="Keep leases, renewals, notices, inspections, and important records organized."
        />
      ) : (
        <div className="space-y-2">
          {documents.slice(0, 2).map((doc) => (
            <MobileDocumentRow key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </section>
  );
}

function MobilePropertyPaymentsTab({
  paymentsPreview,
  bankConnected,
  onConnectBank,
  onViewPayments,
}: {
  paymentsPreview: Array<{ id: string; month: string; status: string; amount: number }>;
  bankConnected: boolean;
  onConnectBank: () => void;
  onViewPayments: () => void;
}) {
  return (
    <div>
      <MobileTabTitle
        title="Payments"
        action={
          <button
            type="button"
            onClick={onViewPayments}
            className="text-[13px] font-semibold text-slate-900"
          >
            All history
          </button>
        }
      />

      <MobileCard className="overflow-hidden">
        {paymentsPreview.length === 0 ? (
          <div className="px-4 py-6">
            <p className="text-[13px] font-semibold text-slate-950">
              No payment schedule yet
            </p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Lease payment history will appear here when available.
            </p>
          </div>
        ) : (
          paymentsPreview.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 last:border-b-0"
            >
              <p className="text-[13px] font-semibold text-slate-950">{item.month}</p>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {item.status}
              </span>
              <p className="text-[13px] font-semibold text-slate-950">
                {formatCurrency(item.amount)}
              </p>
            </div>
          ))
        )}
      </MobileCard>

      <MobileCard className="mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
              Payment Setup
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-slate-500">
              {bankConnected
                ? "Rent collection is active for this workspace."
                : "Connect your bank account to activate rent collection."}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              bankConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {bankConnected ? "Active" : "Action"}
          </span>
        </div>

        {!bankConnected && (
          <button
            type="button"
            onClick={onConnectBank}
            className="mt-4 h-11 w-full rounded-[16px] bg-[#33435F] text-[13px] font-semibold text-white"
          >
            Connect Bank
          </button>
        )}
      </MobileCard>
    </div>
  );
}

function MobileNoteCard({ note }: { note: LandlordMobileNote }) {
  const privateNote = note.type === "private";

  return (
    <article
      className={`rounded-[20px] border px-4 py-3 ${
        privateNote ? "border-amber-200 bg-[#FFF8EA]" : "border-blue-200 bg-[#EFF7FF]"
      }`}
    >
      <p className="text-[14px] font-semibold leading-5 text-slate-950">{note.text}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-[12px] font-medium text-slate-500">
          {formatDate(note.created_at)} · Created by {note.created_by_role || "landlord"}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
            privateNote ? "bg-[#FFE8B8] text-[#8A5A00]" : "bg-[#DCEEFF] text-[#1D5F9F]"
          }`}
        >
          {privateNote ? "Private Note" : "Shared Note"}
        </span>
      </div>
    </article>
  );
}

function MobileDocumentRow({ document }: { document: LandlordMobileDocument }) {
  return (
    <MobileCard className="flex items-center gap-3 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[11px] font-semibold uppercase text-slate-500">
        {document.file_name.split(".").pop()?.slice(0, 3) || "DOC"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-slate-950">
          {document.file_name}
        </p>
        <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
          {formatDate(document.created_at)}
          {document.file_size ? ` · ${Math.round(document.file_size / 1024)} KB` : ""}
        </p>
      </div>
    </MobileCard>
  );
}

function MobileActivityPreview({
  activities,
  onViewAll,
}: {
  activities: LandlordMobileActivity[];
  onViewAll?: () => void;
}) {
  return (
    <section>
      <MobileSectionHeader
        title="Recent Activity"
        action={
          onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="text-[13px] font-semibold text-slate-900"
            >
              View all
            </button>
          ) : null
        }
      />
      <MobileCard className="overflow-hidden">
        {activities.length === 0 ? (
          <div className="px-4 py-6">
            <p className="text-[13px] font-semibold text-slate-950">No recent activity</p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Property updates will appear here.
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const { Icon, shell } = getActivityTone(activity);

            return (
              <div
                key={activity.id}
                className="flex gap-3 border-b border-zinc-200 px-4 py-3.5 last:border-b-0"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${shell}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-slate-950">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="mt-1 line-clamp-1 text-[12.5px] font-medium text-slate-500">
                      {activity.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-[12px] font-medium text-slate-400">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </MobileCard>
    </section>
  );
}

function MobileEmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <MobileCard className="px-4 py-6 text-center">
      <p className="text-[14px] font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-[290px] text-[12.5px] font-medium leading-5 text-slate-500">
        {subtitle}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-950"
        >
          {actionLabel}
        </button>
      )}
    </MobileCard>
  );
}
