"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CommandCenterLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    searchParams.get("error") === "staff_required"
      ? "Staff access required."
      : ""
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session?.access_token) {
      setSubmitting(false);
      setError("Unable to sign in with those credentials.");
      return;
    }

    const response = await fetch("/api/command-center/session-event", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "login" }),
    });

    if (!response.ok) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setError("Staff access required.");
      return;
    }

    router.push("/command-center");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-6 py-10 text-[#0F172A]">
      <section className="w-full max-w-[460px] rounded-[32px] border border-zinc-200 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="AvenueBoard"
            width={190}
            height={42}
            priority
            className="h-9 w-auto object-contain"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Command Center
          </p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.055em] text-slate-950">
            Secure staff access
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
            Secure access for AvenueBoard team members
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-slate-700">
              Work email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-slate-700">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-2xl bg-slate-950 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Authorized team members only
        </p>
      </section>
    </main>
  );
}
