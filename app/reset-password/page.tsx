"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/app/components/AuthLayout";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const checks = useMemo(() => {
    return {
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      length: password.length >= 8,
    };
  }, [password]);

  useEffect(() => {
    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Invalid or expired password reset link.");
        return;
      }

      if (
        redirectPath.includes("/tenant/accept-invite") &&
        typeof window !== "undefined"
      ) {
        const inviteToken = sessionStorage.getItem(
          "avenueboard_tenant_invite_token"
        );

        if (!inviteToken) {
          setMessage(
            "Your invitation session expired. Please reopen your invitation email after resetting your password."
          );
        }
      }

      setSessionReady(true);
    }

    checkRecoverySession();
  }, [redirectPath]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated successfully. Redirecting...");

    setTimeout(() => {
      router.replace(redirectPath);
    }, 1000);
  }

  const inputClass =
    "mt-3 h-[56px] w-full rounded-2xl border border-zinc-300 bg-white px-5 text-[15px] text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:ring-4 focus:ring-[#CA6180]/10";

  return (
    <AuthLayout>
      <div className="w-full">
        <h1 className="text-[42px] font-semibold tracking-[-0.05em] text-[#0F172A]">
          Create New Password
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-zinc-500">
          Your new password must be secure and easy for you to remember.
        </p>

        {redirectPath.includes("/tenant/accept-invite") && (
          <div className="mt-6 rounded-2xl border border-[#F5D5DF] bg-[#FFF7FA] px-4 py-3 text-[13px] leading-6 text-[#9F3D5F]">
            After updating your password, we’ll return you to your tenant
            invitation.
          </div>
        )}

        {!sessionReady ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-[14px] text-zinc-600">
            {message || "Preparing secure password reset..."}
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-8 space-y-4">
            <div>
              <label className="text-[14px] font-medium text-zinc-700">
                New Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a new password"
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
              {loading ? "Updating password..." : "Update Password"}
            </button>
          </form>
        )}
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