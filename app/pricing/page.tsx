import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import { PublicHero } from "@/components/marketing/PublicHero";
import { PricingDisclosureTooltip } from "./PricingDisclosureTooltip";

const plans = [
  {
    title: "Self-Managing Landlords",
    price: "$0",
    priceSuffix: "/month",
    subtitle: "Always free.",
    detail: "No monthly software subscription.",
    cta: "Get Started Free",
    href: "/signup",
    featured: true,
    note: "",
    footnote: "",
    inclusions: [
      "Unlimited properties & units",
      "Lease management & templates",
      "Document storage",
      "Tenant portal",
      "Multiple payment options",
      "Payment history & rent statements",
      "Credit reporting",
      "Avenue Perks rewards",
      "AI Assistant",
      "Email support",
    ],
  },
  {
    title: "Property Managers",
    price: "$0",
    priceSuffix: "/month",
    subtitle: "Always free.",
    detail: "Manage multiple properties from one platform.",
    cta: "Get Started Free",
    href: "/signup",
    featured: false,
    note: "",
    footnote: "",
    inclusions: [
      "Unlimited properties & units",
      "Lease management & templates",
      "Document storage",
      "Tenant portal",
      "Multiple payment options",
      "Payment history & rent statements",
      "Credit reporting",
      "Avenue Perks rewards",
      "AI Assistant",
      "Email support",
    ],
  },
  {
    title: "Enterprise Solutions",
    price: "Custom Board",
    priceSuffix: "",
    subtitle: "Pay as you grow.",
    detail: "Built for larger portfolios and operations.",
    cta: "Contact Sales",
    href: "mailto:sales@avenueboard.com?subject=AvenueBoard Enterprise Pricing",
    featured: false,
    note: "",
    footnote: "",
    inclusions: [
      "Everything in Property Managers",
      "Custom branding",
      "Custom resident experience",
      "Team roles & permissions",
      "Custom workflows & automations",
      "Custom integrations",
      "Dedicated account management",
      "Priority support",
    ],
  },
] as const;

const tenantScreeningDisclosure = {
  displayValue: "Paid by applicant",
  tooltip:
    "Tenant screening fees are paid directly by the applicant. The exact screening cost is shown before the application is submitted.",
  tooltipLabel: "Tenant screening fee disclosure",
} as const;

const residentPaymentAccessDisclosure = {
  displayValue: "Paid by resident",
  tooltip: {
    intro: "A $10 fee applies when rent is paid through AvenueBoard.",
    items: [
      "Resident dashboard access",
      "Standard ACH payments",
      "AutoPay",
      "Credit reporting",
      "Rent statements",
      "AvenueBucks rewards",
    ],
    note: "Landlords may choose to absorb this fee for their residents.",
  },
  tooltipLabel: "Resident payment access fee disclosure",
} as const;

const featureComparison = [
  { id: "monthly-platform-fee", feature: "Monthly Platform Fee", landlords: "$0/month", enterprise: "Custom" },
  { id: "properties-and-units", feature: "Properties & Units", landlords: "Unlimited", enterprise: "Unlimited" },
  { id: "online-rent-collection", feature: "Online Rent Collection" },
  { id: "lease-management", feature: "Lease Management" },
  { id: "lease-templates", feature: "Lease Templates" },
  { id: "lease-renewals", feature: "Lease Renewals" },
  { id: "secure-document-storage", feature: "Document Storage" },
  { id: "notes-and-shared-comments", feature: "Notes & Shared Comments" },
  { id: "data-import-and-export", feature: "Data Import & Export" },
  { id: "notification-center", feature: "Notification Center" },
  { id: "avenueboard-mobile-app", feature: "AvenueBoard Mobile App" },
  { id: "ai-assistant", feature: "AI Assistant" },
  { id: "reports-and-expense-tracking", feature: "Reports & Expense Tracking" },
  { id: "rent-statements", feature: "Rent Statements" },
  { id: "tax-documents", feature: "Tax Documents" },
  { id: "email-support", feature: "Email Support", landlords: "Standard", enterprise: "Priority" },
  {
    id: "online-support-requests",
    feature: "Online Support Requests",
    landlords: "Standard",
    enterprise: "Priority",
  },
  {
    id: "custom-branding",
    feature: "Custom Branding",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "custom-resident-experience",
    feature: "Custom Resident Experience",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "team-roles-and-permissions",
    feature: "Team Roles & Permissions",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "custom-workflows-and-automations",
    feature: "Custom Workflows & Automations",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "custom-integrations",
    feature: "Custom Integrations",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "dedicated-account-management",
    feature: "Dedicated Account Management",
    landlords: false,
    propertyManagers: false,
    enterprise: true,
  },
  {
    id: "tenant-screening",
    feature: "Tenant Screening",
    landlords: tenantScreeningDisclosure,
    enterprise: tenantScreeningDisclosure,
  },
  { id: "tenant-portal", feature: "Tenant Portal" },
  {
    id: "resident-payment-access",
    feature: "Resident Payment Access",
    landlords: residentPaymentAccessDisclosure,
    enterprise: "Custom",
  },
  { id: "autopay-setup", feature: "AutoPay Setup" },
  { id: "ach-payments", feature: "ACH Payments" },
  { id: "debit-and-credit-card-payments", feature: "Debit & Credit Card Payments*" },
  { id: "rent-reminder-notifications", feature: "Rent Reminder Notifications" },
  { id: "credit-reporting", feature: "Credit Reporting" },
  { id: "avenue-perks-rewards", feature: "Avenue Perks Rewards" },
] as const;

