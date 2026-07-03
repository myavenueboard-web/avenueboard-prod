"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import { supabase } from "@/lib/supabase";

type Deal = {
  name: string;
  logo: string;
  logoClass: string;
  description: string;
  category: string;
};

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
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setAuthenticated(Boolean(user));
      setAuthChecked(true);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const locked = authChecked && !authenticated;

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader activePage="avenue-perks" />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-7 px-5 sm:px-7 lg:px-16">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max items-center gap-10">
              {categories.map((category, index) => (
                <button
                  key={category}
                  type="button"
                  className={`relative h-16 whitespace-nowrap text-[15px] font-medium transition ${
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

          <label className="hidden h-11 w-[320px] shrink-0 items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 text-zinc-500 shadow-[0_8px_28px_rgba(15,23,42,0.035)] lg:flex">
            <Search size={18} strokeWidth={2} />
            <input
              type="search"
              placeholder="Search rewards"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[1600px] flex-1 px-5 pb-14 pt-9 sm:px-7 lg:px-16">
        <div
          className={`relative ${
            locked ? "pointer-events-none select-none blur-[2px]" : ""
          }`}
        >
          <div className="relative overflow-hidden">
            <div>
              <h1 className="max-w-[780px] text-[46px] font-semibold leading-[1.04] tracking-[-0.075em] text-slate-950 sm:text-[58px]">
                Exclusive savings.
                <br />
                Because you&apos;re on track.
              </h1>

              <p className="mt-5 max-w-[570px] text-[16px] font-medium leading-8 text-slate-600">
                Explore special offers and member benefits from trusted partners.
              </p>
            </div>

            <div className="pointer-events-none absolute right-16 top-1 hidden h-44 w-52 lg:block">
              <span className="absolute right-10 top-0 text-[42px] leading-none text-[#6B4A3A]">
                ✦
              </span>
              <span className="absolute left-4 top-24 text-[22px] leading-none text-[#D7C2B2]">
                ✦
              </span>
              <span className="absolute right-36 top-32 text-[15px] leading-none text-[#D7C2B2]">
                ✦
              </span>
            </div>
          </div>

          <div className="mt-10 flex items-end justify-between gap-7">
            <div>
              <h2 className="text-[29px] font-semibold tracking-[-0.055em] text-slate-950">
                Partner Deals
              </h2>
              <p className="mt-1.5 text-[14.5px] font-medium text-zinc-500">
                Exclusive offers from trusted AvenueBoard partners.
              </p>
            </div>

            <button
              type="button"
              className="hidden items-center gap-2 text-[14.5px] font-semibold text-slate-950 transition hover:text-zinc-600 sm:inline-flex"
            >
              View all deals <span className="text-[18px]">→</span>
            </button>
          </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {partnerDeals.map((deal) => (
            <article
              key={deal.name}
              className="group rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.032)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.07)]"
            >
              <div className="flex min-h-[84px] items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] text-[16px] font-bold ${deal.logoClass}`}
                >
                  {deal.logo}
                </div>

                <div className="min-w-0 pt-0.5">
                  <h3 className="truncate text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
                    {deal.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-6 text-slate-600">
                    {deal.description}
                  </p>
                </div>
              </div>

              <span className="mt-4 inline-flex h-8 items-center rounded-full bg-zinc-100 px-3.5 text-[12px] font-semibold text-zinc-600">
                {deal.category}
              </span>

              <button
                type="button"
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6B4A3A] text-[13.5px] font-semibold text-white transition hover:bg-[#7A5544]"
              >
                View Deal <span>→</span>
              </button>

              <p className="mt-3.5 text-[12px] font-medium text-zinc-400">
                Terms apply.
              </p>
            </article>
          ))}
          </div>
        </div>

        {locked && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/25 px-4 pt-24">
            <div className="w-full max-w-[640px] rounded-[34px] border border-zinc-200 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:px-12">
              <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.06em] text-slate-950">
                Exclusive to AvenueBoard users.
              </h2>
              <p className="mx-auto mt-4 max-w-[440px] text-[16px] font-medium leading-7 text-slate-600">
                Create an account or sign in to access this member benefit.
              </p>
              <p className="mx-auto mt-3 max-w-[360px] text-[13.5px] font-medium leading-6 text-zinc-500">
                Always free to open. No card required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0F172A] px-7 text-[14px] font-semibold text-white transition hover:bg-[#1E293B]"
                >
                  Create Account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-7 text-[14px] font-semibold text-slate-950 transition hover:bg-zinc-50"
                >
                  Sign In
                </Link>
              </div>
              <Link
                href="/latest-landing#avenue-perks"
                className="mt-6 inline-flex text-[14px] font-semibold text-slate-500 transition hover:text-slate-950"
              >
                Learn More
              </Link>
            </div>
          </div>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
