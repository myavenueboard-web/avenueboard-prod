"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Mail } from "lucide-react";

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

type EmailEvent = {
  id: string;
  event_type: string | null;
  recipient_email: string | null;
  related_property_id: string | null;
  related_lease_id: string | null;
  status: string | null;
  sent_at: string | null;
  failed_at: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string | null;
};

type Counts = {
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
};

export default function EmailTrackingPage() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [counts, setCounts] = useState<Counts>({
    sent: 0,
    failed: 0,
    pending: 0,
    skipped: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmailEvents() {
      setLoading(true);
      setError("");

      const [{ data, error: eventError }, sent, failed, pending, skipped] =
        await Promise.all([
          supabase
            .from("email_events")
            .select(
              "id, event_type, recipient_email, related_property_id, related_lease_id, status, sent_at, failed_at, provider_message_id, error_message, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(100),
          countEmailStatus("sent"),
          countEmailStatus("failed"),
          countEmailStatus("pending"),
          countEmailStatus("skipped"),
        ]);

      if (eventError) {
        setError(eventError.message);
        setEvents([]);
      } else {
        setEvents((data || []) as EmailEvent[]);
      }

      setCounts({ sent, failed, pending, skipped });
      setLoading(false);
    }

    loadEmailEvents();
  }, []);

  const eventTypes = useMemo(
    () =>
      Array.from(
        new Set(events.map((event) => event.event_type).filter(Boolean))
      ) as string[],
    [events]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const statusMatch =
        statusFilter === "all" || event.status === statusFilter;
      const typeMatch = typeFilter === "all" || event.event_type === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [events, statusFilter, typeFilter]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Communications"
        title="Email Tracking"
        description="Monitor Wave 1 onboarding emails, delivery status, queued reminders, provider IDs, and failures."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Sent" value={{ value: counts.sent }} tone="green" />
          <KpiCard label="Failed" value={{ value: counts.failed }} tone="red" />
          <KpiCard label="Pending" value={{ value: counts.pending }} tone="amber" />
          <KpiCard label="Skipped" value={{ value: counts.skipped }} />
        </div>

        {error ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={17} />
            email_events unavailable: {error}
          </div>
        ) : null}

        <Section
          title="Recent Email Events"
          description="Showing the latest 100 email events. Use filters to isolate failures or a specific lifecycle email."
          action={
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="skipped">Skipped</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 outline-none"
              >
                <option value="all">All event types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {readable(type)}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <AdminTable
            columns={[
              "Event Type",
              "Recipient",
              "Property",
              "Lease",
              "Status",
              "Sent At",
              "Provider Message ID",
              "Error",
            ]}
            empty={!loading && filteredEvents.length === 0}
            rows={filteredEvents.map((event) => (
              <tr key={event.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-zinc-400" />
                    <span className="font-medium">{readable(event.event_type)}</span>
                  </div>
                </TableCell>
                <TableCell muted>{readable(event.recipient_email)}</TableCell>
                <TableCell muted>{shortId(event.related_property_id)}</TableCell>
                <TableCell muted>{shortId(event.related_lease_id)}</TableCell>
                <TableCell>
                  <StatusBadge value={event.status} />
                </TableCell>
                <TableCell>
                  <DateCell value={event.sent_at || event.failed_at} />
                </TableCell>
                <TableCell muted>{readable(event.provider_message_id)}</TableCell>
                <TableCell muted>{readable(event.error_message)}</TableCell>
              </tr>
            ))}
          />

          {loading ? (
            <p className="mt-3 text-xs text-zinc-500">Loading email events...</p>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

async function countEmailStatus(status: string) {
  const { count } = await supabase
    .from("email_events")
    .select("*", { count: "exact", head: true })
    .eq("status", status);

  return count || 0;
}

function shortId(value: string | null) {
  return value ? value.slice(0, 8) : "-";
}
