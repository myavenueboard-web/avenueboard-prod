"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import {
  legalTrustSections,
  type PublicPageLink,
} from "@/components/public-pages/publicPageNavigation";

type LegalTrustSectionId =
  | "terms-of-service"
  | "privacy-policy"
  | "security"
  | "cookie-policy"
  | "accessibility";

type LegalTrustContent = {
  group: "legal" | "trust";
  title: string;
  description: string;
  sections: { title: string; body: string }[];
};

const legalTrustContent: Record<LegalTrustSectionId, LegalTrustContent> = {
  "terms-of-service": {
    group: "legal",
    title: "Terms of Service",
    description:
      "A working overview of the terms that govern access to AvenueBoard products, rental workspaces, payments, documents, support, and related services.",
    sections: [
      {
        title: "Introduction",
        body: "These Terms of Service describe the working rules for using AvenueBoard. AvenueBoard provides software tools for rental workspaces, account access, documents, statements, support workflows, and payment-related experiences.",
      },
      {
        title: "Eligibility",
        body: "Users should access AvenueBoard only if they can form a binding agreement and are authorized to use the rental workspace, property, lease, account, or organization they access.",
      },
      {
        title: "Accounts and Access",
        body: "Users are responsible for keeping account credentials secure. Access may depend on account role, accepted invitations, verified resident access, landlord permissions, and workspace configuration.",
      },
      {
        title: "Landlord and Resident Use",
        body: "Landlords and property managers may use AvenueBoard to organize rental operations. Residents may use AvenueBoard to access rental details shared with them, statements, documents, support, and account tools.",
      },
      {
        title: "Payments and AutoPay",
        body: "Payment and AutoPay features may be processed by third-party providers. AvenueBoard may display payment status and related records based on available platform data, but AvenueBoard is not a bank, lender, or payment card issuer.",
      },
      {
        title: "Statements and Records",
        body: "Rent payment statements and records are provided for convenience and record-keeping based on completed payment information available in AvenueBoard.",
      },
      {
        title: "Documents and Communications",
        body: "Users are responsible for content they upload, store, or share through AvenueBoard, including documents, notes, support requests, and communications.",
      },
      {
        title: "Avenue Perks and Credit Building",
        body: "Avenue Perks and credit-building experiences may be partner-enabled, planned, limited, or subject to availability. AvenueBoard does not guarantee savings, credit outcomes, approvals, or third-party availability.",
      },
      {
        title: "Acceptable Use",
        body: "Users may not misuse AvenueBoard, access data without permission, interfere with platform security, upload harmful content, or use the service for unlawful activity.",
      },
      {
        title: "Disclaimers",
        body: "AvenueBoard provides software and informational tools only. AvenueBoard does not provide legal, tax, financial, credit, lending, insurance, accounting, or real estate brokerage advice.",
      },
      {
        title: "Limitation of Liability",
        body: "To the extent permitted by law, AvenueBoard is not responsible for indirect, incidental, special, consequential, or punitive damages related to platform use, third-party services, or user-provided information.",
      },
      {
        title: "Changes to Terms",
        body: "AvenueBoard may update these Terms as the product, legal requirements, or business operations evolve.",
      },
      {
        title: "Contact",
        body: "Questions about these Terms can be directed through the Help Center or support contact methods made available in AvenueBoard.",
      },
    ],
  },
  "privacy-policy": {
    group: "legal",
    title: "Privacy Policy",
    description:
      "A working overview of how AvenueBoard may collect, use, share, and protect information connected to accounts, rental workspaces, payments, documents, and support.",
    sections: [
      {
        title: "Introduction",
        body: "This Privacy Policy explains, in draft form, how AvenueBoard may process information when users access AvenueBoard websites, accounts, rental workspaces, support tools, and product experiences.",
      },
      {
        title: "Information We Collect",
        body: "AvenueBoard may collect information provided directly by users, information generated through platform use, information from rental workspace activity, and technical information needed to operate the service.",
      },
      {
        title: "Account Information",
        body: "Account information may include name, email address, phone number, profile details, authentication provider information, roles, settings, and support activity.",
      },
      {
        title: "Property and Lease Information",
        body: "AvenueBoard may process property names, addresses, unit details, lease dates, rent amounts, resident access records, landlord contact details, and related rental workspace information.",
      },
      {
        title: "Payment Information",
        body: "Payment workflows may include payment status, rent cycle information, payment method labels, last four digits, processor identifiers, Resident Platform Fees, card processing fees, receipts, and statement records.",
      },
      {
        title: "Documents and Notes",
        body: "Users may upload documents, create notes, share records, and store files connected to rental workspaces. AvenueBoard may process that content to provide authorized access and platform features.",
      },
      {
        title: "How We Use Information",
        body: "AvenueBoard may use information to provide accounts, workspace access, payment-related workflows, document storage, statements, support, product security, communications, and service improvements.",
      },
      {
        title: "How We Share Information",
        body: "AvenueBoard may share information with authorized users, service providers, payment processors, hosting providers, support tools, analytics providers, and authorities when required or appropriate.",
      },
      {
        title: "Data Security",
        body: "AvenueBoard uses reasonable technical and organizational safeguards designed to protect information, but no system can be guaranteed to be completely secure.",
      },
      {
        title: "Data Retention",
        body: "AvenueBoard may retain information as needed to provide services, support records, maintain business operations, comply with obligations, and improve reliability.",
      },
      {
        title: "Your Choices",
        body: "Users may be able to update profile details, manage certain settings, request support, access available records, or change communication preferences through the platform.",
      },
      {
        title: "Cookies and Analytics",
        body: "AvenueBoard may use cookies, local storage, and analytics tools to support authentication, remember preferences, measure product usage, improve performance, and protect the service.",
      },
      {
        title: "Changes to Policy",
        body: "AvenueBoard may update this Privacy Policy as the product, service providers, legal requirements, or privacy practices evolve.",
      },
      {
        title: "Contact",
        body: "Questions about this Privacy Policy can be directed through the Help Center or support contact methods made available in AvenueBoard.",
      },
    ],
  },
  security: {
    group: "trust",
    title: "Security",
    description:
      "A working overview of AvenueBoard security practices and the safeguards used to support rental workspace trust.",
    sections: [
      {
        title: "Platform Protection",
        body: "AvenueBoard is designed to use trusted infrastructure, authenticated access, role-aware data visibility, and secure service providers where appropriate.",
      },
      {
        title: "Account Access",
        body: "Users should keep login credentials secure, use trusted devices, and sign out when using shared computers. AvenueBoard may rely on authentication providers and access checks to protect account sessions.",
      },
      {
        title: "Payment Security",
        body: "Payment method collection and processing may be handled by payment providers such as Stripe. AvenueBoard should not directly store full card or bank account details unless specifically supported by a secure provider workflow.",
      },
      {
        title: "Data Access",
        body: "Rental workspace data should be visible only to authorized users based on account role, accepted resident access, landlord ownership, and configured permissions.",
      },
      {
        title: "Reporting Concerns",
        body: "Security questions or concerns can be reported through the Help Center or support contact methods made available by AvenueBoard.",
      },
    ],
  },
  "cookie-policy": {
    group: "trust",
    title: "Cookie Policy",
    description:
      "A working overview of how AvenueBoard may use cookies, local storage, and similar technologies.",
    sections: [
      {
        title: "What Cookies Do",
        body: "Cookies and similar technologies can help AvenueBoard remember sessions, support login, maintain preferences, measure usage, and improve product reliability.",
      },
      {
        title: "Essential Cookies",
        body: "Some cookies or local storage items may be necessary for authentication, security, routing, and core platform functionality.",
      },
      {
        title: "Analytics and Performance",
        body: "AvenueBoard may use analytics tools to understand product usage, troubleshoot performance, and improve the user experience.",
      },
      {
        title: "Your Choices",
        body: "Browser settings may allow users to block, clear, or manage cookies. Some AvenueBoard features may not work correctly if essential cookies are disabled.",
      },
      {
        title: "Updates",
        body: "This Cookie Policy may be updated as AvenueBoard adds or changes tools, service providers, or product experiences.",
      },
    ],
  },
  accessibility: {
    group: "trust",
    title: "Accessibility",
    description:
      "A working overview of AvenueBoard accessibility goals for public pages and product experiences.",
    sections: [
      {
        title: "Our Goal",
        body: "AvenueBoard aims to make rental management tools clear, usable, and accessible for landlords, property managers, and residents.",
      },
      {
        title: "Design Approach",
        body: "AvenueBoard works toward readable typography, clear navigation, sufficient contrast, responsive layouts, and predictable interaction patterns.",
      },
      {
        title: "Assistive Technology",
        body: "AvenueBoard aims to support common browser and assistive technology patterns where practical, including keyboard navigation and semantic page structure.",
      },
      {
        title: "Ongoing Improvements",
        body: "Accessibility is an ongoing product effort. AvenueBoard may update pages and workflows as the platform evolves.",
      },
      {
        title: "Feedback",
        body: "Users can share accessibility feedback through the Help Center or support contact methods made available by AvenueBoard.",
      },
    ],
  },
};

