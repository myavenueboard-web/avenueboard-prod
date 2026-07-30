import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getAuditLogDetail } from "@/lib/command-center/audit-log";

export default async function CommandCenterAuditLogDetailPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const staff = await requireCommandCenterStaff();
  const { auditId } = await params;
  const detail = await loadAuditDetail(staff, auditId);

  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/command-center/audit-log"
          className="text-[13px] font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Back to Audit Log
        </Link>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Audit Event
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
              {detail.action}
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              {formatLabel(detail.category)} · {detail.created}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px]">
            <p className="font-semibold text-slate-950">{detail.staff.name}</p>
            <p className="mt-1 text-slate-500">{detail.staff.email}</p>
            <p className="mt-1 text-slate-400">{detail.staff.role}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <InfoSection
            title="Event Overview"
            rows={[
              ["Audit ID", detail.id],
              ["Normalized Action", detail.action],
              ["Raw Action", detail.rawAction],
              ["Category", formatLabel(detail.category)],
              ["Change Type", formatLabel(detail.changeType)],
              ["Source", detail.source],
              ["Created", detail.created],
              ["Created UTC", detail.createdUtc],
              ["Reason", detail.reason],
            ]}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">Target</h2>
            <div className="mt-4 divide-y divide-slate-100">
              <DetailRow label="Target Type" value={detail.target.type} />
              <DetailRow label="Target ID" value={detail.target.id} />
              <DetailRow label="Resolved Name" value={detail.target.label} />
              <div className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]">
                <p className="font-semibold text-slate-500">Safe Link</p>
                {detail.target.href ? (
                  <Link
                    href={detail.target.href}
                    className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                  >
                    Open related record
                  </Link>
                ) : (
                  <p className="break-words text-slate-900">Not available</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">Changes</h2>
            {detail.changes.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Field</th>
                      <th className="px-4 py-3 font-semibold">Before</th>
                      <th className="px-4 py-3 font-semibold">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.changes.map((change) => (
                      <tr key={change.field} className="align-top">
                        <td className="px-4 py-3 font-semibold text-slate-950">
                          {formatLabel(change.field)}
                        </td>
                        <td className="max-w-[320px] break-words px-4 py-3 text-slate-600">
                          {change.before}
                        </td>
                        <td className="max-w-[320px] break-words px-4 py-3 text-slate-600">
                          {change.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-[13px] font-medium text-slate-500">
                No before/after data was stored for this event.
              </p>
            )}
            <p className="mt-4 text-[13px] font-medium leading-5 text-slate-500">
              {detail.changeSummary}
            </p>
          </section>
        </div>

        <div className="space-y-5">
          <InfoSection
            title="Staff Actor"
            rows={[
              ["Staff ID", detail.staff.id || "Not available"],
              ["Name", detail.staff.name],
              ["Email", detail.staff.email],
              ["Role", detail.staff.role],
            ]}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">Context</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.context.length ? (
                detail.context.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[150px_1fr]"
                  >
                    <p className="font-semibold text-slate-500">{item.label}</p>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="break-words font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        {item.value}
                      </Link>
                    ) : (
                      <p className="break-words text-slate-900">{item.value}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-[13px] font-medium text-slate-500">
                  No safe related context is available.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">Metadata</h2>
            <pre className="mt-4 max-h-[560px] overflow-auto rounded-2xl bg-slate-950 p-4 text-[12px] leading-5 text-slate-100">
              {JSON.stringify(detail.metadata, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

async function loadAuditDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  auditId: string
) {
  try {
    return await getAuditLogDetail(staff, auditId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Audit Log detail failed to load:", error);
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
          <DetailRow key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="break-words text-slate-900">{value}</p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
