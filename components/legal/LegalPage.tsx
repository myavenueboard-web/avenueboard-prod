import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";

type LegalPageKind = "terms" | "privacy";

type LegalSection = {
  title: string;
  body: string;
};

const legalTabs = [
  { id: "terms", label: "Terms of Service", href: "/terms-of-service" },
  { id: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
] as const;

const termsSections: LegalSection[] = [
  {
    title: "Introduction",
    body: "These Terms of Service describe the working rules for using AvenueBoard. AvenueBoard provides software tools that help landlords, property managers, and residents organize rental information, access, communications, payments, documents, statements, and related support workflows.",
  },
  {
    title: "Eligibility",
    body: "You should use AvenueBoard only if you are able to form a binding agreement and are authorized to use the rental workspace you access. If you use AvenueBoard on behalf of a property owner, business, or organization, you are responsible for confirming that you have the right to do so.",
  },
  {
    title: "Accounts and Access",
    body: "You are responsible for keeping your account credentials secure and for activity that occurs through your account. Landlord and resident access may depend on invitations, accepted workspace access, user roles, property records, and account verification steps.",
  },
  {
    title: "Landlord and Resident Use",
    body: "Landlords and property managers may use AvenueBoard to organize rental operations, invite residents, maintain property records, store documents, and track activity. Residents may use AvenueBoard to view rental information shared with them, manage account settings, access statements, review documents, and communicate through supported workflows.",
  },
  {
    title: "Payments and AutoPay",
    body: "Payment and AutoPay features may be processed by third-party providers such as Stripe. AvenueBoard may display payment status, payment methods, rent cycles, Resident Platform Fees, card processing fees, and related records based on available platform data. AvenueBoard is not a bank, lender, payment card issuer, or money transmitter unless specifically stated by applicable terms from a licensed provider.",
  },
  {
    title: "Statements and Records",
    body: "AvenueBoard may generate rent payment statements or records based on completed payment information available in the platform. These records are provided for convenience and record-keeping only and should not be treated as tax, legal, credit, lending, or accounting advice.",
  },
  {
    title: "Documents and Communications",
    body: "Users may upload, store, and share documents, notes, and communications through AvenueBoard. Users are responsible for ensuring they have the right to upload, share, view, or rely on any content they add to the platform.",
  },
  {
    title: "Avenue Perks and Credit Building",
    body: "Avenue Perks and credit-building features may include partner-enabled, planned, or limited-availability experiences. Offers, eligibility, availability, and partner terms may change. AvenueBoard does not guarantee credit outcomes, savings, approvals, or third-party offer availability.",
  },
  {
    title: "Acceptable Use",
    body: "You may not misuse AvenueBoard, attempt to access accounts or data without permission, upload harmful content, interfere with platform security, use the service for unlawful activity, or submit information that you do not have permission to provide.",
  },
  {
    title: "Disclaimers",
    body: "AvenueBoard provides software and informational tools. AvenueBoard does not provide legal, tax, financial, credit, lending, insurance, accounting, or real estate brokerage advice. Users should consult qualified professionals before making decisions that require professional guidance.",
  },
  {
    title: "Limitation of Liability",
    body: "To the extent permitted by law, AvenueBoard is not responsible for indirect, incidental, special, consequential, or punitive damages, or for losses related to user-provided information, third-party services, payment processors, partner offers, or unavailable platform features.",
  },
  {
    title: "Changes to Terms",
    body: "AvenueBoard may update these Terms from time to time as the product, legal requirements, or business operations evolve. Updated terms may be posted on this page with a revised effective date.",
  },
  {
    title: "Contact",
    body: "Questions about these Terms can be directed to AvenueBoard through the Help Center or by using the support contact methods made available in the platform.",
  },
];

const privacySections: LegalSection[] = [
  {
    title: "Introduction",
    body: "This Privacy Policy explains, in draft form, how AvenueBoard may collect, use, share, and protect information when users access AvenueBoard websites, accounts, rental workspaces, support tools, payment-related workflows, and connected product experiences.",
  },
  {
    title: "Information We Collect",
    body: "AvenueBoard may collect information that users provide directly, information generated through use of the platform, information from invited rental workspaces, and limited technical information needed to operate, secure, and improve the service.",
  },
  {
    title: "Account Information",
    body: "Account information may include name, email address, phone number, profile details, authentication provider information, account role, workspace access, support case history, settings, and related account activity.",
  },
  {
    title: "Property and Lease Information",
    body: "AvenueBoard may process property names, addresses, unit details, lease dates, rent amounts, resident access records, landlord contact details, property contacts, lease status, and related rental workspace information.",
  },
  {
    title: "Payment Information",
    body: "Payment workflows may involve payment status, rent cycle information, payment method labels, last four digits, processor identifiers, Resident Platform Fees, card processing fees, receipts, and statement records. Sensitive card or bank details are expected to be handled by payment processors rather than stored directly by AvenueBoard.",
  },
  {
    title: "Documents and Notes",
    body: "Users may upload documents, create notes, share records, and store files connected to a rental workspace. AvenueBoard may process this content to make it available to authorized users and support platform features.",
  },
  {
    title: "How We Use Information",
    body: "AvenueBoard may use information to provide accounts, rental workspace access, payment-related workflows, document storage, statements, support, product security, user communications, service improvements, and compliance-related operations.",
  },
  {
    title: "How We Share Information",
    body: "AvenueBoard may share information with authorized landlords, residents, service providers, payment processors, hosting providers, support tools, analytics providers, business operations vendors, and authorities when required by law or needed to protect the platform.",
  },
  {
    title: "Data Security",
    body: "AvenueBoard uses reasonable technical and organizational safeguards designed to protect information. No method of transmission, storage, or processing can be guaranteed to be completely secure.",
  },
  {
    title: "Data Retention",
    body: "AvenueBoard may retain information for as long as needed to provide the service, support rental records, maintain business records, resolve disputes, comply with legal obligations, and improve platform reliability.",
  },
  {
    title: "Your Choices",
    body: "Users may be able to update profile details, manage certain settings, request support, access available records, or change communication preferences through the platform. Some records may be retained where required for security, compliance, or legitimate business purposes.",
  },
  {
    title: "Cookies and Analytics",
    body: "AvenueBoard may use cookies, local storage, and analytics tools to support authentication, remember preferences, measure product usage, improve performance, and protect the service.",
  },
  {
    title: "Changes to Policy",
    body: "AvenueBoard may update this Privacy Policy as the product, service providers, legal requirements, or privacy practices evolve. Updated versions may be posted on this page with a revised effective date.",
  },
  {
    title: "Contact",
    body: "Questions about this Privacy Policy can be directed to AvenueBoard through the Help Center or by using the support contact methods made available in the platform.",
  },
];

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const isTerms = kind === "terms";
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const sections = isTerms ? termsSections : privacySections;

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader />

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center px-5 sm:px-7 lg:px-16">
          <nav
            className="min-w-0 flex-1 overflow-x-auto"
            aria-label="Legal pages"
          >
            <div className="flex min-w-max items-center gap-10">
              {legalTabs.map((tab) => {
                const active = tab.id === kind;

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
            AvenueBoard Legal
          </p>
          <h1 className="mt-5 text-[44px] font-medium leading-[0.98] tracking-[-0.07em] text-[#050A1F] sm:text-[58px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[720px] text-[16px] font-medium leading-8 text-zinc-500 sm:text-[17px]">
            This page is a working draft and should be reviewed by legal counsel
            before public launch.
          </p>
          <p className="mt-3 text-[13px] font-medium text-zinc-400">
            Last updated: June 2026
          </p>
        </div>

        <div className="mt-14 max-w-[920px] divide-y divide-zinc-200 border-y border-zinc-200">
          {sections.map((section) => (
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

        <div className="mt-12 flex flex-wrap gap-4 text-[14px] font-semibold">
          <Link
            href="/help-center"
            className="text-slate-700 transition hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            Help Center
          </Link>
          <Link
            href={isTerms ? "/privacy-policy" : "/terms-of-service"}
            className="text-slate-700 transition hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            {isTerms ? "Privacy Policy" : "Terms of Service"}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
