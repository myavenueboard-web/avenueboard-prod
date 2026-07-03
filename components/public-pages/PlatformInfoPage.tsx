"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import {
  platformSections,
  type PlatformSectionId,
  type PublicPageLink,
} from "@/components/public-pages/publicPageNavigation";

type PlatformContent = {
  title: string;
  description: string;
  items: {
    title: string;
    description: string;
    href?: string;
  }[];
};

const platformContent: Record<string, PlatformContent> = {
  "rental-properties": {
    title: "Rental Properties",
    description:
      "AvenueBoard helps keep property records, lease context, resident access, and rental activity organized in one clean workspace.",
    items: [
      {
        title: "Property records",
        description:
          "Keep core property and unit details close to lease, document, and payment information.",
      },
      {
        title: "Lease context",
        description:
          "Connect lease dates, monthly rent, resident access, and active status to each rental property.",
      },
    ],
  },
  "landlord-dashboard": {
    title: "Landlord Board",
    description:
      "The landlord workspace is designed for managing properties, residents, leases, payments, documents, and reporting without unnecessary clutter.",
    items: [
      {
        title: "Portfolio workspace",
        description:
          "Review properties, resident records, lease details, notes, documents, and activity from a single Board.",
      },
      {
        title: "Operational clarity",
        description:
          "Designed for individual landlords, small portfolios, and property managers who need practical tools.",
      },
    ],
  },
  "resident-dashboard": {
    title: "Resident Board",
    description:
      "The Resident Board gives residents a focused place to view rent details, payment setup, lease information, documents, statements, and benefits.",
    items: [
      {
        title: "Resident view",
        description:
          "Help residents understand rent status, payment history, property contact, notes, documents, and lease details.",
      },
      {
        title: "Account support",
        description:
          "Connect residents to Help Center, support cases, Avenue Perks, and credit-building information where available.",
      },
    ],
  },
  "ava-support": {
    title: "Ava Assistant",
    description:
      "Ava Assistant experiences help AvenueBoard users find guidance and route support questions into cleaner workflows.",
    items: [
      {
        title: "Guided help",
        description:
          "Support flows can help users find answers or create support cases when more help is needed.",
        href: "/help-center",
      },
      {
        title: "Case context",
        description:
          "Support requests can preserve useful context so users and the support team can follow up more clearly.",
      },
    ],
  },
  "avenue-perks": {
    title: "Avenue Perks",
    description:
      "Avenue Perks gives AvenueBoard users access to partner savings on everyday essentials, services, dining, travel, shopping, and more.",
    items: [
      {
        title: "User benefit",
        description:
          "A benefit layer designed to make AvenueBoard useful beyond rent payment workflows.",
        href: "/avenue-perks",
      },
      {
        title: "Partner powered",
        description:
          "Perks are positioned as exclusive savings and offers, not points, cashback, or rewards balances.",
      },
    ],
  },
  pricing: {
    title: "Pricing",
    description:
      "AvenueBoard is designed around an approachable model for landlords, managers, and residents.",
    items: [
      {
        title: "Landlord access",
        description:
          "The landlord and manager workspace is intended to stay free from monthly subscription requirements.",
      },
      {
        title: "Payment fees",
        description:
          "Residents pay a $10 monthly Resident Platform Fee unless the landlord chooses to absorb it.",
      },
    ],
  },
  "rent-collection": {
    title: "Rent Collection",
    description:
      "Rent collection tools are designed around clear rent cycles, payment status, resident actions, and completed payment records.",
    items: [
      {
        title: "Cycle-aware payments",
        description:
          "Rent payments can be tied to a specific month so records stay easier to understand.",
      },
      {
        title: "Duplicate prevention",
        description:
          "Payment flows are designed to avoid accidental duplicate payments for the same rent cycle.",
      },
    ],
  },
  "lease-tracking": {
    title: "Lease Tracking",
    description:
      "Lease tracking keeps key lease dates, rent details, status, unit information, and access context close to the rental workspace.",
    items: [
      {
        title: "Lease details",
        description:
          "Reference lease start dates, end dates, monthly rent, active status, and unit details.",
      },
      {
        title: "Timeline context",
        description:
          "Show available lease and resident access milestones when those records exist.",
      },
    ],
  },
  "document-storage": {
    title: "Document Storage",
    description:
      "Document storage helps keep rental files available alongside the property, lease, resident, and payment records they support.",
    items: [
      {
        title: "Property documents",
        description:
          "Store documents where residents and landlords can find the records they are allowed to access.",
      },
      {
        title: "Organized records",
        description:
          "Keep files connected to the rental workspace instead of scattered across email threads.",
      },
    ],
  },
  "payment-history": {
    title: "Payment History",
    description:
      "Payment history gives users clearer visibility into completed, upcoming, late, and future rent cycles.",
    items: [
      {
        title: "Payment progress",
        description:
          "A rolling schedule helps residents see recent paid months, the upcoming month, and future cycles.",
      },
      {
        title: "Statement source",
        description:
          "Completed payment records can power rent payment statements and downloadable records.",
      },
    ],
  },
  "rent-reminders": {
    title: "Rent Reminders",
    description:
      "Rent reminder experiences can help residents and landlords stay aware of due dates, payment setup, and upcoming rent cycles.",
    items: [
      {
        title: "Upcoming rent context",
        description:
          "Rent due dates and payment status can be surfaced in resident-facing views.",
      },
      {
        title: "Future-ready workflows",
        description:
          "Reminder experiences can evolve around rent cycle status and communication preferences.",
      },
    ],
  },
  reports: {
    title: "Reports",
    description:
      "Reports can help landlords, managers, and residents understand rental records, payment history, statements, and activity over time.",
    items: [
      {
        title: "Rental records",
        description:
          "Summarize key operational records without turning the workspace into a heavy reporting system.",
      },
      {
        title: "Payment summaries",
        description:
          "Support future reporting around statements, receipts, transaction summaries, and rent history.",
      },
    ],
  },
  "help-center": {
    title: "Help Center",
    description:
      "The Help Center gives users a public place to find answers, contact AvenueBoard, and access support cases when signed in.",
    items: [
      {
        title: "Support hub",
        description:
          "Browse FAQ, contact support, or open My Cases from the Help Center.",
        href: "/help-center",
      },
      {
        title: "Public and protected sections",
        description:
          "FAQ and Contact Us are public, while My Cases is connected to the signed-in account.",
      },
    ],
  },
  faqs: {
    title: "FAQs",
    description:
      "FAQs provide quick answers to common AvenueBoard product, account, payment, document, and support questions.",
    items: [
      {
        title: "Browse questions",
        description:
          "FAQ content is available without requiring users to open a support request.",
        href: "/help-center?section=faq",
      },
    ],
  },
  "my-cases": {
    title: "My Cases",
    description:
      "My Cases lets signed-in users view support requests, statuses, detail history, and closed case records connected to their account.",
    items: [
      {
        title: "Support case history",
        description:
          "Support cases stay protected and are only shown to authenticated users.",
        href: "/help-center?section=cases",
      },
    ],
  },
  "contact-us": {
    title: "Contact Us",
    description:
      "Contact Us gives users a focused path for AvenueBoard product, account, payment, and platform questions.",
    items: [
      {
        title: "Contact support",
        description:
          "Use the Help Center contact section when more support context is needed.",
        href: "/help-center?section=contact",
      },
    ],
  },
  login: {
    title: "Login",
    description:
      "The login page gives existing AvenueBoard users a focused path back into their account.",
    items: [
      {
        title: "Sign in",
        description:
          "Continue with email and password or supported OAuth providers.",
        href: "/login",
      },
    ],
  },
  "get-started": {
    title: "Get Started",
    description:
      "Create an AvenueBoard account to access available landlord, resident, support, and benefit experiences.",
    items: [
      {
        title: "Create account",
        description:
          "Start with the signup flow and continue through the appropriate workspace routing.",
        href: "/signup",
      },
    ],
  },
  "about-avenueboard": {
    title: "About AvenueBoard",
    description:
      "AvenueBoard is a rental workspace focused on making rental management clearer for landlords, managers, and residents.",
    items: [
      {
        title: "Product focus",
        description:
          "The platform brings rent, leases, documents, support, and resident-facing tools into a cleaner system.",
      },
    ],
  },
  "why-avenueboard": {
    title: "Why AvenueBoard",
    description:
      "AvenueBoard is designed for practical rental work, approachable pricing, and a better experience for both sides of the rental relationship.",
    items: [
      {
        title: "Built for everyday operators",
        description:
          "Simple enough for one property and organized enough for growing rental portfolios.",
      },
    ],
  },
  "for-landlords": {
    title: "For Landlords",
    description:
      "AvenueBoard helps landlords organize properties, tenants, leases, payments, documents, and support records.",
    items: [
      {
        title: "Landlord workspace",
        description:
          "Keep operational context visible without relying on memory, scattered files, or email threads.",
      },
    ],
  },
  "for-property-managers": {
    title: "For Property Managers",
    description:
      "AvenueBoard gives property managers a cleaner way to organize records, resident access, and payment visibility.",
    items: [
      {
        title: "Portfolio clarity",
        description:
          "Support multiple rental workflows with consistent records and tenant-facing access.",
      },
    ],
  },
  "for-residents": {
    title: "For Residents",
    description:
      "AvenueBoard gives residents a clearer place to view rent details, documents, statements, support, and benefits.",
    items: [
      {
        title: "Resident experience",
        description:
          "Make rental information easier to find and understand from the Resident Board.",
      },
    ],
  },
  roadmap: {
    title: "Roadmap",
    description:
      "The AvenueBoard roadmap is focused on stronger rental records, clearer resident experiences, and practical tools for managing rentals.",
    items: [
      {
        title: "Future product direction",
        description:
          "Payments, statements, support, benefits, and partner-enabled resident tools can continue to expand over time.",
      },
    ],
  },
};

