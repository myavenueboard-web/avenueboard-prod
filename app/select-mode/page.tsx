"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

export default function SelectModePage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("there");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();

        const resolvedName =
          profile.display_name ||
          data.user.email?.split("@")[0] ||
          "there";

        setFirstName(resolvedName.split(" ")[0]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-zinc-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-[88px] items-center justify-between px-8 lg:px-12">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="h-9 w-auto"
        />

        <button
          onClick={handleLogout}
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-[13px] font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900"
        >
          Log out
        </button>
      </header>

      {/* Body */}
      <section className="grid min-h-screen pt-[88px] lg:grid-cols-[0.9fr_1px_1.1fr]">

        {/* Left Side */}
        <div className="flex items-center bg-[#F7F6F3] px-10 lg:px-20">
          <div className="max-w-[650px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Hi
            </p>

            <h1 className="mt-5 text-[52px] font-[650] leading-[0.98] tracking-[-0.07em] text-slate-950">
              Welcome back{" "}
              <span className="text-[#B9476D]">
                {firstName}
              </span>
              ,
              <br />
              Choose how you'd like to continue today.
            </h1>

            <p className="mt-7 max-w-[500px] text-[15px] leading-7 text-zinc-500">
              This account has access to both landlord and tenant
              experiences.
            </p>

            <p className="mt-7 max-w-[500px] text-[15px] leading-7 text-zinc-500">
              Switch between modes anytime.
            </p>

          </div>
        </div>

        {/* Divider */}
        <div className="hidden bg-[#F1EEE8]
w-px
opacity-60 lg:block" />

        {/* Right Side */}
        <div className="flex items-center px-10 lg:px-20">
          <div className="w-full max-w-[520px]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Continue
            </p>

            <h2 className="mt-4 text-[42px] font-[650] leading-[1.05] tracking-[-0.06em] text-slate-950">
              How do you want
              <br />
              to continue?
            </h2>

            <div className="mt-10 space-y-5">
              <button
                onClick={() => router.push("/dashboard")}
                className="group w-full rounded-[30px] border border-[#E8E5DE] bg-white p-8 text-left transition-all duration-200 group-hover:bg-[#FCFAFB] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[22px] font-[650] tracking-[-0.04em] text-slate-950">
                      Landlord
                    </p>

                    <p className="mt-3 text-[14px] leading-6 text-zinc-500">
                      Manage properties, tenants, leases, rent
                      collection, reports, and expenses.
                    </p>
                  </div>

                  <span className="text-[24px] text-zinc-300 transition group-hover:translate-x-1 group-hover:text-[#B9476D]">
                    →
                  </span>
                </div>
              </button>

              <button
                onClick={() => router.push("/tenant")}
                className="group w-full rounded-[30px] border border-[#E8E5DE] bg-white p-8 text-left transition-all duration-200 hover:border-[#B9476D]/30 hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[22px] font-[650] tracking-[-0.04em] text-slate-950">
                      Tenant
                    </p>

                    <p className="mt-3 text-[14px] leading-6 text-zinc-500">
                      View your lease, payment setup, documents,
                      rent history, and Avenue Perks.
                    </p>
                  </div>

                  <span className="text-[24px] text-zinc-300 transition group-hover:translate-x-1 group-hover:text-[#B9476D]">
                    →
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}