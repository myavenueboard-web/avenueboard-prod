"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/AuthLayout";
import { supabase } from "@/lib/supabase";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const prefilledEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace(redirectPath);
        return;
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, [router, redirectPath]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(redirectPath);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      router.replace(redirectPath);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", profile.id);

    const roleList = (roles || []).map((r) => r.role);

    const hasLandlord = roleList.includes("landlord");
    const hasTenant = roleList.includes("tenant");

    if (redirectPath !== "/dashboard") {
      router.replace(redirectPath);
      return;
    }

    if (hasLandlord && hasTenant) {
      router.replace("/select-mode");
      return;
    }

    if (hasTenant) {
      router.replace("/tenant");
      return;
    }

    router.replace("/dashboard");
  }

  const inputClass =
    "mt-3 h-[54px] w-full rounded-2xl border border-zinc-300 bg-white px-4 text-[15px] text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:ring-4 focus:ring-[#CA6180]/10 sm:h-[58px] sm:px-5";

  if (checkingSession) {
    return (
      <AuthLayout>
        <div className="text-[14px] text-zinc-500">Checking session...</div>
      </AuthLayout>
    );
  }

  return (
  <AuthLayout>

  <div className="w-full">

    <h1 className="text-[36px] font-semibold tracking-[-0.05em] text-[#0F172A] sm:text-[42px]">
      Log In
    </h1>

        {redirectPath.includes("/tenant/accept-invite") && (
          <div className="mt-5 rounded-2xl border border-[#F5D5DF] bg-[#FFF7FA] px-4 py-3 text-[13px] leading-6 text-[#9F3D5F] sm:mt-6">
            Log in with the email address that received your tenant invitation
            to continue.
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5 sm:mt-9">
          <div>
            <label className="text-[14px] font-medium text-zinc-700">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              readOnly={!!prefilledEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${inputClass} ${
                prefilledEmail
                  ? "cursor-not-allowed bg-zinc-50 text-zinc-500"
                  : ""
              }`}
            />

            {prefilledEmail && (
              <p className="mt-2 text-[12px] text-zinc-400">
                This email is locked to match your tenant invitation.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-[14px] font-medium text-zinc-700">
                Password
              </label>

              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="shrink-0 text-[13px] font-medium text-[#CA6180] hover:opacity-80"
              >
                Forgot password?
              </button>
            </div>

            <div className="relative mt-3">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputClass} mt-0 pr-14`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {message && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] leading-6 text-red-700 shadow-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[54px] w-full rounded-2xl bg-[#0F172A] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] active:translate-y-0 disabled:opacity-60 sm:h-[58px]"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4 sm:my-7">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="shrink-0 text-[12px] text-zinc-400 sm:text-[13px]">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button className="h-[50px] w-full rounded-2xl border border-zinc-200 bg-white text-[14px] font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:h-[52px]">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-[14px] leading-6 text-zinc-500 sm:mt-7">
          Don’t have an account?{" "}
          <button
            onClick={() => {
              const params = new URLSearchParams();

              if (redirectPath) {
                params.set("redirect", redirectPath);
              }

              if (prefilledEmail) {
                params.set("email", prefilledEmail);
              }

              router.push(`/signup?${params.toString()}`);
            }}
            className="font-semibold text-[#CA6180] hover:opacity-80"
          >
            Create Now
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}