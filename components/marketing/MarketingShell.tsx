"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MarketingFooter } from "./MarketingFooter";

type MarketingHeaderPage =
  | "landing"
  | "avenue-perks"
  | "credit-building"
  | "help-center";

type MarketingHeaderProps = {
  activePage?: MarketingHeaderPage;
  variant?: "marketing" | "platform" | "perks" | "legal";
  activeNav?:
    | "platform"
    | "rent-tools"
    | "company"
    | "perks"
    | "avenue-perks"
    | "credit-building"
    | "legal"
    | "trust";
};

type MarketingAuthUser = {
  name: string;
  email: string;
  initials: string;
  hasLandlord: boolean;
  hasTenant: boolean;
};

let cachedMarketingAuthUser: MarketingAuthUser | null = null;
let cachedMarketingAuthInitialized = false;

const landingNavItems = [
  { label: "Rental Properties", href: "#rental-properties" },
  { label: "Residents", href: "#residents" },
  { label: "Avenue Perks", href: "#avenue-perks" },
  { label: "Pricing", href: "#pricing" },
];

const publicNavItems = [
  { id: "avenue-perks", label: "Avenue Perks", href: "/avenue-perks" },
  { id: "credit-building", label: "Credit Building", href: "/credit-building" },
] as const;

const platformNavItems = [
  { id: "platform", label: "Platform", href: "/platform?section=platform" },
  { id: "rent-tools", label: "Rent Tools", href: "/platform?section=rent-tools" },
  { id: "company", label: "Company", href: "/platform?section=company" },
  { id: "perks", label: "Perks", href: "/perks?section=avenue-perks" },
] as const;

const perksNavItems = [
  {
    id: "avenue-perks",
    label: "Avenue Perks",
    href: "/perks?section=avenue-perks",
  },
  {
    id: "credit-building",
    label: "Credit Building",
    href: "/perks?section=credit-building",
  },
  { id: "platform", label: "Platform", href: "/platform?section=platform" },
] as const;

const legalNavItems = [
  { id: "legal", label: "Legal", href: "/legal?section=terms-of-service" },
  { id: "trust", label: "Trust", href: "/legal?section=security" },
] as const;

export function MarketingHeader({
  activePage = "landing",
  variant = "marketing",
  activeNav,
}: MarketingHeaderProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [authUser, setAuthUser] = useState<MarketingAuthUser | null>(
    cachedMarketingAuthUser
  );
  const [authLoading, setAuthLoading] = useState(
    !cachedMarketingAuthInitialized
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = activePage === "landing";
  const isMarketing = variant === "marketing";
  const usesPlatformShell = variant === "platform";
  const primaryNavItems =
    variant === "platform"
      ? platformNavItems
      : variant === "perks"
      ? perksNavItems
      : variant === "legal"
      ? legalNavItems
      : publicNavItems;

  useEffect(() => {
    let mounted = true;

    async function loadAuthUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          cachedMarketingAuthUser = null;
          cachedMarketingAuthInitialized = true;
          setAuthUser(null);
          setAuthLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .eq("user_id", user.id)
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
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "User";
        const email = profile?.email || user.email || "";
        const roleList = (roles || []).map((item) => String(item.role));

        const nextAuthUser = {
          name,
          email,
          initials: getInitials(name || email),
          hasLandlord: roleList.includes("landlord"),
          hasTenant: Boolean(tenantAccess?.length) || roleList.includes("tenant"),
        };

        cachedMarketingAuthUser = nextAuthUser;
        cachedMarketingAuthInitialized = true;
        setAuthUser(nextAuthUser);
      } catch (error) {
        console.warn("Marketing header auth load warning:", error);
        if (mounted && !cachedMarketingAuthInitialized) setAuthUser(null);
      } finally {
        if (mounted) {
          cachedMarketingAuthInitialized = true;
          setAuthLoading(false);
        }
      }
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        cachedMarketingAuthUser = null;
        cachedMarketingAuthInitialized = true;
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        loadAuthUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }

      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    cachedMarketingAuthUser = null;
    cachedMarketingAuthInitialized = true;
    setAuthUser(null);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-white/72 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-10 xl:gap-14">
          <Link href="/" className="-ml-1 flex items-center">
            <img src="/logo.png" alt="AvenueBoard" className="h-9 w-auto" />
          </Link>

          <nav className="hidden items-center gap-8 xl:gap-10 lg:flex">
            {isMarketing && isLanding
              ? landingNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-[15px] font-medium text-[#4B4E5A] transition-colors hover:text-black"
                  >
                    {item.label}
                  </Link>
                ))
              : primaryNavItems.map((item) => {
                  const active =
                    variant === "marketing"
                      ? activePage === item.id
                      : activeNav === item.id;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-[15px] font-medium transition-colors ${
                        active
                          ? "text-black"
                          : "text-[#4B4E5A] hover:text-black"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
          </nav>
        </div>

        <div className="hidden items-center gap-5 xl:gap-6 lg:flex">
          <Link
            href="/help-center"
            className={`text-[15px] font-medium transition-colors ${
              activePage === "help-center"
                ? "text-black"
                : "text-[#4B4E5A] hover:text-black"
            }`}
          >
            Help Center
          </Link>

          {authLoading ? (
            <MarketingHeaderAuthSkeleton />
          ) : authUser ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition hover:bg-zinc-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F172A] text-[13px] font-semibold text-white">
                  {authUser.initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[230px] truncate text-[14px] font-semibold text-zinc-950 xl:max-w-[250px]">
                    {authUser.name || authUser.email}
                  </span>
                  <span className="block max-w-[230px] truncate text-[12px] text-zinc-500 xl:max-w-[250px]">
                    {authUser.email}
                  </span>
                </span>
                <ChevronDown size={15} className="text-zinc-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[56px] z-50 w-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-zinc-200 px-4 py-4">
                    <p className="truncate text-[14px] font-semibold text-zinc-900">
                      {authUser.name || authUser.email}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-zinc-500">
                      {authUser.email}
                    </p>
                  </div>
                  {authUser.hasTenant && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/tenant");
                      }}
                      className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Resident Board
                    </button>
                  )}
                  {authUser.hasLandlord && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/dashboard");
                      }}
                      className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Landlord Board
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/help-center");
                    }}
                    className="flex h-11 w-full items-center px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Help Center
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex h-11 w-full items-center border-t border-zinc-200 px-4 text-[13px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[15px] font-medium text-[#4B4E5A] transition-colors hover:text-black"
              >
                {isLanding || usesPlatformShell ? "Log In" : "Sign In"}
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#0F172A] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-all hover:bg-[#1E293B]"
              >
                {isLanding || usesPlatformShell ? "Get Started" : "Create Account"}
                {isLanding && <ArrowRight size={16} />}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MarketingHeaderAuthSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-[248px] items-center justify-end gap-3"
    >
      <span className="h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
      <span className="hidden w-[150px] space-y-2 sm:block">
        <span className="block h-3 w-[130px] animate-pulse rounded-full bg-zinc-100" />
        <span className="block h-2.5 w-[105px] animate-pulse rounded-full bg-zinc-100" />
      </span>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "AB").toUpperCase();
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}
