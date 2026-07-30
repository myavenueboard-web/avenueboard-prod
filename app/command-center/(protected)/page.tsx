import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Home,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  getCommandCenterGrowthOverview,
  getCommandCenterOverview,
  getCommandCenterRange,
  type CommandCenterGrowthMetricId,
  type CommandCenterGrowthOverview,
  type CommandCenterMetric,
  type CommandCenterRangeId,
  type CommandCenterSection,
} from "@/lib/command-center/overview";
import { requireCommandCenterStaff } from "@/lib/command-center/server";

const rangeLinks: Array<{ id: CommandCenterRangeId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
];

const growthMetricLinks: Array<{ id: CommandCenterGrowthMetricId; label: string }> = [
  { id: "users", label: "Users" },
  { id: "rent", label: "Rent Processed" },
];

const kpiMetrics = [
  { section: "People", metric: "Total registered users", label: "Registered Users", icon: Users },
  { section: "People", metric: "Landlords", label: "Landlords", icon: UserCheck },
  { section: "People", metric: "Residents", label: "Residents", icon: Users },
  { section: "Activation", metric: "Properties created", label: "Properties", icon: Building2 },
  { section: "Activation", metric: "Active leases", label: "Active Leases", icon: Home },
  { section: "Payments", metric: "Rent processed", label: "Rent Processed", icon: CircleDollarSign },
  { section: "Support", metric: "Open cases", label: "Open Cases", icon: ClipboardList },
];

const overviewLinks: Record<string, { label: string; href: string }> = {
  Growth: { label: "View people", href: "/command-center/people" },
  Activation: { label: "View activation", href: "/command-center/properties" },
  Payments: { label: "View payments", href: "/command-center/payments" },
  Support: { label: "View cases", href: "/command-center/cases" },
};

