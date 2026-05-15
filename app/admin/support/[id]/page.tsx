"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  LifeBuoy,
  Upload,
  Paperclip,
  User,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SupportCaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  const [status, setStatus] = useState("unassigned");
  const [priority, setPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("Admin");
  const [internalNote, setInternalNote] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCase() {
    const { data } = await supabase
      .from("support_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data: noteData } = await supabase
      .from("support_case_notes")
      .select("*")
      .eq("support_case_id", id)
      .order("created_at", { ascending: false });

    const { data: attachmentData } = await supabase
      .from("support_case_attachments")
      .select("*")
      .eq("support_case_id", id)
      .order("created_at", { ascending: false });

    setCaseData(data);
    setNotes(noteData || []);
    setAttachments(attachmentData || []);

    setStatus(data?.status || "unassigned");
    setPriority(data?.priority || "normal");
    setAssignedTo(data?.assigned_to || "Admin");
    setRootCause(data?.root_cause || "");
    setResolutionSummary(data?.resolution_summary || "");

    setLoading(false);
  }

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  async function saveCase() {
    setSaving(true);

    const { error } = await supabase
      .from("support_requests")
      .update({
        status,
        priority,
        assigned_to: assignedTo,
        root_cause: rootCause,
        resolution_summary: resolutionSummary,
        resolved_at:
          status === "resolved" || status === "closed"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", id);

    if (internalNote.trim()) {
      await supabase.from("support_case_notes").insert({
        support_case_id: id,
        note: internalNote,
        created_by: "Admin",
      });

      setInternalNote("");
    }

    setSaving(false);

    if (error) {
      alert(error.message || "Failed to save case.");
      return;
    }

    await loadCase();
  }

  async function uploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `${id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("support-attachments")
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("support-attachments")
      .getPublicUrl(filePath);

    await supabase.from("support_case_attachments").insert({
      support_case_id: id,
      file_name: file.name,
      file_url: data.publicUrl,
      file_path: filePath,
    });

    await loadCase();
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading case...</div>;
  }

  if (!caseData) {
    return (
      <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-8">
        <h1 className="text-2xl font-semibold">Support case not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-[#CA6180]"
      >
        <ArrowLeft size={16} />
        Back to Support
      </Link>

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
              <LifeBuoy size={22} />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
                Support Case
              </p>

              <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">
                {caseData.subject || "Support Request"}
              </h1>

              <p className="mt-2 text-sm text-neutral-500">
                {caseData.email || "No email"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge value={(caseData.status || "unassigned").replaceAll("_", " ")} />
            <Badge value={`${caseData.priority || "normal"} priority`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Meta label="Ticket ID" value={caseData.id?.slice(0, 8)} />
          <Meta
            label="Created"
            value={
              caseData.created_at
                ? new Date(caseData.created_at).toLocaleDateString()
                : "-"
            }
          />
          <Meta label="Assigned To" value={caseData.assigned_to || "Admin"} />
          <Meta label="Status" value={caseData.status || "unassigned"} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="text-xl font-semibold">Issue Details</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {caseData.description ||
                caseData.message ||
                "No description added."}
            </p>
          </div>

          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="text-xl font-semibold">Internal Notes</h2>

            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={4}
              placeholder="Add a new internal note..."
              className="mt-4 w-full rounded-2xl border border-[#e7dfe2] px-4 py-4 text-sm outline-none focus:border-[#CA6180]"
            />

            <div className="mt-5 space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-neutral-500">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-[#f0e4e8] p-4"
                  >
                    <p className="text-sm text-neutral-700">{note.note}</p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {note.created_by || "Admin"} ·{" "}
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="text-xl font-semibold">Attachments</h2>

            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e7dfe2] p-6 text-sm text-neutral-500 hover:border-[#CA6180] hover:text-[#CA6180]">
              <Upload size={18} />
              Upload attachment
              <input type="file" className="hidden" onChange={uploadAttachment} />
            </label>

            <div className="mt-5 space-y-3">
              {attachments.length === 0 ? (
                <p className="text-sm text-neutral-500">No attachments yet.</p>
              ) : (
                attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.file_url}
                    target="_blank"
                    className="flex items-center gap-3 rounded-2xl border border-[#f0e4e8] p-4 text-sm hover:bg-[#CA6180]/5"
                  >
                    <Paperclip size={16} className="text-[#CA6180]" />
                    {file.file_name}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="text-xl font-semibold">Case Management</h2>

            <div className="mt-5 space-y-5">
              <Field label="Assigned To">
                <input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
                />
              </Field>

              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_customer">Waiting Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </Field>

              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Field>

              <Field label="Root Cause">
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[#e7dfe2] px-4 py-4 text-sm outline-none focus:border-[#CA6180]"
                />
              </Field>

              <Field label="Resolution Summary">
                <textarea
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-[#e7dfe2] px-4 py-4 text-sm outline-none focus:border-[#CA6180]"
                />
              </Field>

              <button
                onClick={saveCase}
                disabled={saving}
                className="rounded-2xl bg-[#CA6180] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Case"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e7dfe2] bg-white p-6">
            <h2 className="text-xl font-semibold">Customer Context</h2>

            <div className="mt-5 space-y-3 text-sm">
              <ContextRow icon={User} label="Email" value={caseData.email || "-"} />
              <ContextRow
                icon={Clock}
                label="Created"
                value={
                  caseData.created_at
                    ? new Date(caseData.created_at).toLocaleString()
                    : "-"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-[#f8f5f6] p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-900">{value || "-"}</p>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-[#f8f5f6] px-3 py-1 text-xs font-medium capitalize text-neutral-600">
      {value}
    </span>
  );
}

function ContextRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#f8f5f6] p-4">
      <Icon size={16} className="text-[#CA6180]" />
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="mt-1 font-medium text-neutral-900">{value}</p>
      </div>
    </div>
  );
}