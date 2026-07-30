"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CaseStatus =
  | "new"
  | "open"
  | "waiting_on_customer"
  | "waiting_on_avenueboard"
  | "waiting_on_payment_partner"
  | "escalated"
  | "resolved"
  | "closed";

type CasePriority = "standard" | "important" | "time_sensitive" | "critical";

const CASE_PRIORITIES: Array<{ value: CasePriority; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "important", label: "Important" },
  { value: "time_sensitive", label: "Time Sensitive" },
  { value: "critical", label: "Critical" },
];

export default function CaseActionsClient({
  caseId,
  assignedStaffId,
  priority,
  status,
  staffOptions,
  allowedStatuses,
  canAssign,
  canUpdateStatus,
  canUpdatePriority,
  canResolve,
  canReopen,
}: {
  caseId: string;
  assignedStaffId: string | null;
  priority: CasePriority;
  status: CaseStatus;
  staffOptions: Array<{ id: string; label: string }>;
  allowedStatuses: Array<{ value: CaseStatus; label: string }>;
  canAssign: boolean;
  canUpdateStatus: boolean;
  canUpdatePriority: boolean;
  canResolve: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  async function updateCase(payload: Record<string, unknown>, label: string) {
    setSaving(label);
    setError("");
    const response = await fetch("/api/command-center/cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, ...payload }),
    });
    setSaving("");
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Unable to update case.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-[18px] font-semibold text-slate-950">Case Actions</h2>
      <div className="mt-4 space-y-4">
        {canAssign ? (
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-600">Assigned To</span>
            <select
              defaultValue={assignedStaffId || ""}
              onChange={(event) =>
                updateCase(
                  { action: "assign", assignedStaffUserId: event.target.value || null },
                  "assign"
                )
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px]"
            >
              <option value="">Unassigned</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canUpdateStatus ? (
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-600">Status</span>
            <select
              defaultValue={status}
              onChange={(event) =>
                updateCase({ action: "status", status: event.target.value }, "status")
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px]"
            >
              {allowedStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canUpdatePriority ? (
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-600">Priority</span>
            <select
              defaultValue={priority}
              onChange={(event) =>
                updateCase({ action: "priority", priority: event.target.value }, "priority")
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px]"
            >
              {CASE_PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canResolve ? (
          <div className="space-y-2">
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-600">
                Resolution Summary
              </span>
              <textarea
                value={resolutionSummary}
                onChange={(event) => setResolutionSummary(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-[14px]"
                placeholder="Summarize the resolution"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                updateCase(
                  { action: "resolve", resolutionSummary },
                  "resolve"
                )
              }
              disabled={saving === "resolve" || !resolutionSummary.trim()}
              className="rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {saving === "resolve" ? "Resolving..." : "Mark Resolved"}
            </button>
          </div>
        ) : null}

        {canReopen ? (
          <button
            type="button"
            onClick={() => updateCase({ action: "reopen" }, "reopen")}
            disabled={saving === "reopen"}
            className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 disabled:opacity-50"
          >
            {saving === "reopen" ? "Reopening..." : "Reopen Case"}
          </button>
        ) : null}
      </div>

      {saving && saving !== "resolve" && saving !== "reopen" ? (
        <p className="mt-3 text-[13px] font-semibold text-slate-500">Saving...</p>
      ) : null}
      {error ? <p className="mt-3 text-[13px] font-semibold text-red-600">{error}</p> : null}
    </section>
  );
}
