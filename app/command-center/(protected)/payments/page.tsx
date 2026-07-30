import Link from "next/link";
import { CaseRowsPerPageSelect } from "@/app/command-center/components/CaseFiltersClient";
import { commandCenterDirectoryPanelClassName } from "@/app/command-center/components/directoryPanelStyles";
import PaymentFiltersClient from "@/app/command-center/components/PaymentFiltersClient";
import { requireCommandCenterStaff } from "@/lib/command-center/server";
import { getPaymentsDirectory } from "@/lib/command-center/payments";

export default async function CommandCenterPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    query?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const staff = await requireCommandCenterStaff();
  const params = (await searchParams) || {};
  const visibleStatus = [
    "successful",
    "processing",
    "pending",
    "failed",
    "partial",
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
    loadPaymentsDirectory(staff, directoryParams),
    loadPaymentStatusCounts(staff, params.query),
  ]);
  const paginationParams = {
    query: params.query,
    status: visibleStatus,
    pageSize: directory.pageSize === 25 ? undefined : String(directory.pageSize),
  };

  return (
    <div className="-mx-2 lg:-mx-4">
      <PaymentFiltersClient
        initialQuery={directory.filters.query}
        initialStatus={directory.filters.status}
        statusCounts={statusCounts}
      />

      <section className={commandCenterDirectoryPanelClassName}>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {[
                  { label: "Payment" },
                  { label: "Resident" },
                  { label: "Landlord" },
                  { label: "Property" },
                  { label: "Rent Month" },
                  { label: "Amount Due", className: "text-left tabular-nums" },
                  { label: "Amount Paid", className: "text-left tabular-nums" },
                  { label: "Status" },
                  { label: "Method" },
                  { label: "Action" },
                ].map((header) => (
                  <th
                    key={header.label}
                    className={`px-3 py-3 font-semibold ${header.className || ""}`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {directory.items.length ? (
                directory.items.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="truncate font-mono text-[12px] font-semibold text-slate-800" title={payment.id}>
                        {formatPaymentId(payment.id)}
                      </p>
                      {payment.requiresReview ? (
                        <p className="mt-1 truncate text-[12px] font-semibold text-amber-700" title={payment.reviewReasons.join(" · ") || "Review"}>
                          Review
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-950" title={payment.resident}>{payment.resident}</p>
                      <p className="mt-1 truncate text-slate-500" title={payment.residentEmail}>{payment.residentEmail}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="truncate font-semibold text-slate-800" title={payment.landlord}>{payment.landlord}</p>
                      <p className="mt-1 truncate text-slate-500" title={payment.landlordEmail}>{payment.landlordEmail}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={payment.property}>{payment.property}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={payment.rentMonth}>{payment.rentMonth}</p>
                    </td>
                    <td className="px-3 py-4 text-left">
                      <span className="inline-block min-w-[72px] text-left font-semibold tabular-nums text-slate-700">
                        {payment.amountDue}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-left">
                      <span className="inline-block min-w-[72px] text-left font-semibold tabular-nums text-slate-700">
                        {payment.amountPaid}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-start">
                        <StatusIndicator status={payment.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      <p className="truncate" title={payment.paymentMethod}>{payment.paymentMethod}</p>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/command-center/payments/${payment.id}`}
                        className="whitespace-nowrap font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={10}>
                    No payments match these filters.
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

async function loadPaymentsDirectory(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  params: {
    query?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }
) {
  try {
    return await getPaymentsDirectory(staff, params);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Payments page failed to load:", error);
    }
    throw error;
  }
}

async function loadPaymentStatusCounts(
  staff: Awaited<ReturnType<typeof requireCommandCenterStaff>>,
  query?: string
) {
  const statuses = [
    "successful",
    "processing",
    "pending",
    "failed",
    "partial",
  ] as const;
  const counts = {
    all: 0,
    successful: 0,
    processing: 0,
    pending: 0,
    failed: 0,
    partial: 0,
  };

  try {
    const [allDirectory, ...statusDirectories] = await Promise.all([
      getPaymentsDirectory(staff, { query, page: "1" }),
      ...statuses.map((status) =>
        getPaymentsDirectory(staff, { query, status, page: "1" })
      ),
    ]);

    counts.all = allDirectory.total;
    statuses.forEach((status, index) => {
      counts[status] = statusDirectories[index]?.total ?? 0;
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Command Center Payments status counts failed:", error);
    }
  }

  return counts;
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
      href={`/command-center/payments?${next.toString()}`}
      className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const textClassName =
    status === "Successful"
      ? "text-green-700"
      : status === "Failed"
      ? "text-red-600"
      : status === "Partial"
      ? "text-orange-600"
      : status === "Processing"
      ? "text-blue-700"
      : status === "Pending"
      ? "text-amber-700"
      : "text-slate-500";

  return (
    <span className="inline-flex min-w-[82px] items-center whitespace-nowrap">
      <span className={`font-medium ${textClassName}`}>{status}</span>
    </span>
  );
}

function formatPaymentId(id: string) {
  if (!id) return "Not available";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}
