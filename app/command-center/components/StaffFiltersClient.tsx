"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function StaffFiltersClient({
  initialQuery,
  initialRole,
  initialStatus,
  initialMfa,
}: {
  initialQuery: string;
  initialRole: string;
  initialStatus: string;
  initialMfa: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateParam("query", query.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");

    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
        <label className="block">
          <span className="text-[12px] font-semibold text-slate-600">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, staff id"
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[14px] outline-none focus:border-slate-400"
          />
        </label>

        <SelectField
          label="Role"
          value={initialRole}
          onChange={(value) => updateParam("role", value)}
          options={[
            ["all", "All"],
            ["super_admin", "Super Admin"],
            ["operations", "Operations"],
            ["support", "Support"],
            ["payments", "Payments"],
            ["read_only", "Read Only"],
          ]}
        />

        <SelectField
          label="Status"
          value={initialStatus}
          onChange={(value) => updateParam("status", value)}
          options={[
            ["all", "All"],
            ["invited", "Invited"],
            ["active", "Active"],
            ["suspended", "Suspended"],
            ["revoked", "Revoked"],
          ]}
        />

        <SelectField
          label="MFA"
          value={initialMfa}
          onChange={(value) => updateParam("mfa", value)}
          options={[
            ["all", "All"],
            ["required", "Required"],
            ["not_required", "Not Required"],
          ]}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-600">{label}</span>
      <select
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] outline-none focus:border-slate-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
