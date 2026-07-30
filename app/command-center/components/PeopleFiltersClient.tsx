"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, Search, UserRound, UsersRound } from "lucide-react";

const PEOPLE_TABS = [
  { value: "all", label: "All", icon: List, badgeClass: "bg-zinc-100 text-zinc-600" },
  { value: "landlord", label: "Landlords", icon: UserRound, badgeClass: "bg-blue-100 text-blue-700" },
  { value: "resident", label: "Residents", icon: UserRound, badgeClass: "bg-green-100 text-green-700" },
  { value: "dual", label: "Dual Role", icon: UsersRound, badgeClass: "bg-purple-100 text-purple-700" },
] as const;

type PeopleTabValue = (typeof PEOPLE_TABS)[number]["value"];

export default function PeopleFiltersClient({
  initialQuery,
  initialRole,
  roleCounts,
}: {
  initialQuery: string;
  initialRole: string;
  roleCounts: Record<PeopleTabValue, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const activeRole = PEOPLE_TABS.some((tab) => tab.value === initialRole)
    ? initialRole
    : "all";

  useEffect(() => {
    const timeout = window.setTimeout(() => updateParam("query", query.trim()), 350);
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
    <div className="flex flex-col gap-4 bg-white lg:flex-row lg:items-center lg:justify-between lg:gap-12">
      <label className="flex w-full flex-col gap-1 md:w-[620px] lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-2">
        <span className="text-[12px] font-semibold text-slate-600 lg:shrink-0 lg:text-[13px]">
          Lookup
        </span>
        <span className="relative block w-full lg:max-w-[620px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitLookup();
              }
            }}
            placeholder="Search name, email, landlord, resident"
            className="h-10 w-full rounded-[11px] border border-slate-200 bg-white py-0 pl-3 pr-11 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
          />
          <button
            type="button"
            onClick={submitLookup}
            className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-slate-700"
            aria-label="Search people"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
          </button>
        </span>
      </label>

      <nav className="-mx-1 overflow-x-auto px-1 lg:shrink-0" aria-label="People role">
        <div className="flex min-w-max items-end gap-5">
          {PEOPLE_TABS.map(({ value, label, icon: Icon, badgeClass }) => {
            const active = activeRole === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateParam("role", value)}
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
                  {roleCounts[value]}
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
