export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7F6F3] px-6 py-8 font-sans text-[#0F172A]">
      <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[32px] bg-white shadow-[0_22px_80px_rgba(15,23,42,0.08)]">
        <header className="border-b border-zinc-100 px-8 py-6">
          <img src="/logo.png" alt="AvenueBoard" className="h-10 w-auto" />
        </header>

        <section className="px-8 py-14 md:px-20">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#B9476D]">
            AvenueBoard Legal
          </p>

          <h1 className="mt-4 text-[48px] font-semibold tracking-[-0.06em]">
            Privacy Policy
          </h1>

          <p className="mt-3 text-[14px] text-zinc-500">
            Last updated: May 2026
          </p>

          <div className="mt-12 max-w-[760px] space-y-10 text-[15px] leading-8 text-zinc-600">
            <LegalSection title="1. Information We Collect">
              AvenueBoard may collect account details, contact information,
              property details, tenant information, lease information, uploaded
              documents, preferences, and payment-related setup information.
            </LegalSection>

            <LegalSection title="2. How We Use Information">
              We use information to provide rent collection workflows, tenant
              setup, lease management, reminders, support, account access, and
              platform security.
            </LegalSection>

            <LegalSection title="3. Payment Information">
              Payment details may be processed by third-party payment providers.
              AvenueBoard does not intend to store sensitive bank account or
              card details directly.
            </LegalSection>

            <LegalSection title="4. Documents">
              Uploaded documents may be stored to support lease and rent
              collection workflows. Users should only upload documents they are
              authorized to share.
            </LegalSection>

            <LegalSection title="5. Communications">
              We may use email, SMS, WhatsApp, or other selected channels to send
              account, rent, reminder, receipt, setup, and support-related
              communications.
            </LegalSection>

            <LegalSection title="6. Sharing Information">
              We may share necessary information with service providers, payment
              processors, hosting providers, support tools, or legal authorities
              when required.
            </LegalSection>

            <LegalSection title="7. Security">
              We use reasonable safeguards to protect user information, but no
              system can guarantee absolute security.
            </LegalSection>

            <LegalSection title="8. Data Retention">
              We may retain information as needed to provide services, comply
              with legal obligations, resolve disputes, and maintain business
              records.
            </LegalSection>

            <LegalSection title="9. User Choices">
              Users may update account details, communication preferences, and
              certain profile information through the platform.
            </LegalSection>

            <LegalSection title="10. Contact">
              For privacy questions, contact support@avenueboard.com.
            </LegalSection>
          </div>
        </section>

        <footer className="border-t border-zinc-100 px-8 py-6 text-[13px] text-zinc-400">
          © 2026 AvenueBoard. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-900">
        {title}
      </h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}