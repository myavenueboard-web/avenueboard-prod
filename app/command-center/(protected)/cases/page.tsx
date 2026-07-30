import Link from "next/link";
import CaseFiltersClient, {
  CaseRowsPerPageSelect,
} from "@/app/command-center/components/CaseFiltersClient";
import { commandCenterDirectoryPanelClassName } from "@/app/command-center/components/directoryPanelStyles";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getCasesDirectory } from "@/lib/command-center/cases";

export default async function CommandCenterCasesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    status?: string;
    priority?: string;
    category?: string;
    assignment?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const visibleStatus =
    params.status === "closed"
      ? "resolved"
      : ["new", "in_progress", "resolved"].includes(params.status || "")
      ? params.status
      : undefined;
  const directoryParams = {
    query: params.query,
    status: visibleStatus,
    page: params.page,
    pageSize: params.pageSize,
  };
  const [directory, statusCounts] = await Promise.all([
    loadCasesDirectory(staff, directoryParams),
    loadCaseStatusCounts(staff, params.query),
  ]);
  const paginationParams = {
    query: params.query,
    status: visibleStatus,
    pageSize: directory.pageSize === 25 ? undefined : String(directory.pageSize),
  };

  return (
    <div className="-mx-2 lg:-mx-4">
      <CaseFiltersClient
        initialQuery={directory.filters.query}
        initialStatus={directory.filters.status}
        statusCounts={statusCounts}
      />

      <section className={commandCenterDirectoryPanelClassName}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[19%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {[
                  "Case",
                  "Customer",
                  "Category",
                  "Priority",
                  "Status",
                  "Assigned To",
                  "Created",
                  "Updated",
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
                      <p className="truncate font-semibold text-slate-950" title={item.caseNumber}>
                        {item.caseNumber}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={item.subject}>
                        {item.subject}
                      </p>
                      {item.reviewWarning ? (
                        <p className="mt-1 truncate text-[12px] font-semibold text-amber-700" title={item.reviewWarning}>
                          {item.reviewWarning}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-900" title={item.customer}>
                        {item.customer}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={item.customerEmail}>
                        {item.customerEmail}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-400" title={item.customerRole}>
                        {item.customerRole}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={item.category}>{item.category}</p>
                    </td>
                    <td className="px-3 py-4"><PriorityIndicator priority={item.priorityKey} label={item.priority} /></td>
                    <td className="px-3 py-4"><StatusIndicator status={item.statusFilterKey} label={item.status} /></td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={item.assignedTo}>{item.assignedTo}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="truncate" title={item.created}>{item.created}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="truncate" title={item.updated}>{item.updated}</p>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/command-center/cases/${item.id}`}
                        className="whitespace-nowrap font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                    No cases match these filters.
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

async function loadCasesDirectory(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    status?: string;
    priority?: string;
    category?: string;
    assignment?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }
) {
  try {
    return await getCasesDirectory(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Cases page failed to load:", error);
    }
    throw error;
  }
}

async function loadCaseStatusCounts(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  query?: string
) {
  const base = { query };
  const [all, open, inProgress, resolved] = await Promise.all([
    getCasesDirectory(staff, base),
    getCasesDirectory(staff, { ...base, status: "new" }),
    getCasesDirectory(staff, { ...base, status: "in_progress" }),
    getCasesDirectory(staff, { ...base, status: "resolved" }),
  ]);

  return {
    all: all.total,
    new: open.total,
    in_progress: inProgress.total,
    resolved: resolved.total,
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
      href={`/command-center/cases?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function StatusIndicator({ status, label }: { status: string; label: string }) {
  const styles =
    status === "resolved"
      ? { dot: "bg-green-500", text: "text-green-600" }
      : status === "closed"
      ? { dot: "bg-zinc-400", text: "text-zinc-500" }
      : status === "escalated"
      ? { dot: "bg-orange-500", text: "text-orange-600" }
      : status === "new"
      ? { dot: "bg-sky-500", text: "text-sky-600" }
      : status === "in_progress"
      ? { dot: "bg-blue-600", text: "text-blue-700" }
      : { dot: "bg-zinc-400", text: "text-zinc-600" };
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold">
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span className={styles.text}>{label}</span>
    </span>
  );
}

function PriorityIndicator({ priority, label }: { priority: string; label: string }) {
  const styles =
    priority === "critical"
      ? { dot: "bg-red-500", text: "text-red-600" }
      : priority === "time_sensitive"
      ? { dot: "bg-orange-500", text: "text-orange-600" }
      : priority === "important"
      ? { dot: "bg-orange-500", text: "text-orange-600" }
      : { dot: "bg-zinc-400", text: "text-zinc-600" };
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold">
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span className={styles.text}>{label}</span>
    </span>
  );
}
