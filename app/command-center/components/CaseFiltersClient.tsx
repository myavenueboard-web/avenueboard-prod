"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, ChevronDown, Circle, Clock3, List, Search } from "lucide-react";

const CASE_STATUSES = [
  { value: "all", label: "All", icon: List, badgeClass: "bg-zinc-100 text-zinc-600" },
  { value: "new", label: "Open", icon: Circle, badgeClass: "bg-red-100 text-red-700" },
  { value: "in_progress", label: "In Progress", icon: Clock3, badgeClass: "bg-blue-100 text-blue-700" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, badgeClass: "bg-green-100 text-green-700" },
] as const;
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;

export default function CaseFiltersClient({
  initialQuery,
  initialStatus,
  statusCounts,
}: {
  initialQuery: string;
  initialStatus: string;
  statusCounts: Record<"all" | "new" | "in_progress" | "resolved", number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const activeStatus = initialStatus === "closed" ? "resolved" : initialStatus;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    params.delete("priority");
    params.delete("category");
    params.delete("assignment");
    params.delete("date");
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

  return (
    <div className="flex flex-col gap-4 bg-white lg:flex-row lg:items-center lg:justify-between lg:gap-12">
      <label className="flex w-full flex-col gap-1 md:w-[520px] lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-2">
        <span className="text-[12px] font-semibold text-slate-600 lg:shrink-0 lg:text-[13px]">
          Lookup
        </span>
        <span className="relative block w-full lg:max-w-[560px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitLookup();
              }
            }}
            placeholder="Search case number, customer name, or email"
            className="h-10 w-full rounded-[11px] border border-slate-200 bg-white py-0 pl-3 pr-11 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
          />
          <button
            type="button"
            onClick={submitLookup}
            className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition hover:text-slate-700"
            aria-label="Search cases"
          >
            <Search className="h-4 w-4" strokeWidth={2} />
          </button>
        </span>
      </label>

      <nav className="-mx-1 overflow-x-auto px-1 lg:shrink-0" aria-label="Case status">
        <div className="flex min-w-max items-end gap-5">
          {CASE_STATUSES.map(({ value, label, icon: Icon, badgeClass }) => {
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
                  {statusCounts[value]}
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

export function CaseRowsPerPageSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, PAGE_SIZE_OPTIONS.findIndex((option) => option === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function updatePageSize(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue === "25") params.delete("pageSize");
    else params.set("pageSize", nextValue);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function openMenu() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % PAGE_SIZE_OPTIONS.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + PAGE_SIZE_OPTIONS.length) % PAGE_SIZE_OPTIONS.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(PAGE_SIZE_OPTIONS.length - 1);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-2 text-[13px] font-normal text-slate-600">
      <span>Rows per page</span>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-8 min-w-16 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white pl-3 pr-2 text-[13px] font-semibold text-slate-800 outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Rows per page"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Rows per page"
          className="absolute bottom-9 left-[calc(100%-4rem)] z-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[13px] text-slate-800 shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
        >
          {PAGE_SIZE_OPTIONS.map((option, index) => {
            const selected = option === value;
            return (
              <button
                key={option}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => updatePageSize(String(option))}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left font-medium outline-none transition ${
                  selected
                    ? "bg-slate-50 text-slate-950"
                    : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50"
                }`}
              >
                {option}
                {selected ? <Check className="h-3.5 w-3.5 text-slate-700" strokeWidth={2} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
