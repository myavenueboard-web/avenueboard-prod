import type { ReactNode } from "react";

export const inputClass =
  "h-[46px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10 sm:h-[52px] sm:px-5 sm:text-[14px]";

export default function FormField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[13px] font-medium text-zinc-900 sm:mb-2 sm:text-[14px]">
        {label}
      </p>

      {children}
    </label>
  );
}