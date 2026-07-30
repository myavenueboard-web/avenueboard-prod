"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  List,
  Search,
} from "lucide-react";

const PROPERTY_STATUSES = [
  { value: "all", label: "All", icon: List, badgeClass: "bg-zinc-100 text-zinc-600" },
  { value: "active", label: "Active", icon: CheckCircle2, badgeClass: "bg-green-100 text-green-700" },
  { value: "setup_incomplete", label: "Setup", icon: AlertTriangle, badgeClass: "bg-amber-100 text-amber-700" },
  { value: "lease_expired", label: "Expired", icon: CircleOff, badgeClass: "bg-red-100 text-red-700" },
] as const;

type PropertyStatusKey = (typeof PROPERTY_STATUSES)[number]["value"];

export default function PropertyFiltersClient({
  initialQuery,
  initialStatus,
  statusCounts,
}: {
  initialQuery: string;
  initialStatus: string;
  statusCounts?: Partial<Record<PropertyStatusKey, number>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    params.delete("bank");
    params.delete("lease");
    params.delete("payment");
    params.delete("created");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => updateParam("query", query.trim()), 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function submitLookup() {
    updateParam("query", query.trim());
  }

  const activeStatus = PROPERTY_STATUSES.some((status) => status.value === initialStatus)
    ? initialStatus
    : "all";
  const safeStatusCounts = statusCounts || {};

  return (
    <div className="flex flex-col gap-4 bg-white lg:flex-row lg:items-center lg:justify-between lg:gap-12">
      <label className="flex w-full flex-col gap-1 md:w-[620px] lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-2">
        <span className="text-[12px] font-semibold text-slate-600 lg:shrink-0 lg:text-[13px]">
          Lookup
        </span>
        <span className="relative block w-full lg:max-w-[660px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitLookup();
              }
            }}
            placeholder="Search property, address, landlord, resident, or lease"
            className="h-10 w-full rounded-[11px] border border-slate-200 bg-white py-0 pl-3 pr-11 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
          />
          <button
            type="button"
            onClick={submitLookup}
            className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-slate-700"
            aria-label="Search properties"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
          </button>
        </span>
      </label>

      <nav className="-mx-1 overflow-x-auto px-1 lg:shrink-0" aria-label="Property status">
        <div className="flex min-w-max items-end gap-5">
          {PROPERTY_STATUSES.map(({ value, label, icon: Icon, badgeClass }) => {
            const active = activeStatus === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateParam("status", value)}
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
                  {safeStatusCounts[value] ?? 0}
                </span>
                {active ? (
                  <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-blue-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
