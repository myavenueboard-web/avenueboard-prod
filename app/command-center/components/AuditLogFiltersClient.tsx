"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  List,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  UsersRound,
} from "lucide-react";

const AUDIT_TABS = [
  { value: "all", label: "All", icon: List, badgeClass: "bg-zinc-100 text-zinc-600" },
  { value: "authentication", label: "Authentication", icon: ShieldCheck, badgeClass: "bg-blue-100 text-blue-700" },
  { value: "cases", label: "Cases", icon: BriefcaseBusiness, badgeClass: "bg-amber-100 text-amber-700" },
  { value: "notes", label: "Notes", icon: StickyNote, badgeClass: "bg-indigo-100 text-indigo-700" },
  { value: "settings", label: "Staff", icon: UsersRound, badgeClass: "bg-green-100 text-green-700" },
  { value: "system", label: "System", icon: Server, badgeClass: "bg-slate-100 text-slate-600" },
] as const;

type AuditTabValue = (typeof AUDIT_TABS)[number]["value"];

export default function AuditLogFiltersClient({
  initialQuery,
  initialCategory,
  initialAction,
  initialStaff,
  initialTargetType,
  initialDate,
  initialChangeType,
  categoryCounts,
  actionOptions,
  staffOptions,
  targetTypeOptions,
}: {
  initialQuery: string;
  initialCategory: string;
  initialAction: string;
  initialStaff: string;
  initialTargetType: string;
  initialDate: string;
  initialChangeType: string;
  categoryCounts: Record<AuditTabValue, number>;
  actionOptions: string[];
  staffOptions: Array<{ id: string; label: string }>;
  targetTypeOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();
  const activeCategory = AUDIT_TABS.some((tab) => tab.value === initialCategory)
    ? initialCategory
    : "all";
  const activeFilterCount = [
    initialAction !== "all",
    initialStaff !== "all",
    initialTargetType !== "all",
    initialDate !== "30d",
    initialChangeType !== "all",
  ].filter(Boolean).length;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateParam("query", query.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  function submitLookup() {
    updateParam("query", query.trim());
  }

  return (
    <div className="bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <label className="flex w-full flex-col gap-1 md:w-[620px] lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-2">
          <span className="text-[12px] font-semibold text-slate-600 lg:shrink-0 lg:text-[13px]">
            Lookup
          </span>
          <span className="relative block w-full lg:max-w-[640px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitLookup();
                }
              }}
              placeholder="Search event, staff, target, action, or reason"
              className="h-10 w-full rounded-[11px] border border-slate-200 bg-white py-0 pl-3 pr-11 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
            />
            <button
              type="button"
              onClick={submitLookup}
              className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-slate-700"
              aria-label="Search audit events"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
            </button>
          </span>
        </label>

        <div className="flex flex-col gap-3 lg:shrink-0 lg:flex-row lg:items-center">
          <nav className="-mx-1 overflow-x-auto px-1" aria-label="Audit category">
            <div className="flex min-w-max items-end gap-5">
              {AUDIT_TABS.map(({ value, label, icon: Icon, badgeClass }) => {
                const active = activeCategory === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateParam("category", value)}
                    className={`group relative inline-flex h-10 items-center gap-2 whitespace-nowrap px-1 pb-2 pt-1 text-[13px] font-semibold transition ${
                      active
                        ? "text-slate-950"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    {label}
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${badgeClass}`}
                    >
                      {categoryCounts[value]}
                    </span>
                    {active ? (
                      <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-blue-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
            Filters
            {activeFilterCount ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-700">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectField
            label="Action"
            value={initialAction}
            onChange={(value) => updateParam("action", value)}
            options={[
              ["all", "All Actions"],
              ...actionOptions.map((action) => [action, action] as [string, string]),
            ]}
          />

          <SelectField
            label="Staff"
            value={initialStaff}
            onChange={(value) => updateParam("staff", value)}
            options={[
              ["all", "All Staff"],
              ...staffOptions.map((staff) => [staff.id, staff.label] as [string, string]),
            ]}
          />

          <SelectField
            label="Target Type"
            value={initialTargetType}
            onChange={(value) => updateParam("targetType", value)}
            options={[
              ["all", "All Targets"],
              ...targetTypeOptions.map((type) => [type, formatLabel(type)] as [string, string]),
            ]}
          />

          <SelectField
            label="Date"
            value={initialDate}
            onChange={(value) => updateParam("date", value)}
            options={[
              ["all", "All Time"],
              ["today", "Today"],
              ["7d", "Last 7 Days"],
              ["30d", "Last 30 Days"],
              ["mtd", "Month to Date"],
              ["ytd", "Year to Date"],
            ]}
          />

          <SelectField
            label="Change Type"
            value={initialChangeType}
            onChange={(value) => updateParam("changeType", value)}
            options={[
              ["all", "All"],
              ["created", "Created"],
              ["updated", "Updated"],
              ["assigned", "Assigned"],
              ["status_changed", "Status Changed"],
              ["priority_changed", "Priority Changed"],
              ["resolved", "Resolved"],
              ["reopened", "Reopened"],
              ["login", "Login"],
              ["logout", "Logout"],
              ["access_denied", "Access Denied"],
              ["note_created", "Note Created"],
              ["note_edited", "Note Edited"],
              ["other", "Other"],
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      <select
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
