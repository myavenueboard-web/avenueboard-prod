"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Play,
  Sparkles,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

const productTabs = [
  {
    label: "Landlord Board",
    title: "Manage every rental from one clean view.",
    description:
      "Track properties, residents, rent status, lease details, notes, and documents without jumping between spreadsheets, folders, and text threads.",
    link: "Explore rental properties",
    href: "#rental-properties",
    stats: ["Rent status", "Lease details", "Resident profile", "Documents"],
  },
  {
    label: "Resident Board",
    title: "Give residents a simple place to stay connected.",
    description:
      "Residents can view rent details, payment history, lease information, shared notes, documents, and important updates from one modern workspace.",
    link: "Explore resident experience",
    href: "#residents",
    stats: ["Amount due", "Payment progress", "Lease status", "Property contact"],
  },
  {
    label: "Ava Assistant",
    title: "Built-in support when users need help.",
    description:
      "Ava helps answer questions, guide users through the platform, and prepare support cases when something needs your team’s attention.",
    link: "Explore Ava Assistant",
    href: "#ava-support",
    stats: ["Instant answers", "Case creation", "Help Center", "Guided support"],
  },
];

const whyItems = [
  "Built for individual landlords, small portfolios, and property managers",
  "Free for landlords and managers with no monthly subscription",
  "Simple enough for one property and organized enough for growing portfolios",
  "Designed for both sides: landlords, managers, and residents",
  "More affordable than traditional property management platforms",
];

function HeroSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-16">
      <style jsx>{`
        @keyframes avenueTrustTextWave {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .trust-gradient-text {
          background-image: linear-gradient(
            110deg,
            #059669,
            #d97706,
            #7c3aed,
            #059669
          );
          background-size: 220% 220%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: avenueTrustTextWave 10s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .trust-gradient-text {
            animation: none;
          }
        }
      `}</style>
      <div className="pt-32 text-center lg:pt-40">
        <div className="mx-auto max-w-[880px]">
          <p className="mb-8 text-[20px] font-medium tracking-[-0.01em] text-[#4B4E5A] sm:text-[22px]">
            Rent, simplified.
          </p>

          <h1 className="text-[54px] font-medium leading-[0.98] tracking-[-0.055em] text-black sm:text-[72px]">
            Manage rentals.
            <br />
            Without the chaos.
          </h1>

          <p className="mx-auto mt-9 max-w-[700px] text-[18px] leading-[1.65] text-[#555966] sm:text-[20px]">
            Collect rent, manage residents, track lease details, store
            documents, and stay organized from one clean Board.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-4 text-[16px] font-semibold text-white transition-all hover:bg-[#1D4ED8]">
              <Play size={16} fill="currentColor" />
              See How It Works
            </button>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-[17px] font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="trust-gradient-text mx-auto mt-10 flex max-w-[980px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[16px] font-semibold sm:gap-x-7 sm:text-[18px]">
            <span className="whitespace-nowrap">No monthly subscription</span>
            <span className="hidden sm:block">•</span>
            <span className="whitespace-nowrap">
              Always free for landlords and managers
            </span>
            <span className="hidden sm:block">•</span>
            <span className="whitespace-nowrap">Designed for residents</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  const [activeTab, setActiveTab] = useState(0);
  const active = productTabs[activeTab];

  return (
    <section
      id="rental-properties"
      className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[880px] text-center">
        <p className="text-[17px] font-medium text-[#555966]">
          One connected platform
        </p>

        <h2 className="mt-6 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[56px]">
          A rental workspace for both sides of the lease.
        </h2>

        <p className="mx-auto mt-6 max-w-[700px] text-[18px] leading-[1.65] text-[#555966]">
          AvenueBoard brings properties, residents, payments, documents, and
          support into one calm product experience.
        </p>
      </div>

      <div className="mx-auto mt-12 flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
        {productTabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={`whitespace-nowrap rounded-full px-6 py-3 text-[15px] font-medium transition-all ${
              activeTab === index
                ? "bg-white text-black shadow-sm"
                : "text-[#555966] hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-[1080px] overflow-hidden rounded-[34px] border border-zinc-200 bg-white shadow-sm lg:grid-cols-[1.35fr_0.65fr]">
        <div className="min-h-[440px] bg-gradient-to-br from-zinc-50 to-white p-6 sm:p-8">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-[#6B6F7B]">
                  AvenueBoard
                </p>

                <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-zinc-950">
                  {active.label}
                </h3>
              </div>

              <span className="rounded-full bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700">
                Ready
              </span>
            </div>

            <div className="mt-8 grid gap-4">
              {active.stats.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Check size={18} className="text-zinc-900" />
                    <span className="text-[15px] font-medium text-[#4B4E5A]">
                      {item}
                    </span>
                  </div>

                  <span className="text-[14px] text-zinc-400">Connected</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 p-8 lg:border-l lg:border-t-0">
          <div className="inline-flex rounded-full bg-white p-3 shadow-sm">
            <Sparkles size={22} className="text-zinc-900" />
          </div>

          <h3 className="mt-6 text-[28px] font-semibold tracking-[-0.035em] text-zinc-950">
            {active.title}
          </h3>

          <p className="mt-4 text-[17px] leading-[1.65] text-[#555966]">
            {active.description}
          </p>

          <Link
            href={active.href}
            className="mt-8 inline-flex items-center gap-2 text-[16px] font-semibold text-zinc-950 transition-colors hover:text-zinc-700"
          >
            {active.link}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function AvenuePerksSection() {
  return (
    <section
      id="avenue-perks"
      className="mt-32 w-full bg-[#F6F7F9]"
    >
      <div className="mx-auto grid min-h-[640px] max-w-[1600px] gap-16 px-6 py-20 sm:px-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-16 lg:py-24">
        <div className="max-w-[610px]">
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-[#6B4A3A]">
            Avenue Perks
          </p>

          <h2 className="mt-5 text-[46px] font-medium leading-[1.02] tracking-[-0.055em] text-black sm:text-[64px]">
            Make every rental journey more rewarding.
          </h2>

          <p className="mt-8 max-w-[600px] text-[18px] leading-[1.7] text-[#555966]">
            Avenue Perks gives landlords and residents access to exclusive
            partner savings on everyday essentials, dining, travel, shopping,
            home services, and more — included as part of the AvenueBoard
            experience.
          </p>

          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.65] text-[#555966]">
            Whether you manage a rental or live in one, Avenue Perks adds real
            value beyond rent.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/avenue-perks"
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#6B4A3A] px-8 text-[15px] font-semibold text-white transition hover:bg-[#7A5544]"
            >
              Explore Avenue Perks
            </Link>
            <p className="max-w-[300px] text-[14px] font-medium leading-6 text-[#6B6F7B]">
              Included for AvenueBoard users.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] ring-1 ring-zinc-200/80 lg:min-h-[500px]">
          <div className="w-[920px] max-w-none p-7">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
              <div className="flex items-center gap-8 text-[14px] font-semibold text-[#555966]">
                {["Home", "All Deals", "Food & Dining", "Travel", "Shopping"].map(
                  (item, index) => (
                    <span
                      key={item}
                      className={
                        index === 0
                          ? "text-zinc-950 underline decoration-zinc-950 underline-offset-[14px]"
                          : ""
                      }
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>

              <div className="flex h-11 w-[230px] items-center rounded-full border border-zinc-200 px-4 text-[13px] font-medium text-zinc-400">
                Search rewards
              </div>
            </div>

            <div className="pt-9">
              <h3 className="max-w-[520px] text-[48px] font-semibold leading-[1.02] tracking-[-0.065em] text-zinc-950">
                Exclusive savings.
                <br />
                Built into AvenueBoard.
              </h3>

              <p className="mt-5 text-[15px] font-medium leading-7 text-[#607086]">
                Explore partner offers and member benefits from trusted
                providers.
              </p>
            </div>

            <div className="mt-10 flex items-end justify-between">
              <div>
                <h4 className="text-[24px] font-semibold tracking-[-0.045em] text-zinc-950">
                  Partner Deals
                </h4>
                <p className="mt-2 text-[14px] font-medium text-[#6B6F7B]">
                  A preview of resident and landlord savings.
                </p>
              </div>
              <span className="pr-10 text-[14px] font-semibold text-zinc-950">
                View all deals →
              </span>
            </div>

            <div className="mt-6 grid w-[1040px] grid-cols-4 gap-5">
              {[
                ["Dining", "Food and delivery savings."],
                ["Travel", "Rates for trips and stays."],
                ["Shopping", "Everyday partner offers."],
                ["Home", "Services for move-in needs."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.045)]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4ECE6] text-[13px] font-bold text-[#6B4A3A]">
                    {title.slice(0, 2)}
                  </div>
                  <h5 className="mt-5 text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                    {title}
                  </h5>
                  <p className="mt-2 min-h-12 text-[14px] leading-6 text-[#607086]">
                    {description}
                  </p>
                  <div className="mt-5 flex h-10 items-center justify-center rounded-xl bg-[#6B4A3A] text-[13px] font-semibold text-white">
                    View Deal →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreditBuildingSection() {
  return (
    <section
      id="credit-building"
      className="mx-auto mt-24 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[34px] border border-zinc-200 bg-zinc-50 p-8 lg:p-10">
          <div className="inline-flex rounded-full bg-white p-3 text-zinc-950 shadow-sm">
            <CreditCard size={24} />
          </div>

          <h2 className="mt-8 text-[38px] font-medium leading-[1.1] tracking-[-0.045em] text-black sm:text-[48px]">
            Rent payments should work harder for residents.
          </h2>

          <p className="mt-6 text-[17px] leading-[1.65] text-[#555966]">
            AvenueBoard is preparing partner-enabled credit-building
            opportunities designed to help residents turn on-time rent payment
            behavior into something more useful over time.
          </p>

          <p className="mt-5 text-[15px] font-medium leading-6 text-[#6A6E7A]">
            Credit-building features are planned and partner-enabled. AvenueBoard
            will not claim direct bureau reporting until supported integrations
            are live.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            ["Coming soon", "Partner-enabled credit-building opportunities"],
            ["Resident-first", "Designed around on-time rent payment behavior"],
            ["Transparent", "Clear positioning before any feature goes live"],
          ].map(([label, text]) => (
            <div
              key={label}
              className="rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm"
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                {label}
              </p>
              <p className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-zinc-950">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyAvenueBoardSection() {
  return (
    <section
      id="why"
      className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[860px] text-center">
        <p className="text-[17px] font-medium text-[#555966]">
          Why AvenueBoard
        </p>
        <h2 className="mt-6 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[56px]">
          Built for everyone managing rentals - not just enterprise teams.
        </h2>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-5">
        {whyItems.map((item, index) => (
          <div
            key={item}
            className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-[14px] font-semibold text-white">
              {index + 1}
            </span>
            <p className="mt-6 text-[16px] font-medium leading-7 text-[#4B4E5A]">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section className="mx-auto mt-32 max-w-[1600px] px-6 sm:px-10 lg:px-16">
      <div className="grid w-full gap-6 py-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-20">
        <h2 className="max-w-[420px] text-[34px] font-semibold leading-[1.05] tracking-[-0.045em] text-zinc-950 sm:text-[42px]">
          Stay in the loop.
          <br />
          Get updates first.
        </h2>

        <div className="w-full lg:pr-8">
          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Email address"
              className="h-[54px] flex-1 rounded-[18px] border border-zinc-300 bg-white px-5 text-[15px] font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
            />
            <button
              type="submit"
              className="h-[54px] rounded-[18px] bg-[#0F172A] px-7 text-[15px] font-semibold text-white transition hover:bg-[#1E293B] sm:min-w-[146px]"
            >
              Join Updates
            </button>
          </form>

          <p className="mt-4 text-[13px] leading-6 text-[#6B6F7B]">
            By signing up, you agree to receive product updates, feature
            announcements, Avenue Perks updates, and occasional marketing
            messages from AvenueBoard. You can unsubscribe at any time.
          </p>

          <p className="mt-2 text-[13px] leading-6 text-[#6B6F7B]">
            Your subscription is subject to the{" "}
            <Link
              href="/terms"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition hover:text-black"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition hover:text-black"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="mx-auto mt-24 max-w-[1600px] px-6 pb-32 sm:px-10 lg:px-16">
      <div className="rounded-[40px] bg-[#0F172A] px-8 py-16 text-center text-white lg:px-12">
        <h2 className="mx-auto max-w-[820px] text-[42px] font-medium leading-[1.05] tracking-[-0.05em] sm:text-[60px]">
          Ready to stop managing rent from memory?
        </h2>

        <p className="mx-auto mt-6 max-w-[680px] text-[18px] leading-[1.65] text-slate-300">
          Start organizing rent, leases, residents, documents, and payments from
          one clean workspace.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[16px] font-semibold text-[#0F172A] transition hover:bg-zinc-100"
          >
            Get Started Free
            <ArrowRight size={17} />
          </Link>

          <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-[16px] font-semibold text-white transition hover:bg-white/10">
            <Play size={16} fill="currentColor" />
            See How It Works
          </button>
        </div>
      </div>
    </section>
  );
}

export default function LatestLandingPage() {
  return (
    <MarketingShell>
      <HeroSection />
      <PlatformSection />
      <AvenuePerksSection />
      <CreditBuildingSection />
      <WhyAvenueBoardSection />
      <NewsletterSection />
      <FinalCtaSection />
    </MarketingShell>
  );
}
