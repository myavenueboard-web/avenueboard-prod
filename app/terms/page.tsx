export default function TermsPage() {
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
            Terms & Conditions
          </h1>

          <p className="mt-3 text-[14px] text-zinc-500">
            Last updated: May 2026
          </p>

          <div className="mt-12 max-w-[760px] space-y-10 text-[15px] leading-8 text-zinc-600">
            <LegalSection title="1. Acceptance of Terms">
              By creating an account or using AvenueBoard, you agree to these
              Terms & Conditions and our Privacy Policy.
            </LegalSection>

            <LegalSection title="2. Platform Use">
              AvenueBoard provides software tools for landlords and tenants to
              manage rent collection, lease setup, reminders, documents, and
              related rental workflows.
            </LegalSection>

            <LegalSection title="3. User Responsibility">
              You are responsible for ensuring that all property, tenant, lease,
              payment, and contact information entered into AvenueBoard is
              accurate and authorized.
            </LegalSection>

            <LegalSection title="4. Authorization">
              Landlords and property managers must confirm that they are
              authorized to collect rent and manage rental activity for the
              property added to AvenueBoard.
            </LegalSection>

            <LegalSection title="5. Payments">
              Payment processing may be handled by third-party providers.
              AvenueBoard does not replace the terms, verification requirements,
              or processing rules of those providers.
            </LegalSection>

            <LegalSection title="6. Fees">
              Certain setup or service fees may apply depending on the lease
              term, payment setup, or selected preferences. Any applicable fees
              should be disclosed before completion.
            </LegalSection>

            <LegalSection title="7. Documents">
              Users may upload lease-related documents. Users are responsible
              for ensuring they have the right to upload and share those
              documents.
            </LegalSection>

            <LegalSection title="8. No Legal or Financial Advice">
              AvenueBoard provides software tools only. It does not provide
              legal, tax, financial, or real estate advice.
            </LegalSection>

            <LegalSection title="9. Account Access">
              You are responsible for keeping your login credentials secure and
              for all activity under your account.
            </LegalSection>

            <LegalSection title="10. Contact">
              For questions about these Terms, contact support@avenueboard.com.
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