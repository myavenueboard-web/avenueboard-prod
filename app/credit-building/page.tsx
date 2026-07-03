"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingShell";
import { supabase } from "@/lib/supabase";

export default function AvenuePerksPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setAuthenticated(Boolean(user));
      setAuthChecked(true);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const locked = authChecked && !authenticated;

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-[#0F172A]">
      <MarketingHeader activePage="credit-building" />

      <section className="relative mx-auto w-full max-w-[1680px] flex-1 px-6 py-20">
        <div
          className={`rounded-[32px] border border-zinc-200 bg-zinc-50/40 p-12 ${
            locked ? "pointer-events-none select-none blur-[2px]" : ""
          }`}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Coming Soon
          </p>

          <h1 className="mt-4 text-[48px] font-medium tracking-[-0.08em] text-slate-950">
            Credit Building
          </h1>

          <p className="mt-4 max-w-[700px] text-[16px] leading-8 text-slate-600">
            Report rent payments, build credit history, and track your progress
            directly from AvenueBoard.
          </p>
        </div>

        {locked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/25 px-4">
            <div className="w-full max-w-[640px] rounded-[34px] border border-zinc-200 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:px-12">
              <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.06em] text-slate-950">
                Exclusive to AvenueBoard users.
              </h2>
              <p className="mx-auto mt-4 max-w-[440px] text-[16px] font-medium leading-7 text-slate-600">
                Create an account or sign in to access this member benefit.
              </p>
              <p className="mx-auto mt-3 max-w-[360px] text-[13.5px] font-medium leading-6 text-zinc-500">
                Always free to open. No card required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0F172A] px-7 text-[14px] font-semibold text-white transition hover:bg-[#1E293B]"
                >
                  Create Account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-7 text-[14px] font-semibold text-slate-950 transition hover:bg-zinc-50"
                >
                  Sign In
                </Link>
              </div>
              <Link
                href="/latest-landing#credit-building"
                className="mt-6 inline-flex text-[14px] font-semibold text-slate-500 transition hover:text-slate-950"
              >
                Learn More
              </Link>
            </div>
          </div>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
