"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";

import {
  AdminPageHeader,
  AdminTable,
  DateCell,
  KpiCard,
  Section,
  StatusBadge,
  TableCell,
} from "@/components/admin/AdminCommandComponents";
import { supabase } from "@/lib/supabase";
import { readable } from "@/lib/admin/adminMetrics";

type SupportRequest = {
  id: string;
  subject: string | null;
  title: string | null;
  email: string | null;
  user_email: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  created_at: string | null;
};

const statusTabs = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Unassigned", value: "unassigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Waiting Customer", value: "waiting_customer" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export default function SupportOperationsPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRequests() {
      setLoading(true);
      const { data, error: requestError } = await supabase
        .from("support_requests")
        .select("id, subject, title, email, user_email, status, priority, category, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (requestError) {
        setError(requestError.message);
        setRequests([]);
      } else {
        setRequests((data || []) as SupportRequest[]);
      }

      setLoading(false);
    }

    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (activeStatus === "all") return requests;
    return requests.filter(
      (request) => (request.status || "open") === activeStatus
    );
  }, [requests, activeStatus]);

  function countByStatus(status: string) {
    if (status === "all") return requests.length;
    return requests.filter((request) => (request.status || "open") === status)
      .length;
  }

  const openCount = requests.filter((request) =>
    ["open", "unassigned", "in_progress", "waiting_customer"].includes(
      request.status || "open"
    )
  ).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Support Operations"
        title="Support Queue"
        description="Salesforce-style case management for landlord and tenant support. Prioritize open cases, assignment, and resolution quality."
        action={
          <div className="flex gap-2">
            <Link
              href="/admin/support/tickets"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              AI Tickets
            </Link>
            <Link
              href="/admin/support/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <Plus size={15} />
              New Case
            </Link>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Open Cases" value={{ value: openCount }} tone="amber" />
          <KpiCard
            label="Closed Cases"
            value={{ value: countByStatus("closed") + countByStatus("resolved") }}
            tone="green"
          />
          <KpiCard label="Urgent Priority" value={{ value: countPriority("urgent", requests) }} tone="red" />
          <KpiCard label="Recent Requests" value={{ value: requests.length }} />
        </div>

        <Section
          title="Case Queue"
          description="Showing the latest 100 support requests."
          action={
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveStatus(tab.value)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                    activeStatus === tab.value
                      ? "bg-zinc-950 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {tab.label} · {countByStatus(tab.value)}
                </button>
              ))}
            </div>
          }
        >
          <AdminTable
            columns={[
              "Case",
              "Requester",
              "Status",
              "Priority",
              "Category",
              "Created",
              "",
            ]}
            empty={!loading && filteredRequests.length === 0}
            rows={filteredRequests.map((request) => (
              <tr key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <LifeBuoy size={15} className="text-zinc-400" />
                    <span className="font-semibold">
                      {request.subject || request.title || "Support Request"}
                    </span>
                  </div>
                </TableCell>
                <TableCell muted>
                  {request.email || request.user_email || "No email"}
                </TableCell>
                <TableCell>
                  <StatusBadge value={request.status || "open"} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={request.priority || "normal"} />
                </TableCell>
                <TableCell muted>{readable(request.category)}</TableCell>
                <TableCell>
                  <DateCell value={request.created_at} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/support/${request.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Open
                  </Link>
                </TableCell>
              </tr>
            ))}
          />

          {loading ? <p className="mt-3 text-xs text-zinc-500">Loading support requests...</p> : null}
          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        </Section>
      </div>
    </div>
  );
}

function countPriority(priority: string, requests: SupportRequest[]) {
  return requests.filter((request) => request.priority === priority).length;
}
