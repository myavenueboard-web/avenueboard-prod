import Link from "next/link";
import StaffActionsClient from "@/app/command-center/components/StaffActionsClient";
import StaffFiltersClient from "@/app/command-center/components/StaffFiltersClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getCommandCenterSettings } from "@/lib/command-center/settings";
import { STAFF_ROLES } from "@/lib/command-center/server";
import type { StaffRole } from "@/lib/command-center/server";

export default async function CommandCenterSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    role?: string;
    status?: string;
    mfa?: string;
    page?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const settings = await loadSettings(staff, params);
  const directory = settings.directory;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Internal Configuration
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.06em] text-slate-950">
          Settings
        </h2>
        <p className="mt-2 max-w-[860px] text-[14px] leading-6 text-slate-500">
          Staff access, role visibility, support configuration, and safe platform
          security information for the AvenueBoard Command Center.
        </p>
      </section>

      <section className="space-y-4">
        <SectionTitle
          title="Staff Access"
          description="Controlled staff membership directory. Writes are server-authoritative and audited."
        />
        <StaffFiltersClient
          initialQuery={directory.filters.query}
          initialRole={directory.filters.role}
          initialStatus={directory.filters.status}
          initialMfa={directory.filters.mfa}
        />

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  {[
                    "Staff Member",
                    "Role",
                    "Status",
                    "MFA Required",
                    "Last Login",
                    "Created",
                    "Invited By",
                    "Actions",
                  ].map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {directory.items.length ? (
                  directory.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{item.fullName}</p>
                        <p className="mt-1 text-slate-500">{item.email}</p>
                        <Link
                          href={`/command-center/settings/staff/${item.id}`}
                          className="mt-2 inline-flex font-semibold text-slate-950 underline-offset-4 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                      <td className="px-4 py-4"><RolePill role={item.role} label={item.roleLabel} /></td>
                      <td className="px-4 py-4"><StatusPill status={item.status} label={item.statusLabel} /></td>
                      <td className="px-4 py-4 text-slate-700">{item.mfaRequired ? "Yes" : "No"}</td>
                      <td className="px-4 py-4 text-slate-600">{item.lastLogin}</td>
                      <td className="px-4 py-4 text-slate-600">{item.created}</td>
                      <td className="px-4 py-4 text-slate-600">{item.invitedBy}</td>
                      <td className="px-4 py-4">
                        <StaffActionsClient
                          staffUserId={item.id}
                          role={item.role}
                          mfaRequired={item.mfaRequired}
                          expectedUpdatedAt={item.updated}
                          canChangeRole={item.canChangeRole}
                          canSuspend={item.canSuspend}
                          canRestore={item.canRestore}
                          canRevoke={item.canRevoke}
                          canActivate={item.canActivate}
                          canToggleMfa={item.canToggleMfa}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                      No staff users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[13px] text-slate-600">
            <p>
              Page {directory.page} of {directory.pageCount} · {directory.total} staff users
            </p>
            <div className="flex gap-2">
              <PaginationLink disabled={directory.page <= 1} page={directory.page - 1} params={params}>
                Previous
              </PaginationLink>
              <PaginationLink disabled={directory.page >= directory.pageCount} page={directory.page + 1} params={params}>
                Next
              </PaginationLink>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <div className="p-5">
            <SectionTitle
              title="Roles & Permissions"
              description="Generated directly from the centralized Command Center permission map."
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <thead className="border-y border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Permission</th>
                  {STAFF_ROLES.map((role) => (
                    <th key={role} className="px-4 py-3 font-semibold">
                      {roleLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settings.roleMatrix.map((row) => (
                  <tr key={row.capability}>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-700">
                      {row.capability}
                    </td>
                    {STAFF_ROLES.map((role) => (
                      <td key={role} className="px-4 py-3">
                        {row.roles[role] ? (
                          <span className="font-semibold text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-slate-300">No</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <InfoCard
          title="Add a Team Member"
          description="Provisioning remains an approved internal server/admin process."
          items={settings.provisioningSteps}
          ordered
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <ListCard title="Support Configuration" groups={[
          ["Statuses", settings.supportConfig.statuses],
          ["Priorities", settings.supportConfig.priorities],
          ["Categories", settings.supportConfig.categories],
        ]} />
        <KeyValueCard title="Platform Information" rows={settings.platformInfo} />
        <InfoCard
          title="Security Information"
          description="Current internal security posture for Settings."
          items={settings.securityInfo}
        />
      </section>
    </div>
  );
}

async function loadSettings(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    role?: string;
    status?: string;
    mfa?: string;
    page?: string;
  }
) {
  try {
    return await getCommandCenterSettings(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Settings page failed to load:", error);
    }
    throw error;
  }
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
        {title}
      </h3>
      <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PaginationLink({
  disabled,
  page,
  params,
  children,
}: {
  disabled: boolean;
  page: number;
  params: Record<string, string | undefined>;
  children: React.ReactNode;
}) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "page") next.set(key, value);
  });
  next.set("page", String(page));

  if (disabled) {
    return (
      <span className="rounded-xl border border-slate-200 px-3 py-2 text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={`/command-center/settings?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function RolePill({ role, label }: { role: string; label: string }) {
  const className =
    role === "super_admin"
      ? "border-slate-300 bg-slate-950 text-white"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "suspended"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "revoked"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function InfoCard({
  title,
  description,
  items,
  ordered,
}: {
  title: string;
  description: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <SectionTitle title={title} description={description} />
      <List className={`mt-4 space-y-3 text-[13px] leading-5 text-slate-600 ${ordered ? "list-decimal pl-5" : ""}`}>
        {items.map((item) => (
          <li key={item} className={ordered ? "" : "rounded-2xl bg-slate-50 px-4 py-3"}>
            {item}
          </li>
        ))}
      </List>
    </section>
  );
}

function ListCard({
  title,
  groups,
}: {
  title: string;
  groups: Array<[string, string[]]>;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
        {title}
      </h3>
      <div className="mt-4 space-y-4">
        {groups.map(([label, values]) => (
          <div key={label}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {label}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {values.map((value) => (
                <span key={value} className="rounded-full border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeyValueCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
        {title}
      </h3>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="py-3 first:pt-0 last:pb-0">
            <p className="text-[12px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 break-words text-[13px] font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function roleLabel(role: StaffRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "read_only") return "Read Only";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
