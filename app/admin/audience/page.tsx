"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Database, Search, UserRound } from "lucide-react";

import {
  AdminPageHeader,
  AdminTable,
  KpiCard,
  Section,
  StatusBadge,
  TableCell,
} from "@/components/admin/AdminCommandComponents";
import { supabase } from "@/lib/supabase";
import { readable } from "@/lib/admin/adminMetrics";

type ProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  name: string | null;
  phone: string | null;
  role: string | null;
  user_type: string | null;
  created_at: string | null;
};

const recordTables = [
  "profiles",
  "user_roles",
  "properties",
  "leases",
  "lease_tenants",
  "tenant_access",
  "lease_documents",
  "property_notes",
  "activity_logs",
  "support_requests",
];

export default function RecordsPage() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [recordCounts, setRecordCounts] = useState<Record<string, number | null>>({});
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);

      const [profileResult, ...countResults] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, display_name, name, phone, role, user_type, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        ...recordTables.map((table) =>
          supabase.from(table).select("*", { count: "exact", head: true })
        ),
      ]);

      setProfiles((profileResult.data || []) as ProfileRecord[]);

      const nextCounts: Record<string, number | null> = {};
      recordTables.forEach((table, index) => {
        nextCounts[table] = countResults[index].error
          ? null
          : countResults[index].count || 0;
      });
      setRecordCounts(nextCounts);
      setLoading(false);
    }

    loadRecords();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!appliedSearch.trim()) return profiles;
    const q = appliedSearch.toLowerCase();

    return profiles.filter((profile) =>
      [
        profile.email,
        profile.full_name,
        profile.display_name,
        profile.name,
        profile.phone,
        profile.role,
        profile.user_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [profiles, appliedSearch]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Records"
        title="Operational Records"
        description="A compact inventory of the core AvenueBoard tables plus profile search for day-to-day customer operations."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {recordTables.map((table) => (
            <KpiCard
              key={table}
              label={readable(table)}
              value={{
                value: recordCounts[table] ?? null,
                error: recordCounts[table] === null ? "Unavailable" : undefined,
              }}
            />
          ))}
        </div>

        <Section
          title="Profile Lookup"
          description="Recent profile records with lightweight search. Detail pages show linked properties, leases, and support history."
          action={
            <div className="flex gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setAppliedSearch(search.trim());
                  }}
                  placeholder="Search profiles"
                  className="h-9 w-[260px] rounded-lg border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <button
                onClick={() => setAppliedSearch(search.trim())}
                className="h-9 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Search
              </button>
            </div>
          }
        >
          <AdminTable
            columns={["Profile", "Email", "Phone", "Role", "Created", ""]}
            empty={!loading && filteredProfiles.length === 0}
            rows={filteredProfiles.map((profile) => (
              <tr key={profile.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500">
                      <UserRound size={16} />
                    </div>
                    <span className="font-semibold">
                      {profile.display_name ||
                        profile.full_name ||
                        profile.name ||
                        "Unknown profile"}
                    </span>
                  </div>
                </TableCell>
                <TableCell muted>{readable(profile.email, "No email")}</TableCell>
                <TableCell muted>{readable(profile.phone, "No phone")}</TableCell>
                <TableCell>
                  <StatusBadge value={profile.role || profile.user_type || "profile"} />
                </TableCell>
                <TableCell muted>
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/audience/${profile.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Open
                  </Link>
                </TableCell>
              </tr>
            ))}
          />

          {loading ? (
            <p className="mt-3 text-xs text-zinc-500">Loading records...</p>
          ) : null}
        </Section>

        <Section
          title="Record Operations Notes"
          description="Use these counts as visibility only. Sensitive mutations should move behind admin server routes in the next security pass."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SmallNote icon={Database} title="Counts are real" body="Unavailable means the table or RLS policy did not allow the current admin client to read it." />
            <SmallNote icon={Search} title="Search is scoped" body="Current search covers the most recent 100 profiles. Server-side search should be added for large datasets." />
            <SmallNote icon={UserRound} title="Profile detail" body="Open a profile to inspect linked leases, owned properties, and related support cases." />
          </div>
        </Section>
      </div>
    </div>
  );
}

function SmallNote({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Database;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <Icon size={17} className="text-zinc-500" />
      <p className="mt-3 text-sm font-semibold text-zinc-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{body}</p>
    </div>
  );
}
