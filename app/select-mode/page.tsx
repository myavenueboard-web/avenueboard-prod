"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

export default function SelectModePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        await getOrCreateProfile();
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
    <main className="min-h-screen bg-white text-slate-950">
      <header className="fixed inset-x-0 top-0 z-20 flex h-[88px] items-center justify-between px-8 lg:px-12">
        <img
          src="/logo.png"
          alt="AvenueBoard"
          className="h-9 w-auto"
        />

        <button
          onClick={handleLogout}
          className="text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-900 hover:underline hover:underline-offset-4"
        >
          Log out
        </button>
      </header>

      <section className="flex min-h-screen items-center justify-center px-5 py-28">
        <div className="w-full max-w-[900px]">
          <div className="mx-auto max-w-[760px] text-center">
            <h1 className="text-[39px] font-medium leading-[0.98] tracking-[-0.075em] text-[#050A1F] sm:text-[50px] md:whitespace-nowrap">
              How do you want to continue?
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[14px] font-medium leading-7 text-zinc-500 sm:text-[15px]">
              Your account is connected to the following workspaces. Choose one
              to open today.
            </p>
          </div>

          <div className="mt-11 grid gap-4 md:grid-cols-2">
            <WorkspaceCard
              variant="landlord"
              title="Landlord Board"
              description="Manage properties, tenants, leases, payments, documents, and reports."
              onClick={() => router.push("/dashboard")}
            />
            <WorkspaceCard
              variant="tenant"
              title="Resident Board"
              description="View rent details, payment setup, lease information, documents, statements, and Avenue Perks."
              onClick={() => router.push("/tenant")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkspaceCard({
  variant,
  title,
  description,
  onClick,
}: {
  variant: "landlord" | "tenant";
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[196px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#050A1F] hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute right-5 top-5">
        <WorkspaceMark variant={variant} />
      </span>

      <span className="flex min-h-full max-w-[245px] flex-col justify-between">
        <span>
          <span className="block text-[22px] font-semibold tracking-[-0.05em] text-[#050A1F]">
            {title}
          </span>
          <span className="mt-4 block text-[14px] font-medium leading-6 text-zinc-500">
            {description}
          </span>
        </span>

        <span className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-700 transition group-hover:text-[#050A1F]">
          Open
          <ArrowRight
            size={16}
            strokeWidth={2}
            className="transition group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </button>
  );
}

function WorkspaceMark({ variant }: { variant: "landlord" | "tenant" }) {
  if (variant === "landlord") {
    return (
      <span className="relative block h-[94px] w-[104px] rounded-2xl bg-[linear-gradient(145deg,#F8FAFC,#EEF2F7)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
        <span className="absolute left-5 top-7 h-12 w-3 rounded-full bg-[#050A1F]/85" />
        <span className="absolute left-10 top-4 h-[60px] w-3 rounded-full bg-[#050A1F]/65" />
        <span className="absolute left-[60px] top-10 h-9 w-3 rounded-full bg-[#050A1F]/40" />
        <span className="absolute bottom-5 left-5 h-px w-14 bg-[#050A1F]/25" />
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#8B6A52]" />
      </span>
    );
  }

  return (
    <span className="relative block h-[94px] w-[104px] rounded-2xl bg-[linear-gradient(145deg,#F8FAFC,#EEF2F7)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
      <span className="absolute left-[31px] top-[27px] h-9 w-11 rounded-[10px] border border-[#050A1F]/70 bg-white/80" />
      <span className="absolute left-[39px] top-[20px] h-8 w-8 rotate-45 rounded-[5px] border-l border-t border-[#050A1F]/70" />
      <span className="absolute bottom-6 left-[34px] h-px w-9 bg-[#050A1F]/25" />
      <span className="absolute bottom-9 left-[42px] h-px w-7 bg-[#050A1F]/18" />
      <span className="absolute right-5 top-5 h-2 w-2 rounded-full bg-[#8B6A52]" />
    </span>
  );
}