function getPlatformSection(value: string | null): PlatformSectionId {
  if (
    value === "platform" ||
    value === "rent-tools" ||
    value === "company"
  ) {
    return value;
  }

  return "platform";
}

function getPlatformCategory(
  section: PlatformSectionId,
  value: string | null,
): PublicPageLink {
  const group = platformSections[section];

  return (
    group.links.find((category) => category.id === value) ??
    group.links.find((category) => category.id === group.defaultCategory) ??
    group.links[0]
  );
}

export function PlatformInfoPage() {
  const searchParams = useSearchParams();
  const activeSection = getPlatformSection(searchParams.get("section"));
  const activeGroup = platformSections[activeSection];
  const activeCategory = getPlatformCategory(
    activeSection,
    searchParams.get("category"),
  );
  const content = platformContent[activeCategory.id] ?? {
    title: activeCategory.label,
    description:
      "This public information section is being prepared for AvenueBoard users.",
    items: [],
  };

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader variant="platform" activeNav={activeSection} />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center px-5 sm:px-7 lg:px-16">
          <nav
            className="min-w-0 flex-1 overflow-x-auto"
            aria-label={`${activeGroup.label} categories`}
          >
            <div className="flex min-w-max items-center gap-10">
              {activeGroup.links.map((category) => {
                const active = activeCategory.id === category.id;

                return (
                  <Link
                    key={category.id}
                    href={category.href}
                    className={`relative flex h-16 items-center whitespace-nowrap text-[15px] font-semibold transition ${
                      active
                        ? "text-slate-950"
                        : "text-zinc-600 hover:text-slate-950"
                    }`}
                  >
                    {category.label}
                    {active && (
                      <span className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-950" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1600px] flex-1 px-5 pb-24 pt-16 sm:px-7 sm:pt-20 lg:px-16">
        <div className="max-w-[980px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {activeGroup.label}
          </p>
          <h1 className="mt-5 max-w-[860px] text-[42px] font-medium leading-[1.02] tracking-[-0.07em] text-[#050A1F] sm:text-[56px]">
            {content.title}
          </h1>
          <p className="mt-6 max-w-[760px] text-[16px] font-medium leading-8 text-zinc-500 sm:text-[17px]">
            {content.description}
          </p>
        </div>

        <div className="mt-14 max-w-[980px] divide-y divide-zinc-200 border-y border-zinc-200">
          {content.items.map((item) => {
            const body = (
              <>
                <span>
                  <span className="block text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
                    {item.title}
                  </span>
                  <span className="mt-2 block text-[15px] leading-7 text-zinc-600">
                    {item.description}
                  </span>
                </span>
                {item.href && (
                  <span className="shrink-0 text-[14px] font-semibold text-slate-700">
                    View
                  </span>
                )}
              </>
            );

            return item.href ? (
              <Link
                key={item.title}
                href={item.href}
                className="grid gap-5 py-7 transition hover:bg-zinc-50/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
              >
                {body}
              </Link>
            ) : (
              <div
                key={item.title}
                className="grid gap-5 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4"
              >
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
