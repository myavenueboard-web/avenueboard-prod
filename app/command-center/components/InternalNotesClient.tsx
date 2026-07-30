"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InternalNoteRow } from "@/lib/command-center/people";

export default function InternalNotesClient({
  profileId,
  targetType = "profile",
  notes,
  canCreate,
  canEdit,
}: {
  profileId: string;
  targetType?: "profile" | "property" | "payment" | "case";
  notes: InternalNoteRow[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function createNote() {
    if (!note.trim()) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/command-center/internal-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId: profileId, note }),
    });
    setSubmitting(false);
    if (!response.ok) {
      setError("Unable to save note.");
      return;
    }
    setNote("");
    router.refresh();
  }

  async function saveEdit(id: string) {
    if (!editingNote.trim()) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/command-center/internal-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note: editingNote }),
    });
    setSubmitting(false);
    if (!response.ok) {
      setError("Unable to update note.");
      return;
    }
    setEditingId(null);
    setEditingNote("");
    router.refresh();
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-950">Internal Notes</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Notes are internal to Command Center and never shown to customers.
          </p>
        </div>
      </div>

      {canCreate ? (
        <div className="mt-4 space-y-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add an internal note"
            className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-slate-400"
          />
          <button
            type="button"
            onClick={createNote}
            disabled={submitting || !note.trim()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add note"}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-500">
          Your role can view notes but cannot create or edit them.
        </p>
      )}

      {error ? <p className="mt-3 text-[13px] font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 divide-y divide-slate-100">
        {notes.length ? (
          notes.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[12px] font-semibold text-slate-500">
                  {item.staff_users?.full_name || item.staff_users?.email || "Staff"} ·{" "}
                  {formatDisplayDateTime(item.created_at)}
                </p>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingNote(item.note);
                    }}
                    className="text-[12px] font-semibold text-slate-600 hover:text-slate-950"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {editingId === item.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editingNote}
                    onChange={(event) => setEditingNote(event.target.value)}
                    className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(item.id)}
                      disabled={submitting || !editingNote.trim()}
                      className="rounded-xl bg-slate-950 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-slate-800">
                  {item.note}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-[14px] text-slate-500">No internal notes yet.</p>
        )}
      </div>
    </section>
  );
}

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
