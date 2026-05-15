"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/AuthLayout";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefilledEmail = searchParams.get("email") || "";
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState(prefilledEmail);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      redirectPath.includes("/tenant/accept-invite") &&
      typeof window !== "undefined"
    ) {
      const inviteToken = sessionStorage.getItem(
        "avenueboard_tenant_invite_token"
      );

      if (!inviteToken) {
        setMessage(
          "Your invitation session expired. Please reopen your invitation email."
        );
      }
    }
  }, [redirectPath]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    let finalRedirectPath = redirectPath;

    if (
      redirectPath.includes("/tenant/accept-invite") &&
      typeof window !== "undefined"
    ) {
      finalRedirectPath = "/tenant/accept-invite";
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password?redirect=${encodeURIComponent(
            finalRedirectPath
          )}`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset link sent. Please check your email.");
  }

  const inputClass =
    "mt-3 h-[58px] w-full rounded-2xl border border-zinc-300 bg-white px-5 text-[15px] text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:ring-4 focus:ring-[#CA6180]/10";

  return (
    <AuthLayout>
      <div className="w-full">
        <h1 className="text-[42px] font-semibold tracking-[-0.05em] text-[#0F172A]">
          Reset Password
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-zinc-500">
          Enter your email and we’ll send you a secure password reset link.
        </p>

        {redirectPath.includes("/tenant/accept-invite") && (
          <div className="mt-6 rounded-2xl border border-[#F5D5DF] bg-[#FFF7FA] px-4 py-3 text-[13px] leading-6 text-[#9F3D5F]">
            Reset your password using the invited tenant email address to
            continue your invitation.
          </div>
        )}

        <form onSubmit={handleReset} className="mt-9 space-y-5">
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
                This email is locked to your invitation flow.
              </p>
            )}
          </div>

          {message && (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-700 shadow-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-[58px] w-full rounded-2xl bg-[#0F172A] text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] active:translate-y-0 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-7 text-center text-[14px] text-zinc-500">
          Remember your password?{" "}
          <button
            onClick={() => {
              const params = new URLSearchParams();

              if (redirectPath) {
                params.set("redirect", redirectPath);
              }

              if (email) {
                params.set("email", email);
              }

              router.push(`/login?${params.toString()}`);
            }}
            className="font-semibold text-[#CA6180] hover:opacity-80"
          >
            Back to Login
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}