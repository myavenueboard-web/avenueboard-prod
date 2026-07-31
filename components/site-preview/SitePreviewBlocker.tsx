"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function SitePreviewBlocker() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/site-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        setError("Incorrect passcode.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Incorrect passcode.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-dvh flex-col overflow-hidden bg-white/72 text-[#0F172A] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-preview-title"
      aria-describedby="site-preview-description"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[#F8FAFC]/35" />

      <div className="relative flex flex-1 items-center justify-center px-6 py-16 text-center">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="AvenueBoard"
            width={320}
            height={56}
            priority
            className="h-10 w-auto sm:h-11"
          />
          <h1
            id="site-preview-title"
            className="mt-10 text-[44px] font-medium leading-none tracking-[-0.055em] text-black sm:text-[60px]"
          >
            Coming soon.
          </h1>
          <p
            id="site-preview-description"
            className="mt-6 max-w-[520px] text-[17px] font-medium leading-8 text-[#59606D] sm:text-[19px]"
          >
            We&rsquo;re putting the finishing touches on AvenueBoard.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="absolute inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto w-full max-w-[360px] rounded-3xl border border-white/75 bg-white/82 p-4 text-left shadow-[0_16px_48px_rgba(15,23,42,0.10),0_2px_12px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-0"
      >
        <label
          htmlFor="site-preview-passcode"
          className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#737B88]"
        >
          Preview access
        </label>
        <div className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            id="site-preview-passcode"
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "site-preview-error" : undefined}
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[#0F172A] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1E293B] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Enter
          </button>
        </div>
        {error ? (
          <p
            id="site-preview-error"
            className="mt-3 text-[13px] font-medium text-red-600"
            role="status"
          >
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
