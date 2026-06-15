"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PerksUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  hasLandlordRole: boolean;
  hasTenantAccess: boolean;
};


const productTabs = [
  { label: "Avenue Perks", href: "/avenue-perks" },
  { label: "Credit Building", href: "/credit-building" },
];

const categories = [
  "Home",
  "All Deals",
  "Food & Dining",
  "Travel",
  "Shopping",
  "Entertainment",
  "Wellness",
  "Tech",
  "Auto",
  "Kids",
  "Finance",
];

export default function AvenuePerksPage() {
  const router = useRouter();
  const [user, setUser] = useState<PerksUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .eq("user_id", authUser.id)
          .maybeSingle();

        const profileId = profile?.id || "";

        const [{ data: roles }, { data: tenantAccess }] = await Promise.all([
          profileId
            ? supabase.from("user_roles").select("role").eq("profile_id", profileId)
            : Promise.resolve({ data: [] }),
          profileId
            ? supabase
                .from("tenant_access")
                .select("id")
                .eq("tenant_profile_id", profileId)
                .eq("invite_status", "accepted")
                .limit(1)
            : Promise.resolve({ data: [] }),
        ]);

        const name =
          profile?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "User";

        const email = profile?.email || authUser.email || "";

        setUser({
          id: authUser.id,
          name,
          email,
          initials: getInitials(name || email),
          hasLandlordRole: (roles || []).some((item) => item.role === "landlord"),
          hasTenantAccess: (tenantAccess || []).length > 0,
        });
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfileMenuOpen(false);
  }

  const dashboardItems = getDashboardItems(user);

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-[56px]">
          <div className="flex items-center gap-12">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center"
              aria-label="AvenueBoard home"
            >
              <Image
                src="/logo.png"
                alt="AvenueBoard"
                width={172}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </button>
      
            <nav className="hidden items-center gap-10 md:flex" aria-label="AvenueBoard sections">
              {productTabs.map((tab) => {
                const active = tab.href === "/credit-building";
      
                return (
                  <button
                    key={tab.href}
                    type="button"
                    onClick={() => router.push(tab.href)}
                    className={`text-[14px] font-semibold transition ${
                      active
                        ? "text-slate-950"
                        : "text-zinc-600 hover:text-slate-950"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
      
          <div className="ml-auto flex items-center gap-4">
            {loadingUser ? (
              <div className="h-10 w-32 animate-pulse rounded-2xl bg-zinc-100" />
            ) : user ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((value) => !value)}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-zinc-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-800">
                    {user.initials}
                  </span>
                  <span className="hidden max-w-[180px] truncate text-[13px] font-semibold text-slate-900 sm:block">
                    {user.name}
                  </span>
                  <span className="text-zinc-400">⌄</span>
                </button>
      
                {profileMenuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-[240px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-zinc-100 px-3 py-3">
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-zinc-500">
                        {user.email}
                      </p>
                    </div>
      
                    {dashboardItems.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          router.push(item.href);
                        }}
                        className="mt-1 w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        {item.label}
                      </button>
                    ))}
      
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl px-3 py-3 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="h-10 rounded-2xl px-4 text-[13px] font-semibold text-slate-800 transition hover:bg-zinc-50"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-slate-950 transition hover:bg-zinc-50"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1680px] flex-1 px-6 py-20">
  <div className="rounded-[32px] border border-zinc-200 bg-zinc-50/40 p-12">
    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      Coming Soon
    </p>

    <h1 className="mt-4 text-[48px] font-medium tracking-[-0.08em] text-slate-950">
      Credit Building
    </h1>

    <p className="mt-4 max-w-[700px] text-[16px] leading-8 text-slate-600">
      Report rent payments, build credit history, and track your progress
      directly from AvenueBoard.
    </p>
  </div>
</section>

      <footer className="mx-auto flex w-full max-w-[1680px] shrink-0 items-center justify-center border-t border-zinc-200 px-4 pb-6 pt-4 text-[12.5px] font-medium text-zinc-500 sm:px-6 lg:px-8">
        <div className="flex flex-nowrap items-center justify-center gap-2.5 leading-none">
          <span>© 2026</span>
          <Image
            src="/logo.png"
            alt="AvenueBoard"
            width={98}
            height={18}
            className="h-[18px] w-auto"
          />
          <span className="text-zinc-300">·</span>
          <span>All rights reserved.</span>
          <span className="text-zinc-300">·</span>
          <button
            type="button"
            onClick={() => router.push("/privacy")}
            className="hover:text-slate-950"
          >
            Privacy Policy
          </button>
          <span className="text-zinc-300">·</span>
          <button
            type="button"
            onClick={() => router.push("/terms")}
            className="hover:text-slate-950"
          >
            Terms of Service
          </button>
        </div>
      </footer>
    </main>
  );
}

function getDashboardItems(user: PerksUser | null) {
  if (!user) return [];

  const items: { label: string; href: string }[] = [];

  if (user.hasLandlordRole) {
    items.push({ label: "Landlord Portal", href: "/dashboard" });
  }

  if (user.hasTenantAccess) {
    items.push({ label: "Tenant Portal", href: "/tenant" });
  }

  return items.length ? items : [{ label: "Select Mode", href: "/select-mode" }];
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (value[0] || "U").toUpperCase();
}