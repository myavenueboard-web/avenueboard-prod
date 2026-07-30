"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronUp,
  ClipboardList,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { StaffUser } from "@/lib/command-center/server";

const navItems = [
  { label: "Overview", href: "/command-center", icon: LayoutDashboard },
  { label: "People", href: "/command-center/people", icon: Users },
  { label: "Properties", href: "/command-center/properties", icon: BriefcaseBusiness },
  { label: "Payments", href: "/command-center/payments", icon: CreditCard },
  { label: "Cases", href: "/command-center/cases", icon: ClipboardList },
  { label: "Analytics", href: "/command-center/analytics", icon: BarChart3 },
  { label: "Audit Log", href: "/command-center/audit-log", icon: FileClock },
  { label: "Settings", href: "/command-center/settings", icon: Settings },
];

function formatRole(role: StaffUser["role"]) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CommandCenterShell({
  staff,
  children,
}: {
  staff: StaffUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [caseActionCount, setCaseActionCount] = useState(0);
  const activeItem =
    navItems.find((item) =>
      item.href === "/command-center"
        ? pathname === "/command-center"
        : pathname.startsWith(item.href)
    ) || navItems[0];
  const hidePageTitle =
    pathname === "/command-center/cases" ||
    pathname === "/command-center" ||
    pathname === "/command-center/payments" ||
    pathname === "/command-center/properties" ||
    pathname === "/command-center/people" ||
    pathname === "/command-center/audit-log";
  const staffName = staff.full_name || staff.email;
  const staffRole = formatRole(staff.role);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadCaseActionCount() {
      try {
        const response = await fetch("/api/command-center/cases", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          counts?: { actionable?: number };
        };
        if (!cancelled) {
          const count = Number(payload.counts?.actionable || 0);
          setCaseActionCount(Number.isFinite(count) && count > 0 ? count : 0);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Command Center case navigation count failed:", error);
        }
      }
    }

    void loadCaseActionCount();
    const interval = window.setInterval(loadCaseActionCount, 60_000);
    window.addEventListener("focus", loadCaseActionCount);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadCaseActionCount);
    };
  }, [pathname]);

  async function handleSignOut() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      await fetch("/api/command-center/session-event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event: "logout" }),
      }).catch(() => null);
    }

    await supabase.auth.signOut();
    router.push("/command-center/login");
    router.refresh();
  }

  return (
    <main className="h-screen overflow-hidden bg-white text-[#0F172A]">
      <div className="mx-auto flex h-screen w-full max-w-[calc(100vw-32px)] overflow-hidden bg-white">
        <aside className="hidden h-screen w-[236px] shrink-0 overflow-hidden border-r border-slate-200 bg-white px-3 py-6 text-slate-950 lg:flex lg:flex-col">
          <div className="rounded-[24px] bg-white px-2 py-3">
            <Image
              src="/logo.png"
              alt="AvenueBoard"
              width={238}
              height={52}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="mt-6 px-1.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Command Center
            </p>
          </div>

          <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto max-[900px]:mt-4 max-[900px]:space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/command-center"
                  ? pathname === "/command-center"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold transition max-[900px]:min-h-11 max-[900px]:text-[14px] ${
                    active
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.label === "Cases" && caseActionCount > 0 ? (
                    <span className="ml-auto inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[11px] font-medium text-red-700 transition duration-150 ease-out">
                      {caseActionCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div ref={accountMenuRef} className="relative pt-3">
            {accountMenuOpen ? (
              <div
                id={menuId}
                role="menu"
                aria-label="Staff account"
                className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 outline-none transition hover:bg-slate-50 hover:text-red-700 focus:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  Sign out
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="grid w-full grid-cols-[36px_minmax(0,1fr)_16px] items-center gap-3 rounded-2xl px-2 py-2 text-left outline-none transition hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-slate-200/70"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-controls={accountMenuOpen ? menuId : undefined}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-[12px] font-semibold text-white">
                {getInitials(staffName)}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-snug text-slate-950">
                  {staffName}
                </span>
                <span className="mt-0.5 block text-[12px] font-normal leading-tight text-slate-500">
                  {staffRole}
                </span>
              </span>
              <ChevronUp
                className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                  accountMenuOpen ? "rotate-180" : ""
                }`}
                strokeWidth={2}
              />
            </button>
          </div>
        </aside>

        <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 lg:px-8">
            {hidePageTitle ? null : (
              <div className="mb-6 min-w-0">
                <h1 className="truncate text-[22px] font-semibold tracking-[-0.05em] text-slate-950">
                  {activeItem.label}
                </h1>
              </div>
            )}
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "A").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}
