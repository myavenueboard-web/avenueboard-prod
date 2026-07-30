import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import InternalNotesClient from "@/app/command-center/components/InternalNotesClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getPropertyDetail } from "@/lib/command-center/properties";

export default async function CommandCenterPropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const staff = await requireCommandCenterStaff();
  const { propertyId } = await params;
  const detail = await loadPropertyDetail(staff, propertyId);

  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/command-center/properties"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 transition hover:text-slate-950"
      >
        <span aria-hidden="true">←</span>
        Back to Properties
      </Link>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold tracking-[-0.055em] text-slate-950">
            {detail.header.property}
          </h1>
          <p className="mt-1 text-[14px] font-medium text-slate-500">
            {detail.header.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold">
          <CompactHeaderValue
            label="Status"
            value={detail.header.status}
            tone={statusTone(detail.header.status)}
          />
          <CompactHeaderValue label="Rent" value={rentPerMonth(detail.header.monthlyRent)} />
          <CompactHeaderValue
            label="Bank"
            value={detail.header.bankStatus}
            tone={statusTone(detail.header.bankStatus)}
          />
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <Panel title="Property & Lease">
            <div className="grid gap-5 md:grid-cols-2">
              <DetailGroup
                title="Property"
                rows={[
                  ["Property Type", detail.header.propertyType],
                  ["Unit", detail.header.unitName],
                  ["Units", detail.header.units],
                  ["Created", detail.header.created],
                  ["Statements", statementAvailability(detail.statements.latestStatus, detail.statements.latestMonth)],
                ]}
              />
              <DetailGroup
                title="Lease"
                rows={[
                  ["Lease Status", detail.lease.status],
                  ["Start Date", detail.lease.startDate],
                  ["End Date", detail.lease.endDate],
                  ["Monthly Rent", detail.lease.monthlyRent],
                  ["Due Day", detail.lease.dueDay],
                  ["Remaining Term", detail.lease.remaining],
                ]}
              />
            </div>

            <details className="mt-4 border-t border-slate-100 pt-3">
              <summary className="cursor-pointer text-[12px] font-semibold text-slate-500 transition hover:text-slate-800">
                Technical details
              </summary>
              <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-2">
                <TechnicalField label="Property ID" value={detail.header.id} />
                <TechnicalField label="Lease ID" value={detail.lease.id} />
                <TechnicalField label="Updated" value={detail.header.updated} />
                {detail.header.archived === "Archived" ? (
                  <TechnicalField label="Archived State" value={detail.header.archived} />
                ) : null}
              </div>
            </details>
          </Panel>

          <Panel title="Residents">
            {detail.residents.length ? (
              <div className="divide-y divide-slate-100">
                {detail.residents.map((resident) => (
                  <div
                    key={`${resident.email}-${resident.role}`}
                    className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-950">
                        {resident.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                        {formatResidentRole(resident.role)} · {resident.email}
                      </p>
                    </div>
                    {resident.id ? (
                      <Link
                        href={`/command-center/people/${resident.id}`}
                        className="self-center text-[12px] font-semibold text-slate-700 transition hover:text-slate-950"
                      >
                        View person →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-slate-500">No residents assigned</p>
            )}
          </Panel>

          <Panel title="Payment Setup">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusRow label="Bank Connection" value={detail.paymentSetup.bankConnection} />
              <StatusRow label="Payout Setup" value={detail.paymentSetup.payoutSetup} />
              <StatusRow label="Payment Collection" value={detail.paymentSetup.collectionEnabled} />
              <StatusRow label="Current Rent Status" value={detail.paymentSetup.currentRentStatus} />
              <StatusRow label="Latest Successful Payment" value={detail.paymentSetup.latestSuccessfulPayment} />
              <StatusRow label="Latest Failed Payment" value={detail.paymentSetup.latestFailedPayment} />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Landlord">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-slate-950">
                {detail.landlord.name}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                {detail.landlord.email}
              </p>
              {detail.landlord.id ? (
                <Link
                  href={`/command-center/people/${detail.landlord.id}`}
                  className="mt-3 inline-flex text-[12px] font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  View person →
                </Link>
              ) : null}
            </div>
          </Panel>

          <Panel title="Support">
            {detail.support.openCases || detail.support.timeSensitiveCases ? (
              <div className="space-y-3">
                <StatusRow label="Open Cases" value={String(detail.support.openCases)} />
                <StatusRow
                  label="Time-sensitive Cases"
                  value={String(detail.support.timeSensitiveCases)}
                />
                <StatusRow label="Latest Case" value={detail.support.latestCase} />
                <Link
                  href={`/command-center/cases?query=${encodeURIComponent(detail.header.property)}`}
                  className="inline-flex text-[12px] font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  View cases →
                </Link>
              </div>
            ) : (
              <p className="text-[13px] font-medium text-slate-500">
                No open support cases
              </p>
            )}
          </Panel>

          <InternalNotesClient
            profileId={detail.header.id}
            targetType="property"
            notes={detail.notes}
            canCreate={detail.canCreateNotes}
            canEdit={detail.canEditNotes}
          />
        </div>
      </div>
    </div>
  );
}

async function loadPropertyDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  propertyId: string
) {
  try {
    return await getPropertyDetail(staff, propertyId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Property detail failed to load:", error);
    }
    throw error;
  }
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-[16px] font-semibold tracking-[-0.025em] text-slate-950">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-slate-500">{title}</p>
      <div className="mt-2 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[120px_1fr] gap-3 py-2 text-[13px] first:pt-0 last:pb-0"
          >
            <p className="font-medium text-slate-500">{label}</p>
            <p className="min-w-0 break-words font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className={`max-w-[58%] text-right text-[13px] font-semibold ${statusTone(value)}`}>
        {value}
      </p>
    </div>
  );
}

function CompactHeaderValue({
  label,
  value,
  tone = "text-slate-950",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <p className="whitespace-nowrap text-slate-500">
      {label}: <span className={tone}>{value}</span>
    </p>
  );
}

function TechnicalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-400">{label}</p>
      <p className="mt-1 break-all font-mono text-slate-700">{value}</p>
    </div>
  );
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("pending") ||
    normalized.includes("not enabled") ||
    normalized.includes("not complete") ||
    normalized.includes("setup")
  ) {
    return "text-amber-600";
  }
  if (
    normalized.includes("connected") ||
    normalized.includes("enabled") ||
    normalized.includes("complete") ||
    normalized.includes("current") ||
    normalized.includes("active")
  ) {
    return "text-emerald-600";
  }
  if (
    normalized.includes("restricted") ||
    normalized.includes("failed") ||
    normalized.includes("late") ||
    normalized.includes("expired")
  ) {
    return "text-red-600";
  }
  if (
    normalized.includes("no activity") ||
    normalized.includes("not available") ||
    normalized.includes("missing")
  ) {
    return "text-slate-400";
  }
  return "text-slate-950";
}

function rentPerMonth(value: string) {
  return value === "Not available" ? value : `${value}/month`;
}

function statementAvailability(status: string, month: string) {
  if (status === "Available") return month === "Not available" ? "Available" : `Available · ${month}`;
  if (status === "No payment activity") return "Not available";
  return status || "Deferred";
}

function formatResidentRole(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("primary")) return "Primary Resident";
  return "Resident";
}
