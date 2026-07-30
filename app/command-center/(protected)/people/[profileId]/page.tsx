import Link from "next/link";
import { notFound } from "next/navigation";
import InternalNotesClient from "@/app/command-center/components/InternalNotesClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import {
  getPeopleDetail,
  formatDate,
  formatDisplayDateTime,
  type RelationshipNode,
} from "@/lib/command-center/people";

export default async function CommandCenterPersonDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const staff = await requireCommandCenterStaff();
  const { profileId } = await params;
  const detail = await loadPeopleDetail(staff, profileId);

  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/command-center/people"
          className="text-[13px] font-semibold text-slate-600 hover:text-slate-950"
        >
          ← Back to People
        </Link>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Profile
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
          {detail.profile.name}
        </h2>
        <p className="mt-2 text-[14px] text-slate-500">{detail.profile.email}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <InfoSection
            title="Overview"
            rows={[
              ["Name", detail.profile.name],
              ["Email", detail.profile.rawEmail || "Not available"],
              ["Phone", detail.profile.rawPhone || "Not available"],
              ["Profile ID", detail.profile.id],
              ["Created", formatDate(detail.profile.createdAt)],
              ["Verified", detail.profile.verified],
              ["Last Activity", formatDisplayDateTime(detail.profile.lastActivity)],
            ]}
          />

          <InfoSection
            title="Account"
            rows={[
              ["Role", detail.profile.role],
              ["Status", detail.profile.status],
              ["Lifecycle", detail.profile.lifecycle],
              ["Standing", detail.profile.standing],
            ]}
          />

          <InfoSection
            title="Landlord Relationships"
            rows={[
              ["Properties", String(detail.landlord.properties.length)],
              ["Active Properties", String(detail.landlord.activeProperties)],
              ["Active Leases", String(detail.landlord.activeLeases.length)],
              ["Residents", String(detail.landlord.residents.length)],
            ]}
          />

          <InfoSection
            title="Resident Relationships"
            rows={[
              ["Landlord", detail.resident.landlord],
              ["Property", detail.resident.property],
              ["Lease", detail.resident.lease],
              ["Rent", detail.resident.rent],
              ["Next Due", detail.resident.nextDue],
            ]}
          />

          <InfoSection
            title="Support"
            rows={[
              ["Open Cases", String(detail.support.openCases)],
              ["Latest Case", detail.support.latestCase],
            ]}
          />

          <InfoSection
            title="Payments"
            rows={[
              ["Latest Payment", detail.payments.latestPayment],
              ["Failed Payments", String(detail.payments.failedPayments)],
              ["Payment Status", detail.payments.status],
            ]}
          />
        </div>

        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Relationship Tree
            </h2>
            <div className="mt-4 space-y-3">
              {detail.relationships.map((node, index) => (
                <RelationshipTree key={`${node.label}-${index}`} node={node} />
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="text-[18px] font-semibold text-slate-950">
              Phase 2 Summaries
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {detail.placeholders.map((item) => (
                <div key={item.title} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-slate-500">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <InternalNotesClient
        profileId={detail.profile.id}
        notes={detail.notes}
        canCreate={detail.canCreateNotes}
        canEdit={detail.canEditNotes}
      />
    </div>
  );
}

async function loadPeopleDetail(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  profileId: string
) {
  try {
    return await getPeopleDetail(staff, profileId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center People detail failed to load:", error);
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

function RelationshipTree({ node }: { node: RelationshipNode }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 text-[13px]">
      <p className="font-semibold text-slate-900">{node.label}</p>
      {node.children?.length ? (
        <div className="ml-4 mt-2 space-y-2 border-l border-slate-200 pl-3">
          {node.children.map((child, index) => (
            <RelationshipTree key={`${child.label}-${index}`} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
