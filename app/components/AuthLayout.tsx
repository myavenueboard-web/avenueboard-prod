"use client";

import { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7F6F3] overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1500px] items-center justify-between px-8 py-8">
        
        {/* LEFT SIDE */}
        <div className="relative hidden h-[92vh] w-[58%] overflow-hidden rounded-[34px] bg-[#EFEDE8] lg:block shadow-[0_24px_80px_rgba(24,24,27,0.06)]">
          
          <img
            src="/auth/authBG.png"
            alt="AvenueBoard"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute bottom-10 left-10 z-20 max-w-[430px]">
            <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#0F172A]">
              Rent management,
              <br />
              made beautifully simple.
            </h1>

            <p className="mt-4 text-[14px] leading-7 text-[#52525B]">
              AvenueBoard gives landlords and tenants a cleaner way to manage
              rent setup, lease details, reminders and payment activity — all
              from one beautifully simple dashboard.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-full justify-center lg:w-[42%]">
          <div className="w-full max-w-[430px]">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}