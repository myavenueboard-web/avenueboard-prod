import Link from "next/link";
import { notFound } from "next/navigation";
import InternalNotesClient from "@/app/command-center/components/InternalNotesClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getPaymentDetail, type StripeReference } from "@/lib/command-center/payments";

export default async function CommandCenterPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const staff = await requireCommandCenterStaff();
  const { paymentId } = await params;
  const detail = await loadPaymentDetail(staff, paymentId);

  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/command-center/payments"
        className="text-[13px] font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Back to Payments
      </Link>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Payment
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="max-w-[720px] break-all font-mono text-[24px] font-semibold tracking-[-0.04em] text-slate-950">
              {detail.header.id}
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              {detail.header.rentMonth} · {detail.header.property}
            </p>
          </div>
          <div className="grid gap-2 text-[13px] text-slate-600 sm:grid-cols-2 lg:text-right">
            <p>Status: {detail.header.paymentStatus}</p>
            <p>Due: {detail.header.amountDue}</p>
            <p>Paid: {detail.header.amountPaid}</p>
            <p>Remaining: {detail.header.remainingBalance}</p>
          </div>
        </div>
      </section>

      {detail.reviewReasons.length ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-[16px] font-semibold text-amber-900">
            Review Queue
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.reviewReasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[12px] font-semibold text-amber-800"
              >
                {reason}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <InfoSection title="Overview" rows={detail.overview} />

          <InfoSection
            title="Resident"
            rows={[
              ["Resident", detail.resident.name],
              ["Email", detail.resident.email],
              [
                "People Profile",
                detail.resident.id
                  ? `/command-center/people/${detail.resident.id}`
                  : "Not available",
              ],
            ]}
          />

          <InfoSection
            title="Property"
            rows={[
              ["Property", detail.property.name],
              ["Lease", detail.property.leaseId],
              ["Rent Month", detail.property.rentMonth],
              ["Monthly Rent", detail.property.monthlyRent],
              [
                "Property Profile",
                detail.property.id
                  ? `/command-center/properties/${detail.property.id}`
                  : "Not available",
              ],
            ]}
          />

          <InfoSection
            title="Landlord"
            rows={[
              ["Landlord", detail.landlord.name],
              ["Email", detail.landlord.email],
              ["Bank Status", detail.landlord.bankStatus],
              [
                "People Profile",
                detail.landlord.id
                  ? `/command-center/people/${detail.landlord.id}`
                  : "Not available",
              ],
            ]}
          />

          <StripeReferences references={detail.stripe} />
        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Relationships
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.relationships.map((item) => (
                <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-700">{item.label}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Deferred Actions
            </h2>
            <div className="mt-4 space-y-2 text-[14px] text-slate-500">
              <p>Refund execution is not available in Command Center Phase 2C.</p>
              <p>Retry, cancel, payout, and dispute actions are deferred.</p>
              <p>Cases integration will connect in a future Command Center phase.</p>
            </div>
          </section>
        </div>
      </div>

      <InternalNotesClient
        profileId={detail.header.id}
        targetType="payment"
        notes={detail.notes}
        canCreate={detail.canCreateNotes}
        canEdit={detail.canEditNotes}
      />
    </div>
  );
}

async function loadPaymentDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  paymentId: string
) {
  try {
    return await getPaymentDetail(staff, paymentId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Payment detail failed to load:", error);
    }
    throw error;
  }
}

function InfoSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-[18px] font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-500">{label}</p>
            <p className="break-words text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StripeReferences({ references }: { references: StripeReference[] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h2 className="text-[18px] font-semibold text-slate-950">
        Stripe References
      </h2>
      <div className="mt-4 divide-y divide-slate-100">
        {references.map((reference) => (
          <div key={reference.label} className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]">
            <p className="font-semibold text-slate-500">{reference.label}</p>
            <div className="min-w-0">
              <p className="break-all font-mono text-[12px] text-slate-900">
                {reference.value}
              </p>
              <div className="mt-2 flex gap-3">
                {reference.href ? (
                  <a
                    href={reference.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-semibold text-slate-700 underline-offset-4 hover:underline"
                  >
                    Open in Stripe
                  </a>
                ) : null}
                {reference.copyable ? (
                  <span className="text-[12px] font-semibold text-slate-500">
                    Copy from value above
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
