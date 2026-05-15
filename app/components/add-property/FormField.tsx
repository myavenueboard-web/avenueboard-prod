import type { ReactNode } from "react";

export const inputClass =
  "h-[50px] w-full rounded-2xl border border-zinc-200 bg-[#F8F9FA] px-5 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#CA6180] focus:bg-white focus:ring-4 focus:ring-[#CA6180]/10";

export default function FormField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-[14px] font-medium text-zinc-900">{label}</p>
      {children}
    </label>
  );
}