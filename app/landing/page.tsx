"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePreview, setActivePreview] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePreview((prev) => (prev === 0 ? 1 : 0));
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  const previews = [{ label: "Landlord Dashboard" }, { label: "Tenant Portal" }];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F6F3] pt-[96px] font-sans text-[#0F172A] sm:pt-[110px]">
      {/* NAVBAR */}
      <header className="fixed left-0 top-0 z-[999] w-full px-3 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-[1fr_auto] items-center rounded-full border border-white/50 bg-white/70 px-4 py-3 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur-3xl transition-all duration-500 md:grid-cols-[1fr_auto_1fr] md:px-7">
          <a href="/" className="flex items-center justify-self-start">
            <img src="/logo.png" alt="AvenueBoard" className="h-7 w-auto object-contain sm:h-8" />
          </a>

          <nav className="hidden items-center gap-10 justify-self-center text-[14px] font-medium text-zinc-700 md:flex">
            <a href="#why" className="transition hover:text-[#0F172A]">Product</a>
            <a href="#how" className="transition hover:text-[#0F172A]">How It Works</a>
            <a href="#pricing" className="transition hover:text-[#0F172A]">Pricing</a>
            <a href="#faq" className="transition hover:text-[#0F172A]">FAQ</a>
          </nav>

          <div className="flex items-center justify-self-end gap-2 sm:gap-3">
            <a href="/login" className="hidden rounded-full px-5 py-2.5 text-[14px] font-semibold text-zinc-700 transition hover:bg-white/55 sm:block">
              Log In
            </a>

            <a href="/signup" className="rounded-full bg-[#0F172A] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E293B] sm:px-6 sm:text-[14px]">
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#F7F6F3] px-4 pt-16 sm:px-6 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-white blur-3xl" />
        <div className="pointer-events-none absolute left-[-180px] top-[260px] h-[420px] w-[420px] rounded-full bg-[#F8D7E1]/55 blur-3xl" />
        <div className="pointer-events-none absolute right-[-180px] top-[300px] h-[420px] w-[420px] rounded-full bg-[#FCE7EF]/65 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-[900px] animate-[fadeUp_0.8s_ease-out] text-center">
          <p className="mx-auto inline-flex items-center rounded-full border border-[#F0CAD5] bg-white/90 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#B53E68] shadow-sm">
            Rental management, simplified
          </p>

          <h1 className="mx-auto mt-7 max-w-[850px] text-[48px] font-semibold leading-[0.92] tracking-[-0.08em] text-[#0F172A] sm:text-[64px] lg:text-[76px]">
            Manage rentals.
            <br />
            <span className="text-[#B53E68]">Without the chaos.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-8 text-zinc-500 sm:text-[18px]">
            Collect rent, manage tenants, track lease details, store documents,
            and stay organized from one clean dashboard.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="/signup" className="group inline-flex h-[52px] items-center justify-center rounded-2xl bg-[#B53E68] px-8 text-[15px] font-semibold text-white shadow-[0_16px_40px_rgba(181,62,104,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#A93F64]">
              Get Started
              <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>

            <a href="#how" className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 px-7 text-[15px] font-semibold text-[#0F172A] shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white">
              See How It Works
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-[13px] font-semibold text-[#0F172A]">
            <span>No monthly subscription</span>
            <span className="h-1 w-1 rounded-full bg-[#B53E68]" />
            <span>Always free for landlords and managers</span>
            <span className="h-1 w-1 rounded-full bg-[#B53E68]" />
            <span>Designed for tenants</span>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-8 max-h-[500px] max-w-[1260px] animate-[float_7s_ease-in-out_infinite] overflow-hidden">
          <div className="overflow-hidden rounded-t-[32px] border border-zinc-200 bg-white p-3 shadow-[0_38px_120px_rgba(15,23,42,0.12)]">
            <Image
              src="/landlord.png"
              alt="AvenueBoard landlord dashboard preview"
              width={1600}
              height={1000}
              priority
              className="h-auto w-full rounded-t-[24px] object-cover"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[150px] bg-gradient-to-t from-[#F7F6F3] via-[#F7F6F3]/95 to-transparent" />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative overflow-hidden bg-[#F7F6F3] px-4 pt-6 pb-24 sm:px-5 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
          <div className="absolute left-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[#F8D7E1] blur-3xl" />
          <div className="absolute right-[-120px] bottom-[80px] h-[320px] w-[320px] rounded-full bg-[#FCE7EF] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1320px]">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.26em] text-[#B9476D]">How it works</p>

            <h2 className="mt-5 text-[36px] font-semibold leading-[0.92] tracking-[-0.075em] text-[#0F172A] sm:text-[52px] lg:text-[58px]">
              Set up in under 10 minutes.
              <br />
              Modern rental management, <span className="text-[#B9476D]">simplified.</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <HowStepCard step="1" title="Add your property" description="Enter your property details, lease terms, rent amount, and important dates. Add one rental or build your entire portfolio." footerTitle="Unlimited properties" footerText="No limits. No caps. Ever." type="property" />
            <HowStepCard step="2" title="Invite your tenant" description="Send a secure invite so your tenant can create their portal, review lease details, and set up payments in minutes." footerTitle="Tenant portal access" footerText="Secure, simple, and mobile-friendly." type="tenant" />
            <HowStepCard step="3" title="Run everything" description="Track rent, monitor payments, send reminders, manage documents, and view reports — all from one clean dashboard." footerTitle="Everything in one place" footerText="Less admin, more clarity." type="dashboard" />
          </div>

          <div className="mt-6 grid gap-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.05)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Secure & Reliable", "Bank-level security to protect your data and payments."],
              ["Save Hours Every Week", "Automated reminders, payments, and tenant communication."],
              ["Everything Organized", "Leases, payments, documents, expenses — all connected."],
              ["Works Anywhere", "Access your dashboard on desktop, tablet, or mobile."],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-4 rounded-2xl p-3 transition-all duration-300 hover:bg-[#FAFAFA]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF1F5] text-[#B9476D]">✓</div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.03em] text-[#0F172A]">{title}</p>
                  <p className="mt-1 text-[13px] leading-6 text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="why" className="bg-white px-4 py-16 sm:px-5 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto max-w-[1280px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B9476D] sm:text-[12px]">The Smarter Way to Manage Rentals</p>

            <h2 className="mx-auto mt-5 max-w-[1240px] text-center text-[36px] font-semibold leading-[0.96] tracking-[-0.075em] text-[#0F172A] sm:text-[46px] lg:text-[56px]">
              The operating system for self-managing rentals.
            </h2>
          </div>

          <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[0.96fr_1.04fr] lg:gap-7">
            <ComparisonCard title="Without AvenueBoard" tone="negative" items={withoutItems} />
            <ComparisonCard title="With AvenueBoard" tone="positive" items={withItems} />
          </div>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section className="bg-[#F7F6F3] px-4 py-16 sm:px-5 lg:py-24">
        <div className="mx-auto max-w-[1480px]">
          <div className="text-center">
            <div className="flex justify-center">
              <p className="inline-flex items-center rounded-full border border-[#F0CAD5] bg-white px-4 py-1.5 text-[13px] font-semibold text-[#B9476D] shadow-sm">
                Dashboard
              </p>
            </div>

            <h2 className="mx-auto mt-5 max-w-[920px] text-[34px] font-semibold leading-[1.02] tracking-[-0.06em] text-[#0F172A] sm:text-[44px] lg:text-[56px]">
              Built for landlords • Designed for tenants — Product Preview
            </h2>
          </div>

          <div className="mt-10 rounded-[24px] border border-zinc-200 bg-white p-2 shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-3">
            <div className="relative h-[260px] overflow-hidden rounded-[18px] bg-white transition-all duration-500 ease-in-out sm:h-[520px] lg:h-[860px]">
              <Image
                key={activePreview}
                src={activePreview === 0 ? "/landlord.png" : "/tenantpreview.png"}
                alt="AvenueBoard Product Preview"
                fill
                priority
                className="animate-[fadeIn_0.7s_ease] object-contain object-top"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {previews.map((item, index) => (
              <button
                key={item.label}
                onClick={() => setActivePreview(index)}
                aria-label={item.label}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activePreview === index ? "w-24 bg-[#B9476D]" : "w-10 bg-zinc-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white px-4 py-16 sm:px-5 lg:py-24">
        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-[880px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#B9476D] sm:text-[12px]">Pricing</p>

            <h2 className="mt-5 text-[36px] font-semibold leading-[0.98] tracking-[-0.075em] text-[#0F172A] sm:text-[46px] lg:text-[62px]">
              Clear pricing for every rental workflow.
            </h2>

            <p className="mx-auto mt-6 max-w-[760px] text-[15px] leading-7 text-zinc-500 sm:text-[17px] sm:leading-8">
              Landlords and property managers can use AvenueBoard without subscription complexity, while renters get clear payment setup when rent collection begins.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-3 lg:gap-6">
            <PricingCard title="Self-Managing Landlords" badge="Always Free" price="$0" priceNote="/ year" description="For individual landlords managing one or multiple rentals with a clean operating dashboard." cta="Start Free" highlight features={["Unlimited property listings", "No rental income cap", "Tenant invitation flow", "Lease setup included", "Rent tracking dashboard", "Payment reminders", "Payment confirmation visibility", "Lease document center", "Expense tracking", "Reports dashboard"]} />

            <PricingCard title="Property Managers" badge="Custom Ready" price="$0" priceNote="/ year" description="For rental teams that need more structure, operational visibility, and custom workflow support." cta="Contact Sales" href="mailto:sales@avenueboard.com?subject=AvenueBoard Property Manager Plan" features={["Everything in landlord plan", "Custom branded dashboard", "Custom email communication", "Maintenance request operations", "Portfolio-level workflows", "Multi-team management support", "Custom CRM integrations", "Premium onboarding guidance", "Up to 6 months onboarding support", "Priority support access"]} />

            <PricingCard title="Renters" badge="Clear Setup" price="Access" priceNote="included" description="For renters invited by their landlord to set up payments, view lease details, and manage rent activity." cta="Tenant Portal" href="/tenant" features={["Free tenant portal access", "One-time setup fee per lease", "Prorated by lease term", "Free ACH rent payments", "Autopay options supported", "Debit and credit card payments*", "Payment confirmations included", "Secure payment verification", "No recurring renter platform fee", "Landlord can absorb setup fee"]} />
          </div>

          <p className="mx-auto mt-7 max-w-[920px] text-center text-[13px] leading-6 text-zinc-400">
            * Card processing charges may apply based on the selected payment method, provider, or financial institution. Tenant setup fees are one-time per lease and may be prorated based on lease length.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#F7F6F3] px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid w-full max-w-[1440px] items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="pt-3">
            <p className="text-[14px] font-semibold uppercase tracking-[0.22em] text-[#B9476D] sm:text-[16px]">FAQ</p>

            <h2 className="mt-6 max-w-[560px] text-[38px] font-semibold leading-[1.02] tracking-[-0.07em] text-[#0F172A] sm:text-[46px] lg:mt-15 lg:text-[56px]">
              Questions?
              <br />
              <span className="text-zinc-500">Self-managing rental owners ask these first.</span>
            </h2>

            <div className="mt-8 lg:mt-40">
              <a href="mailto:support@avenueboard.com" className="inline-flex items-center text-[16px] font-semibold text-[#B9476D] transition hover:text-[#A93F64] sm:text-[18px]">
                More questions? Reach out <span className="ml-2">→</span>
              </a>
            </div>
          </div>

          <div className="w-full">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={item.question} className="border-b border-zinc-300/80 py-5 first:border-t sm:py-6">
                  <button onClick={() => setOpenFaq(isOpen ? null : index)} className="flex w-full items-start justify-between gap-6 text-left">
                    <span className="max-w-[760px] text-[16px] font-semibold leading-7 tracking-[-0.035em] text-[#0F172A] sm:text-[18px]">
                      {item.question}
                    </span>

                    <span className={`text-[24px] font-medium leading-none text-[#0F172A] transition-transform duration-150 sm:text-[26px] ${isOpen ? "rotate-45" : ""}`}>
                      +
                    </span>
                  </button>

                  <div className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? "max-h-[280px] pt-4 opacity-100" : "max-h-0 opacity-0"}`}>
                    <p className="max-w-[760px] text-[14px] leading-7 text-zinc-600 sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-white px-4 py-16 sm:px-5 lg:py-24">
        <div className="mx-auto max-w-[820px] text-center">
          <h2 className="text-[38px] font-semibold leading-[0.95] tracking-[-0.07em] text-[#0F172A] sm:text-[52px]">
            Ready to stop managing rent from memory?
          </h2>

          <p className="mx-auto mt-6 max-w-[760px] text-[15px] leading-7 text-zinc-500 sm:text-[17px] sm:leading-8">
            One streamlined dashboard for rent collection, leases, tenants, payments, and property records — developed to feel simple from day one.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/signup" className="w-full rounded-full bg-[#B9476D] px-8 py-3.5 text-[14px] font-semibold text-white transition hover:bg-[#A93F64] sm:w-auto">
              Get Started
            </a>

            <a href="#how" className="w-full rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-[14px] font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:w-auto">
              See How It Works
            </a>
          </div>

          <p className="mt-5 text-[13px] font-medium text-zinc-400">Designed for modern rental management.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-[1680px] px-6 py-14 sm:px-12 sm:py-20 lg:px-16 2xl:px-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_0.8fr] lg:gap-24">
            <div>
              <img src="/logo.png" alt="AvenueBoard" className="h-11 w-auto object-contain sm:h-14" />

              <p className="mt-8 max-w-[640px] text-[15px] leading-8 text-zinc-600 sm:mt-10 sm:leading-[2.05rem]">
                A powerful rental management platform built for landlords, rental portfolios, and modern property operations. From rent collection and lease management to tenant coordination and property records, everything works together in one streamlined dashboard.
              </p>

              <div className="mt-8 flex items-center gap-5 text-[15px] font-medium tracking-[-0.02em] text-[#0F172A] sm:mt-9">
                <a href="#" className="transition hover:text-[#B9476D]">Instagram</a>
                <a href="#" className="transition hover:text-[#B9476D]">LinkedIn</a>
                <a href="#" className="transition hover:text-[#B9476D]">X</a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 lg:gap-14">
              <FooterColumn title="Product" links={[["About", "#why"], ["How It Works", "#how"], ["Pricing", "#pricing"], ["Rent Collection", "#why"], ["Tenant Setup", "#how"], ["Lease Tracking", "#pricing"]]} />
              <FooterColumn title="Resources" links={[["FAQs", "#faq"], ["Login", "/login"], ["Get Started", "/signup"], ["Contact", "mailto:support@avenueboard.com"]]} />
              <FooterColumn title="Legal" links={[["Privacy Policy", "/privacy"], ["Terms", "/terms"], ["Security", "#"]]} />
            </div>
          </div>

          <div className="mt-12 border-t border-zinc-200 pt-8 sm:mt-16">
            <p className="text-[14px] text-zinc-500 sm:text-[15px]">© 2026 AvenueBoard. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </main>
  );
}
  

function ComparisonCard({
  title,
  items,
  tone,
}: {
  title: string;
  tone: "positive" | "negative";
  items: { title: string; description: string }[];
}) {
  const isPositive = tone === "positive";

  return (
    <div
      className={`relative h-full overflow-hidden rounded-[34px] border p-6 shadow-[0_28px_100px_rgba(15,23,42,0.055)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_110px_rgba(15,23,42,0.08)] sm:rounded-[40px] sm:p-7 ${
        isPositive
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 lg:scale-[1.015]"
          : "border-rose-200/80 bg-gradient-to-br from-rose-50/45 via-white to-white"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${
          isPositive ? "bg-emerald-200/35" : "bg-rose-200/25"
        }`}
      />

      <div className="relative z-10 flex items-center gap-4 border-b border-zinc-200/70 pb-6">
        <div
          className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border text-[26px] font-semibold ${
            isPositive
              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border-rose-200 bg-rose-50 text-[#B9476D]"
          }`}
        >
          {isPositive ? "✓" : "×"}
        </div>

        <h3 className="text-[16px] font-semibold uppercase tracking-[0.18em] text-[#0F172A] sm:text-[18px]">
          {title}
        </h3>
      </div>

      <div className="relative z-10 mt-6 divide-y divide-zinc-200/70">
        {items.map((item) => (
          <div key={item.title} className="flex gap-5 py-4 first:pt-0">
            <div
              className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold ${
                isPositive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-[#B9476D]"
              }`}
            >
              {isPositive ? "✓" : "–"}
            </div>

            <div>
              <p className="text-[16px] font-semibold tracking-[-0.035em] text-[#0F172A]">
                {item.title}
              </p>

              <p className="mt-2 max-w-[560px] text-[14px] leading-[1.65] text-zinc-500">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#0F172A]">
        {title}
      </h3>

      <div className="mt-7 space-y-5">
        {links.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="block text-[16px] leading-none text-zinc-600 transition hover:text-[#B9476D]"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

const withoutItems = [
  {
    title: "Manual rent tracking",
    description:
      "Rent status, balances, due dates, and payment history are tracked across memory, notes, or spreadsheets.",
  },
  {
    title: "Scattered tenant communication",
    description:
      "Important updates, reminders, and confirmations get lost across texts, emails, and separate apps.",
  },
  {
    title: "No clear payment visibility",
    description:
      "It becomes harder to know what is paid, what is pending, and what needs follow-up.",
  },
  {
    title: "Documents are harder to manage",
    description:
      "Lease files, tenant records, notices, and property documents are stored in different places.",
  },
  {
    title: "Expenses and reporting feel disconnected",
    description:
      "Repairs, HOA fees, utilities, and property expenses are difficult to organize into a clean view.",
  },
];

const withItems = [
  {
    title: "Clean rent collection dashboard",
    description:
      "View rent activity, payment status, lease details, and property records from one organized place.",
  },
  {
    title: "Automated rent reminders",
    description:
      "Keep tenants informed with rent reminders, due-date visibility, and payment-related updates.",
  },
  {
    title: "Payment confirmation notifications",
    description:
      "Landlords and tenants get clearer visibility when payment activity is completed or updated.",
  },
  {
    title: "Lease and document center",
    description:
      "Keep lease agreements, tenant records, uploads, notices, and property files connected to each rental.",
  },
  {
    title: "Expenses and reports in one place",
    description:
      "Track property expenses, view portfolio activity, and keep records organized inside the dashboard.",
  },
];

const faqItems = [
  {
    question: "How long does it take to set up AvenueBoard?",
    answer:
      "Setup is designed to be quick. Create your account, add your property details, enter lease information, and invite your tenant. Once the tenant accepts the invite and completes payment setup, your property is ready to manage from the dashboard.",
  },
  {
    question: "Is AvenueBoard free for landlords and property managers?",
    answer:
      "Yes. AvenueBoard is designed to stay free for landlords and property managers using the standard platform. There are no hidden monthly platform fees for landlords. Tenant onboarding may include a one-time setup fee, and landlords can choose to absorb that fee if they prefer.",
  },
  {
    question: "Do tenants need to download anything?",
    answer:
      "No. Tenants can access AvenueBoard from a secure browser link on mobile, tablet, or desktop. They can view lease details, manage payment setup, access shared documents, and stay updated without downloading an app.",
  },
  {
    question: "Can AvenueBoard support larger rental portfolios?",
    answer:
      "Yes. Larger portfolios can reach out for customized onboarding, dashboard workflows, and portfolio-specific support. Qualified portfolio setups may also include additional onboarding assistance during initial setup.",
  },
  {
    question: "Where can I see upcoming platform updates?",
    answer:
      "AvenueBoard will share upcoming product improvements, planned features, and platform updates through the roadmap link in the footer. You can also contact support to discuss features needed for your rental workflow.",
  },
  {
    question:
      "Why choose AvenueBoard over traditional property management software?",
    answer:
      "Traditional property management platforms can feel overly complex and enterprise-focused. AvenueBoard is designed for independent landlords, small property managers, and growing rental portfolios that want rent collection, leases, tenants, payments, and records organized in one clean dashboard.",
  },
];


function PricingCard({
  title,
  badge,
  price,
  priceNote,
  description,
  cta,
  href = "/signup",
  features,
  highlight = false,
}: {
  title: string;
  badge: string;
  price: string;
  priceNote: string;
  description: string;
  cta: string;
  href?: string;
  features: string[];
  highlight?: boolean;
}) {
  const buttonHref =
    cta === "Contact Sales"
      ? "mailto:sales@avenueboard.com?subject=AvenueBoard Property Manager Plan"
      : "/signup";

  return (
    <div
      className={`relative overflow-hidden rounded-[34px] border bg-white p-7 shadow-[0_24px_90px_rgba(15,23,42,0.05)] ${
        highlight
          ? "border-[#B9476D]/45 ring-1 ring-[#B9476D]/20"
          : "border-zinc-200"
      }`}
    >
      <div
        className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
          highlight
            ? "bg-[#FFF1F5] text-[#B9476D]"
            : "bg-[#F7F6F3] text-zinc-500"
        }`}
      >
        {badge}
      </div>

      <h3 className="max-w-[270px] pr-20 text-[25px] font-semibold leading-[1.05] tracking-[-0.06em] text-[#0F172A]">
        {title}
      </h3>

      <p className="mt-5 min-h-[78px] text-[14px] leading-7 text-zinc-500">
        {description}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-[54px] font-semibold leading-none tracking-[-0.08em] text-[#0F172A]">
          {price}
        </span>

        <span className="pb-2 text-[14px] font-medium text-zinc-500">
          {priceNote}
        </span>
      </div>

      <a
        href={buttonHref}
        className={`mt-7 flex h-12 w-full items-center justify-center rounded-2xl text-[14px] font-semibold transition ${
          highlight
            ? "bg-[#B9476D] text-white hover:bg-[#A93F64]"
            : "bg-[#0F172A] text-white hover:bg-[#1E293B]"
        }`}
      >
        {cta}
      </a>

      <div className="mt-7 border-t border-zinc-100 pt-6">
        <div className="space-y-4">
          {features.map((feature) => (
            <div key={feature} className="flex gap-3 text-[14px] text-zinc-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[12px] font-semibold text-emerald-600">
                ✓
              </span>

              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowStepCard({
  step,
  title,
  description,
  footerTitle,
  footerText,
  type,
}: {
  step: string;
  title: string;
  description: string;
  footerTitle: string;
  footerText: string;
  type: "property" | "tenant" | "dashboard";
}) {
  return (
    <div
  className="rounded-[34px] border border-zinc-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
>
      <div className="flex items-center gap-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B9476D] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(185,71,109,0.25)]">
          {step}
        </span>

        <h3 className="text-[22px] font-semibold tracking-[-0.055em] text-[#0F172A]">
          {title}
        </h3>
      </div>

      <p className="mt-5 min-h-[96px] text-[15px] leading-7 text-zinc-500">
        {description}
      </p>

      <div className="mt-5 rounded-[24px] border border-zinc-300/70 bg-[#FAFAFA] p-4 shadow-inner">
        {type === "property" && <PropertyMockup />}
        {type === "tenant" && <TenantMockup />}
        {type === "dashboard" && <DashboardMockup />}
      </div>

      <div className="mt-6 flex items-center gap-4 border-t border-zinc-100 pt-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F5] text-[#B9476D]">
          ✓
        </div>

        <div>
          <p className="text-[16px] font-semibold tracking-[-0.035em] text-[#0F172A]">
            {footerTitle}
          </p>
          <p className="mt-1 text-[13px] text-zinc-500">{footerText}</p>
        </div>
      </div>
    </div>
  );
}

function PropertyMockup() {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[14px] font-semibold">Property Details</p>
        <span className="text-zinc-400">•••</span>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-[11px] text-zinc-400">Property Name</p>
          <p className="mt-1 text-[13px] font-semibold">Sunset Townhome</p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-[11px] text-zinc-400">Address</p>
          <p className="mt-1 text-[13px]">1234 Sunset Ave, Austin, TX</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-[11px] text-zinc-400">Monthly Rent</p>
            <p className="mt-1 text-[14px] font-semibold">$3,200</p>
          </div>

          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-[11px] text-zinc-400">Lease End</p>
            <p className="mt-1 text-[14px] font-semibold">Oct 31</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantMockup() {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[14px] font-semibold">Tenants</p>
        <span className="text-zinc-400">•••</span>
      </div>

      <div className="space-y-3">
        {[
          ["OB", "Olivia Bennett", "Active"],
          ["EC", "Ethan Carter", "Invited"],
        ].map(([initials, name, status]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-semibold">
                {initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="text-[11px] text-zinc-400">
                  {name.toLowerCase().replace(" ", ".")}@email.com
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
              {status}
            </span>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-[#E8AFC0] p-3 text-center text-[13px] font-semibold text-[#B9476D]">
          + Invite Tenant
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[14px] font-semibold">Dashboard Overview</p>
        <span className="text-zinc-400">•••</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-[11px] text-zinc-400">Collected</p>
          <p className="mt-1 text-[18px] font-semibold">$7,350</p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-[11px] text-zinc-400">Due This Month</p>
          <p className="mt-1 text-[18px] font-semibold">$3,100</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex justify-between rounded-xl border border-zinc-200 p-3 text-[13px]">
          <span>Rent Reminders</span>
          <span className="text-zinc-400">3 Scheduled</span>
        </div>

        <div className="flex justify-between rounded-xl border border-zinc-200 p-3 text-[13px]">
          <span>Latest Payment</span>
          <span className="font-semibold">$3,200</span>
        </div>
      </div>
    </div>
  );
}