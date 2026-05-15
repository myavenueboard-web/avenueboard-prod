"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SelectModePage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-6 font-sans text-[#0F172A]">
      <div className="w-full max-w-[560px] rounded-[32px] border border-zinc-200 bg-white p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <img src="/logo.png" alt="AvenueBoard" className="mx-auto h-10 w-auto" />

        <h1 className="mt-8 text-[30px] font-semibold tracking-[-0.05em] text-zinc-900">
          How would you like to continue?
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-zinc-500">
          This account has access to both landlord and tenant mode.
        </p>

        <div className="mt-8 grid gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-[24px] border border-zinc-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#B9476D]/40 hover:shadow-md"
          >
            <p className="text-[17px] font-semibold text-zinc-900">
              Continue as Landlord
            </p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              Manage properties, tenants, rent collection, reports, and expenses.
            </p>
          </button>

          <button
            onClick={() => router.push("/tenant")}
            className="rounded-[24px] border border-zinc-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#B9476D]/40 hover:shadow-md"
          >
            <p className="text-[17px] font-semibold text-zinc-900">
              Continue as Tenant
            </p>
            <p className="mt-2 text-[13px] leading-6 text-zinc-500">
              View your lease, rent details, documents, and payment setup.
            </p>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="mt-7 text-[13px] font-semibold text-zinc-400 hover:text-zinc-700"
        >
          Log out
        </button>
      </div>
    </main>
  );
}