"use client";

import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="relative w-[285px] shrink-0 rounded-[24px] bg-[#F8F8F7] px-6 py-8">
      <img src="/logo.png" alt="AvenueBoard" className="h-10 w-auto" />

      <div className="mt-12">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-2xl bg-white px-4 py-3 text-left text-[15px] font-semibold text-[#0F172A] shadow-sm"
        >
          All Properties
        </button>
      </div>

      <div className="absolute bottom-8 left-6 right-6 space-y-3">
        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 hover:bg-white hover:text-zinc-900">
          <span className="text-[20px]">⬡</span>
          Expenses
        </button>

        <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-zinc-500 hover:bg-white hover:text-zinc-900">
          <span className="text-[20px]">♡</span>
          Help
        </button>
      </div>
    </aside>
  );
}