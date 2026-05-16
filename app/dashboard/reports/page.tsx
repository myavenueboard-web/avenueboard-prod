"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

type PropertyItem = {
  id: string;
  property_label: string;
};

type LeaseItem = {
  id: string;
  property_id: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  properties?: { property_label: string } | null;
};

type ExpenseItem = {
  id: string;
  property_id: string;
  amount: number;
  paid_date: string;
  properties?: { property_label: string } | null;
};

export default function ReportsPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [leases, setLeases] = useState<LeaseItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");

  useEffect(() => {
    async function loadReportsPage() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();

        const { data: propertyData } = await supabase
          .from("properties")
          .select("id, property_label")
          .eq("owner_profile_id", profile.id)
          .order("created_at", { ascending: false });

        const loadedProperties = (propertyData || []) as PropertyItem[];
        setProperties(loadedProperties);

        const propertyIds = loadedProperties.map((property) => property.id);

        if (propertyIds.length > 0) {
          const { data: leaseData } = await supabase
            .from("leases")
            .select(
              `
              id,
              property_id,
              monthly_rent,
              start_date,
              end_date,
              properties (
                property_label
              )
            `
            )
            .in("property_id", propertyIds)
            .order("created_at", { ascending: false });

          setLeases(
            (leaseData || []).map((item: any) => ({
              ...item,
              properties: Array.isArray(item.properties)
                ? item.properties[0] || null
                : item.properties,
            })) as LeaseItem[]
          );
        } else {
          setLeases([]);
        }

        const { data: expenseData } = await supabase
          .from("expenses")
          .select(
            `
            id,
            property_id,
            amount,
            paid_date,
            properties (
              property_label
            )
          `
          )
          .eq("profile_id", profile.id)
          .order("paid_date", { ascending: false });

        setExpenses(
          (expenseData || []).map((item: any) => ({
            ...item,
            properties: Array.isArray(item.properties)
              ? item.properties[0] || null
              : item.properties,
          })) as ExpenseItem[]
        );
      } catch (error) {
        console.error("Reports load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadReportsPage();
  }, [router]);

  const filteredLeases = useMemo(() => {
    if (selectedProperty === "all") return leases;
    return leases.filter((lease) => lease.property_id === selectedProperty);
  }, [leases, selectedProperty]);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (selectedProperty !== "all") {
      filtered = filtered.filter(
        (expense) => expense.property_id === selectedProperty
      );
    }

    if (selectedRange !== "all") {
      const cutoff = new Date();

      if (selectedRange === "30") cutoff.setDate(cutoff.getDate() - 30);
      if (selectedRange === "90") cutoff.setDate(cutoff.getDate() - 90);
      if (selectedRange === "365") cutoff.setDate(cutoff.getDate() - 365);

      filtered = filtered.filter(
        (expense) => new Date(expense.paid_date) >= cutoff
      );
    }

    return filtered;
  }, [expenses, selectedProperty, selectedRange]);

  const expectedRent = filteredLeases.reduce(
    (sum, lease) => sum + Number(lease.monthly_rent || 0),
    0
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const rentCollected = 0;
  const netAmount = rentCollected - totalExpenses;

  function exportReport() {
    const rows = [
      ["AvenueBoard Report"],
      [],
      ["Expected Rent", `$${expectedRent.toLocaleString()}`],
      ["Rent Collected", `$${rentCollected.toLocaleString()}`],
      ["Expenses", `$${totalExpenses.toLocaleString()}`],
      ["Net", `$${netAmount.toLocaleString()}`],
      [],
      ["Expense Details"],
      ["Property", "Amount", "Paid Date"],
      ...filteredExpenses.map((expense) => [
        expense.properties?.property_label || "Unknown",
        `$${Number(expense.amount).toLocaleString()}`,
        expense.paid_date,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "avenueboard-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading reports...
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <ReportCard
          label="Expected Rent"
          value={`$${expectedRent.toLocaleString()}`}
        />
        <ReportCard
          label="Rent Collected"
          value={`$${rentCollected.toLocaleString()}`}
        />
        <ReportCard
          label="Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          warning
        />
        <ReportCard
          label="Net"
          value={`$${netAmount.toLocaleString()}`}
          success={netAmount >= 0}
        />
      </div>

      <section className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
        <div className="shrink-0 border-b border-zinc-100 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-[16px] font-semibold">Expense Breakdown</h2>
            <p className="mt-1 text-[12px] text-zinc-500">
              {filteredExpenses.length} expense records
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-0 sm:flex sm:items-center">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-10 min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 text-[13px] outline-none focus:border-[#B9476D] focus:ring-4 focus:ring-[#B9476D]/10 sm:px-4"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_label}
                </option>
              ))}
            </select>

            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="h-10 min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 text-[13px] outline-none focus:border-[#B9476D] focus:ring-4 focus:ring-[#B9476D]/10 sm:px-4"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 1 Year</option>
            </select>

            <button
              onClick={exportReport}
              className="col-span-2 h-10 rounded-2xl bg-[#B9476D] px-5 text-[13px] font-semibold text-white hover:bg-[#A93F64] sm:col-span-1"
            >
              Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr] border-b border-zinc-100 bg-[#FAFAFA] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:grid-cols-[1.2fr_1fr_1fr] sm:px-5 sm:text-[12px]">
          <span>Property</span>
          <span>Paid Date</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredExpenses.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center sm:px-8">
              <div className="flex flex-col items-center justify-center py-14">
                <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[22px]">
                  No report data available
                </h3>

                <p className="mt-3 max-w-[420px] text-center text-[14px] leading-6 text-zinc-500">
                  Expense and rent information will appear here once rent
                  payments, expenses, and property activity are added.
                </p>
              </div>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="grid grid-cols-[1.1fr_0.9fr_0.8fr] items-center border-b border-zinc-100 px-4 py-4 text-[13px] hover:bg-zinc-50 sm:grid-cols-[1.2fr_1fr_1fr] sm:px-5"
              >
                <p className="min-w-0 truncate font-semibold text-zinc-900">
                  {expense.properties?.property_label || "Unknown"}
                </p>

                <p className="truncate text-zinc-500">
                  {formatDate(expense.paid_date)}
                </p>

                <p className="text-right font-semibold text-zinc-900">
                  ${Number(expense.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function ReportCard({
  label,
  value,
  warning = false,
  success = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-zinc-200 bg-white p-4 sm:rounded-[24px] sm:p-5">
      <p className="text-[13px] text-zinc-500">{label}</p>

      <p
        className={`mt-3 truncate text-[24px] font-semibold tracking-[-0.05em] sm:text-[28px] ${
          warning
            ? "text-red-600"
            : success
            ? "text-emerald-600"
            : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}