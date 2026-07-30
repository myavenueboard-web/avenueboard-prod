import Link from "next/link";
import { CaseRowsPerPageSelect } from "@/app/command-center/components/CaseFiltersClient";
import { commandCenterDirectoryPanelClassName } from "@/app/command-center/components/directoryPanelStyles";
import PropertyFiltersClient from "@/app/command-center/components/PropertyFiltersClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getPropertiesDirectory } from "@/lib/command-center/properties";

export default async function CommandCenterPropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    status?: string;
    bank?: string;
    lease?: string;
    payment?: string;
    created?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const visibleStatus = [
    "active",
    "setup_incomplete",
    "lease_expired",
  ].includes(params.status || "")
    ? params.status
    : undefined;
  const directoryParams = {
    query: params.query,
    status: visibleStatus,
    page: params.page,
    pageSize: params.pageSize,
  };
  const [directory, statusCounts] = await Promise.all([
    loadPropertiesDirectory(staff, directoryParams),
    loadPropertyStatusCounts(staff, params.query),
  ]);
  const paginationParams = {
    query: params.query,
    status: visibleStatus,
    pageSize: directory.pageSize === 25 ? undefined : String(directory.pageSize),
  };

  return (
    <div className="-mx-2 lg:-mx-4">
      <PropertyFiltersClient
        initialQuery={directory.filters.query}
        initialStatus={directory.filters.status}
        statusCounts={statusCounts}
      />

      <section className={commandCenterDirectoryPanelClassName}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[21%]" />
              <col className="w-[17%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {[
                  "Property",
                  "Landlord",
                  "Status",
                  "Lease",
                  "Resident",
                  "Rent",
                  "Bank",
                  "Action",
                ].map((header) => (
                  <th
                    key={header}
                    className={`px-3 py-3 font-semibold ${
                    header === "Rent" ? "text-left tabular-nums" : ""
                    } ${header === "Action" ? "text-left" : ""}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {directory.items.length ? (
                directory.items.map((property) => (
                  <tr key={property.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-950" title={property.property}>
                        {property.property}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={property.address}>
                        {property.address}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-800" title={property.landlord}>
                        {property.landlord}
                      </p>
                      <p className="mt-1 truncate text-slate-500" title={property.landlordEmail}>
                        {property.landlordEmail}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <PropertyStatusIndicator status={property.status} />
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="truncate" title={property.lease}>{property.lease}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={property.resident}>{property.resident}</p>
                    </td>
                    <td className="px-3 py-4 text-left">
                      <span className="inline-block min-w-[72px] text-left font-semibold tabular-nums text-slate-700">
                        {property.monthlyRent}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <BankStatusText status={property.bankStatus} />
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/command-center/properties/${property.id}`}
                        className="whitespace-nowrap font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    No properties match these filters.
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

async function loadPropertiesDirectory(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    status?: string;
    bank?: string;
    lease?: string;
    payment?: string;
    created?: string;
    page?: string;
    pageSize?: string;
  }
) {
  try {
    return await getPropertiesDirectory(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Properties page failed to load:", error);
    }
    throw error;
  }
}

async function loadPropertyStatusCounts(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  query?: string
) {
  const [all, active, setup, expired] = await Promise.all([
    getPropertiesDirectory(staff, { query, page: "1", pageSize: "100" }),
    getPropertiesDirectory(staff, { query, status: "active", page: "1", pageSize: "100" }),
    getPropertiesDirectory(staff, { query, status: "setup_incomplete", page: "1", pageSize: "100" }),
    getPropertiesDirectory(staff, { query, status: "lease_expired", page: "1", pageSize: "100" }),
  ]);

  return {
    all: all.total,
    active: active.items.length,
    setup_incomplete: setup.items.length,
    lease_expired: expired.items.length,
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
      href={`/command-center/properties?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function PropertyStatusIndicator({ status }: { status: string }) {
  const textClassName =
    status === "Active"
      ? "text-green-700"
      : status === "Setup Incomplete"
      ? "text-amber-700"
      : status === "Vacant"
      ? "text-blue-700"
      : status === "Lease Expired"
      ? "text-red-600"
      : status === "Archived"
      ? "text-slate-500"
      : "text-slate-500";

  return (
    <span className="inline-flex whitespace-nowrap">
      <span className={`font-medium ${textClassName}`}>{status}</span>
    </span>
  );
}

function BankStatusText({ status }: { status: string }) {
  const textClassName =
    status === "Connected"
      ? "text-green-700"
      : status === "Pending"
      ? "text-amber-700"
      : status === "Restricted"
      ? "text-red-600"
      : "text-slate-500";

  return <span className={`whitespace-nowrap font-medium ${textClassName}`}>{status}</span>;
}