const featureComparisonFootnotes = [
  {
    id: "card-processing-fees",
    text: "*Card processing fees may apply depending on the card type and payment method.",
  },
] as const;

function getIncludedAvailability(row: (typeof featureComparison)[number]) {
  return "landlords" in row ? row.landlords : true;
}

function getPropertyManagerAvailability(row: (typeof featureComparison)[number]) {
  return "propertyManagers" in row ? row.propertyManagers : getIncludedAvailability(row);
}

function getEnterpriseAvailability(row: (typeof featureComparison)[number]) {
  return "enterprise" in row ? row.enterprise : getIncludedAvailability(row);
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-[#0F172A]">
      <MarketingHeader activePage="pricing" />

      <PublicHero
        eyebrow="Pricing, simplified."
        title={
          <>
            Simple pricing.
            <br />
            Built for every rental.
          </>
        }
        description={
          <span className="trust-gradient-text mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center xl:flex-nowrap">
            <span className="inline-flex justify-center xl:whitespace-nowrap">
              Free for landlords and property managers.
            </span>
            <span className="inline-flex justify-center xl:whitespace-nowrap">
              A better rental experience for residents.
            </span>
            <span className="inline-flex justify-center xl:whitespace-nowrap">
              Enterprise solutions available as portfolio grows.
            </span>
          </span>
        }
        descriptionClassName="relative left-1/2 w-[calc(100vw-3rem)] max-w-[1560px] -translate-x-1/2 text-[16px] font-semibold leading-normal tracking-normal sm:w-[calc(100vw-5rem)] sm:text-[18px] lg:w-[calc(100vw-8rem)]"
      />

      <section className="mx-auto max-w-[1600px] px-6 pb-20 sm:px-10 lg:px-16 lg:pb-28">
        <div className="mx-auto mt-20 grid max-w-[1280px] items-stretch gap-5 lg:grid-cols-[1.08fr_1fr_1fr] xl:gap-6">
          {plans.map((plan) => (
            <article
              key={plan.title}
              className={`flex h-full flex-col rounded-[28px] border bg-white p-7 shadow-[0_18px_48px_rgba(15,23,42,0.045)] sm:p-8 lg:grid lg:grid-rows-[66px_70px_78px_48px_auto_1fr_auto] ${
                plan.featured
                  ? "border-[#0F172A]/45 shadow-[0_24px_64px_rgba(15,23,42,0.08)] ring-1 ring-[#0F172A]/10 lg:-translate-y-1"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-start">
                <h2 className="text-[27px] font-semibold leading-tight tracking-[-0.04em] text-zinc-950">
                  {plan.title}
                </h2>
              </div>

              <div
                className={`mt-6 flex items-start lg:mt-0 ${
                  plan.priceSuffix ? "" : "lg:pt-1.5"
                }`}
              >
                {plan.priceSuffix ? (
                  <p className="flex items-end gap-2 text-zinc-950">
                    <span className="text-[52px] font-semibold leading-none tracking-[-0.055em] sm:text-[58px]">
                      {plan.price}
                    </span>
                    <span className="mb-1.5 text-[16px] font-medium leading-none tracking-[-0.02em] text-[#606875]">
                      {plan.priceSuffix}
                    </span>
                  </p>
                ) : (
                  <p className="max-w-full text-[32px] font-semibold leading-[1.02] tracking-[-0.055em] text-zinc-950 sm:text-[36px] xl:whitespace-nowrap">
                    {plan.price}
                  </p>
                )}
              </div>

              <div className="mt-5 lg:mt-0">
                <p
                  className={`text-[16px] leading-7 ${
                    plan.priceSuffix
                      ? "font-semibold text-[#0F766E]"
                      : "font-semibold text-[#0F766E]"
                  }`}
                >
                  {plan.subtitle}
                </p>
                {plan.detail && (
                  <p className="mt-1 text-[16px] font-medium leading-7 text-[#606875] lg:whitespace-nowrap">
                    {plan.detail}
                  </p>
                )}
              </div>

              <Link
                href={plan.href}
                className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:mt-0 ${
                  plan.featured
                    ? "bg-[#0F172A] text-white hover:bg-[#1E293B]"
                    : "border border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {plan.cta}
              </Link>

              <div className="mt-9 border-t border-zinc-200 pt-7 lg:mt-8">
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-950">
                  Included
                </h3>
              </div>

              <div className="pt-5">
                <ul className="grid gap-3.5">
                  {plan.inclusions.map((inclusion, inclusionIndex) => (
                    <li
                      key={`${plan.title}-${inclusion}-${inclusionIndex}`}
                      className="flex items-start gap-3 text-[14.5px] font-medium leading-5 text-[#5E6673]"
                    >
                      <Check
                        size={15}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-[#0F172A]"
                        aria-hidden="true"
                      />
                      <span>{inclusion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8 text-[12.5px] font-medium leading-5 text-[#747B88]">
                {plan.note && <p>{plan.note}</p>}
                {plan.footnote && <p className={plan.note ? "mt-3" : ""}>{plan.footnote}</p>}
              </div>
            </article>
          ))}
        </div>

        <section className="mx-auto mt-24 max-w-[1400px]">
          <div className="mx-auto max-w-[860px] text-center">
            <p className="text-[17px] font-medium text-[#555966]">
              Compare everything included
            </p>
            <h2 className="mt-6 text-[42px] font-medium leading-[1.08] tracking-[-0.045em] text-black sm:text-[56px]">
              All features at a glance.
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#0F172A] text-white">
                    <th className="w-[40%] px-6 py-5 text-[14px] font-semibold tracking-[-0.01em] sm:px-8">
                      Feature
                    </th>
                    <th className="w-[20%] px-6 py-5 text-center text-[14px] font-semibold tracking-[-0.01em]">
                      Landlords
                    </th>
                    <th className="w-[20%] px-6 py-5 text-center text-[14px] font-semibold tracking-[-0.01em]">
                      Property Managers
                    </th>
                    <th className="w-[20%] px-6 py-5 text-center text-[14px] font-semibold tracking-[-0.01em]">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-200">
                      <th className="px-6 py-5 text-[15px] font-medium leading-6 text-zinc-950 sm:px-8">
                        {row.feature}
                      </th>
                      <td className="border-l border-zinc-200 px-6 py-5 text-center text-[14.5px] font-medium text-[#5E6673]">
                        <ComparisonAvailability value={getPropertyManagerAvailability(row)} />
                      </td>
                      <td className="border-l border-zinc-200 px-6 py-5 text-center text-[14.5px] font-medium text-[#5E6673]">
                        <ComparisonAvailability value={getIncludedAvailability(row)} />
                      </td>
                      <td className="border-l border-zinc-200 px-6 py-5 text-center text-[14.5px] font-medium text-[#5E6673]">
                        <ComparisonAvailability value={getEnterpriseAvailability(row)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-left text-[13px] font-normal leading-5 text-[#7A8392]">
            {featureComparisonFootnotes.map((footnote) => (
              <p key={footnote.id}>{footnote.text}</p>
            ))}
          </div>
        </section>
      </section>

      <MarketingFooter />
    </main>
  );
}

type ComparisonDisclosure = {
  displayValue: string;
  tooltip:
    | string
      | {
          intro: string;
        items: readonly string[];
          note: string;
        };
  tooltipLabel: string;
};

function ComparisonAvailability({ value }: { value: boolean | string | ComparisonDisclosure }) {
  if (value === false) {
    return <span className="text-zinc-300">—</span>;
  }

  if (typeof value === "string") {
    return <span className="text-[14.5px] font-medium text-[#5E6673]">{value}</span>;
  }

  if (typeof value === "object") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#5E6673]">
        <span>{value.displayValue}</span>
        <PricingDisclosureTooltip label={value.tooltipLabel} tooltip={value.tooltip} />
      </span>
    );
  }

  return (
    <Check
      size={18}
      strokeWidth={2.4}
      className="mx-auto text-[#16A34A]"
      aria-hidden="true"
    />
  );
}
