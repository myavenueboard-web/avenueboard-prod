import {
  Activity,
  Building2,
  FileText,
  LifeBuoy,
  Mail,
  UserRound,
} from "lucide-react";

import {
  AdminPageHeader,
  DateCell,
  KpiCard,
  RecordLink,
  Section,
  StatusBadge,
  TableCell,
  AdminTable,
  getRecordString,
} from "@/components/admin/AdminCommandComponents";
import {
  formatCurrencyCount,
  getAdminOverviewData,
  readable,
} from "@/lib/admin/adminMetrics";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getAdminOverviewData();

  const platformActivity = [
    ...data.recent.activityLogs.map((row) => ({
      href: "/admin/ideas",
      icon: Activity,
      title: getRecordString(row, ["title", "activity_type"], "Activity logged"),
      subtitle: readable(row.description, readable(row.activity_type)),
      date: row.created_at,
    })),
    ...data.recent.properties.map((row) => ({
      href: "/admin/audience",
      icon: Building2,
      title: getRecordString(row, ["property_label", "street_address"], "Property created"),
      subtitle: `${readable(row.city)} ${readable(row.state_name)}`,
      date: row.created_at,
    })),
    ...data.recent.leases.map((row) => ({
      href: "/admin/audience",
      icon: FileText,
      title: `${readable(row.lease_status, "lease")} lease`,
      subtitle: `$${Number(row.monthly_rent || 0).toLocaleString()}/month`,
      date: row.created_at,
    })),
    ...data.recent.profiles.map((row) => ({
      href: `/admin/audience/${row.id}`,
      icon: UserRound,
      title: getRecordString(row, ["display_name", "full_name", "email"], "Profile created"),
      subtitle: getRecordString(row, ["email", "role", "user_type"], "No email"),
      date: row.created_at,
    })),
  ]
    .filter((item) => item.date)
    .sort(
      (a, b) =>
        new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()
    )
    .slice(0, 8);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Operations"
        title="Overview"
        description="Real-time operational visibility across users, properties, leases, payments, support, communications, and system activity."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Landlords" value={data.counts.landlords} />
          <KpiCard label="Total Tenants" value={data.counts.tenants} />
          <KpiCard label="Total Properties" value={data.counts.properties} />
          <KpiCard label="Total Leases" value={data.counts.leases} />
          <KpiCard
            label="Active Tenant Access"
            value={data.counts.activeTenantAccess}
            tone="green"
          />
          <KpiCard
            label="Rent Under Management"
            value={formatCurrencyCount(data.rentUnderManagement)}
            helper="Active leases"
            tone="blue"
          />
          <KpiCard label="Total Payments" value={data.counts.paymentsTotal} />
          <KpiCard
            label="Open Support Cases"
            value={data.counts.openSupport}
            tone="amber"
          />
          <KpiCard label="Emails Sent" value={data.counts.emailsSent} tone="green" />
          <KpiCard label="Emails Failed" value={data.counts.emailsFailed} tone="red" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Section
            title="Recent Platform Activity"
            description="Latest records and activity logs across the platform."
          >
            <div className="space-y-2">
              {platformActivity.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
                  No platform activity found.
                </div>
              ) : (
                platformActivity.map((item, index) => (
                  <RecordLink
                    key={`${item.title}-${index}`}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    subtitle={`${item.subtitle} · ${new Date(
                      String(item.date)
                    ).toLocaleString()}`}
                  />
                ))
              )}
            </div>
          </Section>

          <Section
            title="Recent Support Activity"
            description="Newest support cases requiring operational awareness."
          >
            <AdminTable
              columns={["Case", "Requester", "Status", "Priority"]}
              empty={data.recent.support.length === 0}
              rows={data.recent.support.map((row) => (
                <tr key={String(row.id)}>
                  <TableCell>
                    <a
                      href={`/admin/support/${row.id}`}
                      className="font-semibold hover:text-blue-600"
                    >
                      {getRecordString(row, ["subject", "title"], "Support request")}
                    </a>
                  </TableCell>
                  <TableCell muted>{getRecordString(row, ["email"], "No email")}</TableCell>
                  <TableCell>
                    <StatusBadge value={row.status || "open"} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.priority || "normal"} />
                  </TableCell>
                </tr>
              ))}
            />
          </Section>
        </div>

        <Section
          title="Recent Email Activity"
          description="Latest email queue events from Wave 1 communications."
          action={
            <a
              href="/admin/marketing"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Email Tracking
            </a>
          }
        >
          <AdminTable
            columns={["Event Type", "Recipient", "Status", "Sent", "Error"]}
            empty={data.recent.emailEvents.length === 0}
            rows={data.recent.emailEvents.map((row) => (
              <tr key={String(row.id)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-zinc-400" />
                    <span className="font-medium">{readable(row.event_type)}</span>
                  </div>
                </TableCell>
                <TableCell muted>{readable(row.recipient_email)}</TableCell>
                <TableCell>
                  <StatusBadge value={row.status} />
                </TableCell>
                <TableCell>
                  <DateCell value={row.sent_at || row.failed_at || row.created_at} />
                </TableCell>
                <TableCell muted>{readable(row.error_message, "-")}</TableCell>
              </tr>
            ))}
          />
        </Section>
      </div>
    </div>
  );
}
