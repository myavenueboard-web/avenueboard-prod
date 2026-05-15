import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    "Command Center",
    "Master Audience",
    "Support Center",
    "Marketing Analytics",
    "Future Scope",
    "Reports",
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f4f5]">
      {/* SIDEBAR */}
      <aside className="w-[260px] border-r border-[#e7dfe2] bg-white">
        <div className="flex items-center border-b border-[#e7dfe2] px-6 py-6">
          <img
            src="/logo.png"
            alt="AvenueBoard"
            className="h-10 w-auto object-contain"
          />
        </div>

        <nav className="flex flex-col gap-1 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item}
              className="rounded-xl px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-[#CA6180]/10 hover:text-[#CA6180]"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex flex-1 flex-col">
        {/* TOPBAR */}
        <header className="flex h-[80px] items-center justify-between border-b border-[#e7dfe2] bg-white px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Command Center
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Internal operational workspace
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#e7dfe2] bg-white px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CA6180]/10 text-sm font-semibold text-[#CA6180]">
              A
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-950">
                Admin
              </p>

              <p className="text-xs text-neutral-500">
                avenueboard@gmail.com
              </p>
            </div>
          </div>
        </header>

        {/* PAGE */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}