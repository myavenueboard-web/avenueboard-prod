"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NewSupportCasePage() {
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const { error } = await supabase.from("support_requests").insert({
      email,
      subject,
      message: description,
      status,
      priority,
    });

    setLoading(false);

    if (!error) {
      setSuccess(true);
      setSubject("");
      setDescription("");
      setStatus("open");
      setPriority("normal");
    } else {
      console.error(error);

alert(
  error?.message ||
    error?.details ||
    "Failed to create support case."
);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <Link
          href="/admin/support"
          className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-[#CA6180]"
        >
          <ArrowLeft size={16} />
          Back to Support
        </Link>

        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
          Support Center
        </p>

        <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.04em] text-neutral-950">
          Open Support Case
        </h1>

        <p className="mt-4 max-w-3xl text-[14px] leading-6 text-neutral-500">
          Create and manage operational support requests for landlords and
          tenants.
        </p>
      </div>

      <form
        onSubmit={handleCreateCase}
        className="rounded-[32px] border border-[#e7dfe2] bg-white p-7"
      >
        <div className="grid gap-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              User Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@email.com"
              className="h-12 w-full rounded-2xl border border-[#e7dfe2] bg-white px-4 text-sm outline-none transition focus:border-[#CA6180]"
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Status
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#e7dfe2] bg-white px-4 text-sm outline-none transition focus:border-[#CA6180]"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Priority
              </label>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#e7dfe2] bg-white px-4 text-sm outline-none transition focus:border-[#CA6180]"
              >
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Subject
            </label>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Issue summary"
              className="h-12 w-full rounded-2xl border border-[#e7dfe2] bg-white px-4 text-sm outline-none transition focus:border-[#CA6180]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={6}
              className="w-full rounded-2xl border border-[#e7dfe2] bg-white px-4 py-4 text-sm outline-none transition focus:border-[#CA6180]"
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#CA6180] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Support Case"}
            </button>

            {success && (
              <p className="text-sm text-green-600">
                Support case created successfully.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}