function getLegalTrustSection(value: string | null): LegalTrustSectionId {
  if (
    value === "terms-of-service" ||
    value === "privacy-policy" ||
    value === "security" ||
    value === "cookie-policy" ||
    value === "accessibility"
  ) {
    return value;
  }

  return "terms-of-service";
}

export function LegalTrustPage() {
  const searchParams = useSearchParams();
  const activeSection = getLegalTrustSection(searchParams.get("section"));
  const content = legalTrustContent[activeSection];
  const visibleTabs = legalTrustSections[content.group].links;

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader
        variant="legal"
        activeNav={content.group === "legal" ? "legal" : "trust"}
      />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center px-5 sm:px-7 lg:px-16">
          <nav
            className="min-w-0 flex-1 overflow-x-auto"
            aria-label="Legal and trust sections"
          >
            <div className="flex min-w-max items-center gap-10">
              {visibleTabs.map((tab: PublicPageLink) => {
                const active = activeSection === tab.id;

                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`relative flex h-16 items-center whitespace-nowrap text-[15px] font-semibold transition ${
                      active
                        ? "text-slate-950"
                        : "text-zinc-600 hover:text-slate-950"
                    }`}
                  >
                    {tab.label}
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
            {content.group === "legal" ? "Legal" : "Trust"}
          </p>
          <h1 className="mt-5 text-[44px] font-medium leading-[0.98] tracking-[-0.07em] text-[#050A1F] sm:text-[58px]">
            {content.title}
          </h1>
          <p className="mt-5 max-w-[760px] text-[16px] font-medium leading-8 text-zinc-500 sm:text-[17px]">
            {content.description}
          </p>
          <p className="mt-5 max-w-[760px] rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px] font-medium leading-6 text-amber-900">
            This page is a working draft and should be reviewed by legal counsel
            before public launch.
          </p>
          <p className="mt-3 text-[13px] font-medium text-zinc-400">
            Last updated: June 2026
          </p>
        </div>

        <div className="mt-14 max-w-[920px] divide-y divide-zinc-200 border-y border-zinc-200">
          {content.sections.map((section) => (
            <section
              key={section.title}
              className="grid gap-5 py-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10"
            >
              <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
                {section.title}
              </h2>
              <p className="text-[16px] leading-8 text-zinc-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
