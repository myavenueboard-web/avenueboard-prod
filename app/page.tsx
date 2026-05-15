export const dynamic = "force-dynamic";
export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
  {/* SOFT BACKGROUND */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#faf7f8,white_40%)]" />

  {/* TOP NAV */}
  <div className="relative z-20">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-10 py-8">
      <img
        src="/logo.png"
        alt="AvenueBoard"
        className="h-8 w-auto object-contain"
      />

      <a
        href="/admin"
        className="rounded-full border border-[#ece7e9] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 transition hover:border-[#CA6180] hover:text-[#CA6180]"
      >
        Admin Access
      </a>
    </div>
  </div>

  {/* HERO */}
  <div className="relative z-10 flex min-h-[88vh] items-center justify-center px-8">
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#CA6180]">
        COMING SOON
      </p>

      <h1 className="mt-8 text-[72px] font-semibold leading-[0.9] tracking-[-0.08em] text-neutral-950 md:text-[104px]">
        Rent,
        <br />
        Simplified.
      </h1>

      <div className="mx-auto mt-10 h-px w-24 bg-[#ece7e9]" />

      <p className="mx-auto mt-10 max-w-2xl text-[17px] leading-9 text-neutral-500">
        AvenueBoard is building a modern operational platform for landlords and
        tenants — combining rent collection, lease management, support,
        reporting, and property operations into one clean experience.
      </p>

      {/* MODULES */}
      <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-3">
        {[
          "Lease Management",
          "Support Center",
          "Operations Dashboard",
          "Reporting",
          "Payment Infrastructure",
        ].map((item) => (
          <div
            key={item}
            className="rounded-full bg-[#faf7f8] px-5 py-3 text-sm font-medium text-neutral-700"
          >
            {item}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="mt-24">
        <p className="text-sm font-medium text-neutral-400">
          Built for landlords. Designed for tenants.
        </p>
      </div>
    </div>
  </div>
</main>
  );
}