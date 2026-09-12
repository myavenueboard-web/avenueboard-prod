"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, KeyRound } from "lucide-react";
import AuthLayout from "@/app/components/AuthLayout";
import {
  getWorkspaceOnboardingStatus,
  submitWorkspaceType,
} from "@/lib/workspaceOnboardingClient";
import {
  WORKSPACE_TYPE_LABELS,
  type WorkspaceType,
} from "@/lib/workspaceTypes";
import { supabase } from "@/lib/supabase";

const workspaceOptions: Array<{
  value: WorkspaceType;
  title: string;
  description: string;
  icon: typeof Home;
}> = [
  {
    value: "self_managing_landlord",
    title: WORKSPACE_TYPE_LABELS.self_managing_landlord,
    description: "I own and manage my own rental properties.",
    icon: Home,
  },
  {
    value: "property_manager",
    title: WORKSPACE_TYPE_LABELS.property_manager,
    description: "I manage rental properties on behalf of owners.",
    icon: Building2,
  },
  {
    value: "resident",
    title: WORKSPACE_TYPE_LABELS.resident,
    description: "I pay rent and access my resident workspace.",
    icon: KeyRound,
  },
];

export default function WorkspaceOnboardingPage() {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<WorkspaceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatus() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login?redirect=/onboarding/workspace");
        return;
      }

      const status = await getWorkspaceOnboardingStatus();

      if (status?.completed && status.destination) {
        router.replace(status.destination);
        return;
      }

      setLoading(false);
    }

    loadStatus();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedType || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const status = await submitWorkspaceType(selectedType);
      router.replace(status.destination);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save your workspace type."
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AuthLayout>
        <div className="text-[14px] text-zinc-500">Loading...</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showLogo={false}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mx-auto max-w-[860px] text-center">
          <img
            src="/logo.png"
            alt="AvenueBoard"
            className="mx-auto h-11 w-auto object-contain"
          />

          <h1 className="mt-8 text-[36px] font-semibold leading-[1.02] tracking-[-0.065em] text-[#050A1F] sm:text-[46px]">
            Welcome to AvenueBoard
          </h1>
          <p className="mt-4 text-[17px] font-semibold tracking-[-0.025em] text-zinc-800">
            How will you primarily use AvenueBoard?
          </p>
          <p className="mx-auto mt-2 max-w-[520px] text-[14px] font-medium leading-6 text-zinc-500">
            This helps us personalize your workspace and onboarding experience.
          </p>
        </div>

        <div className="mx-auto mt-9 grid max-w-[920px] gap-4 md:grid-cols-3">
          {workspaceOptions.map(({ value, title, description, icon: Icon }) => {
            const selected = selectedType === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                aria-pressed={selected}
                className={`group min-h-[184px] rounded-[24px] border bg-white p-5 text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/80 ${
                  selected
                    ? "border-[#050A1F] shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
                    : "border-zinc-200 shadow-[0_12px_36px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                    selected
                      ? "border-[#050A1F] bg-[#050A1F] text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 group-hover:text-zinc-950"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="mt-5 block text-[19px] font-semibold tracking-[-0.045em] text-[#050A1F]">
                  {title}
                </span>
                <span className="mt-3 block text-[13.5px] font-medium leading-6 text-zinc-500">
                  {description}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mx-auto mt-5 max-w-[520px] rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-[13px] font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center">
          <button
            type="submit"
            disabled={!selectedType || submitting}
            className="h-[52px] min-w-[220px] rounded-2xl bg-[#050A1F] px-8 text-[15px] font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition hover:bg-[#111827] focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>

          <p className="mt-5 max-w-[430px] text-center text-[12.5px] font-medium leading-5 text-zinc-400">
            Your primary workspace can be changed later through AvenueBoard
            Support.
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
