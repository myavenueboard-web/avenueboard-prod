"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Ticket } from "lucide-react";
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

type SupportTicket = {
  id: string;
  ticket_number: string;
  user_id: string;
  profile_id: string | null;
  tenant_access_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  category: string;
  message: string;
  status: "open" | "in_review" | "resolved";
  priority: string;
  created_at: string;
  metadata?: {
    confirmed_issue_summary?: string;
    conversation_summary?: string;
    issue_details?: string;
    tenant_context?: {
      tenantName?: string | null;
      propertyLabel?: string | null;
    };
  } | null;
};

const statusOptions = ["open", "in_review", "resolved"] as const;

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function loadTickets() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setError(error.message);
      setTickets([]);
    } else {
      setTickets((data || []) as SupportTicket[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const counts = useMemo(
    () => ({
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inReview: tickets.filter((ticket) => ticket.status === "in_review")
        .length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      total: tickets.length,
    }),
    [tickets]
  );

  async function updateTicketStatus(
    ticketId: string,
    status: SupportTicket["status"]
  ) {
    setUpdatingId(ticketId);

    const { error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId);

    if (error) {
      setError(error.message);
    } else {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, status } : ticket
        )
      );
    }

    setUpdatingId("");
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Ava"
        title="Support Tickets"
        description="Tickets created from Ava conversations. Review, prioritize, and update ticket status."
        action={
          <Link
            href="/admin/support"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft size={14} />
            Support Queue
          </Link>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Open" value={{ value: counts.open }} tone="amber" />
          <KpiCard
            label="In Review"
            value={{ value: counts.inReview }}
            tone="blue"
          />
          <KpiCard
            label="Resolved"
            value={{ value: counts.resolved }}
            tone="green"
          />
          <KpiCard label="Total Tickets" value={{ value: counts.total }} />
        </div>

        <Section
          title="Ava Support Tickets"
          description="Showing the latest 100 tenant support tickets."
        >
          <AdminTable
            columns={[
              "Ticket",
              "Category",
              "Priority",
              "Tenant/User",
              "Property",
              "Status",
              "Issue Summary",
              "Conversation Summary",
              "Created",
            ]}
            empty={!loading && tickets.length === 0}
            rows={tickets.map((ticket) => (
              <tr key={ticket.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ticket size={15} className="text-zinc-400" />
                    <span className="font-semibold">{ticket.ticket_number}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge value={ticket.category} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={ticket.priority} />
                </TableCell>
                <TableCell muted>
                  {ticket.metadata?.tenant_context?.tenantName ||
                    shortId(ticket.profile_id || ticket.user_id)}
                </TableCell>
                <TableCell muted>
                  {ticket.metadata?.tenant_context?.propertyLabel ||
                    shortId(ticket.property_id)}
                </TableCell>
                <TableCell>
                  <select
                    value={ticket.status}
                    disabled={updatingId === ticket.id}
                    onChange={(event) =>
                      updateTicketStatus(
                        ticket.id,
                        event.target.value as SupportTicket["status"]
                      )
                    }
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-700 outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="line-clamp-2 text-xs font-semibold text-zinc-900">
                      {ticket.metadata?.confirmed_issue_summary ||
                        ticket.message}
                    </p>
                    {ticket.metadata?.issue_details ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
                        {ticket.metadata.issue_details}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell muted>
                  <div className="flex max-w-[360px] items-start gap-2">
                    <Bot size={14} className="mt-0.5 shrink-0 text-zinc-400" />
                    <span className="line-clamp-3">
                      {ticket.metadata?.conversation_summary || ticket.message}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <DateCell value={ticket.created_at} />
                </TableCell>
              </tr>
            ))}
          />

          {loading ? (
            <p className="mt-3 text-xs text-zinc-500">Loading tickets...</p>
          ) : null}
          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        </Section>
      </div>
    </div>
  );
}

function shortId(value: string | null) {
  return value ? value.slice(0, 8) : "-";
}
