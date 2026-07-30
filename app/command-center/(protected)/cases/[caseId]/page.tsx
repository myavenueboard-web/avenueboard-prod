import Link from "next/link";
import { notFound } from "next/navigation";
import CaseActionsClient from "@/app/command-center/components/CaseActionsClient";
import InternalNotesClient from "@/app/command-center/components/InternalNotesClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getCaseDetail } from "@/lib/command-center/cases";

export default async function CommandCenterCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const staff = await requireCommandCenterStaff();
  const { caseId } = await params;
  const detail = await loadCaseDetail(staff, caseId);

  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/command-center/cases"
        className="text-[13px] font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Back to Cases
      </Link>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Case
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
              {detail.header.caseNumber}
            </h2>
            <p className="mt-2 max-w-[760px] text-[14px] text-slate-500">
              {detail.header.subject}
            </p>
            {detail.header.reviewWarning ? (
              <p className="mt-2 text-[13px] font-semibold text-amber-700">
                {detail.header.reviewWarning}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 text-[13px] text-slate-600 sm:grid-cols-2 lg:text-right">
            <p>Priority: {detail.header.priority}</p>
            <p>Status: {detail.header.status}</p>
            <p>Customer: {detail.header.customer}</p>
            <p>Assigned: {detail.header.assignedTo}</p>
            <p>Created: {detail.header.created}</p>
            <p>Updated: {detail.header.updated}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.76fr]">
        <div className="space-y-5">
          <InfoSection title="Case Overview" rows={detail.overview} />

          <InfoSection
            title="Customer"
            rows={[
              ["Name", detail.customer.name],
              ["Email", detail.customer.email],
              ["Role", detail.customer.role],
              [
                "People Profile",
                detail.customer.id
                  ? `/command-center/people/${detail.customer.id}`
                  : "Not available",
              ],
            ]}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Related Records
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.related.map((item) => (
                <div key={item.label} className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]">
                  <p className="font-semibold text-slate-500">{item.label}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="break-words font-semibold text-slate-900 underline-offset-4 hover:underline"
                    >
                      {item.value}
                    </Link>
                  ) : (
                    <p className="break-words text-slate-900">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Customer Message
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-slate-800">
              {detail.message}
            </p>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Conversation / Timeline
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.timeline.length ? (
                detail.timeline.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="shrink-0 text-[12px] text-slate-500">{item.timestamp}</p>
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-slate-500">{item.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-[14px] text-slate-500">No timeline activity found.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <CaseActionsClient
            caseId={detail.header.id}
            assignedStaffId={detail.header.assignedStaffId}
            priority={detail.header.priorityKey}
            status={detail.header.statusKey}
            staffOptions={detail.staffOptions}
            allowedStatuses={detail.allowedStatuses}
            canAssign={detail.canAssign}
            canUpdateStatus={detail.canUpdateStatus}
            canUpdatePriority={detail.canUpdatePriority}
            canResolve={detail.canResolve}
            canReopen={detail.canReopen}
          />

          <InfoSection title="Resolution" rows={detail.resolution} />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Deferred Reply Functionality
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-slate-500">
              Customer replies and external email responses are deferred until a
              dedicated support-reply workflow exists.
            </p>
          </section>
        </div>
      </div>

      <InternalNotesClient
        profileId={detail.header.id}
        targetType="case"
        notes={detail.notes}
        canCreate={detail.canCreateNotes}
        canEdit={detail.canEditNotes}
      />
    </div>
  );
}

async function loadCaseDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  caseId: string
) {
  try {
    return await getCaseDetail(staff, caseId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Case detail failed to load:", error);
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
