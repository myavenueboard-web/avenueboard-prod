import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import { PublicHero } from "@/components/marketing/PublicHero";

const categoryPlaceholders = [
  "Home",
  "Food & Dining",
  "Travel",
  "Shopping",
  "Wellness",
  "Tech",
] as const;

const accessSteps = [
  {
    title: "Create or sign in to your account",
    body: "Avenue Perks is designed as a member benefit for AvenueBoard users.",
  },
  {
    title: "Open the member-benefits area",
    body: "Members can access Avenue Perks and Credit Building from one product area.",
  },
  {
    title: "Explore available benefits",
    body: "Offers and planned benefits may vary by partner, availability, and eligibility.",
  },
] as const;

export default function AvenuePerksMarketingPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-[#0F172A]">
      <MarketingHeader activePage="avenue-perks" />

      <PublicHero
        eyebrow="Avenue Perks"
        title="Member benefits for the rental journey."
        description="Avenue Perks is AvenueBoard's member-benefits experience for resident and rental-life offers, planned partner savings, and future services connected to the AvenueBoard platform."
        primaryAction={{ label: "Create Account", href: "/signup" }}
        secondaryAction={{
          label: "Sign In",
          href: "/login",
          icon: ArrowRight,
          variant: "secondary",
        }}
      />

      <section className="mx-auto max-w-[1600px] px-6 pb-24 sm:px-10 lg:px-16 lg:pb-32">
        <div className="mt-24 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <section className="rounded-[30px] border border-zinc-200 bg-[#F7F6F3] p-8 sm:p-10 lg:p-12">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#7A5A46]">
              What Avenue Perks is
            </p>
            <h2 className="mt-5 max-w-[560px] text-[38px] font-semibold leading-tight tracking-[-0.055em] text-zinc-950 sm:text-[48px]">
              A member-benefits layer built around renting.
            </h2>
            <p className="mt-6 max-w-[620px] text-[16px] font-medium leading-8 text-[#626A76]">
              Avenue Perks gives AvenueBoard users a dedicated place for
              resident-focused benefits, partner-enabled offers, and planned
              services that can support everyday rental life.
            </p>
          </section>

          <section className="rounded-[30px] border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.045)] sm:p-10 lg:p-12">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Benefit categories
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {categoryPlaceholders.map((category) => (
                <div
                  key={category}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-4 text-[15px] font-semibold text-zinc-800"
                >
                  {category}
                </div>
              ))}
            </div>
            <p className="mt-7 text-[14px] font-medium leading-7 text-[#6B7280]">
              Specific offers, partners, and availability may change over time.
              AvenueBoard will present terms and availability inside the member
              experience when benefits are available.
            </p>
          </section>
        </div>

        <section className="mt-20 rounded-[30px] border border-zinc-200 bg-white p-8 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                How access works
              </p>
              <h2 className="mt-5 text-[36px] font-semibold leading-tight tracking-[-0.055em] text-zinc-950 sm:text-[46px]">
                Sign in to view member benefits.
              </h2>
              <p className="mt-5 text-[16px] font-medium leading-8 text-[#626A76]">
                The public page explains Avenue Perks. The actual catalog and
                Credit Building screen live inside the member-benefits product
                area.
              </p>
            </div>

            <div className="grid gap-5">
              {accessSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="grid gap-4 rounded-2xl border border-zinc-200 p-5 sm:grid-cols-[44px_minmax(0,1fr)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-[14px] font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em] text-zinc-950">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] font-medium leading-7 text-[#626A76]">
                      {step.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-8 sm:p-10">
            <h2 className="text-[30px] font-semibold tracking-[-0.05em] text-zinc-950">
              Avenue Perks for residents
            </h2>
            <p className="mt-5 text-[16px] font-medium leading-8 text-[#626A76]">
              Avenue Perks is designed to connect residents with useful rental
              life benefits while keeping access tied to AvenueBoard accounts.
            </p>
          </div>
          <div className="rounded-[30px] border border-zinc-200 bg-white p-8 sm:p-10">
            <h2 className="text-[30px] font-semibold tracking-[-0.05em] text-zinc-950">
              Connected to future resident benefits
            </h2>
            <p className="mt-5 text-[16px] font-medium leading-8 text-[#626A76]">
              Credit Building and other resident services may become available
              through the same member-benefits area as supported integrations
              and partner experiences are introduced.
            </p>
          </div>
        </section>

        <section className="mt-20 rounded-[34px] bg-[#0F172A] px-8 py-14 text-center text-white sm:px-10 lg:px-12">
          <h2 className="mx-auto max-w-[720px] text-[38px] font-semibold leading-tight tracking-[-0.055em] sm:text-[52px]">
            Ready to explore AvenueBoard?
          </h2>
          <p className="mx-auto mt-5 max-w-[620px] text-[16px] font-medium leading-8 text-slate-300">
            Create an account or sign in to access the member-benefits product
            area when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#0F172A] transition hover:bg-zinc-100"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-[15px] font-semibold text-white transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </section>
      </section>

      <MarketingFooter />
    </main>
  );
}
