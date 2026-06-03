import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight } from "lucide-react";

import type { AdminCount, AdminRecord } from "@/lib/admin/adminMetrics";
import { formatCount, formatDateTime, readable } from "@/lib/admin/adminMetrics";

type Tone = "blue" | "green" | "red" | "amber" | "zinc";

const toneStyles: Record<Tone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-200 bg-white px-8 py-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-zinc-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            {description}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  helper,
  tone = "zinc",
}: {
  label: string;
  value: AdminCount | string;
  helper?: string;
  tone?: Tone;
}) {
  const displayValue = typeof value === "string" ? value : formatCount(value);
  const error = typeof value === "string" ? undefined : value.error;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {error ? <AlertTriangle size={14} className="text-amber-500" /> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
        {displayValue}
      </p>
      {helper || error ? (
        <p
          className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneStyles[tone]}`}
        >
          {error || helper}
        </p>
      ) : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: unknown }) {
  const text = readable(value, "unknown");
  const key = text.toLowerCase();
  const tone: Tone =
    key.includes("failed") || key.includes("urgent")
      ? "red"
      : key.includes("sent") ||
          key.includes("paid") ||
          key.includes("resolved") ||
          key.includes("closed") ||
          key.includes("active")
        ? "green"
        : key.includes("pending") ||
            key.includes("waiting") ||
            key.includes("late") ||
            key.includes("high")
          ? "amber"
          : key.includes("open") || key.includes("progress")
            ? "blue"
            : "zinc";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${toneStyles[tone]}`}
    >
      {text}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

export function AdminTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return <EmptyState message="No records found." />;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">{rows}</tbody>
      </table>
    </div>
  );
}

export function TableCell({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle ${muted ? "text-zinc-500" : "text-zinc-900"}`}
    >
      {children}
    </td>
  );
}

export function RecordLink({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600">
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">{title}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <ArrowRight size={15} className="text-zinc-400" />
    </Link>
  );
}

export function getRecordString(
  row: AdminRecord,
  keys: string[],
  fallback = "-"
) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }
  return fallback;
}

export function DateCell({ value }: { value: unknown }) {
  return <span className="text-xs text-zinc-500">{formatDateTime(value)}</span>;
}
