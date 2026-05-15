"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function MasterAudiencePage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setProfiles(data || []);

      setLoading(false);
    }

    loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!appliedSearch.trim()) return profiles;

    const q = appliedSearch.toLowerCase();

    return profiles.filter((profile) =>
      JSON.stringify(profile).toLowerCase().includes(q)
    );
  }, [profiles, appliedSearch]);

  function handleSearch() {
    setAppliedSearch(search.trim());
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white px-8 pb-8 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
          Master Audience
        </p>

        <h1 className="mt-2 text-[42px] font-semibold leading-none tracking-[-0.04em]">
          Audience Lookup
        </h1>

        <p className="mt-3 max-w-3xl text-[14px] leading-6 text-neutral-500">
          Search profiles and open associated landlord, tenant, lease, property,
          and support information.
        </p>

        <div className="mt-5 flex gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search by email, name, phone, property, or role..."
              className="h-12 w-full rounded-2xl border border-[#e7dfe2] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#CA6180]"
            />
          </div>

          <button
            onClick={handleSearch}
            className="rounded-2xl bg-[#CA6180] px-6 text-sm font-medium text-white transition hover:opacity-90"
          >
            Find
          </button>

          <button
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
            }}
            className="rounded-2xl border border-[#e7dfe2] bg-white px-5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Profile Records
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {loading
                ? "Loading..."
                : `${filteredProfiles.length} record(s) found`}
            </p>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-[#f0e4e8]">
          {filteredProfiles.length === 0 ? (
            <div className="py-14 text-center text-sm text-neutral-500">
              No matching profiles found.
            </div>
          ) : (
            filteredProfiles.map((profile: any) => (
              <Link
                key={profile.id}
                href={`/admin/audience/${profile.id}`}
                className="grid grid-cols-[1.5fr_1fr_0.7fr_0.5fr] items-center gap-4 border-b border-[#f0e4e8] px-5 py-4 transition last:border-b-0 hover:bg-[#CA6180]/5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {profile.full_name ||
                        profile.name ||
                        profile.email ||
                        "Unknown Profile"}
                    </p>

                    <p className="mt-1 truncate text-sm text-neutral-500">
                      {profile.email || "No email"}
                    </p>
                  </div>
                </div>

                <div className="truncate text-sm text-neutral-500">
                  {profile.phone || "No phone"}
                </div>

                <div className="text-sm font-medium capitalize text-neutral-700">
                  {profile.role || profile.user_type || "profile"}
                </div>

                <div className="text-right text-xs font-medium text-[#CA6180]">
                  Open
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}