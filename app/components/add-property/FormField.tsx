import type { ReactNode } from "react";

export const inputClass =
  "h-[46px] w-full rounded-xl border border-zinc-200 bg-[#F8F9FA] px-4 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 sm:h-[52px] sm:px-5";

export default function FormField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1.5 text-[15px] font-medium text-zinc-900 sm:mb-2">
        {label}
      </p>

      {children}
    </label>
  );
}
