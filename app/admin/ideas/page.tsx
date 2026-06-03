import { Activity, AlertTriangle, FileText, MailWarning } from "lucide-react";

import {
  AdminPageHeader,
  AdminTable,
  DateCell,
  KpiCard,
  Section,
  StatusBadge,
  TableCell,
  getRecordString,
} from "@/components/admin/AdminCommandComponents";
import {
  countBy,
  countRows,
  getAdminOverviewData,
  readable,
  recentRows,
} from "@/lib/admin/adminMetrics";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const [
    data,
    failedEmails,
    recentErrors,
    pendingTenantAccess,
    acceptedTenantAccess,
    documentCount,
    noteCount,
    recentActivity,
  ] = await Promise.all([
    getAdminOverviewData(),
    recentRows(
      "email_events",
      "id, event_type, recipient_email, status, error_message, failed_at, created_at",
      8
    ),
    recentRows(
      "activity_logs",
      "id, activity_type, title, description, created_at, property_id, lease_id",
      8
    ),
    countBy("tenant_access", "invite_status", "pending"),
    countBy("tenant_access", "invite_status", "accepted"),
    countRows("lease_documents"),
    countRows("property_notes"),
    recentRows(
      "activity_logs",
      "id, activity_type, title, description, created_at, property_id, lease_id",
      10
    ),
  ]);

  const failedEmailRows = failedEmails.filter((row) => row.status === "failed");
  const errorRows = recentErrors.filter((row) =>
    String(row.activity_type || row.title || "").toLowerCase().includes("error")
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="System Health"
        title="Operational Health"
        description="A fast view of delivery failures, tenant invite issues, lease activation signals, document volume, and recent platform logs."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Failed Email Events"
            value={data.counts.emailsFailed}
            tone="red"
          />
          <KpiCard
            label="Email Delivery Failures"
            value={{ value: failedEmailRows.length }}
            helper="Recent rows"
            tone="red"
          />
          <KpiCard
            label="Tenant Invite Issues"
            value={pendingTenantAccess}
            helper="Pending invites"
            tone="amber"
          />
          <KpiCard
            label="Lease Activation Signals"
            value={acceptedTenantAccess}
            helper="Accepted tenant access"
            tone="green"
          />
          <KpiCard
            label="Recent Errors"
            value={{ value: errorRows.length }}
            tone={errorRows.length > 0 ? "red" : "green"}
          />
          <KpiCard label="Document Upload Counts" value={documentCount} />
          <KpiCard label="Property Notes" value={noteCount} />
          <KpiCard label="Activity Logs" value={data.counts.activityLogs} />
          <KpiCard label="Open Support Cases" value={data.counts.openSupport} tone="amber" />
          <KpiCard label="Pending Emails" value={data.counts.emailsPending} tone="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section
            title="Failed Email Events"
            description="Immediate delivery failures that need review."
          >
            <AdminTable
              columns={["Event", "Recipient", "Status", "Failed", "Error"]}
              empty={failedEmailRows.length === 0}
              rows={failedEmailRows.map((row) => (
                <tr key={String(row.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MailWarning size={15} className="text-red-500" />
                      <span className="font-semibold">{readable(row.event_type)}</span>
                    </div>
                  </TableCell>
                  <TableCell muted>{readable(row.recipient_email)}</TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} />
                  </TableCell>
                  <TableCell>
                    <DateCell value={row.failed_at || row.created_at} />
                  </TableCell>
                  <TableCell muted>{readable(row.error_message)}</TableCell>
                </tr>
              ))}
            />
          </Section>

          <Section
            title="Tenant Invite & Lease Activation"
            description="Current signal quality from tenant access records."
          >
            <div className="space-y-3">
              <HealthRow
                icon={AlertTriangle}
                label="Pending tenant invites"
                value={pendingTenantAccess.value}
                tone="amber"
              />
              <HealthRow
                icon={Activity}
                label="Accepted tenant access"
                value={acceptedTenantAccess.value}
                tone="green"
              />
              <HealthRow
                icon={FileText}
                label="Lease document rows"
                value={documentCount.value}
                tone="zinc"
              />
            </div>
          </Section>
        </div>

        <Section
          title="Recent Activity Logs"
          description="Newest activity rows available to the admin client."
        >
          <AdminTable
            columns={["Activity", "Description", "Property", "Lease", "Created"]}
            empty={recentActivity.length === 0}
            rows={recentActivity.map((row) => (
              <tr key={String(row.id)}>
                <TableCell>
                  <span className="font-semibold">
                    {getRecordString(row, ["title", "activity_type"], "Activity")}
                  </span>
                </TableCell>
                <TableCell muted>{readable(row.description)}</TableCell>
                <TableCell muted>{String(row.property_id || "-").slice(0, 8)}</TableCell>
                <TableCell muted>{String(row.lease_id || "-").slice(0, 8)}</TableCell>
                <TableCell>
                  <DateCell value={row.created_at} />
                </TableCell>
              </tr>
            ))}
          />
        </Section>
      </div>
    </div>
  );
}

function HealthRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: number | null;
  tone: "green" | "amber" | "zinc";
}) {
  const color =
    tone === "green"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-zinc-600 bg-zinc-50 border-zinc-200";

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${color}`}>
          <Icon size={15} />
        </div>
        <p className="text-sm font-medium text-zinc-900">{label}</p>
      </div>
      <p className="text-sm font-semibold text-zinc-950">
        {value === null ? "Unavailable" : value.toLocaleString()}
      </p>
    </div>
  );
}
