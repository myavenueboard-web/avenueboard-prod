import Link from "next/link";
import { CaseRowsPerPageSelect } from "@/app/command-center/components/CaseFiltersClient";
import { commandCenterDirectoryPanelClassName } from "@/app/command-center/components/directoryPanelStyles";
import AuditLogFiltersClient from "@/app/command-center/components/AuditLogFiltersClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getAuditLogDirectory } from "@/lib/command-center/audit-log";

export default async function CommandCenterAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    category?: string;
    action?: string;
    staff?: string;
    targetType?: string;
    date?: string;
    changeType?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const visibleCategory = [
    "authentication",
    "cases",
    "notes",
    "settings",
    "system",
  ].includes(params.category || "")
    ? params.category
    : undefined;
  const directoryParams = {
    query: params.query,
    category: visibleCategory,
    action: params.action,
    staff: params.staff,
    targetType: params.targetType,
    date: params.date,
    changeType: params.changeType,
    page: params.page,
    pageSize: params.pageSize,
  };
  const [directory, categoryCounts] = await Promise.all([
    loadAuditLogDirectory(staff, directoryParams),
    loadAuditCategoryCounts(staff, {
      query: params.query,
      action: params.action,
      staff: params.staff,
      targetType: params.targetType,
      date: params.date,
      changeType: params.changeType,
    }),
  ]);
  const paginationParams = {
    query: params.query,
    category: visibleCategory,
    action: params.action,
    staff: params.staff,
    targetType: params.targetType,
    date: params.date,
    changeType: params.changeType,
    pageSize: directory.pageSize === 25 ? undefined : String(directory.pageSize),
  };

  return (
    <div className="-mx-2 lg:-mx-4">
      <AuditLogFiltersClient
        initialQuery={directory.filters.query}
        initialCategory={directory.filters.category}
        initialAction={directory.filters.action}
        initialStaff={directory.filters.staff}
        initialTargetType={directory.filters.targetType}
        initialDate={directory.filters.date}
        initialChangeType={directory.filters.changeType}
        categoryCounts={categoryCounts}
        actionOptions={directory.options.actions}
        staffOptions={directory.options.staff}
        targetTypeOptions={directory.options.targetTypes}
      />

      <section className={commandCenterDirectoryPanelClassName}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {[
                  "Event",
                  "Staff",
                  "Target",
                  "Change",
                  "Created",
                  "Action",
                ].map((header) => (
                  <th key={header} className="px-3 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {directory.items.length ? (
                directory.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-950" title={item.action}>
                        {item.action}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={formatCategory(item.category)}>
                        {formatCategory(item.category)}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={item.rawAction}>
                        {item.rawAction}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-900" title={item.staffName}>
                        {item.staffName}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={item.staffEmail}>
                        {item.staffEmail}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-400" title={item.staffRole}>
                        {item.staffRole}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-900" title={item.targetType}>
                        {item.targetType}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={item.targetLabel}>
                        {item.targetLabel}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={item.targetId}>
                        {item.targetId}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="line-clamp-2 text-slate-700" title={item.changeSummary}>
                        {item.changeSummary}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="truncate" title={item.created}>{item.created}</p>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/command-center/audit-log/${item.id}`}
                        className="whitespace-nowrap font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                    No audit events match these filters.
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

async function loadAuditLogDirectory(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    category?: string;
    action?: string;
    staff?: string;
    targetType?: string;
    date?: string;
    changeType?: string;
    page?: string;
    pageSize?: string;
  }
) {
  try {
    return await getAuditLogDirectory(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Audit Log page failed to load:", error);
    }
    throw error;
  }
}

async function loadAuditCategoryCounts(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    action?: string;
    staff?: string;
    targetType?: string;
    date?: string;
    changeType?: string;
  }
) {
  const [all, authentication, cases, notes, settings, system] = await Promise.all([
    getAuditLogDirectory(staff, { ...params, page: "1" }),
    getAuditLogDirectory(staff, { ...params, category: "authentication", page: "1" }),
    getAuditLogDirectory(staff, { ...params, category: "cases", page: "1" }),
    getAuditLogDirectory(staff, { ...params, category: "notes", page: "1" }),
    getAuditLogDirectory(staff, { ...params, category: "settings", page: "1" }),
    getAuditLogDirectory(staff, { ...params, category: "system", page: "1" }),
  ]);

  return {
    all: all.total,
    authentication: authentication.total,
    cases: cases.total,
    notes: notes.total,
    settings: settings.total,
    system: system.total,
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
      href={`/command-center/audit-log?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
