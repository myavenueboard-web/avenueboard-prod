"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  LifeBuoy,
  BarChart3,
  Lightbulb,
  FileText,
  ChevronDown,
  Settings,
  LogOut,
  User,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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
        .select("*")
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navItems = [
    { name: "Command Center", href: "/admin", icon: LayoutDashboard },
    { name: "Master Audience", href: "/admin/audience", icon: Users },
    { name: "Support Center", href: "/admin/support", icon: LifeBuoy },
    { name: "Marketing Analytics", href: "/admin/marketing", icon: BarChart3 },
    { name: "Future Scope", href: "/admin/ideas", icon: Lightbulb },
    { name: "Reports", href: "/admin/reports", icon: FileText },
  ];

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f5f6]">
        <div className="rounded-2xl border border-[#eadde1] bg-white px-6 py-4 text-sm text-neutral-600 shadow-sm">
          Checking admin access...
        </div>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f5f6] text-neutral-950">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#eadde1] bg-white">
        <div className="flex h-[120px] items-center justify-center">
          <Link href="/admin">
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="mt-[110px] flex flex-col gap-3 px-5">
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
                className={`flex items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-[14px] font-medium transition ${
                  active
                    ? "bg-[#CA6180]/10 text-[#CA6180]"
                    : "text-neutral-600 hover:bg-[#CA6180]/10 hover:text-[#CA6180]"
                }`}
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto border-t border-[#eadde1] p-4">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#f8f5f6] px-3 py-3 text-left transition hover:bg-[#CA6180]/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CA6180]/10 text-sm font-semibold text-[#CA6180]">
              A
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-950">
                Admin
              </p>
              <p className="truncate text-xs text-neutral-500">
                {adminEmail}
              </p>
            </div>

            <ChevronDown
              size={15}
              className={`text-neutral-400 transition ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute bottom-[82px] left-4 right-4 rounded-2xl border border-[#eadde1] bg-white p-2 shadow-xl">
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-100"
              >
                <User size={16} />
                Profile Settings
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-100"
              >
                <Settings size={16} />
                Admin Settings
              </Link>

              <div className="my-2 border-t border-[#eadde1]" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-500 transition hover:bg-red-50"
              >
                <LogOut size={16} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}