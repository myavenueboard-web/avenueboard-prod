import Link from "next/link";
import { CaseRowsPerPageSelect } from "@/app/command-center/components/CaseFiltersClient";
import { commandCenterDirectoryPanelClassName } from "@/app/command-center/components/directoryPanelStyles";
import PeopleFiltersClient from "@/app/command-center/components/PeopleFiltersClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getPeopleDirectory } from "@/lib/command-center/people";

export default async function CommandCenterPeoplePage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    role?: string;
    activity?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const visibleRole = ["landlord", "resident", "dual"].includes(params.role || "")
    ? params.role
    : undefined;
  const directoryParams = {
    query: params.query,
    role: visibleRole,
    activity: params.activity,
    page: params.page,
    pageSize: params.pageSize,
  };
  const [directory, roleCounts] = await Promise.all([
    loadPeopleDirectory(staff, directoryParams),
    loadPeopleRoleCounts(staff, {
      query: params.query,
      activity: params.activity,
    }),
  ]);
  const paginationParams = {
    query: params.query,
    role: visibleRole,
    activity: params.activity,
    pageSize: directory.pageSize === 25 ? undefined : String(directory.pageSize),
  };

  return (
    <div className="-mx-2 lg:-mx-4">
      <PeopleFiltersClient
        initialQuery={directory.filters.query}
        initialRole={directory.filters.role}
        roleCounts={roleCounts}
      />

      <section className={commandCenterDirectoryPanelClassName}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {[
                  "Person",
                  "Role",
                  "Lifecycle",
                  "Properties",
                  "Active Leases",
                  "Joined",
                  "Action",
                ].map((header) => (
                  <th
                    key={header}
                    className={`px-3 py-3 font-semibold ${
                      header === "Properties" || header === "Active Leases"
                        ? "text-center"
                        : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {directory.items.length ? (
                directory.items.map((person) => (
                  <tr key={person.id} className="align-top">
                    <td className="px-3 py-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-700">
                          {getInitials(person.name || person.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950" title={person.name}>
                            {person.name}
                          </p>
                          <p className="mt-1 truncate text-slate-500" title={person.email}>
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <RoleText role={person.role} />
                    </td>
                    <td className="px-3 py-4">
                      <LifecycleText lifecycle={person.lifecycle} />
                    </td>
                    <td className="px-3 py-4 text-center tabular-nums text-slate-700">
                      {person.properties}
                    </td>
                    <td className="px-3 py-4 text-center tabular-nums text-slate-700">
                      {person.activeLeases}
                    </td>
                    <td className="px-3 py-4 text-slate-600">{person.joined}</td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/command-center/people/${person.id}`}
                        className="whitespace-nowrap font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    No profiles match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 mb-4 flex flex-col gap-3 bg-white px-1 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Page {directory.page} of {directory.pageCount}
        </p>
        <CaseRowsPerPageSelect value={directory.pageSize} />
        <div className="flex gap-2">
          <PaginationLink disabled={directory.page <= 1} page={directory.page - 1} params={paginationParams}>
            Previous
          </PaginationLink>
          <PaginationLink disabled={directory.page >= directory.pageCount} page={directory.page + 1} params={paginationParams}>
            Next
          </PaginationLink>
        </div>
      </div>
    </div>
  );
}

async function loadPeopleDirectory(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    role?: string;
    activity?: string;
    page?: string;
    pageSize?: string;
  }
) {
  try {
    return await getPeopleDirectory(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center People page failed to load:", error);
    }
    throw error;
  }
}

async function loadPeopleRoleCounts(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    activity?: string;
  }
) {
  const [all, landlord, resident, dual] = await Promise.all([
    getPeopleDirectory(staff, { ...params, page: "1" }),
    getPeopleDirectory(staff, { ...params, role: "landlord", page: "1" }),
    getPeopleDirectory(staff, { ...params, role: "resident", page: "1" }),
    getPeopleDirectory(staff, { ...params, role: "dual", page: "1" }),
  ]);

  return {
    all: all.total,
    landlord: landlord.total,
    resident: resident.total,
    dual: dual.total,
  };
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
      href={`/command-center/people?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function RoleText({ role }: { role: string }) {
  const className =
    role === "Landlord"
      ? "text-blue-700"
      : role === "Resident"
      ? "text-green-700"
      : role === "Dual Role"
      ? "text-purple-700"
      : "text-slate-600";

  return <span className={`whitespace-nowrap font-medium ${className}`}>{role}</span>;
}

function LifecycleText({ lifecycle }: { lifecycle: string }) {
  const className =
    lifecycle === "First Payment" || lifecycle === "Rent Collecting"
      ? "text-green-700"
      : lifecycle === "Property Added"
      ? "text-blue-700"
      : lifecycle === "Setup Incomplete"
      ? "text-amber-700"
      : lifecycle === "Registered"
      ? "text-slate-700"
      : "text-slate-500";

  return (
    <span className={`font-medium ${className}`} title={lifecycle}>
      {lifecycle}
    </span>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "A").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}
