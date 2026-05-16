"use client";

import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F6F3]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-5 py-6 sm:px-8 lg:justify-between">
        {/* LEFT SIDE */}
        <div className="relative hidden h-[92vh] w-[58%] overflow-hidden rounded-[34px] bg-[#EFEDE8] shadow-[0_24px_80px_rgba(24,24,27,0.06)] lg:block">
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
          <div className="w-full max-w-[430px] rounded-[30px] bg-white px-6 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10 lg:bg-transparent lg:p-0 lg:shadow-none">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}