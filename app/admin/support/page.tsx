"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

const statusTabs = [
  { label: "All", value: "all" },
  { label: "Unassigned", value: "unassigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Waiting Customer", value: "waiting_customer" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export default function SupportCenterPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setRequests(data || []);
      setLoading(false);
    }

    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (activeStatus === "all") return requests;

    return requests.filter(
      (item) => (item.status || "unassigned") === activeStatus
    );
  }, [requests, activeStatus]);

  function countByStatus(status: string) {
    if (status === "all") return requests.length;

    return requests.filter((item) => (item.status || "unassigned") === status)
      .length;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
              Support Center
            </p>

            <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
              Support Cases
            </h1>

            <p className="mt-4 max-w-3xl text-[14px] leading-6 text-neutral-500">
              Manage landlord and tenant support requests from one internal
              workspace.
            </p>
          </div>

          <Link
            href="/admin/support/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#CA6180] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            New Case
          </Link>
        </div>
      </div>

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-6">
        <div className="flex flex-wrap gap-3">
          {statusTabs.map((tab) => {
            const active = activeStatus === tab.value;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[#CA6180] text-white"
                    : "bg-[#f8f5f6] text-neutral-600 hover:bg-[#CA6180]/10 hover:text-[#CA6180]"
                }`}
              >
                {tab.label} · {countByStatus(tab.value)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-6">
        <h2 className="text-xl font-semibold">
          {statusTabs.find((tab) => tab.value === activeStatus)?.label} Support
          Requests
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          {loading
            ? "Loading..."
            : `${filteredRequests.length} record(s) found`}
        </p>

        <div className="mt-6 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7dfe2] py-14 text-center text-sm text-neutral-500">
              No support requests found.
            </div>
          ) : (
            filteredRequests.map((item: any) => (
              <Link
                key={item.id}
                href={`/admin/support/${item.id}`}
                className="block rounded-2xl border border-[#f0e4e8] p-5 transition hover:bg-[#CA6180]/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
                      <LifeBuoy size={18} />
                    </div>

                    <div>
                      <p className="font-semibold text-neutral-950">
                        {item.subject || item.title || "Support Request"}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {item.email || item.user_email || "No email"}
                      </p>

                      <div
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityStyles(
                          item.priority || "normal"
                        )}`}
                      >
                        {item.priority || "normal"} priority
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyles(
                      item.status || "unassigned"
                    )}`}
                  >
                    {(item.status || "unassigned").replaceAll("_", " ")}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusStyles(status: string) {
  switch (status) {
    case "resolved":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "waiting_customer":
      return "bg-yellow-100 text-yellow-700";
    case "closed":
      return "bg-neutral-200 text-neutral-700";
    default:
      return "bg-[#f8f5f6] text-neutral-600";
  }
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-[#f8f5f6] text-neutral-600";
  }
}