import Link from "next/link";
import { notFound } from "next/navigation";
import StaffActionsClient from "@/app/command-center/components/StaffActionsClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getStaffDetail } from "@/lib/command-center/settings";

export default async function CommandCenterStaffDetailPage({
  params,
}: {
  params: Promise<{ staffUserId: string }>;
}) {
  const actor = await requireCommandCenterStaff();
  const { staffUserId } = await params;
  const detail = await loadStaffDetail(actor, staffUserId);

  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/command-center/settings"
        className="text-[13px] font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Back to Settings
      </Link>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Staff Access
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
          {detail.staff.fullName}
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">{detail.staff.email}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-5">
          <InfoSection
            title="Overview"
            rows={[
              ["Staff ID", detail.staff.id],
              ["Auth User ID", detail.staff.authUserId],
              ["Name", detail.staff.fullName],
              ["Email", detail.staff.email],
              ["Role", detail.staff.roleLabel],
              ["Status", detail.staff.statusLabel],
              ["Status Meaning", detail.staff.statusDescription],
              ["MFA Required", detail.staff.mfaRequired ? "Yes" : "No"],
              ["Last Login", detail.staff.lastLogin],
              ["Created", detail.staff.created],
              ["Invited By", detail.staff.invitedBy],
            ]}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-[18px] font-semibold text-slate-950">
              Recent Command Center Actions
            </h3>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.recentAuditEvents.length ? (
                detail.recentAuditEvents.map((event) => (
                  <div key={event.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/command-center/audit-log/${event.id}`}
                      className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                    >
                      {event.action}
                    </Link>
                    <p className="mt-1 text-[13px] text-slate-500">{event.reason}</p>
                    <p className="mt-1 text-[12px] text-slate-400">{event.created}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-[13px] font-medium text-slate-500">
                  No recent audit events found.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-[18px] font-semibold text-slate-950">Controlled Actions</h3>
            <div className="mt-4">
              <StaffActionsClient
                staffUserId={detail.staff.id}
                role={detail.staff.role}
                mfaRequired={detail.staff.mfaRequired}
                expectedUpdatedAt={detail.staff.updated}
                canChangeRole={detail.staff.canChangeRole}
                canSuspend={detail.staff.canSuspend}
                canRestore={detail.staff.canRestore}
                canRevoke={detail.staff.canRevoke}
                canActivate={detail.staff.canActivate}
                canToggleMfa={detail.staff.canToggleMfa}
              />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-[18px] font-semibold text-slate-950">Permissions</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.staff.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600"
                >
                  {permission}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

async function loadStaffDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  staffUserId: string
) {
  try {
    return await getStaffDetail(staff, staffUserId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Staff detail failed to load:", error);
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
      <h3 className="text-[18px] font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-3 py-3 text-[14px] first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr]"
          >
            <p className="font-semibold text-slate-500">{label}</p>
            <p className="break-words text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
