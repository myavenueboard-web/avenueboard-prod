"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  CreditCard,
  Database,
  Eye,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const navItems = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Email Tracking", href: "/admin/marketing", icon: Mail },
  { name: "Email Preview", href: "/admin/email-preview", icon: Eye },
  { name: "Records", href: "/admin/audience", icon: Database },
  { name: "Payments", href: "/admin/reports", icon: CreditCard },
  { name: "Support", href: "/admin/support", icon: LifeBuoy },
  { name: "System Health", href: "/admin/ideas", icon: Activity },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    async function checkAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id, email, status")
        .eq("email", user.email)
        .eq("status", "active")
        .maybeSingle();

      if (!adminUser) {
        router.push("/dashboard");
        return;
      }

      setAdminEmail(user.email);
      setAllowed(true);
      setChecking(false);
    }

    checkAdminAccess();
  }, [router]);

  const activeSection = useMemo(() => {
    return (
      navItems.find((item) =>
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href)
      )?.name || "Command Center"
    );
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-600 shadow-sm">
          Checking admin access...
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-zinc-950">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-5">
          <Link href="/admin" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Production
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <button
            onClick={() => setProfileOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Admin</p>
              <p className="truncate text-xs text-zinc-500">{adminEmail}</p>
            </div>
            <ChevronDown
              size={14}
              className={`text-zinc-400 transition ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {profileOpen ? (
            <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} />
                Log Out
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              AvenueBoard Command Center
            </p>
            <p className="text-xs text-zinc-500">{activeSection}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-[320px] items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-400 lg:flex">
              <Search size={15} />
              Search records, cases, emails...
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600">
              <ShieldCheck size={15} className="text-emerald-600" />
              Admin
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
