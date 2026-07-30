"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CookiePreferencesButton,
  PrivacyPreferencesPageControls,
} from "@/components/cookie-consent/CookieConsent";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import {
  legalTrustSections,
  type PublicPageLink,
} from "@/components/public-pages/publicPageNavigation";

type LegalTrustSectionId =
  | "terms-of-service"
  | "privacy-policy"
  | "cookie-policy"
  | "privacy-preferences";

type LegalTrustContent = {
  group: "legal" | "trust";
  title: string;
  description: string;
  sections: { title: string; body: string }[];
  lastUpdated?: string;
};

const COOKIE_POLICY_LAST_UPDATED = "July 23, 2026";
const DEFAULT_LEGAL_TRUST_SECTION: LegalTrustSectionId = "privacy-policy";
const LEGAL_READING_ARTICLE_CLASS = "mx-auto w-full max-w-[950px] pb-10";

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
      "Learn how AvenueBoard collects, uses, shares, and protects personal information.",
    lastUpdated: COOKIE_POLICY_LAST_UPDATED,
    sections: [],
  },
  "cookie-policy": {
    group: "trust",
    title: "Cookie Policy",
    description:
      "This Cookie Policy explains how AvenueBoard uses cookies and similar technologies when you visit or use our website and services.",
    lastUpdated: COOKIE_POLICY_LAST_UPDATED,
    sections: [
      {
        title: "About This Cookie Policy",
        body: "This Cookie Policy applies to the AvenueBoard website and web application.",
      },
      {
        title: "Why We Use Cookies",
        body: "AvenueBoard uses cookies and similar technologies to provide a secure and reliable experience for landlords, residents, and other users of our platform.",
      },
      {
        title: "Managing Your Privacy Preferences",
        body: "AvenueBoard allows you to control the use of optional technologies through the Privacy Preferences panel.",
      },
      {
        title: "Changes to This Policy",
        body: "We may update this Cookie Policy from time to time as our services, technologies, or legal obligations evolve.",
      },
    ],
  },
  "privacy-preferences": {
    group: "trust",
    title: "Privacy Preferences",
    description:
      "Choose how AvenueBoard uses optional technologies. Essential technologies are always active because they are required to keep the platform secure and functioning properly.",
    lastUpdated: COOKIE_POLICY_LAST_UPDATED,
    sections: [
      {
        title: "Essential Technologies",
        body: "Always active technologies are required for authentication, security, session management, invitations, payment onboarding, and saving your privacy choices.",
      },
      {
        title: "Analytics Technologies",
        body: "Analytics technologies help us understand product usage and improve performance. AvenueBoard does not currently activate analytics technologies.",
      },
      {
        title: "Marketing Technologies",
        body: "Marketing technologies may support campaign measurement, affiliate attribution, or relevant promotions in the future. AvenueBoard does not currently activate marketing technologies.",
      },
    ],
  },
};

function getLegalTrustSection(value: string | null): LegalTrustSectionId {
  if (
    value === "terms-of-service" ||
    value === "privacy-policy" ||
    value === "cookie-policy" ||
    value === "privacy-preferences"
  ) {
    return value;
  }

  if (value === "security" || value === "accessibility") {
    return "privacy-preferences";
  }

  return DEFAULT_LEGAL_TRUST_SECTION;
}

