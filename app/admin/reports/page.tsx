import {
  DollarSign,
  Home,
  Users,
  FileText,
  LifeBuoy,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const AVENUEBOARD_SETUP_FEE = 89;

async function getReportsData() {
  const [profilesResult, propertiesResult, leasesResult, supportResult] =
    await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("properties").select("*"),
      supabase.from("leases").select("*"),
      supabase.from("support_requests").select("*"),
    ]);

  const profiles = profilesResult.data || [];
  const properties = propertiesResult.data || [];
  const leases = leasesResult.data || [];
  const support = supportResult.data || [];

  const activeLeases = leases.filter(
    (lease: any) => lease.lease_status === "active"
  );

  const monthlyRentUnderManagement = activeLeases.reduce(
    (sum: number, lease: any) => sum + Number(lease.monthly_rent || 0),
    0
  );

  const annualRentUnderManagement = monthlyRentUnderManagement * 12;
  const estimatedRevenue = activeLeases.length * AVENUEBOARD_SETUP_FEE;

  const resolvedSupport = support.filter(
    (item: any) => item.status === "resolved" || item.status === "closed"
  );

  return {
    profiles,
    properties,
    leases,
    support,
    activeLeases,
    monthlyRentUnderManagement,
    annualRentUnderManagement,
    estimatedRevenue,
    resolvedSupport,
  };
}

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-neutral-500">Reports</p>

          <h1 className="mt-3 text-[42px] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
            Growth & Revenue
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-500">
            Track key metrics across users, properties, leases, rent handled,
            support, and estimated AvenueBoard revenue.
          </p>
        </div>

        <div className="hidden items-center gap-2 rounded-2xl border border-[#e7dfe2] bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm md:flex">
          <CalendarDays size={16} className="text-[#CA6180]" />
          Current Snapshot
        </div>
      </div>

      {/* MAIN REVENUE HERO */}
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
              <DollarSign size={24} />
            </div>

            <p className="mt-6 text-sm text-neutral-500">
              AvenueBoard Revenue
            </p>

            <h2 className="mt-3 text-[56px] font-semibold leading-none tracking-[-0.05em] text-neutral-950">
              {formatCurrency(data.estimatedRevenue)}
            </h2>

            <p className="mt-5 text-sm text-neutral-400">
              Estimated from active leases × ${AVENUEBOARD_SETUP_FEE}
            </p>
          </div>

          <div className="flex min-h-[180px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#CA6180]/10 via-white to-[#CA6180]/5">
            <div className="text-center">
              <p className="text-sm font-medium text-[#CA6180]">
                Revenue trend chart
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                Coming after reporting events are finalized
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RENT + SNAPSHOT */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0e4e8] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
                <DollarSign size={20} />
              </div>

              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                Rent Handled
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <LargeMetric
              label="Monthly Rent Handled"
              value={formatCurrency(data.monthlyRentUnderManagement)}
            />

            <LargeMetric
              label="Annual Rent Handled"
              value={formatCurrency(data.annualRentUnderManagement)}
            />
          </div>
        </div>

        <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#f0e4e8] pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
              <TrendingUp size={20} />
            </div>

            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Operational Snapshot
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            <RowMetric label="Active Leases" value={data.activeLeases.length} />
            <RowMetric label="Support Cases" value={data.support.length} />
            <RowMetric label="Resolved Cases" value={data.resolvedSupport.length} />
          </div>
        </div>
      </div>

      {/* SMALL CARDS */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={data.profiles.length} />
        <StatCard
          icon={Home}
          label="Enrolled Properties"
          value={data.properties.length}
        />
        <StatCard icon={FileText} label="Total Leases" value={data.leases.length} />
        <StatCard icon={LifeBuoy} label="Support Cases" value={data.support.length} />
      </div>

      {/* TIMELINE */}
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
            <CalendarDays size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Reporting Timeline
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Charts and trends over time will be available once reporting
              events are finalized.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <ReportBox title="Daily View" />
          <ReportBox title="Monthly View" />
          <ReportBox title="Yearly View" />
        </div>
      </div>
    </div>
  );
}

function LargeMetric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>

      <h3 className="mt-4 text-[38px] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
        {value}
      </h3>
    </div>
  );
}

function RowMetric({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#f0e4e8] bg-[#fbf9fa] px-5 py-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
        <Icon size={20} />
      </div>

      <p className="mt-6 text-sm text-neutral-500">{label}</p>

      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        {value}
      </h2>
    </div>
  );
}

function ReportBox({ title }: { title: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#e7dfe2] bg-[#fbf9fa] p-8 text-center">
      <CalendarDays size={22} className="mx-auto text-[#CA6180]" />

      <p className="mt-4 font-semibold text-neutral-900">{title}</p>

      <p className="mt-2 text-sm text-neutral-500">Coming soon</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}