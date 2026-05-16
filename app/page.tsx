export const dynamic = "force-dynamic";

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#faf7f8,white_45%)]" />

      <div className="relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <img
            src="/logo.png"
            alt="AvenueBoard"
            className="h-7 w-auto object-contain sm:h-8"
          />

          <a
            href="/admin"
            className="rounded-full border border-[#ece7e9] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 transition hover:border-[#CA6180] hover:text-[#CA6180] sm:px-5 sm:text-[11px]"
          >
            Admin
          </a>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-5 pb-12 pt-4 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#CA6180] sm:text-[11px]">
            Coming Soon
          </p>

          <h1 className="mt-7 text-[56px] font-semibold leading-[0.9] tracking-[-0.08em] text-neutral-950 sm:text-[76px] md:text-[104px]">
            Rent,
            <br />
            Simplified.
          </h1>

          <div className="mx-auto mt-8 h-px w-20 bg-[#ece7e9] sm:mt-10 sm:w-24" />

          <p className="mx-auto mt-8 max-w-[620px] text-[15px] leading-8 text-neutral-500 sm:mt-10 sm:text-[17px] sm:leading-9">
            AvenueBoard is building a modern operational platform for landlords
            and tenants — combining rent collection, lease management, support,
            reporting, and property operations into one clean experience.
          </p>

          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2.5 sm:mt-16 sm:gap-3">
            {[
              "Lease Management",
              "Support Center",
              "Operations Dashboard",
              "Reporting",
              "Payment Infrastructure",
            ].map((item) => (
              <div
                key={item}
                className="rounded-full bg-[#faf7f8] px-4 py-2.5 text-[12px] font-medium text-neutral-700 sm:px-5 sm:py-3 sm:text-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-16 sm:mt-24">
            <p className="text-[13px] font-medium text-neutral-400 sm:text-sm">
              Built for landlords. Designed for tenants.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}