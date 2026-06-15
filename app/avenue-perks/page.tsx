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

type Deal = {
  name: string;
  logo: string;
  logoClass: string;
  description: string;
  category: string;
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

const partnerDeals: Deal[] = [
  {
    name: "DoorDash",
    logo: "D",
    logoClass: "bg-red-50 text-red-600",
    description: "Save up to 15% off your next order.",
    category: "Food & Dining",
  },
  {
    name: "Uber",
    logo: "Uber",
    logoClass: "bg-zinc-950 text-white",
    description: "Save up to 15% on rides.",
    category: "Travel",
  },
  {
    name: "Starbucks",
    logo: "★",
    logoClass: "bg-emerald-50 text-emerald-700",
    description: "Earn rewards faster with member perks.",
    category: "Food & Drinks",
  },
  {
    name: "Booking.com",
    logo: "B.",
    logoClass: "bg-blue-50 text-blue-700",
    description: "Save up to 20% on stays worldwide.",
    category: "Travel",
  },
  {
    name: "Nike",
    logo: "Nike",
    logoClass: "bg-zinc-100 text-zinc-950",
    description: "Up to 20% off select styles.",
    category: "Shopping",
  },
  {
    name: "Hulu",
    logo: "hulu",
    logoClass: "bg-green-50 text-green-600",
    description: "Get up to 20% off your plan.",
    category: "Entertainment",
  },
  {
    name: "Walmart+",
    logo: "✦",
    logoClass: "bg-sky-50 text-sky-600",
    description: "Members save more every day.",
    category: "Shopping",
  },
  {
    name: "adidas",
    logo: "adidas",
    logoClass: "bg-zinc-100 text-zinc-950",
    description: "Up to 20% off sitewide.",
    category: "Shopping",
  },
  {
    name: "Instacart+",
    logo: "●",
    logoClass: "bg-orange-50 text-orange-500",
    description: "Get $10 off your first 3 orders.",
    category: "Groceries",
  },
  {
    name: "iHerb",
    logo: "iHerb",
    logoClass: "bg-lime-50 text-lime-700",
    description: "Up to 10% off wellness essentials.",
    category: "Wellness",
  },
  {
    name: "Lowe's",
    logo: "Lowe's",
    logoClass: "bg-blue-50 text-blue-800",
    description: "Save up to 10% on home improvement.",
    category: "Home",
  },
  {
    name: "Chevron",
    logo: "CV",
    logoClass: "bg-red-50 text-red-700",
    description: "Save up to 10¢/gal on fuel.",
    category: "Auto",
  },
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
          const active = tab.href === "/avenue-perks";

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

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center gap-6 px-4 sm:px-6 lg:px-[56px]">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-9">
              {categories.map((category, index) => (
                <button
                  key={category}
                  type="button"
                  className={`relative h-15 whitespace-nowrap text-[14px] font-medium transition ${
                    index === 0
                      ? "text-slate-950"
                      : "text-zinc-600 hover:text-slate-950"
                  }`}
                >
                  {category}

                  {index === 0 && (
                    <span className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-950" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="hidden h-10 w-[290px] shrink-0 items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 text-zinc-500 shadow-[0_8px_28px_rgba(15,23,42,0.035)] lg:flex">
            <Search size={17} strokeWidth={2} />
            <input
              type="search"
              placeholder="Search rewards"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-12 pt-7 sm:px-6 lg:px-[56px]">
        <div className="relative overflow-hidden">
          <div>
            <h1 className="max-w-[720px] text-[42px] font-semibold leading-[1.04] tracking-[-0.075em] text-slate-950 sm:text-[52px]">
              Exclusive savings.
              <br />
              Because you&apos;re on track.
            </h1>

            <p className="mt-4 max-w-[520px] text-[15px] font-medium leading-7 text-slate-600">
              Explore special offers and member benefits from trusted partners.
            </p>
          </div>

          <div className="pointer-events-none absolute right-16 top-1 hidden h-40 w-48 lg:block">
            <span className="absolute right-10 top-0 text-[38px] leading-none text-[#6B4A3A]">
              ✦
            </span>
            <span className="absolute left-4 top-22 text-[20px] leading-none text-[#D7C2B2]">
              ✦
            </span>
            <span className="absolute right-34 top-30 text-[14px] leading-none text-[#D7C2B2]">
              ✦
            </span>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.055em] text-slate-950">
              Partner Deals
            </h2>
            <p className="mt-1 text-[13.5px] font-medium text-zinc-500">
              Exclusive offers from trusted AvenueBoard partners.
            </p>
          </div>

          <button
            type="button"
            className="hidden items-center gap-2 text-[13.5px] font-semibold text-slate-950 transition hover:text-zinc-600 sm:inline-flex"
          >
            View all deals <span className="text-[17px]">→</span>
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {partnerDeals.map((deal) => (
            <article
              key={deal.name}
              className="group rounded-[22px] border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.032)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.07)]"
            >
              <div className="flex min-h-[74px] items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-[15px] font-bold ${deal.logoClass}`}
                >
                  {deal.logo}
                </div>

                <div className="min-w-0 pt-0.5">
                  <h3 className="truncate text-[15.5px] font-semibold tracking-[-0.03em] text-slate-950">
                    {deal.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-slate-600">
                    {deal.description}
                  </p>
                </div>
              </div>

              <span className="mt-3 inline-flex h-7 items-center rounded-full bg-zinc-100 px-3 text-[11px] font-semibold text-zinc-600">
                {deal.category}
              </span>

              <button
                type="button"
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6B4A3A] text-[12.5px] font-semibold text-white transition hover:bg-[#7A5544]"
              >
                View Deal <span>→</span>
              </button>

              <p className="mt-3 text-[11.5px] font-medium text-zinc-400">
                Terms apply.
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1480px] shrink-0 items-center justify-center border-t border-zinc-200 px-4 pb-6 pt-4 text-[12.5px] font-medium text-zinc-500 sm:px-6 lg:px-[56px]">
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