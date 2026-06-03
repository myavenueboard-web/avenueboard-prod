import { CreditCard, DollarSign } from "lucide-react";

import {
  AdminPageHeader,
  AdminTable,
  DateCell,
  KpiCard,
  Section,
  StatusBadge,
  TableCell,
} from "@/components/admin/AdminCommandComponents";
import {
  formatCurrencyCount,
  getAdminOverviewData,
  readable,
} from "@/lib/admin/adminMetrics";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const data = await getAdminOverviewData();

  return (
    <div>
      <AdminPageHeader
        eyebrow="Payments"
        title="Payment Operations"
        description="Operational payment visibility using existing rent payment and lease data only. No platform revenue is fabricated."
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Rent Under Management"
            value={formatCurrencyCount(data.rentUnderManagement)}
            helper="Active leases"
            tone="blue"
          />
          <KpiCard
            label="Successful Payments"
            value={data.counts.paymentsSuccessful}
            tone="green"
          />
          <KpiCard
            label="Pending Payments"
            value={data.counts.paymentsPending}
            tone="amber"
          />
          <KpiCard label="Failed Payments" value={data.counts.paymentsFailed} tone="red" />
          <KpiCard label="Total Payments" value={data.counts.paymentsTotal} />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500">
              <DollarSign size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Platform revenue tracking not configured.
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                This screen shows rent payment operations only. AvenueBoard fee
                revenue should be added after Stripe platform fee and payout
                reporting are modeled.
              </p>
            </div>
          </div>
        </div>

        <Section
          title="Recent Payments"
          description="Latest rent payment rows from the existing rent_payments table."
        >
          <AdminTable
            columns={["Payment", "Lease", "Period", "Status", "Paid At", "Receipt"]}
            empty={data.recent.payments.length === 0}
            rows={data.recent.payments.map((payment) => (
              <tr key={String(payment.id)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-zinc-400" />
                    <span className="font-semibold">
                      ${Number(payment.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell muted>{String(payment.lease_id || "-").slice(0, 8)}</TableCell>
                <TableCell muted>{readable(payment.period_label)}</TableCell>
                <TableCell>
                  <StatusBadge value={payment.status} />
                </TableCell>
                <TableCell>
                  <DateCell value={payment.paid_at || payment.created_at} />
                </TableCell>
                <TableCell>
                  {payment.receipt_url ? (
                    <a
                      href={String(payment.receipt_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400">-</span>
                  )}
                </TableCell>
              </tr>
            ))}
          />
        </Section>
      </div>
    </div>
  );
}
