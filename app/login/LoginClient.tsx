"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/AuthLayout";
import AuthOAuthButton from "@/app/components/AuthOAuthButton";
import { supabase } from "@/lib/supabase";

function getSafeInternalReturnTo(value: string | null) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  if (value.includes("\\") || value.includes("://")) return "";
  return value;
}

function getFriendlyOAuthError(provider: "google" | "apple") {
  const providerName = provider === "google" ? "Google" : "Apple";
  return `${providerName} sign-in could not be completed. Please try again or use email and password.`;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnToPath = getSafeInternalReturnTo(searchParams.get("returnTo"));
  const redirectPath =
    returnToPath ||
    getSafeInternalReturnTo(searchParams.get("redirect")) ||
    "/dashboard";
  const prefilledEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(
    null
  );
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace(redirectPath);
        return;
      }

      if (searchParams.get("error") === "oauth_failed") {
        setMessage(
          "Social sign-in could not be completed. Please try again or use email and password."
        );
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, [router, redirectPath, searchParams]);

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

  async function handleOAuth(provider: "google" | "apple") {
    setMessage("");
    setOauthLoading(provider);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: prefilledEmail
          ? {
              login_hint: prefilledEmail,
            }
          : undefined,
      },
    });

    if (error) {
      setOauthLoading(null);
      setMessage(getFriendlyOAuthError(provider));
    }
  }

  const inputClass =
    "mt-3 h-[52px] w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 sm:h-[56px] sm:px-5";

  if (checkingSession) {
    return (
      <AuthLayout>
        <div className="text-[14px] text-zinc-500">Checking session...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showLogo={false}>
      <div className="w-full">
        <h1 className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[30px] font-semibold tracking-[-0.055em] text-[#0F172A] sm:flex-nowrap sm:text-[34px]">
          <span>Welcome back to</span>
          <Link
            href="/latest-landing"
            aria-label="AvenueBoard home"
            className="shrink-0"
          >
            <img
              src="/logo.png"
              alt="AvenueBoard"
              className="relative -top-[2px] mt-1 h-11 w-auto object-contain sm:h-12"
            />
          </Link>
        </h1>

        {redirectPath.includes("/tenant/accept-invite") && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[13px] leading-6 text-blue-800">
            Log in with the email address that received your resident invitation
            to continue.
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="mx-auto mt-7 w-full max-w-[460px] space-y-4"
        >
          <div>
            <label className="text-[14px] font-medium text-zinc-700">
              Email
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
                This email is locked to match your resident invitation.
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
                className="shrink-0 text-[13px] font-medium text-slate-600 transition hover:text-slate-950"
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
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-800"
              >
                {showPassword ? "Hide" : "Show"}
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
            className="h-[52px] w-full rounded-2xl bg-[#0F172A] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#172033] hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mx-auto my-5 flex w-full max-w-[460px] items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            OR
          </span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="mx-auto grid w-full max-w-[460px] gap-3">
          <AuthOAuthButton
            provider="google"
            label="Continue with Google"
            loading={oauthLoading === "google"}
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuth("google")}
          />
          <AuthOAuthButton
            provider="apple"
            label="Continue with Apple"
            loading={oauthLoading === "apple"}
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuth("apple")}
          />
        </div>

        <p className="mt-5 text-center text-[14px] leading-6 text-zinc-500">
          Don&apos;t have an account?{" "}
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
            className="font-semibold text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline hover:underline-offset-4"
          >
            Create account
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
