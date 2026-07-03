"use client";

import { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
  showLogo = true,
}: {
  children: ReactNode;
  showLogo?: boolean;
}) {
  return (
    <main className="min-h-screen bg-white">
      <Link
        href="/latest-landing"
        className="absolute left-5 top-5 text-[14px] font-medium text-zinc-500 transition hover:text-zinc-900 sm:left-8 sm:top-7"
      >
        &larr; Back to Home
      </Link>

      <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-5 py-7 sm:px-8">
        <div className="w-full max-w-[560px]">
          {showLogo && (
            <div className="mb-10 flex justify-center">
              <Link href="/latest-landing" aria-label="AvenueBoard home">
                <img
                  src="/logo.png"
                  alt="AvenueBoard"
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>
          )}

          {children}
        </div>
      </div>
    </main>
  );
}
