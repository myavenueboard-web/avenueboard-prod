import Link from "next/link";
import {
  getAnalyticsDateRange,
  getCommandCenterAnalytics,
  type AnalyticsDashboard,
  type AnalyticsMetric,
  type AnalyticsRangeId,
} from "@/lib/command-center/analytics";
import { requireCommandCenterStaff } from "@/lib/command-center/server";

const rangeLinks: Array<{ id: AnalyticsRangeId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "mtd", label: "Month to Date" },
  { id: "ytd", label: "Year to Date" },
];

export default async function CommandCenterAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = getAnalyticsDateRange(params?.range);
  const staff = await requireCommandCenterStaff();
  const dashboard = await getCommandCenterAnalytics(staff, range);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Phase 2E
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
              Analytics
            </h2>
            <p className="mt-2 max-w-[820px] text-[14px] font-medium leading-6 text-slate-500">
              Internal operating analytics for growth, activation, portfolio,
              payments, cases, and operational health. Metrics use aggregated
              production records only and show Unavailable when a source query
              fails instead of masking it as zero.
            </p>
            <p className="mt-3 text-[12px] font-semibold text-slate-400">
              {dashboard.range.label} · {dashboard.range.boundaryDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rangeLinks.map((item) => {
              const active = dashboard.range.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/command-center/analytics?range=${item.id}`}
                  className={`rounded-2xl px-4 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="rounded-2xl border border-dashed border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-400">
              Custom deferred
            </span>
          </div>
        </div>
      </section>

      <MetricSection section={dashboard.executive} columns="xl:grid-cols-4" />

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
          <SectionHeader
            title="User Growth"
            description="New profile creation in the selected period with current role attribution."
          />
          <MetricGrid metrics={dashboard.userGrowth.metrics} columns="lg:grid-cols-5" />
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bucket</th>
                  <th className="px-4 py-3 font-semibold">Users</th>
                  <th className="px-4 py-3 font-semibold">Landlords</th>
                  <th className="px-4 py-3 font-semibold">Residents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboard.userGrowth.trend.map((point) => (
                  <tr key={point.label}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {point.label}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{point.users}</td>
                    <td className="px-4 py-3 text-slate-600">{point.landlords}</td>
                    <td className="px-4 py-3 text-slate-600">{point.residents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <BreakdownCard
          title="Current Role Split"
          description="Current profile role composition."
          rows={dashboard.userGrowth.split}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <FunnelCard
          title="Landlord Activation Funnel"
          description="Current-state landlord progression across reliable operational milestones."
          stages={dashboard.activation.landlord}
        />
        <FunnelCard
          title="Resident Activation Funnel"
          description="Current-state resident progression. Payment-method stage is intentionally omitted until reliable."
          stages={dashboard.activation.resident}
        />
      </section>

      <MetricSection section={dashboard.portfolio} columns="xl:grid-cols-4" />

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <MetricSection section={dashboard.payments} columns="lg:grid-cols-3" />
        <BreakdownCard
          title="Payment Method Split"
          description="Inferred from payment source and payment-method fields."
          rows={dashboard.payments.methodSplit}
        />
      </section>

      <MetricSection section={dashboard.support} columns="xl:grid-cols-4" />

      <section className="grid gap-5 xl:grid-cols-3">
        <BreakdownCard
          title="Cases by Category"
          description="Current support-ticket category distribution."
          rows={dashboard.support.byCategory}
        />
        <BreakdownCard
          title="Cases by Status"
          description="Current support-ticket status distribution."
          rows={dashboard.support.byStatus}
        />
        <BreakdownCard
          title="Cases by Priority"
          description="Current support-ticket priority distribution."
          rows={dashboard.support.byPriority}
        />
      </section>

      <MetricSection section={dashboard.health} columns="xl:grid-cols-5" />

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <DefinitionsCard dashboard={dashboard} />
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
          <SectionHeader
            title="Known Limitations"
            description="Items intentionally deferred to avoid misleading internal analytics."
          />
          <ul className="mt-5 space-y-3 text-[13px] font-medium leading-6 text-slate-600">
            {dashboard.limitations.map((item) => (
              <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}

function MetricSection({
  section,
  columns = "xl:grid-cols-3",
}: {
  section: { title: string; description: string; metrics: AnalyticsMetric[] };
  columns?: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <SectionHeader title={section.title} description={section.description} />
      <MetricGrid metrics={section.metrics} columns={columns} />
    </section>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
        {title}
      </h3>
      <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MetricGrid({
  metrics,
  columns,
}: {
  metrics: AnalyticsMetric[];
  columns: string;
}) {
  return (
    <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${columns}`}>
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            {metric.label}
          </p>
          <p
            className={`mt-2 text-[24px] font-semibold tracking-[-0.055em] ${
              metric.state === "error"
                ? "text-red-600"
                : metric.state === "deferred"
                ? "text-slate-400"
                : "text-slate-950"
            }`}
          >
            {metric.value}
          </p>
          <p className="mt-2 text-[12px] font-medium leading-5 text-slate-500">
            {metric.help}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {metric.kind}
          </p>
        </article>
      ))}
    </div>
  );
}

function FunnelCard({
  title,
  description,
  stages,
}: {
  title: string;
  description: string;
  stages: AnalyticsDashboard["activation"]["landlord"];
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <div className="p-5">
        <SectionHeader title={title} description={description} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="border-y border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Stage</th>
              <th className="px-5 py-3 font-semibold">Users</th>
              <th className="px-5 py-3 font-semibold">From Previous</th>
              <th className="px-5 py-3 font-semibold">From First Stage</th>
              <th className="px-5 py-3 font-semibold">Drop-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stages.map((stage) => (
              <tr key={stage.label}>
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {stage.label}
                  {stage.limitation ? (
                    <p className="mt-1 text-[12px] font-medium text-slate-400">
                      {stage.limitation}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-slate-700">{stage.count}</td>
                <td className="px-5 py-4 text-slate-700">{stage.previousConversion}</td>
                <td className="px-5 py-4 text-slate-700">{stage.registeredConversion}</td>
                <td className="px-5 py-4 text-slate-700">{stage.dropOff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BreakdownCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <SectionHeader title={title} description={description} />
      <div className="mt-5 divide-y divide-slate-100">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <p className="text-[13px] font-semibold text-slate-800">{row.label}</p>
              <p className="text-[14px] font-semibold text-slate-950">{row.value}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-4 text-[13px] font-medium text-slate-500">
            No data available for this breakdown.
          </p>
        )}
      </div>
    </section>
  );
}

function DefinitionsCard({ dashboard }: { dashboard: AnalyticsDashboard }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
      <div className="p-5">
        <SectionHeader
          title="Metric Registry"
          description="Operational definitions for the analytics currently exposed in Command Center."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead className="border-y border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Metric</th>
              <th className="px-5 py-3 font-semibold">Definition</th>
              <th className="px-5 py-3 font-semibold">Source</th>
              <th className="px-5 py-3 font-semibold">Date Field</th>
              <th className="px-5 py-3 font-semibold">Limitations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {dashboard.definitions.map((definition) => (
              <tr key={definition.key}>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-950">
                    {definition.displayName}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-slate-400">
                    {definition.aggregation}
                  </p>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <p>{definition.currentDefinition}</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {definition.description}
                  </p>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {definition.sourceTables.join(", ")}
                </td>
                <td className="px-5 py-4 text-slate-600">{definition.dateField}</td>
                <td className="px-5 py-4 text-slate-600">{definition.limitations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