function TermsOfServiceContent() {
  const termsLinkClass =
    "font-semibold text-[#0F172A] decoration-zinc-300 underline-offset-4 transition hover:underline hover:decoration-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

  return (
    <article className={LEGAL_READING_ARTICLE_CLASS}>
      <header className="pt-[44px] sm:pt-[60px]">
        <h1 className="text-[31px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#050A1F] sm:text-[36px]">
          Using AvenueBoard
        </h1>
        <div className="mt-8 space-y-5 text-[17px] font-medium leading-8 text-[#3F4653] sm:text-[18px] sm:leading-9">
          <p>
            These Terms of Service explain the rules for using AvenueBoard. They
            describe your rights and responsibilities, our responsibilities, and
            the conditions that apply when you access or use the AvenueBoard
            website, applications, or services.
          </p>
          <p>
            By creating an account, accessing, or using AvenueBoard, you agree
            to these Terms of Service.
          </p>
          <p>Please read these Terms carefully before using AvenueBoard.</p>
          <p>
            These Terms form a legal agreement between you and AvenueBoard
            regarding your access to and use of our services.
          </p>
        </div>
        <p className="mt-4 text-[15px] font-medium text-zinc-500">
          Last updated: July 23, 2026
        </p>
      </header>

      <div className="mt-16 space-y-20 text-[17px] leading-8 text-[#3F4653] sm:text-[18px] sm:leading-9">
        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            1. Acceptance of These Terms
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              By accessing or using AvenueBoard, you agree to be bound by these
              Terms of Service.
            </p>
            <p>
              If you do not agree with these Terms, you should not use
              AvenueBoard.
            </p>
            <p>These Terms apply to all users of the AvenueBoard platform.</p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            2. Eligibility
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              You must be at least 18 years old or the age of legal majority
              where you live to create or use an AvenueBoard account.
            </p>
            <p>
              By using AvenueBoard, you represent that you have the legal
              capacity to enter into a binding agreement.
            </p>
            <p>
              You agree to provide accurate, complete, and current information
              when creating or maintaining your account.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            3. About AvenueBoard
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard provides software that helps landlords, property
              managers, and residents manage rental properties, leases, rent
              payments, statements, expenses, communications, and related
              services.
            </p>
            <p>AvenueBoard is a technology platform.</p>
            <p>
              AvenueBoard is not a party to lease agreements between landlords
              and residents.
            </p>
            <p>
              AvenueBoard does not provide legal, financial, tax, accounting, or
              real estate advice.
            </p>
            <p>
              AvenueBoard facilitates the management of rental properties and
              related activities, but users remain solely responsible for their
              rental agreements, business decisions, communications, legal
              obligations, and compliance with applicable laws. AvenueBoard is
              not responsible for decisions made by landlords, property
              managers, residents, or other users.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            4. User Accounts
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials.
            </p>
            <p>You are responsible for all activity that occurs under your account.</p>
            <p>
              You agree to notify AvenueBoard promptly if you believe your
              account has been accessed without authorization.
            </p>
            <p>
              We may suspend or restrict access where necessary to protect the
              platform or other users.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            5. Landlord and Property Manager Responsibilities
          </h2>
          <div className="mt-6 space-y-5">
            <p>Landlords and property managers are responsible for:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Maintaining accurate property information.</li>
              <li>Providing accurate lease and payment information.</li>
              <li>
                Ensuring they have the authority to manage the properties and
                information submitted through AvenueBoard.
              </li>
              <li>
                Complying with applicable housing, rental, financial, and
                privacy laws.
              </li>
              <li>
                Obtaining any permissions or authorizations required before
                providing information relating to residents or other
                individuals.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            6. Resident Responsibilities
          </h2>
          <div className="mt-6 space-y-5">
            <p>Residents are responsible for:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Providing accurate information.</li>
              <li>Reviewing payment information before submitting payments.</li>
              <li>Maintaining the security of their account.</li>
              <li>Using AvenueBoard only for lawful purposes.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            7. Payments
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard supports payment-related services through third-party
              payment providers.
            </p>
            <p>
              Payment processing, settlement timing, verification, disputes,
              refunds, and related services may depend upon those providers.
            </p>
            <p>Processing times may vary.</p>
            <p>
              AvenueBoard is not a bank or financial institution and does not
              guarantee uninterrupted payment processing or specific settlement
              times.
            </p>
            <p>
              AvenueBoard is not responsible for payment delays, failed
              transactions, banking interruptions, or payment-provider outages
              that are outside our reasonable control.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            8. Fees
          </h2>
          <div className="mt-6 space-y-5">
            <p>Any applicable fees will be presented before a transaction is completed.</p>
            <p>By completing a transaction, you agree to any disclosed fees.</p>
            <p>
              AvenueBoard may update pricing or introduce new services in the
              future. Any material pricing changes will be communicated before
              they apply.
            </p>
            <p>
              Continued use of paid services after revised pricing becomes
              effective constitutes acceptance of the updated pricing.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            9. Acceptable Use
          </h2>
          <div className="mt-6 space-y-5">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Violate any applicable law.</li>
              <li>Submit false or misleading information.</li>
              <li>Access accounts or information without authorization.</li>
              <li>
                Attempt to interfere with the operation or security of
                AvenueBoard.
              </li>
              <li>
                Reverse engineer, copy, or misuse the platform except as
                permitted by law.
              </li>
              <li>Upload malicious software or harmful code.</li>
              <li>Use AvenueBoard to commit fraud or facilitate unlawful activity.</li>
              <li>
                Attempt to scrape, harvest, or collect information from
                AvenueBoard without authorization.
              </li>
              <li>
                Use automated tools, bots, scripts, or similar technologies to
                interfere with, overload, disrupt, or improperly access the
                platform.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            10. User Content
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              You retain ownership of information and content that you submit to
              AvenueBoard.
            </p>
            <p>
              You grant AvenueBoard the limited rights necessary to host, store,
              process, display, transmit, and use that content solely for the
              purpose of operating and providing the services.
            </p>
            <p>
              You represent that you have the necessary rights to provide any
              information you upload or submit.
            </p>
            <p>
              You remain solely responsible for the accuracy, legality,
              completeness, and content of any information or material you submit
              through AvenueBoard.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            11. Intellectual Property
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard and its content, software, branding, trademarks,
              logos, designs, and related intellectual property are owned by
              AvenueBoard or its licensors.
            </p>
            <p>
              These Terms do not grant you ownership of any AvenueBoard
              intellectual property.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            12. Availability
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              We work to provide a reliable service but do not guarantee
              uninterrupted availability.
            </p>
            <p>
              Maintenance, updates, technical issues, or events beyond our
              reasonable control may temporarily affect access to the platform.
            </p>
            <p>
              We may add, remove, improve, modify, suspend, or discontinue
              features where reasonably necessary to improve the platform,
              maintain security, comply with legal obligations, or support the
              continued operation of AvenueBoard.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            13. Third-Party Services
          </h2>
          <div className="mt-6 space-y-5">
            <p>Some AvenueBoard functionality depends upon third-party services.</p>
            <p>Those services operate under their own terms and privacy practices.</p>
            <p>
              AvenueBoard is not responsible for third-party services that it
              does not control.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            14. Termination
          </h2>
          <div className="mt-6 space-y-5">
            <p>You may stop using AvenueBoard at any time.</p>
            <p>
              AvenueBoard may suspend or terminate accounts that violate these
              Terms, present security risks, or misuse the platform.
            </p>
            <p>
              Termination does not automatically eliminate obligations that
              arose before termination.
            </p>
            <p>
              Termination of an account does not automatically remove historical
              records that AvenueBoard is required or permitted to retain for
              legitimate business purposes, legal obligations, security, fraud
              prevention, dispute resolution, or recordkeeping.
            </p>
            <p>
              Certain provisions of these Terms, including those relating to
              intellectual property, disclaimers, limitation of liability,
              indemnification, and any obligations that by their nature should
              survive termination, will continue to apply after your account or
              access to the platform has ended.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            15. Disclaimers
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard is provided on an &quot;as available&quot; and
              &quot;as is&quot; basis to the extent permitted by applicable law.
            </p>
            <p>
              We do not guarantee that the platform will always be
              uninterrupted, error-free, or available at every moment.
            </p>
            <p>
              To the fullest extent permitted by applicable law, AvenueBoard
              makes no warranties, whether express or implied, regarding the
              availability, reliability, accuracy, or suitability of the platform
              for any particular purpose.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            16. Limitation of Liability
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              To the fullest extent permitted by applicable law, AvenueBoard
              shall not be liable for indirect, incidental, consequential,
              special, exemplary, or punitive damages arising from or relating
              to the use of the platform.
            </p>
            <p>
              Nothing in these Terms limits liability where such limitation is
              prohibited by applicable law.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            17. Indemnification
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              You agree to indemnify and hold AvenueBoard harmless from claims,
              liabilities, damages, losses, and expenses arising from:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Your use of the platform.</li>
              <li>Your violation of these Terms.</li>
              <li>Information or content you submit.</li>
              <li>Your violation of another person&apos;s rights or applicable law.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            18. Changes to These Terms
          </h2>
          <div className="mt-6 space-y-5">
            <p>We may update these Terms of Service from time to time.</p>
            <p>
              When we make material changes, we will update the &quot;Last
              updated&quot; date shown on this page and, where appropriate,
              provide additional notice.
            </p>
            <p>
              Your continued use of AvenueBoard after updated Terms become
              effective constitutes acceptance of the updated Terms.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            19. Contact Us
          </h2>
          <p className="mt-6">
            If you have any questions about these Terms of Service, please
            contact us at{" "}
            <a href="mailto:support@avenueboard.com" className={termsLinkClass}>
              support@avenueboard.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

function PrivacyPolicyContent() {
  const policyLinkClass =
    "font-semibold text-[#0F172A] decoration-zinc-300 underline-offset-4 transition hover:underline hover:decoration-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

  return (
    <article className={LEGAL_READING_ARTICLE_CLASS}>
      <header className="pt-[44px] sm:pt-[60px]">
        <h1 className="text-[31px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#050A1F] sm:text-[36px]">
          How AvenueBoard handles your information
        </h1>
        <div className="mt-8 space-y-5 text-[17px] font-medium leading-8 text-[#3F4653] sm:text-[18px] sm:leading-9">
          <p>
            This Privacy Policy explains how AvenueBoard collects, uses, shares,
            retains, and protects personal information when you visit our
            website, create or use an account, access our services, or otherwise
            interact with AvenueBoard.
          </p>
          <p>
            It also explains the choices and rights that may be available to you
            regarding your personal information.
          </p>
          <p>
            We believe transparency is an important part of earning and
            maintaining your trust.
          </p>
        </div>
        <p className="mt-4 text-[15px] font-medium text-zinc-500">
          Last updated: July 23, 2026
        </p>
      </header>

      <div className="mt-16 space-y-20 text-[17px] leading-8 text-[#3F4653] sm:text-[18px] sm:leading-9">
        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            About This Privacy Policy
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              This Privacy Policy applies to the AvenueBoard website, web
              application, and related services.
            </p>
            <p>
              It applies to landlords, property managers, residents, invited
              users, prospective users, and other individuals who interact with
              AvenueBoard.
            </p>
            <p>
              This Privacy Policy does not apply to third-party websites,
              applications, or services that may be linked to or integrated with
              AvenueBoard and that operate under their own privacy practices.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Information We Collect
          </h2>
          <div className="mt-6 space-y-8">
            <p>
              The information we collect depends on how you use AvenueBoard and
              the services you choose to use.
            </p>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Account and Contact Information
              </h3>
              <p className="mt-3">
                We may collect information such as your name, email address,
                telephone number, account preferences, profile details,
                authentication information, and other information you provide
                when creating or managing an account.
              </p>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Property and Rental Information
              </h3>
              <p className="mt-3">
                We may collect information needed to support property and rental
                management, including property addresses, unit information,
                rental amounts, lease dates, occupancy information,
                property-related expenses, payment status, documents, and other
                records entered into or generated through the platform.
              </p>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Resident and Invitation Information
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  When a landlord or property manager invites a resident to
                  AvenueBoard, we may receive or collect information such as the
                  resident&apos;s name, contact information, invitation status,
                  property association, lease-related details, and account
                  activity.
                </p>
                <p>
                  Landlords and property managers are responsible for ensuring
                  that they are authorized to provide personal information about
                  residents, applicants, occupants, or other individuals to
                  AvenueBoard.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Payment and Transaction Information
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We may collect information necessary to initiate, process,
                  document, reconcile, or support rent payments, fees, payouts,
                  refunds, bank-account onboarding, and related transactions.
                </p>
                <p>
                  AvenueBoard does not store complete payment card numbers or
                  online-banking credentials. Payment and financial information
                  is collected and processed by the applicable payment service
                  provider. AvenueBoard may receive limited or masked details
                  and transaction records needed to provide and support
                  payment-related features.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Identity and Verification Information
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  Payment and financial-service providers may collect identity,
                  account, business, or verification information needed to
                  establish payment services, prevent fraud, and satisfy
                  requirements applicable to their services. AvenueBoard may
                  receive verification status or limited related information
                  needed to support the account.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Communications and Support Information
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We collect information you provide when contacting support,
                  submitting a request, reporting a problem, responding to a
                  message, communicating through AvenueBoard, or otherwise
                  corresponding with us.
                </p>
                <p>
                  This may include message content, contact details, support
                  history, and information needed to investigate and resolve a
                  request.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Device, Usage, and Technical Information
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We may collect limited technical information necessary to
                  operate, secure, troubleshoot, and improve AvenueBoard.
                </p>
                <p>
                  This may include browser type, device type, operating system,
                  network information, login activity, timestamps, pages or
                  features accessed, error information, security events, and
                  interactions with the platform.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Cookies and Similar Technologies
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We use cookies and similar technologies to support
                  authentication, security, privacy-preference storage, session
                  management, and other core platform functionality.
                </p>
                <p>
                  Optional technologies are controlled through Privacy
                  Preferences where applicable.
                </p>
                <p>
                  For more information, review the AvenueBoard{" "}
                  <Link
                    href="/legal?section=cookie-policy"
                    className={policyLinkClass}
                  >
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Information From Service Providers and Other Sources
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We may receive information from service providers and other
                  parties that support functions such as authentication,
                  payments, account verification, communications, fraud
                  prevention, security, property-address validation, and
                  platform operations.
                </p>
                <p>
                  We may also receive information from landlords, property
                  managers, residents, or other users when they invite someone,
                  associate a person with a property or lease, submit a support
                  request, or use collaborative platform features.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            How We Use Information
          </h2>
          <div className="mt-6 space-y-5">
            <p>AvenueBoard may use personal information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, operate, maintain, and improve the platform.</li>
              <li>Create, authenticate, and manage user accounts.</li>
              <li>
                Support property, lease, resident, payment, expense, statement,
                and related platform functionality.
              </li>
              <li>
                Facilitate rent payments, fees, payouts, refunds, and other
                supported transactions.
              </li>
              <li>
                Process invitations and connect authorized users with
                properties, leases, and accounts.
              </li>
              <li>
                Generate records, receipts, statements, notifications, and
                account activity information.
              </li>
              <li>
                Communicate with users about accounts, payments, requests,
                updates, support matters, and service-related notices.
              </li>
              <li>
                Verify account information and satisfy applicable payment,
                fraud-prevention, risk, or authorization requirements.
              </li>
              <li>
                Detect, investigate, and prevent fraud, misuse, unauthorized
                access, security incidents, and violations of our terms.
              </li>
              <li>
                Troubleshoot errors and improve reliability, performance,
                accessibility, and user experience.
              </li>
              <li>
                Maintain business records, resolve disputes, enforce
                agreements, and protect AvenueBoard, our users, and others.
              </li>
              <li>
                Comply with legal obligations and respond to lawful requests.
              </li>
              <li>
                Carry out other purposes disclosed to you when information is
                collected or with your permission.
              </li>
            </ul>
            <p>
              We use personal information only for purposes reasonably related
              to operating, securing, supporting, and improving AvenueBoard and
              providing the services requested by users.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            How We Share Information
          </h2>
          <div className="mt-6 space-y-8">
            <p>
              AvenueBoard does not sell or rent personal information. We share
              information only when it is reasonably necessary to operate our
              services, fulfill your requests, comply with legal obligations, or
              protect AvenueBoard, our users, and others.
            </p>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Between Authorized Platform Users
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  Information may be shared between landlords, property
                  managers, residents, and other authorized users when necessary
                  to provide the platform&apos;s rental-management and
                  payment-related features.
                </p>
                <p>
                  For example, a resident may be able to view information
                  related to a lease, rent amount, payment status, receipt,
                  statement, property, or landlord account. A landlord or
                  property manager may be able to view resident, lease, payment,
                  invitation, and account-related information associated with
                  properties they are authorized to manage.
                </p>
                <p>
                  Users should provide access only to individuals who are
                  authorized to view the applicable information.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Service Providers
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We may share information with service providers that perform
                  functions on our behalf, including authentication, hosting,
                  data storage, payment processing, account verification,
                  communications, customer support, security, fraud prevention,
                  address services, document handling, and platform operations.
                </p>
                <p>
                  These providers may access information only as necessary to
                  perform their services, satisfy applicable requirements, or as
                  otherwise permitted by law.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Payment and Financial Services
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  Information may be shared with payment and financial-service
                  providers to facilitate transactions, verify accounts, support
                  payouts, prevent fraud, handle disputes or refunds, and
                  satisfy financial, identity, risk, or compliance requirements.
                </p>
                <p>
                  AvenueBoard does not control all information collected
                  directly by a payment or financial-service provider through
                  its own hosted experience. That provider&apos;s privacy policy
                  applies to information it collects directly.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Legal Obligations and Protection
              </h3>
              <div className="mt-3 space-y-5">
                <p>
                  We may disclose information when we reasonably believe
                  disclosure is required to:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Comply with applicable law, regulation, legal process, or a
                    lawful government request.
                  </li>
                  <li>Enforce our agreements or policies.</li>
                  <li>
                    Detect, investigate, or prevent fraud, security incidents,
                    misuse, or unlawful activity.
                  </li>
                  <li>
                    Protect the rights, property, safety, and security of
                    AvenueBoard, our users, service providers, or others.
                  </li>
                  <li>Establish, exercise, or defend legal claims.</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Business Transfers
              </h3>
              <p className="mt-3">
                If AvenueBoard is involved in a merger, acquisition, financing,
                reorganization, sale of assets, bankruptcy, or similar business
                transaction, information may be disclosed or transferred as part
                of that transaction, subject to applicable law and appropriate
                confidentiality protections.
              </p>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                With Your Direction or Consent
              </h3>
              <p className="mt-3">
                We may disclose information when you direct us to do so,
                authorize a connection or transaction, request that information
                be shared, or otherwise provide consent.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Your Information Is Not Sold
          </h2>
          <div className="mt-6 space-y-5">
            <p>AvenueBoard does not sell or rent your personal information.</p>
            <p>
              We do not share personal information with third parties in
              exchange for money.
            </p>
            <p>
              We use and disclose personal information only as reasonably
              necessary to provide and operate our services, process payments,
              manage accounts and rental activity, communicate with users,
              protect the platform, prevent fraud and misuse, comply with legal
              obligations, and improve the reliability of our services.
            </p>
            <p>
              Service providers that process information for AvenueBoard are
              permitted to use it only as necessary to provide their services,
              satisfy applicable obligations, or as otherwise allowed by law.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            How We Protect Information
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard uses reasonable administrative, technical, and
              organizational safeguards designed to help protect personal
              information against unauthorized access, use, disclosure,
              alteration, or destruction.
            </p>
            <p>
              These safeguards may include secure authentication, encrypted
              communications, access controls, account and session protections,
              and the use of trusted service providers that support the secure
              operation of the platform.
            </p>
            <p>
              Access to personal information is limited to authorized users,
              personnel, and service providers who require it to perform
              legitimate business functions or provide services on behalf of
              AvenueBoard.
            </p>
            <p>
              Payment-related information is handled using secure payment
              workflows and trusted payment service providers where applicable.
            </p>
            <p>
              No method of transmission over the internet or method of
              electronic storage can be guaranteed to be completely secure.
              While AvenueBoard works to protect personal information, we cannot
              guarantee absolute security.
            </p>
            <p>
              Users are responsible for maintaining the confidentiality of their
              login credentials and for notifying AvenueBoard promptly if they
              believe their account has been accessed or used without
              authorization.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Data Retention
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard retains personal information for as long as reasonably
              necessary to provide the services, maintain accounts and records,
              complete transactions, satisfy contractual and legal obligations,
              resolve disputes, prevent fraud, enforce agreements, and protect
              the platform.
            </p>
            <p>
              Retention periods may vary based on the type of information, the
              services involved, the status of an account or lease, legal
              requirements, payment and financial recordkeeping obligations, and
              legitimate business needs.
            </p>
            <p>
              When information is no longer reasonably required, AvenueBoard may
              delete it, de-identify it, or retain it in a restricted form where
              necessary for legal, security, backup, fraud-prevention, or
              recordkeeping purposes.
            </p>
            <p>
              Deleting an account may not result in the immediate deletion of
              every record. Certain information may be retained where reasonably
              necessary to complete pending transactions, maintain financial or
              legal records, resolve disputes, enforce agreements, protect
              users, or comply with applicable obligations.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Your Privacy Choices and Rights
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Depending on where you live and the law that applies, you may have
              certain rights or choices regarding your personal information.
            </p>
            <p>These may include the ability to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access certain personal information associated with you.</li>
              <li>Correct inaccurate or incomplete account information.</li>
              <li>Request deletion of certain personal information.</li>
              <li>
                Obtain information about how personal information is collected,
                used, or disclosed.
              </li>
              <li>Manage cookie and optional technology preferences.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>
                Object to or request limits on certain uses of personal
                information where applicable.
              </li>
              <li>
                Request a portable copy of certain information where applicable.
              </li>
              <li>
                Appeal a decision regarding a privacy request where required by
                law.
              </li>
            </ul>
            <p>
              You can update certain account information directly through
              AvenueBoard. For other requests, contact us using the information
              in the Contact Us section.
            </p>
            <p>
              We may need to verify your identity before completing a request.
              We may also need information that helps us identify the account,
              property, lease, transaction, or records connected to the request.
            </p>
            <p>
              Authorized agents may submit requests where permitted by
              applicable law. We may require evidence of the agent&apos;s
              authority and may verify the request directly with the individual
              concerned.
            </p>
            <p>
              Privacy rights are not absolute. We may deny or limit a request
              where permitted by law, including when information must be retained
              to complete a transaction, provide a requested service, protect
              security, prevent fraud, comply with law, maintain required
              records, or establish or defend legal claims.
            </p>
            <p>
              AvenueBoard will not discriminate against an individual for
              exercising a privacy right provided by applicable law.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Account Information and Deletion
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Users may update certain account and profile information through
              the available account settings.
            </p>
            <p>
              Users may request account deletion by contacting AvenueBoard using
              the information in the Contact Us section.
            </p>
            <p>
              Before processing a deletion request, we may verify the
              requestor&apos;s identity and authority. We may also require that
              pending transactions, active disputes, account balances, property
              or lease responsibilities, or other unresolved obligations be
              addressed.
            </p>
            <p>
              Account deletion does not necessarily delete information held
              independently by another authorized user. For example, a landlord
              or property manager may retain records they are legally or
              operationally entitled to maintain, and AvenueBoard may retain
              transaction, payment, lease, security, and compliance records where
              reasonably necessary.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Landlords, Property Managers, and Resident Information
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Landlords and property managers may use AvenueBoard to enter,
              upload, generate, or manage information relating to properties,
              leases, residents, occupants, payments, expenses, and
              communications.
            </p>
            <p>
              Landlords and property managers are responsible for ensuring that
              they have an appropriate basis and authority to provide that
              information to AvenueBoard and to invite or grant access to other
              users.
            </p>
            <p>
              Residents should contact their landlord or property manager
              regarding information or decisions controlled by that landlord or
              property manager. AvenueBoard may assist with platform-related
              privacy requests but may not be able to alter records that another
              user is independently required or entitled to maintain.
            </p>
            <p>
              Users must not use AvenueBoard to collect, upload, disclose, or
              process information that they are not authorized to handle.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Communications
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard may send transactional and service-related
              communications concerning account activity, invitations, payments,
              receipts, statements, security, support requests, policy updates,
              and changes to the services.
            </p>
            <p>
              Some communications are necessary to provide the services and may
              not be optional while an account remains active.
            </p>
            <p>
              Where AvenueBoard offers optional promotional communications,
              users may unsubscribe using the method provided in the
              communication. Unsubscribing from promotional communications will
              not prevent necessary account, transaction, security, or
              service-related messages.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Cookies and Privacy Preferences
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard uses essential cookies and similar technologies to
              support secure authentication, session management,
              privacy-preference storage, payment-related workflows, and core
              platform operation.
            </p>
            <p>
              Where optional technologies are available, users can manage them
              through Privacy Preferences.
            </p>
            <p>
              For detailed information, review the AvenueBoard{" "}
              <Link
                href="/legal?section=cookie-policy"
                className={policyLinkClass}
              >
                Cookie Policy
              </Link>{" "}
              or visit{" "}
              <Link
                href="/legal?section=privacy-preferences"
                className={policyLinkClass}
              >
                Privacy Preferences
              </Link>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Third-Party Links and Services
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard may contain links to, integrations with, or features
              provided by third-party websites and services.
            </p>
            <p>
              Third parties operate under their own terms and privacy practices.
              AvenueBoard is not responsible for the content, privacy practices,
              security, or availability of third-party services that it does not
              control.
            </p>
            <p>
              We encourage users to review the applicable policies before
              providing information directly to a third party.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Children&apos;s Privacy
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard is intended for use by adults and is not directed to
              children under the age of 13.
            </p>
            <p>
              We do not knowingly collect personal information directly from
              children. If we become aware that personal information has been
              collected from a child in a manner that is inconsistent with
              applicable law, we will take reasonable steps to delete it.
            </p>
            <p>
              Information relating to minors may be provided by a parent,
              guardian, landlord, or other authorized adult where reasonably
              necessary for legitimate property or lease administration.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            United States Service
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard is currently intended for use within the United
              States.
            </p>
            <p>
              Information may be processed and stored in the United States and
              in other locations where our service providers operate, subject to
              applicable contractual, technical, and legal protections.
            </p>
            <p>
              If AvenueBoard expands its services to additional countries or
              introduces materially different international processing
              practices, this Privacy Policy may be updated accordingly.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Do Not Track and Privacy Signals
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Browser &ldquo;Do Not Track&rdquo; signals do not currently have a
              universally accepted technical or legal standard, and AvenueBoard
              does not respond to them in a uniform manner.
            </p>
            <p>
              Where AvenueBoard recognizes a supported privacy signal, such as
              Global Privacy Control, the signal will be handled in accordance
              with the functionality available in our Privacy Preferences and
              applicable requirements.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Changes to This Privacy Policy
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes to our services, technologies, business practices, or
              legal obligations.
            </p>
            <p>
              When we make changes, we will update the &ldquo;Last
              updated&rdquo; date shown on this page. If changes materially
              affect how personal information is handled, we may provide
              additional notice where appropriate.
            </p>
            <p>
              Your continued use of AvenueBoard after an updated Privacy Policy
              becomes effective is subject to the updated policy, except where
              additional consent or notice is required by applicable law.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Contact Us
          </h2>
          <p className="mt-6">
            If you have questions about this Privacy Policy or AvenueBoard&apos;s
            privacy practices, please contact us at{" "}
            <a href="mailto:support@avenueboard.com" className={policyLinkClass}>
              support@avenueboard.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

function PrivacyPreferencesContent() {
  return (
    <article className={LEGAL_READING_ARTICLE_CLASS}>
      <header className="pt-10 sm:pt-12">
        <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#050A1F] sm:text-[34px]">
          Privacy Preferences
        </h1>
        <p className="mt-6 text-[16px] font-medium leading-7 text-zinc-700 sm:text-[17px] sm:leading-8">
          Manage how AvenueBoard uses optional technologies. Essential
          technologies are always active because they are required to keep the
          platform secure and functioning properly.
        </p>
      </header>

      <div className="mt-8 text-[16px] leading-7 text-zinc-700 sm:text-[17px] sm:leading-8">
        <PrivacyPreferencesPageControls />
      </div>
    </article>
  );
}

function CookiePolicyContent() {
  return (
    <article className={LEGAL_READING_ARTICLE_CLASS}>
      <header className="pt-16 sm:pt-20">
        <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] text-[#050A1F] sm:text-[40px]">
          How AvenueBoard uses cookies
        </h1>
        <p className="mt-8 text-[17px] font-medium leading-8 text-zinc-700 sm:text-[18px] sm:leading-9">
          This Cookie Policy explains how AvenueBoard uses cookies and similar
          technologies when you visit or use our website and services. It
          describes why these technologies are used, the types of cookies and
          similar technologies we use, and the choices available to you.
        </p>
        <p className="mt-6 text-[15px] font-medium text-zinc-500">
          Last updated: {COOKIE_POLICY_LAST_UPDATED}
        </p>
      </header>

      <div className="mt-16 space-y-20 text-[17px] leading-8 text-zinc-700 sm:text-[18px] sm:leading-9">
        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            About This Cookie Policy
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              This Cookie Policy applies to the AvenueBoard website and web
              application.
            </p>
            <p>
              Cookies are small text files that are stored on your browser or
              device. They help websites remember information about your visit
              and enable important features that improve security, reliability,
              and usability.
            </p>
            <p>
              Some cookies and similar technologies are required for AvenueBoard
              to operate securely and reliably, while others are optional and
              are only used when you choose to enable them.
            </p>
            <p>
              This Cookie Policy should be read together with the AvenueBoard{" "}
              <Link
                href="/legal?section=privacy-policy"
                className="font-semibold text-slate-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-slate-950"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Why AvenueBoard Uses Cookies
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard uses cookies and similar technologies to provide a
              secure, reliable, and consistent experience for everyone who uses
              our platform.
            </p>
            <p>
              These technologies help us:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Keep users securely signed in</li>
              <li>Protect accounts and prevent unauthorized access</li>
              <li>Maintain secure sessions while using the application</li>
              <li>Remember your privacy and cookie preferences</li>
              <li>Support core website and application functionality</li>
              <li>
                Improve reliability and performance where optional technologies
                have been enabled
              </li>
            </ul>
            <p>
              Optional cookies and similar technologies are used only where
              appropriate and only after the required consent has been provided.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Types of Technologies We Use
          </h2>
          <div className="mt-7 space-y-8">
            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Essential Technologies
              </h3>
              <p className="mt-3">
                Strictly necessary technologies are essential for the operation
                and security of AvenueBoard. They support important
                functionality such as authentication, session management,
                account security, fraud prevention, payment-related processes,
                and remembering your privacy preferences.
              </p>
              <p className="mt-3">
                Because these technologies are necessary for the platform to
                function correctly, they remain active and cannot be disabled
                through the Privacy Preferences interface.
              </p>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Analytics Technologies
              </h3>
              <p className="mt-3">
                Analytics technologies help us understand how AvenueBoard is
                used so we can improve performance, usability, and reliability.
              </p>
              <p className="mt-3">
                These technologies are optional and will be used only after the
                required consent has been provided.
              </p>
              <p className="mt-3">
                AvenueBoard does not currently use optional analytics
                technologies.
              </p>
              <p className="mt-3">
                If our use of optional technologies changes in the future, this
                Cookie Policy and your Privacy Preferences will be updated
                accordingly.
              </p>
            </div>

            <div>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                Marketing Technologies
              </h3>
              <p className="mt-3">
                Marketing technologies are commonly used to measure advertising
                performance or support personalized advertising.
              </p>
              <p className="mt-3">
                AvenueBoard does not currently use advertising or behavioral
                marketing technologies.
              </p>
              <p className="mt-3">
                If this changes in the future, users will have the opportunity
                to review and update their Privacy Preferences before any
                optional marketing technologies are enabled, where required.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Essential Technologies
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard uses a limited number of essential technologies that
              support the operation and security of the platform.
            </p>
            <p>
              These technologies help us:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Maintain secure user authentication</li>
              <li>Keep users signed in while using the application</li>
              <li>Remember your Privacy Preferences</li>
              <li>Support secure payment-related functionality</li>
              <li>Protect accounts and maintain the integrity of the platform</li>
            </ul>
            <p>
              These technologies are required for the service to operate
              correctly and are not used for advertising or behavioral
              marketing.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Third-Party Services
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard works with trusted service providers that help deliver
              essential platform functionality, including secure
              authentication, payment processing, communications, and other
              services necessary to operate the platform.
            </p>
            <p>
              Where these providers use cookies or similar technologies, they do
              so only as needed to provide the services they perform on behalf
              of AvenueBoard.
            </p>
            <p>
              These providers maintain their own privacy and cookie practices in
              accordance with their respective policies.
            </p>
            <p>
              AvenueBoard does not currently use third-party advertising or
              behavioral marketing technologies.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Managing Your Privacy Preferences
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              AvenueBoard allows you to control the use of optional cookies and
              similar technologies through the Privacy Preferences panel.
            </p>
            <p>
              You may:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Accept all optional technologies</li>
              <li>Use essential technologies only</li>
              <li>Enable or disable optional categories, where available</li>
              <li>Update your preferences at any time</li>
            </ul>
            <p>
              Essential technologies remain active because they are required for
              the secure operation of the platform.
            </p>
            <p>
              <CookiePreferencesButton
                label="Open Privacy Preferences"
                className="inline-flex text-[17px] font-semibold text-slate-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:text-[18px]"
              />
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            How Long Cookies Remain
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Some cookies and similar technologies remain only for the duration
              of your browsing session, while others remain on your device for a
              longer period so your preferences can be remembered when you
              return.
            </p>
            <p>
              Your Privacy Preferences are currently remembered for
              approximately 180 days unless you change them or clear your
              browser data sooner.
            </p>
            <p>
              Clearing browser cookies may require you to sign in again or
              update your privacy preferences during a future visit.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Browser Controls
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              Most modern web browsers allow you to review, manage, or delete
              cookies through their settings.
            </p>
            <p>
              Please note that disabling essential cookies or similar
              technologies may affect authentication, security, payment-related
              functionality, or other core features of AvenueBoard.
            </p>
            <p>
              To manage optional AvenueBoard technologies, we recommend using
              the Privacy Preferences available within our website.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Changes to This Cookie Policy
          </h2>
          <div className="mt-6 space-y-5">
            <p>
              We may update this Cookie Policy from time to time as AvenueBoard
              evolves or as legal and operational requirements change.
            </p>
            <p>
              When we make material changes, we will update the &quot;Last
              updated&quot; date shown on this page. Where appropriate, we may
              also ask you to review your Privacy Preferences again.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            Contact Us
          </h2>
          <p className="mt-6">
            If you have any questions about this Cookie Policy or how
            AvenueBoard uses cookies and similar technologies, please contact us
            at{" "}
            <a
              href="mailto:support@avenueboard.com"
              className="font-semibold text-slate-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-slate-950"
            >
              support@avenueboard.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

export function LegalTrustPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = getLegalTrustSection(requestedSection);
  const content = legalTrustContent[activeSection];
  const visibleTabs = legalTrustSections[content.group].links;

  useEffect(() => {
    if (requestedSection !== activeSection) {
      router.replace(`/legal?section=${activeSection}`, { scroll: false });
    }
  }, [activeSection, requestedSection, router]);

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader />

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

      <section className="mx-auto w-full max-w-[1600px] flex-1 px-5 pb-24 sm:px-7 lg:px-16">
        {activeSection === "terms-of-service" ? (
          <TermsOfServiceContent />
        ) : activeSection === "cookie-policy" ? (
          <CookiePolicyContent />
        ) : activeSection === "privacy-policy" ? (
          <PrivacyPolicyContent />
        ) : activeSection === "privacy-preferences" ? (
          <PrivacyPreferencesContent />
        ) : (
          <>
            <div className="max-w-[980px] pt-16 sm:pt-20">
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
                This page is a working draft and should be reviewed by legal
                counsel before public launch.
              </p>
              <p className="mt-3 text-[13px] font-medium text-zinc-400">
                Last updated: {content.lastUpdated || "June 2026"}
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
                  <div className="space-y-5 text-[16px] leading-8 text-zinc-600">
                    {section.body.split("\n\n").map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
