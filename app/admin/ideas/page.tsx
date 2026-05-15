"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

const statusTabs = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

export default function FutureIdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("support");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(true);

  async function loadIdeas() {
    const { data } = await supabase
      .from("future_ideas")
      .select("*")
      .order("created_at", { ascending: false });

    setIdeas(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadIdeas();
  }, []);

  const filteredIdeas = useMemo(() => {
    if (activeStatus === "all") return ideas;
    return ideas.filter((idea) => idea.status === activeStatus);
  }, [ideas, activeStatus]);

  async function createIdea(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from("future_ideas").insert({
      title,
      description,
      source,
      priority,
      status: "new",
      created_by: "Admin",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setSource("support");
    setPriority("normal");
    setShowForm(false);
    await loadIdeas();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CA6180]">
              Future Scope
            </p>

            <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
              Ideas & Findings
            </h1>

            <p className="mt-4 max-w-3xl text-[14px] leading-6 text-neutral-500">
              Capture customer suggestions, support findings, bugs, and future
              AvenueBoard improvements in one place.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#CA6180] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus size={16} />
            New Idea
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={createIdea}
          className="rounded-[32px] border border-[#e7dfe2] bg-white p-7"
        >
          <div className="grid gap-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Idea title"
              required
              className="h-12 rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the idea or finding..."
              rows={5}
              className="rounded-2xl border border-[#e7dfe2] px-4 py-4 text-sm outline-none focus:border-[#CA6180]"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-12 rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
              >
                <option value="support">Support</option>
                <option value="customer_feedback">Customer Feedback</option>
                <option value="internal">Internal</option>
                <option value="bug">Bug</option>
                <option value="survey">Survey</option>
              </select>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-12 rounded-2xl border border-[#e7dfe2] px-4 text-sm outline-none focus:border-[#CA6180]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <button className="w-fit rounded-2xl bg-[#CA6180] px-6 py-3 text-sm font-medium text-white">
              Save Idea
            </button>
          </div>
        </form>
      )}

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-6">
        <div className="flex flex-wrap gap-3">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                activeStatus === tab.value
                  ? "bg-[#CA6180] text-white"
                  : "bg-[#f8f5f6] text-neutral-600 hover:bg-[#CA6180]/10 hover:text-[#CA6180]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-[#e7dfe2] bg-white p-6">
        <h2 className="text-xl font-semibold">Idea Queue</h2>

        <p className="mt-1 text-sm text-neutral-500">
          {loading ? "Loading..." : `${filteredIdeas.length} record(s) found`}
        </p>

        <div className="mt-6 space-y-3">
          {filteredIdeas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7dfe2] py-14 text-center text-sm text-neutral-500">
              No ideas found.
            </div>
          ) : (
            filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-2xl border border-[#f0e4e8] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CA6180]/10 text-[#CA6180]">
                      <Lightbulb size={18} />
                    </div>

                    <div>
                      <p className="font-semibold text-neutral-950">
                        {idea.title}
                      </p>

                      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
                        {idea.description || "No description added."}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Badge value={idea.source || "internal"} />
                        <Badge value={`${idea.priority || "normal"} priority`} />
                      </div>
                    </div>
                  </div>

                  <Badge value={(idea.status || "new").replaceAll("_", " ")} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-[#f8f5f6] px-3 py-1 text-xs font-medium capitalize text-neutral-600">
      {value.replaceAll("_", " ")}
    </span>
  );
}