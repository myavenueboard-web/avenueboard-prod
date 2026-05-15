"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/AuthLayout";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const prefilledEmail = searchParams.get("email") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => {
    return {
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      length: password.length >= 8,
    };
  }, [password]);

  const inputClass =
    "mt-3 h-[56px] w-full rounded-2xl border border-zinc-300 bg-white px-5 text-[15px] text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:ring-4 focus:ring-[#CA6180]/10";

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!fullName.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!checks.uppercase || !checks.number || !checks.length) {
      setMessage(
        "Password must include 1 uppercase, 1 number, and 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?redirect=${encodeURIComponent(
            redirectPath
          )}${prefilledEmail ? `&email=${encodeURIComponent(prefilledEmail)}` : ""}`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();

      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        setMessage(
          "An account already exists with this email. Please sign in instead."
        );
      } else {
        setMessage(error.message);
      }

      return;
    }

    if (data.user?.identities && data.user.identities.length === 0) {
      setMessage(
        "An account already exists with this email. Please sign in instead."
      );
      return;
    }

    if (redirectPath.includes("/tenant/accept-invite")) {
      setMessage(
        "Account created successfully. Please confirm your email, then log in to continue your tenant invitation."
      );
      return;
    }

    setMessage(
      "Account created. Please check your email to confirm your account."
    );
  }

  function goToLogin() {
    const params = new URLSearchParams();

    if (redirectPath) {
      params.set("redirect", redirectPath);
    }

    if (prefilledEmail) {
      params.set("email", prefilledEmail);
    }

    router.push(`/login?${params.toString()}`);
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <h1 className="text-[42px] font-semibold tracking-[-0.05em] text-[#0F172A]">
          Create your account
        </h1>

        {redirectPath.includes("/tenant/accept-invite") && (
          <div className="mt-6 rounded-2xl border border-[#F5D5DF] bg-[#FFF7FA] px-4 py-3 text-[13px] leading-6 text-[#9F3D5F]">
            Create your account using the same email address that received your
            tenant invitation.
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <div>
            <label className="text-[14px] font-medium text-zinc-700">
              Full Name
            </label>

            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
              className={inputClass}
            />
          </div>

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
                prefilledEmail ? "cursor-not-allowed bg-zinc-50 text-zinc-500" : ""
              }`}
            />

            {prefilledEmail && (
              <p className="mt-2 text-[12px] text-zinc-400">
                This email is locked to match your tenant invitation.
              </p>
            )}
          </div>

          <div>
            <label className="text-[14px] font-medium text-zinc-700">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className={inputClass}
            />

            <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
              <CheckItem active={checks.uppercase} label="1 uppercase" />
              <CheckItem active={checks.number} label="1 number" />
              <CheckItem active={checks.length} label="8 characters" />
            </div>
          </div>

          <div>
            <label className="text-[14px] font-medium text-zinc-700">
              Confirm Password
            </label>

            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={inputClass}
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-700 shadow-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-[58px] w-full rounded-2xl bg-[#0F172A] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] active:translate-y-0 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-[13px] text-zinc-400">Or continue with</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button className="h-[52px] w-full rounded-2xl border border-zinc-200 bg-white text-[14px] font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-[14px] text-zinc-500">
          Already have an account?{" "}
          <button
            onClick={goToLogin}
            className="font-semibold text-[#CA6180] hover:opacity-80"
          >
            Sign In
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

function CheckItem({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`flex items-center gap-1 ${
        active ? "text-emerald-600" : "text-zinc-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
          active ? "bg-emerald-500 text-white" : "bg-zinc-300 text-white"
        }`}
      >
        ✓
      </span>
      {label}
    </span>
  );
}