export default async function CommandCenterOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; growth?: string }>;
}) {
  const params = await searchParams;
  const range = getCommandCenterRange(params?.range);
  const growthMetric: CommandCenterGrowthMetricId =
    params?.growth === "rent" ? "rent" : "users";
  const staff = await requireCommandCenterStaff();
  const sections = await getCommandCenterOverview(range, staff);
  const growthOverview = await getCommandCenterGrowthOverview(range, growthMetric);

  const people = requireSection(sections, "People");
  const activation = requireSection(sections, "Activation");
  const payments = requireSection(sections, "Payments");
  const support = requireSection(sections, "Support");

  const activityMetrics = [
    findMetric(sections, "People", "New signups"),
    findMetric(sections, "Payments", "Successful payments"),
    findMetric(sections, "Support", "New cases"),
    findMetric(sections, "Activation", "Rent-collecting landlords"),
    findMetric(sections, "Activation", "Properties created"),
  ].filter(Boolean) as CommandCenterMetric[];

  const attentionMetrics = [
    findMetric(sections, "Operations", "Bank connection issues"),
    findMetric(sections, "Operations", "Failed payment items"),
    findMetric(sections, "Operations", "Properties requiring setup"),
    findMetric(sections, "Operations", "Pending resident invitations"),
    findMetric(sections, "Support", "Time-sensitive cases"),
  ].filter(Boolean) as CommandCenterMetric[];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
          Operations Snapshot
        </h2>

        <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-slate-200 bg-white p-1">
          {rangeLinks.map((item) => {
            const active = range.rangeId === item.id;
            return (
              <Link
                key={item.id}
                href={`/command-center?range=${item.id}&growth=${growthMetric}`}
                className={`rounded-[14px] px-3.5 py-2 text-[12px] font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="rounded-[14px] px-3.5 py-2 text-[12px] font-semibold text-slate-400">
            Custom
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-7">
          {kpiMetrics.map((item) => {
            const metric = findMetric(sections, item.section, item.metric);
            return metric ? (
              <KpiStripItem
                key={`${item.section}-${item.metric}`}
                metric={metric}
                label={item.label}
                icon={item.icon}
              />
            ) : null;
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <GrowthOverviewCard
          overview={growthOverview}
          rangeId={range.rangeId}
          selectedMetric={growthMetric}
        />

        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-slate-700" strokeWidth={2} />
            <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
              Today&apos;s Activity
            </h3>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {activityMetrics.map((metric) => (
              <MetricRow key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <OperationsCard title="Growth" section={people} visual="sparkline" />
        <OperationsCard title="Activation" section={activation} visual="funnel" />
        <OperationsCard title="Payments" section={payments} visual="donut" />
        <OperationsCard title="Support" section={support} visual="bars" />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" strokeWidth={2} />
          <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
            Requires Attention
          </h3>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {attentionMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-850">{metric.label}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500">
                    {metric.help}
                  </p>
                </div>
              </div>
              <MetricValue metric={metric} className="text-[16px]" />
            </div>
          ))}
        </div>
      </section>

      <p className="pt-1 text-center text-[12px] font-medium text-slate-400">
        Metrics are read-only and reflect production data. Not configured means explicit event or milestone tracking is required.
      </p>
    </div>
  );
}

function GrowthOverviewCard({
  overview,
  rangeId,
  selectedMetric,
}: {
  overview: CommandCenterGrowthOverview;
  rangeId: CommandCenterRangeId;
  selectedMetric: CommandCenterGrowthMetricId;
}) {
  const maxValue = Math.max(...overview.points.map((point) => point.value), 0);
  const hasActivity = maxValue > 0;
  const colors = growthChartColors[selectedMetric];
  const chartMax = Math.max(maxValue, 1);
  const tickValues = Array.from(
    new Set([1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(chartMax * ratio)))
  );

  return (
    <section className="bg-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[24px] font-semibold tracking-[-0.055em] text-slate-950">
            Growth Overview
          </h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-[12px] font-semibold text-slate-500">
            {overview.state === "error" ? "Unavailable" : overview.periodLabel}
          </p>
          <div className="flex w-fit items-center gap-1 rounded-[16px] border border-slate-200 bg-white p-1">
            {growthMetricLinks.map((item) => {
              const active = selectedMetric === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/command-center?range=${rangeId}&growth=${item.id}`}
                  className={`rounded-[12px] px-4 py-2 text-[13px] font-semibold transition ${
                    active
                      ? `${colors.active} text-white shadow-sm`
                      : "text-slate-500 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="grid h-[270px] grid-cols-[42px_1fr] gap-3">
          <div className="relative h-full text-[12px] font-medium text-slate-500">
            {tickValues.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="absolute right-0 -translate-y-1/2"
                style={{
                  top: `${
                    tickValues.length === 1
                      ? 0
                      : (index / (tickValues.length - 1)) * 100
                  }%`,
                }}
              >
                {selectedMetric === "rent" ? formatCompactAxisCurrency(value) : value}
              </span>
            ))}
          </div>

          <div className="relative h-full">
            {tickValues.slice(0, -1).map((value, index) => (
              <div
                key={`grid-${value}-${index}`}
                className="absolute inset-x-0 border-t border-dashed border-slate-200"
                style={{
                  top: `${
                    tickValues.length === 1
                      ? 0
                      : (index / (tickValues.length - 1)) * 100
                  }%`,
                }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 border-t border-slate-300" />

            <div className="relative flex h-full items-end gap-2 overflow-x-auto pb-px">
              {overview.points.map((point) => {
                const height = hasActivity
                  ? Math.max(10, Math.round((point.value / chartMax) * 220))
                  : 10;
                const filled = point.value > 0 && overview.state === "ready";

                return (
                  <div
                    key={point.key}
                    tabIndex={0}
                    className="group relative flex min-w-[34px] flex-1 items-end justify-center outline-none"
                    aria-label={`${point.tooltipLabel}. ${overview.metricLabel}: ${point.displayValue}`}
                  >
                    <span
                      className={`block w-full max-w-[36px] rounded-t-[6px] transition ${
                        filled ? colors.bar : "bg-slate-200"
                      } group-hover:brightness-95 group-focus-visible:ring-2 group-focus-visible:ring-slate-300`}
                      style={{ height }}
                    />
                    <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 hidden min-w-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-semibold text-slate-700 shadow-lg group-hover:block group-focus:block">
                      <span className="block text-slate-950">{point.tooltipLabel}</span>
                      <span className="mt-0.5 block text-slate-500">
                        {selectedMetric === "rent" ? "Rent processed" : "Users added"}:{" "}
                        {point.displayValue}
                      </span>
                    </span>
                  </div>
                );
              })}
              {!hasActivity && overview.state === "ready" ? (
                <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[12px] font-semibold text-slate-400">
                  No activity in this period
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="ml-[54px] mt-3 grid text-[12px] font-medium text-slate-500"
          style={{
            gridTemplateColumns: `repeat(${Math.max(
              overview.points.length,
              1
            )}, minmax(0, 1fr))`,
          }}
        >
          {overview.points.map((point, index) => {
            const showLabel =
              rangeId === "today" ||
              overview.points.length <= 7 ||
              index === 0 ||
              index === overview.points.length - 1 ||
              index % 5 === 0;

            return (
              <span
                key={`${point.key}-label`}
                className={`truncate text-center ${showLabel ? "opacity-100" : "opacity-0"}`}
                aria-hidden={!showLabel}
              >
                {point.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function KpiStripItem({
  metric,
  label,
  icon: Icon,
}: {
  metric: CommandCenterMetric;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <article className="min-w-0 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="truncate text-[12px] font-semibold text-slate-600">{label}</p>
      </div>
      <MetricValue metric={metric} className="mt-3 text-[28px]" />
      <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">
        {metric.help}
      </p>
    </article>
  );
}

function OperationsCard({
  title,
  section,
  visual,
}: {
  title: string;
  section: CommandCenterSection;
  visual: "sparkline" | "funnel" | "donut" | "bars";
}) {
  const link = overviewLinks[title];
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="p-4">
        <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-slate-950">
          {title}
        </h3>
        <MiniVisual visual={visual} metrics={section.metrics} />
      </div>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {section.metrics.map((metric) => (
          <MetricRow key={metric.label} metric={metric} />
        ))}
      </div>
      {link ? (
        <Link
          href={link.href}
          className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {link.label}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </section>
  );
}

function MiniVisual({
  visual,
  metrics,
}: {
  visual: "sparkline" | "funnel" | "donut" | "bars";
  metrics: CommandCenterMetric[];
}) {
  const numericValues = metrics.map((metric) => numericMetricValue(metric)).filter((value) => value > 0);
  if (!numericValues.length) {
    return (
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-center text-[12px] font-semibold text-slate-400">
        Not enough historical data
      </div>
    );
  }

  if (visual === "sparkline") {
    return (
      <div className="mt-4 flex h-12 items-end gap-1.5">
        {metrics.map((metric, index) => (
          <span
            key={`${metric.label}-${index}`}
            className="w-full rounded-full bg-slate-200"
            style={{ height: `${Math.max(10, Math.min(44, numericMetricValue(metric) * 2 + 10))}px` }}
          />
        ))}
      </div>
    );
  }

  if (visual === "funnel") {
    const max = Math.max(...numericValues, 1);
    return (
      <div className="mt-4 space-y-1.5">
        {metrics.slice(0, 4).map((metric) => (
          <div key={metric.label} className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-800"
              style={{
                width: `${Math.max(12, Math.min(100, (numericMetricValue(metric) / max) * 100))}%`,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (visual === "donut") {
    const successful = numericMetricValue(metrics.find((metric) => metric.label === "Successful payments") || metrics[0]);
    const failed = numericMetricValue(metrics.find((metric) => metric.label === "Failed payments") || metrics[1]);
    const processing = numericMetricValue(metrics.find((metric) => metric.label === "Currently processing") || metrics[2]);
    const total = Math.max(successful + failed + processing, 1);
    const successfulEnd = (successful / total) * 100;
    const failedEnd = successfulEnd + (failed / total) * 100;
    return (
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-full"
          style={{
            background: `conic-gradient(#0f172a 0 ${successfulEnd}%, #dc2626 ${successfulEnd}% ${failedEnd}%, #94a3b8 ${failedEnd}% 100%)`,
          }}
        >
          <div className="m-2 h-8 w-8 rounded-full bg-white" />
        </div>
        <p className="text-[12px] font-medium text-slate-500">
          Successful, failed, and processing activity
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {metrics.slice(0, 3).map((metric) => (
        <div key={metric.label} className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-800"
              style={{ width: `${Math.max(12, Math.min(100, numericMetricValue(metric) * 8))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricRow({
  metric,
  label,
  compact,
}: {
  metric: CommandCenterMetric;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${
        compact ? "rounded-2xl bg-slate-50 px-3 py-3" : "px-4 py-3 first:pt-0 last:pb-0"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800">{label || metric.label}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500">
          {metric.help}
        </p>
      </div>
      <MetricValue metric={metric} className="text-[14px]" />
    </div>
  );
}

function MetricValue({
  metric,
  className,
}: {
  metric: CommandCenterMetric;
  className?: string;
}) {
  return (
    <p
      className={`shrink-0 text-right font-semibold tracking-[-0.045em] ${
        metric.state === "error"
          ? "text-red-600"
          : metric.state === "deferred"
          ? "text-slate-400"
          : "text-slate-950"
      } ${className || ""}`}
    >
      {metric.value}
    </p>
  );
}

function findMetric(
  sections: CommandCenterSection[],
  sectionTitle: string,
  metricLabel: string
) {
  return sections
    .find((section) => section.title === sectionTitle)
    ?.metrics.find((metric) => metric.label === metricLabel);
}

function requireSection(sections: CommandCenterSection[], title: string) {
  return (
    sections.find((section) => section.title === title) || {
      title,
      eyebrow: "",
      metrics: [],
    }
  );
}

function numericMetricValue(metric: CommandCenterMetric) {
  if (metric.state === "deferred" || metric.state === "error") return 0;
  const value = Number(String(metric.value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatCompactAxisCurrency(value: number) {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
}

const growthChartColors: Record<
  CommandCenterGrowthMetricId,
  { active: string; bar: string }
> = {
  users: {
    active: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  rent: {
    active: "bg-blue-600",
    bar: "bg-blue-600",
  },
};
