"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StaffRole = "super_admin" | "operations" | "support" | "payments" | "read_only";

export default function StaffActionsClient({
  staffUserId,
  role,
  mfaRequired,
  expectedUpdatedAt,
  canChangeRole,
  canSuspend,
  canRestore,
  canRevoke,
  canActivate,
  canToggleMfa,
}: {
  staffUserId: string;
  role: StaffRole;
  mfaRequired: boolean;
  expectedUpdatedAt: string;
  canChangeRole: boolean;
  canSuspend: boolean;
  canRestore: boolean;
  canRevoke: boolean;
  canActivate: boolean;
  canToggleMfa: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  async function updateStaff(payload: Record<string, unknown>, label: string) {
    setSaving(label);
    setError("");
    const response = await fetch("/api/command-center/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffUserId, expectedUpdatedAt, ...payload }),
    });
    setSaving("");

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Unable to update staff access.");
      return;
    }

    router.refresh();
  }

  function promptReason(message: string) {
    return window.prompt(message)?.trim() || "";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canChangeRole ? (
          <select
            defaultValue={role}
            disabled={Boolean(saving)}
            onChange={(event) => {
              const nextRole = event.target.value as StaffRole;
              if (nextRole === role) return;
              const reason = promptReason("Reason for role change");
              if (!reason) {
                event.currentTarget.value = role;
                return;
              }
              updateStaff({ action: "change_role", role: nextRole, reason }, "role");
            }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700"
          >
            <option value="super_admin">Super Admin</option>
            <option value="operations">Operations</option>
            <option value="support">Support</option>
            <option value="payments">Payments</option>
            <option value="read_only">Read Only</option>
          </select>
        ) : null}

        {canActivate ? (
          <ActionButton
            disabled={Boolean(saving)}
            onClick={() => updateStaff({ action: "activate" }, "activate")}
          >
            Activate
          </ActionButton>
        ) : null}

        {canSuspend ? (
          <ActionButton
            disabled={Boolean(saving)}
            onClick={() => {
              const reason = promptReason("Reason for suspension");
              if (reason) updateStaff({ action: "suspend", reason }, "suspend");
            }}
          >
            Suspend
          </ActionButton>
        ) : null}

        {canRestore ? (
          <ActionButton
            disabled={Boolean(saving)}
            onClick={() => updateStaff({ action: "restore" }, "restore")}
          >
            Restore
          </ActionButton>
        ) : null}

        {canRevoke ? (
          <ActionButton
            danger
            disabled={Boolean(saving)}
            onClick={() => {
              const reason = promptReason("Reason for revoking access");
              if (reason && window.confirm("Revoke this staff member's access?")) {
                updateStaff({ action: "revoke", reason }, "revoke");
              }
            }}
          >
            Revoke
          </ActionButton>
        ) : null}

        {canToggleMfa ? (
          <ActionButton
            disabled={Boolean(saving)}
            onClick={() =>
              updateStaff(
                { action: "toggle_mfa", mfaRequired: !mfaRequired },
                "mfa"
              )
            }
          >
            {mfaRequired ? "MFA Off" : "MFA On"}
          </ActionButton>
        ) : null}
      </div>
      {saving ? <p className="text-[12px] font-semibold text-slate-500">Saving...</p> : null}
      {error ? <p className="text-[12px] font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-xl border px-3 text-[12px] font-semibold transition disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
