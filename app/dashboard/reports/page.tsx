"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Home,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Shield,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";
import {
  AVENUEBOARD_PLATFORM_FEE_CENTS,
  parseLandlordAbsorbsResidentPlatformFee,
} from "@/lib/fees/residentPlatformFee";

type PropertyItem = {
  id: string;
  property_label: string;
};

type LeaseItem = {
  id: string;
  property_id: string;
  monthly_rent: number;
  start_date: string | null;
  end_date: string | null;
  properties?: { property_label: string } | null;
};

type RentPaymentItem = {
  id: string;
  property_id: string;
  lease_id: string | null;
  amount: number | null;
  rent_cycle_key?: string | null;
  rent_amount_cents?: number | null;
  tenant_service_fee_cents?: number | null;
  status: string | null;
  period_label: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  properties?: { property_label: string } | null;
};

type LeasePreferenceItem = {
  id: string;
  lease_id: string;
  landlord_absorbs_fee: unknown;
};

type StatementItem = {
  month: Date;
  rentPaid: number;
  avenueBoardFee: number;
  netReceived: number;
  landlordAbsorbedFee: boolean;
  available: boolean;
  unavailableReason?: "future" | "before_lease_start";
};

type ExpenseItem = {
  id: string;
  profile_id: string;
  property_id: string;
  description: string;
  category: string | null;
  amount: number;
  paid_date: string;
  created_at?: string;
  properties?: { property_label: string } | null;
};

type ExpenseForm = {
  propertyId: string;
  category: string;
  amount: string;
  paidDate: string;
  description: string;
  recurring: boolean;
  receiptName: string;
};

type TabId = "overview" | "expenses";
type RangeId = "this_month" | "last_month" | "ytd" | "custom";

const expenseCategories = [
  "Mortgage",
  "Property Tax",
  "Insurance",
  "HOA",
  "Utilities",
  "Repairs",
  "Maintenance",
  "Supplies",
  "Cleaning",
  "Legal / Professional",
  "Other",
];

const breakdownCategories = [
  "Mortgage",
  "Property Tax",
  "Insurance",
  "HOA",
  "Utilities",
  "Repairs",
  "Maintenance",
  "Other",
];

const emptyExpenseForm: ExpenseForm = {
  propertyId: "",
  category: "Maintenance",
  amount: "",
  paidDate: new Date().toISOString().slice(0, 10),
  description: "",
  recurring: false,
  receiptName: "",
};

export default function ReportsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [profileId, setProfileId] = useState("");
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [leases, setLeases] = useState<LeaseItem[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPaymentItem[]>([]);
  const [leasePreferences, setLeasePreferences] = useState<LeasePreferenceItem[]>(
    []
  );
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedRange, setSelectedRange] = useState<RangeId>("this_month");
  const [statementMenu, setStatementMenu] = useState("");
  const [selectedStatementYear, setSelectedStatementYear] = useState(
    new Date().getFullYear()
  );

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseItem | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);

  useEffect(() => {
    async function loadReportsPage() {
      try {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        setProfileId(profile.id);

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, property_label")
          .eq("owner_profile_id", profile.id)
          .order("created_at", { ascending: false });

        if (propertyError) {
          console.warn("Reports properties load warning:", propertyError);
        }

        const loadedProperties = (propertyData || []) as PropertyItem[];
        setProperties(loadedProperties);
        setExpenseForm((prev) => ({
          ...prev,
          propertyId: loadedProperties[0]?.id || "",
        }));

        const propertyIds = loadedProperties.map((property) => property.id);

        if (propertyIds.length > 0) {
          const [{ data: leaseData }, { data: paymentData }] = await Promise.all([
            supabase
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
              .order("created_at", { ascending: false }),
            supabase
              .from("rent_payments")
              .select(
                `
                id,
                property_id,
                lease_id,
                amount,
                rent_cycle_key,
                rent_amount_cents,
                tenant_service_fee_cents,
                status,
                period_label,
                due_date,
                paid_at,
                created_at,
                properties (
                  property_label
                )
              `
              )
              .in("property_id", propertyIds)
              .order("due_date", { ascending: false }),
          ]);

          const normalizedLeases = normalizeRelatedRows(leaseData || []) as LeaseItem[];
          setLeases(normalizedLeases);
          setRentPayments(
            normalizeRelatedRows(paymentData || []) as RentPaymentItem[]
          );

          const leaseIds = normalizedLeases.map((lease) => lease.id);

          if (leaseIds.length > 0) {
            const { data: preferenceData } = await supabase
              .from("lease_preferences")
              .select("id, lease_id, landlord_absorbs_fee")
              .in("lease_id", leaseIds);

            setLeasePreferences((preferenceData || []) as LeasePreferenceItem[]);
          } else {
            setLeasePreferences([]);
          }
        } else {
          setLeases([]);
          setRentPayments([]);
          setLeasePreferences([]);
        }

        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select(
            `
            *,
            properties (
              property_label
            )
          `
          )
          .eq("profile_id", profile.id)
          .order("paid_date", { ascending: false });

        if (expenseError) {
          console.warn("Reports expenses load warning:", expenseError);
        }

        setExpenses(normalizeExpenses(expenseData || []));
      } catch (error) {
        console.warn("Reports page load warning:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadReportsPage();
  }, [router]);

  const range = useMemo(() => getDateRange(selectedRange), [selectedRange]);

  const filteredLeases = useMemo(() => {
    if (selectedProperty === "all") return leases;
    return leases.filter((lease) => lease.property_id === selectedProperty);
  }, [leases, selectedProperty]);

  const filteredPayments = useMemo(() => {
    return rentPayments.filter((payment) => {
      if (selectedProperty !== "all" && payment.property_id !== selectedProperty) {
        return false;
      }

      const paymentDate = parseLocalDate(
        payment.due_date || payment.paid_at || payment.created_at || ""
      );
      if (!paymentDate) return true;

      return paymentDate >= range.start && paymentDate <= range.end;
    });
  }, [rentPayments, range.end, range.start, selectedProperty]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (selectedProperty !== "all" && expense.property_id !== selectedProperty) {
        return false;
      }

      const paidDate = parseLocalDate(expense.paid_date);
      if (!paidDate) return true;

      return paidDate >= range.start && paidDate <= range.end;
    });
  }, [expenses, range.end, range.start, selectedProperty]);

  const monthlyRent = filteredLeases.reduce(
    (sum, lease) => sum + Number(lease.monthly_rent || 0),
    0
  );
  const expectedRent = filteredPayments.length
    ? filteredPayments.reduce((sum, payment) => sum + getPaymentAmount(payment), 0)
    : monthlyRent;
  const collectedRent = filteredPayments
    .filter((payment) => isPaid(payment.status))
    .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  const lateRent = filteredPayments
    .filter((payment) => isLate(payment))
    .reduce((sum, payment) => sum + getPaymentAmount(payment), 0);
  const pendingRent = Math.max(expectedRent - collectedRent - lateRent, 0);
  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );
  const netCashFlow = collectedRent - totalExpenses;
  const trendRows = useMemo(
    () => buildTrendRows(filteredPayments, range),
    [filteredPayments, range]
  );
  const expenseBreakdown = useMemo(
    () => buildExpenseBreakdown(filteredExpenses),
    [filteredExpenses]
  );
  const recentExpenses = filteredExpenses.slice(0, 5);
  const statementPayments = useMemo(() => {
    return rentPayments.filter((payment) => {
      if (selectedProperty === "all") return true;
      return payment.property_id === selectedProperty;
    });
  }, [rentPayments, selectedProperty]);
  const statements = useMemo(
    () =>
      buildStatements(
        statementPayments,
        leasePreferences,
        filteredLeases,
        selectedStatementYear
      ),
    [filteredLeases, leasePreferences, selectedStatementYear, statementPayments]
  );

  function openAddExpense() {
    setEditingExpense(null);
    setExpenseForm({
      ...emptyExpenseForm,
      propertyId: properties[0]?.id || "",
      paidDate: new Date().toISOString().slice(0, 10),
    });
    setExpenseOpen(true);
  }

  function openEditExpense(expense: ExpenseItem) {
    setEditingExpense(expense);
    setExpenseForm({
      propertyId: expense.property_id,
      description: expense.description || "",
      category: normalizeExpenseCategory(expense.category),
      amount: String(expense.amount || ""),
      paidDate: expense.paid_date || new Date().toISOString().slice(0, 10),
      recurring: false,
      receiptName: "",
    });
    setExpenseOpen(true);
  }

  async function handleSaveExpense() {
    if (
      !profileId ||
      !expenseForm.propertyId ||
      !expenseForm.description.trim() ||
      !expenseForm.amount ||
      Number(expenseForm.amount) <= 0 ||
      !expenseForm.paidDate
    ) {
      return;
    }

    setSavingExpense(true);

    const payload = {
      property_id: expenseForm.propertyId,
      description: expenseForm.description.trim(),
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      paid_date: expenseForm.paidDate,
    };

    if (editingExpense) {
      const { data, error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingExpense.id)
        .eq("profile_id", profileId)
        .select(
          `
          *,
          properties (
            property_label
          )
        `
        )
        .single();

      if (error) {
        console.warn("Expense update warning:", error);
        setSavingExpense(false);
        return;
      }

      const normalizedExpense = normalizeExpense(data);
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === normalizedExpense.id ? normalizedExpense : item
        )
      );
      setExpenseOpen(false);
      setEditingExpense(null);
      setSavingExpense(false);
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        profile_id: profileId,
        ...payload,
      })
      .select(
        `
        *,
        properties (
          property_label
        )
      `
      )
      .single();

    if (error) {
      console.warn("Expense insert warning:", error);
      setSavingExpense(false);
      return;
    }

    setExpenses((prev) => [normalizeExpense(data), ...prev]);
    setExpenseOpen(false);
    setSavingExpense(false);
  }

  async function handleDeleteExpense() {
    if (!deleteExpense || !profileId) return;

    setDeletingExpense(true);

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", deleteExpense.id)
      .eq("profile_id", profileId);

    if (error) {
      console.warn("Expense delete warning:", error);
      setDeletingExpense(false);
      return;
    }

    setExpenses((prev) => prev.filter((item) => item.id !== deleteExpense.id));
    setDeleteExpense(null);
    setDeletingExpense(false);
  }

  function exportExpenses() {
    downloadCsv(
      "avenueboard-expenses.csv",
      [
        ["Date", "Property", "Category", "Description", "Amount"],
        ...filteredExpenses.map((expense) => [
          formatDate(expense.paid_date),
          expense.properties?.property_label || "Unknown Property",
          expense.category || "Other",
          expense.description,
          String(expense.amount),
        ]),
      ]
    );
  }

  function downloadStatement(month: Date, type: "pdf" | "csv") {
    const label = `${formatMonthYear(month)} Statement`;
    if (type === "csv") {
      downloadCsv(`${label}.csv`, [
        ["Statement", label],
        ["Period", `${formatDate(month)} - ${formatDate(endOfMonth(month))}`],
        ["Expected Rent", String(expectedRent)],
        ["Collected Rent", String(collectedRent)],
        ["Pending Rent", String(pendingRent)],
        ["Late Rent", String(lateRent)],
      ]);
      return;
    }

    window.print();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto pb-8 scrollbar-hide">
      <div className="mx-auto max-w-[1440px] pr-1">
        <div className="-ml-3 -mr-6 border-b border-zinc-200 pl-3">
          <div className="flex gap-8">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Reports
            </TabButton>
            <TabButton
              active={activeTab === "expenses"}
              onClick={() => setActiveTab("expenses")}
            >
              Expenses
            </TabButton>
          </div>
        </div>

        {activeTab === "overview" ? (
          <div className="pt-5">
            <div className="grid min-h-[calc(100vh-185px)] min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
              <section className="min-w-0 min-h-[calc(100vh-185px)] rounded-[24px] border border-zinc-200 bg-white p-5">
                <FinancialOverviewHeader
                  properties={properties}
                  selectedProperty={selectedProperty}
                  setSelectedProperty={setSelectedProperty}
                  selectedRange={selectedRange}
                  setSelectedRange={setSelectedRange}
                />

                <FinancialOverviewSummary />
              </section>

              <div className="flex min-w-0 min-h-[calc(100vh-185px)] flex-col">
                <ExpenseBreakdownSection
                  onAddExpense={openAddExpense}
                  addExpenseDisabled={properties.length === 0}
                />

                <RentStatementsCard
                  statements={statements}
                  selectedYear={selectedStatementYear}
                  setSelectedYear={setSelectedStatementYear}
                  statementMenu={statementMenu}
                  setStatementMenu={setStatementMenu}
                  onView={() => window.print()}
                  onDownload={(month) => downloadStatement(month, "pdf")}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-5">
            <section className="rounded-[22px] border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 px-5 py-5">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
                    Expense Management
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-zinc-500">
                    Add, edit, and export property expenses.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportExpenses}
                    className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-zinc-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={openAddExpense}
                    disabled={properties.length === 0}
                    className="h-10 rounded-2xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              <ExpenseManagementPreviewTable />
            </section>
          </div>
        )}
      </div>

      {expenseOpen && (
        <ExpenseModal
          title={editingExpense ? "Edit Expense" : "Add Expense"}
          properties={properties}
          form={expenseForm}
          setForm={setExpenseForm}
          saving={savingExpense}
          onClose={() => {
            setExpenseOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}

      {deleteExpense && (
        <DeleteExpenseModal
          expenseName={deleteExpense.description}
          deleting={deletingExpense}
          onClose={() => {
            if (!deletingExpense) setDeleteExpense(null);
          }}
          onConfirm={handleDeleteExpense}
        />
      )}
    </div>
  );
}

function FinancialOverviewSummary() {
  return (
    <div className="px-5 pt-10">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,0.86fr)] gap-12">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.055em] text-slate-500">
            Rent Collected YTD
          </p>
          <p className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.07em] text-slate-950">
            $186,450
          </p>
          <p className="mt-5 text-[14px] font-medium text-slate-500">
            of $245,000 expected
          </p>

          <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[76%] rounded-full bg-emerald-500" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-[14px] font-semibold">
            <span className="text-emerald-600">76% collected</span>
            <span className="text-slate-500">$58,550 remaining</span>
          </div>
        </div>

        <div className="bg-zinc-200" />

        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.055em] text-slate-500">
            Total Expenses YTD
          </p>
          <p className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.07em] text-slate-950">
            $48,230
          </p>
          <div className="mt-9 flex items-center gap-4">
            <span className="inline-flex h-10 items-center rounded-xl bg-red-50 px-4 text-[13px] font-semibold text-red-500">
              ↑ 12.4%
            </span>
            <span className="text-[14px] font-medium text-slate-500">
              vs last year
            </span>
          </div>
        </div>
      </div>

      <PropertiesLeaseOverview />
    </div>
  );
}

function PropertiesLeaseOverview() {
  const rows = [
    {
      icon: Home,
      property: "101 Main St",
      address: "Unit 2B, Anytown, CA 94016",
      leaseTerm: "Aug 1, 2024 – Jul 31, 2025",
      leaseLength: "12 months",
      rent: "$2,450 / month",
      rentDue: "Due on 1st",
      tenant: "John Smith",
      email: "john.smith@email.com",
      phone: "(415) 555-0198",
      nextDue: "Jun 1, 2026",
      dueIn: "In 12 days",
    },
    {
      icon: Building2,
      property: "Sunset Villas",
      address: "Unit 5A, Anytown, CA 94016",
      leaseTerm: "Jan 15, 2025 – Jan 14, 2026",
      leaseLength: "12 months",
      rent: "$2,200 / month",
      rentDue: "Due on 15th",
      tenant: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "(415) 555-0142",
      nextDue: "Jun 15, 2026",
      dueIn: "In 26 days",
    },
  ];

  return (
    <div className="mt-14">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
            Properties &amp; Lease Overview
          </h3>
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
            2 of 2 properties
          </span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 transition hover:text-slate-950"
        >
          View all
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={2.2}
          />
        </button>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[2.3fr_1.65fr_1.35fr_1.9fr_1.55fr_24px] border-b border-zinc-200 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <span>Property</span>
            <span>Lease Term</span>
            <span>Rent</span>
            <span>Tenant</span>
            <span>Next Rent Due</span>
            <span />
          </div>

          <div className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const Icon = row.icon;

              return (
                <div
                  key={row.property}
                  className="grid grid-cols-[2.3fr_1.65fr_1.35fr_1.9fr_1.55fr_24px] items-center gap-5 py-7"
                >
                  <div className="flex min-w-0 items-start gap-5">
                    <Icon
                      aria-hidden="true"
                      className="mt-1 h-8 w-8 shrink-0 text-slate-950"
                      strokeWidth={1.8}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-slate-950">
                        {row.property}
                      </p>
                      <p className="mt-1.5 truncate text-[13.5px] font-medium text-slate-500">
                        {row.address}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active Lease
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="max-w-[165px] text-[15px] font-semibold leading-6 text-slate-950">
                      {row.leaseTerm}
                    </p>
                    <p className="mt-1 text-[13.5px] font-medium text-slate-500">
                      {row.leaseLength}
                    </p>
                  </div>

                  <div>
                    <p className="text-[16px] font-semibold text-slate-950">
                      {row.rent}
                    </p>
                    <p className="mt-1.5 text-[13.5px] font-medium text-slate-500">
                      {row.rentDue}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold text-slate-950">
                      {row.tenant}
                    </p>
                    <p className="mt-1.5 truncate text-[13.5px] font-medium text-slate-500">
                      {row.email}
                    </p>
                    <p className="mt-1 text-[13.5px] font-medium text-slate-500">
                      {row.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-[16px] font-semibold text-slate-950">
                      {row.nextDue}
                    </p>
                    <p className="mt-1.5 text-[13.5px] font-semibold text-emerald-600">
                      {row.dueIn}
                    </p>
                  </div>

                  <ChevronRight
                    aria-hidden="true"
                    className="h-5 w-5 justify-self-end text-slate-950"
                    strokeWidth={2.2}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialOverviewHeader({
  properties,
  selectedProperty,
  setSelectedProperty,
  selectedRange,
  setSelectedRange,
}: {
  properties: PropertyItem[];
  selectedProperty: string;
  setSelectedProperty: (value: string) => void;
  selectedRange: RangeId;
  setSelectedRange: (value: RangeId) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="shrink-0 text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
          Financial Overview
        </h2>
        <select
          value={selectedProperty}
          onChange={(event) => setSelectedProperty(event.target.value)}
          className="h-10 min-w-[220px] rounded-2xl border border-zinc-200 bg-white px-4 text-[13.5px] font-semibold text-slate-800 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
        >
          <option value="all">All Properties ({properties.length})</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.property_label}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-flex h-10 shrink-0 items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-1">
        {[
          ["this_month", "This Month"],
          ["ytd", "Year to Date"],
          ["custom", "Custom"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedRange(id as RangeId)}
            className={`h-8 rounded-xl px-3.5 text-[12.5px] font-semibold transition ${
              selectedRange === id
                ? "bg-slate-950 text-white shadow-[0_5px_12px_rgba(15,23,42,0.12)]"
                : "bg-white text-slate-600 hover:bg-zinc-50 hover:text-slate-950"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExpenseBreakdownSection({
  onAddExpense,
  addExpenseDisabled,
}: {
  onAddExpense: () => void;
  addExpenseDisabled: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const displayItems = [
    {
      category: "Mortgage",
      amount: 1250,
      percent: 50.4,
      color: "#113E78",
    },
    {
      category: "Property Tax",
      amount: 420,
      percent: 16.9,
      color: "#63C6BF",
    },
    {
      category: "Insurance",
      amount: 280,
      percent: 11.3,
      color: "#91C1F5",
    },
    {
      category: "Maintenance",
      amount: 210,
      percent: 8.5,
      color: "#A979E4",
    },
    {
      category: "HOA / PM",
      amount: 160,
      percent: 6.5,
      color: "#F3B23D",
    },
    {
      category: "Utilities",
      amount: 110,
      percent: 4.4,
      color: "#B7DB8B",
    },
    {
      category: "Other",
      amount: 50,
      percent: 2,
      color: "#C9CED6",
    },
  ];
  const displayTotal = 2480;
  let offset = 0;
  const gradient = displayItems
    .map((item) => {
      const start = offset;
      const end = offset + (item.amount / displayTotal) * 100;
      offset = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <section className="flex-1 min-h-0 overflow-hidden pb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
            Expense Breakdown
          </h2>
          <p className="mt-1.5 text-[13.5px] font-medium leading-5 text-slate-500">
            See where your money is going.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddExpense}
          disabled={addExpenseDisabled}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
          Add Expense
        </button>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[150px_minmax(0,1fr)] items-center gap-5">
        <div className="min-w-0 overflow-visible">
          <div className="ml-10 flex h-[168px] w-[168px] items-center justify-center overflow-visible">
            <div
              className="flex h-[224px] w-[224px] shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${gradient})` }}
            >
              <div className="flex h-[148px] w-[148px] flex-col items-center justify-center rounded-full bg-white text-center">
                <p className="text-[12px] font-medium text-slate-500">
                  Total Expenses
                </p>
                <p className="mt-2 text-[29px] font-semibold tracking-[-0.065em] text-slate-950">
                  {formatCurrency(displayTotal)}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500">
                  May {currentYear}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mr-5 max-w-[300px] space-y-1.5 justify-self-end">
          {displayItems.map((item) => (
            <div
              key={item.category}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_72px] items-center gap-x-3.5 text-[14px]"
            >
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex h-6 w-6 items-center justify-center text-slate-600">
                <ExpenseCategoryIcon category={item.category} />
              </span>
              <span className="truncate font-medium text-slate-950">
                {item.category}
              </span>
              <span className="justify-self-end text-right font-semibold tabular-nums text-slate-950">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpenseCategoryIcon({ category }: { category: string }) {
  const normalized = normalizeExpenseCategory(category);
  const Icon =
    category === "HOA / PM"
      ? UserRound
      : category === "Maintenance"
        ? Wrench
        : normalized === "Mortgage"
      ? Home
      : normalized === "Property Tax" || normalized === "HOA"
        ? Building2
        : normalized === "Insurance"
          ? Shield
          : normalized === "Utilities"
            ? Zap
            : normalized === "Repairs" || normalized === "Maintenance"
              ? Wrench
              : MoreHorizontal;

  return <Icon className="h-3.5 w-3.5 text-slate-600" strokeWidth={1.8} />;
}

function RentStatementsCard({
  statements,
  selectedYear,
  setSelectedYear,
  statementMenu,
  setStatementMenu,
  onView,
  onDownload,
}: {
  statements: StatementItem[];
  selectedYear: number;
  setSelectedYear: (value: number) => void;
  statementMenu: string;
  setStatementMenu: (value: string) => void;
  onView: (month: Date) => void;
  onDownload: (month: Date) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [scrollThumb, setScrollThumb] = useState({
    top: 0,
    height: 128,
    visible: false,
  });

  function updateStatementScrollbar() {
    const list = listRef.current;
    if (!list) return;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const thumbHeight = Math.min(88, list.clientHeight);
    const thumbTop =
      maxScroll > 0
        ? (list.scrollTop / maxScroll) * (list.clientHeight - thumbHeight)
        : 0;

    setScrollThumb({
      top: thumbTop,
      height: thumbHeight,
      visible: maxScroll > 0,
    });
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rowHeight = 64;
    const targetTopIndex =
      selectedYear === currentYear ? Math.max(new Date().getMonth() - 2, 0) : 0;
    const animationFrame = window.requestAnimationFrame(() => {
      list.scrollTop = targetTopIndex * rowHeight;
      updateStatementScrollbar();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [currentYear, selectedYear, statements]);

  useEffect(() => {
    if (!yearMenuOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        yearMenuRef.current &&
        !yearMenuRef.current.contains(event.target as Node)
      ) {
        setYearMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setYearMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [yearMenuOpen]);

  return (
    <section className="relative rounded-[24px] border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
          Rent Statements
        </h2>
        <div ref={yearMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setYearMenuOpen((open) => !open)}
            className="inline-flex h-8 w-[92px] items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-slate-800 outline-none transition hover:bg-zinc-50 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            aria-haspopup="menu"
            aria-expanded={yearMenuOpen}
          >
            {selectedYear}
            <ChevronDown
              aria-hidden="true"
              className={`h-3.5 w-3.5 text-slate-500 transition ${
                yearMenuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2}
            />
          </button>

          {yearMenuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-[108px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
              {yearOptions.map((year) => {
                const selected = selectedYear === year;

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(year);
                      setYearMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                      selected
                        ? "bg-slate-50 text-slate-950"
                        : "text-slate-700 hover:bg-zinc-50 hover:text-slate-950"
                    }`}
                    role="menuitem"
                  >
                    {year}
                    {selected && (
                      <Check
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-slate-950"
                        strokeWidth={2.2}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13.5px] font-medium leading-6 text-slate-500">
        View and download your monthly rent statements.
      </p>

      <div className="relative mt-7">
        <div
          ref={listRef}
          onScroll={updateStatementScrollbar}
          className="h-[300px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="divide-y divide-zinc-100">
          {statements.map((statement) => {
            const key = formatCycleKey(statement.month);
            const unavailableMessage =
              statement.unavailableReason === "before_lease_start"
                ? "Statement not available. No active lease for this month."
                : "Statement not generated yet. This is a future month.";

            return (
              <div
                key={key}
                data-statement-key={key}
                title={statement.available ? undefined : unavailableMessage}
                className="group relative grid h-16 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <ReceiptText
                    aria-hidden="true"
                    className={`h-[21px] w-[21px] shrink-0 ${
                      statement.available ? "text-emerald-700" : "text-slate-600"
                    }`}
                    strokeWidth={1.9}
                  />
                  <p
                    className={`truncate text-[14px] font-semibold ${
                      statement.available ? "text-slate-950" : "text-slate-500"
                    }`}
                  >
                    {formatMonthYear(statement.month)}
                  </p>
                </div>

                <button
                  type="button"
                  aria-disabled={!statement.available}
                  onClick={() => {
                    if (!statement.available) {
                      setStatementMenu(key);
                      return;
                    }
                    onView(statement.month);
                  }}
                  className={`text-[13px] font-medium transition ${
                    statement.available
                      ? "text-slate-950 hover:text-slate-700 hover:underline"
                      : "cursor-not-allowed text-slate-300"
                  }`}
                >
                  View
                </button>
                <button
                  type="button"
                  aria-disabled={!statement.available}
                  onClick={() => {
                    if (!statement.available) {
                      setStatementMenu(key);
                      return;
                    }
                    onDownload(statement.month);
                  }}
                  className={`inline-flex h-8 items-center justify-center gap-2 rounded-xl border px-3.5 text-[12.5px] font-semibold transition ${
                    statement.available
                      ? "border-zinc-200 bg-white text-slate-700 hover:bg-zinc-50"
                      : "cursor-not-allowed border-zinc-100 bg-white text-slate-300"
                  }`}
                >
                  <Download
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    strokeWidth={2}
                  />
                  Download
                </button>

                {!statement.available && (
                  <div
                    className={`pointer-events-none absolute right-0 top-full z-10 mt-1 max-w-[260px] rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium leading-5 text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.14)] transition ${
                      statementMenu === key
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {unavailableMessage}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {scrollThumb.visible && (
          <div className="pointer-events-none absolute -right-[23px] top-0 h-[300px] w-1">
            <div
              className="w-[3px] rounded-full bg-slate-800/90"
              style={{
                height: `${scrollThumb.height}px`,
                transform: `translateY(${scrollThumb.top}px)`,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-12 text-[14px] font-semibold transition ${
        active ? "text-slate-950" : "text-zinc-500 hover:text-slate-800"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-slate-950" />
      )}
    </button>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: string;
  tone: "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-600";

  return (
    <div className="flex items-center gap-4 md:border-r md:border-zinc-100 md:last:border-r-0">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[21px] font-semibold ${toneClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-zinc-500">{label}</p>
        <p className="mt-1 truncate text-[24px] font-semibold tracking-[-0.055em] text-slate-950">
          {value}
        </p>
        <p className="mt-1 text-[12px] font-medium text-zinc-500">{subtext}</p>
      </div>
    </div>
  );
}

function CashFlowPart({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "blue" | "red";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700"
      : tone === "blue"
      ? "text-blue-700"
      : tone === "red"
      ? "text-red-600"
      : "text-slate-950";

  return (
    <div>
      <p className="text-[12px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-[23px] font-semibold tracking-[-0.055em] ${color}`}>
        {value}
      </p>
      <p className="mt-1 text-[12px] font-medium text-zinc-500">This period</p>
    </div>
  );
}

function EquationSign({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden text-[22px] font-semibold text-slate-950 md:block">
      {children}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function TrendChart({
  rows,
}: {
  rows: { label: string; collected: number; pending: number; late: number }[];
}) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.collected, row.pending, row.late])
  );
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? 50 : (index / (rows.length - 1)) * 100;
    const y = 100 - (row.collected / maxValue) * 82 - 8;
    return `${x},${y}`;
  });

  return (
    <div className="mt-5 rounded-[20px] bg-gradient-to-b from-white to-zinc-50 px-2 pb-2 pt-3">
      <div className="relative h-[230px] overflow-hidden rounded-[18px]">
        <div className="absolute inset-x-0 top-4 h-px bg-zinc-100" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-zinc-100" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-zinc-100" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="collectionGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129 / 0.26)" />
              <stop offset="100%" stopColor="rgb(16 185 129 / 0.02)" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,100 ${points.join(" ")} 100,100`}
            fill="url(#collectionGradient)"
            stroke="none"
          />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="#059669"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute inset-x-0 bottom-0 grid grid-cols-6 gap-2 text-[11px] font-medium text-zinc-500">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div
                className="mb-2 rounded-t-lg bg-blue-400/70"
                style={{ height: `${Math.max(6, (row.pending / maxValue) * 120)}px` }}
              />
              <div
                className="mb-2 rounded-t-lg bg-amber-400/70"
                style={{ height: `${Math.max(4, (row.late / maxValue) * 96)}px` }}
              />
              <p className="truncate text-center">{row.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  items,
}: {
  items: { category: string; amount: number; percent: number; color: string }[];
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  let offset = 0;
  const gradient = items
    .map((item) => {
      const start = offset;
      const end = offset + (item.amount / Math.max(total, 1)) * 100;
      offset = end;
      return `${colorToCss(item.color)} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="mx-auto flex h-[150px] w-[150px] items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${gradient})` }}
    >
      <div className="flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
        <p className="text-[16px] font-semibold tracking-[-0.04em] text-slate-950">
          {formatCurrency(total)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-zinc-500">Expenses</p>
      </div>
    </div>
  );
}

function StatementsSection({
  statements,
  statementMenu,
  setStatementMenu,
  onDownload,
}: {
  statements: StatementItem[];
  statementMenu: string;
  setStatementMenu: (value: string) => void;
  onDownload: (month: Date, type: "pdf" | "csv") => void;
}) {
  return (
    <section className="rounded-[22px] border border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
          Rent Statements
        </h2>
      </div>

      <div className="divide-y divide-zinc-100">
        {statements.map((statement) => {
          const key = formatCycleKey(statement.month);
          return (
            <div
              key={key}
              className="grid gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-8 shrink-0 items-center justify-center text-slate-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3h7l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 3v5h4M9 12h6M9 16h6"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-slate-950">
                    {formatMonthYear(statement.month)}
                  </p>
                  <StatementFinancialSummary statement={statement} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 rounded-xl border border-zinc-200 bg-white px-4 text-[12.5px] font-semibold text-slate-700 transition hover:bg-zinc-50"
              >
                View
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatementMenu(statementMenu === key ? "" : key)}
                  className="h-9 rounded-xl border border-zinc-200 bg-white px-4 text-[12.5px] font-semibold text-slate-700 transition hover:bg-zinc-50"
                >
                  Download⌄
                </button>
                {statementMenu === key && (
                  <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                    <button
                      type="button"
                      onClick={() => {
                        onDownload(statement.month, "pdf");
                        setStatementMenu("");
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-[12.5px] font-semibold text-slate-700 hover:bg-zinc-50"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDownload(statement.month, "csv");
                        setStatementMenu("");
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-[12.5px] font-semibold text-slate-700 hover:bg-zinc-50"
                    >
                      Download CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type ExpensePreviewFilter = "all" | "one_time" | "recurring";

function ExpenseManagementPreviewTable() {
  const [filter, setFilter] = useState<ExpensePreviewFilter>("all");
  const rows = [
    {
      id: "EXP-2026-000006",
      type: "Recurring",
      category: "HOA / PM",
      description: "Monthly HOA fee",
      property: "101 Main St",
      createdOn: "Jul 1, 2026",
      amount: "$150",
    },
    {
      id: "EXP-2026-000005",
      type: "One-Time",
      category: "Maintenance",
      description: "Kitchen sink repair",
      property: "Sunset Villas",
      createdOn: "Jun 24, 2026",
      amount: "$210",
    },
    {
      id: "EXP-2026-000004",
      type: "Recurring",
      category: "Insurance",
      description: "Property insurance premium",
      property: "All Properties",
      createdOn: "Jun 1, 2026",
      amount: "$1,250",
    },
    {
      id: "EXP-2026-000003",
      type: "One-Time",
      category: "Utilities",
      description: "Water bill",
      property: "101 Main St",
      createdOn: "May 18, 2026",
      amount: "$110",
    },
    {
      id: "EXP-2026-000002",
      type: "One-Time",
      category: "Property Tax",
      description: "County property tax",
      property: "Sunset Villas",
      createdOn: "Apr 12, 2026",
      amount: "$420",
    },
  ];
  const filters: { id: ExpensePreviewFilter; label: string; count: number }[] = [
    { id: "all", label: "All Expenses", count: 5 },
    { id: "one_time", label: "One-Time", count: 3 },
    { id: "recurring", label: "Recurring", count: 2 },
  ];
  const filteredRows =
    filter === "all"
      ? rows
      : rows.filter((row) =>
          filter === "recurring" ? row.type === "Recurring" : row.type === "One-Time"
        );

  return (
    <div>
      <div className="border-b border-zinc-100 px-5 pt-2.5">
        <div className="flex flex-wrap gap-5 sm:gap-10">
          {filters.map((item) => {
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`relative flex h-10 items-center gap-3 bg-transparent px-2 text-[14px] font-semibold transition focus:outline-none ${
                  active ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {item.label}
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-zinc-100 px-2 text-[12px] font-semibold text-slate-600">
                  {item.count}
                </span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2563EB]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className="grid min-h-14 grid-cols-[1.25fr_0.9fr_1fr_1.55fr_1.15fr_1fr_0.85fr_0.75fr] items-center gap-4 border-b border-zinc-200 px-6 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <span>Expense ID</span>
            <span>Type</span>
            <span>Category</span>
            <span>Description</span>
            <span>Property</span>
            <span>Created On</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {filteredRows.map((row) => {
              const recurring = row.type === "Recurring";

              return (
                <div
                  key={row.id}
                  className="grid min-h-[74px] grid-cols-[1.25fr_0.9fr_1fr_1.55fr_1.15fr_1fr_0.85fr_0.75fr] items-center gap-4 px-6 text-[14px] transition hover:bg-zinc-50/70"
                >
                  <span className="font-semibold text-slate-950">{row.id}</span>
                  <span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                        recurring
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.type}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800">{row.category}</span>
                  <span className="truncate font-medium text-slate-600">
                    {row.description}
                  </span>
                  <span className="truncate font-semibold text-slate-800">
                    {row.property}
                  </span>
                  <span className="font-medium text-slate-500">{row.createdOn}</span>
                  <span className="text-right font-semibold tabular-nums text-slate-950">
                    {row.amount}
                  </span>
                  <span className="text-right">
                    <button
                      type="button"
                      className="text-[13px] font-semibold text-slate-700 transition hover:text-slate-950 hover:underline"
                    >
                      Edit
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseTable({
  expenses,
  emptyLabel,
  compact,
  onEdit,
  onDelete,
}: {
  expenses: ExpenseItem[];
  emptyLabel: string;
  compact?: boolean;
  onEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
}) {
  return (
    <div className={compact ? "mt-4" : ""}>
      <div className="hidden grid-cols-[120px_1.2fr_140px_1.5fr_120px_90px_100px] border-b border-zinc-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 lg:grid">
        <span>Date</span>
        <span>Property</span>
        <span>Category</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
        <span className="text-center">Receipt</span>
        <span className="text-right">Actions</span>
      </div>

      {expenses.length === 0 ? (
        <div className="flex min-h-[150px] items-center justify-center px-5 py-10 text-center text-[14px] font-medium text-zinc-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="grid gap-2 px-5 py-4 text-[13px] hover:bg-zinc-50 lg:grid-cols-[120px_1.2fr_140px_1.5fr_120px_90px_100px] lg:items-center"
            >
              <p className="font-medium text-slate-700">{formatDate(expense.paid_date)}</p>
              <p className="truncate font-semibold text-slate-950">
                {expense.properties?.property_label || "Unknown Property"}
              </p>
              <p>
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-600">
                  {normalizeExpenseCategory(expense.category)}
                </span>
              </p>
              <p className="truncate text-zinc-600">{expense.description}</p>
              <p className="font-semibold text-slate-950 lg:text-right">
                {formatCurrency(Number(expense.amount || 0))}
              </p>
              <p className="text-zinc-400 lg:text-center">—</p>
              <div className="flex justify-start gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  className="text-[12px] font-semibold text-slate-600 hover:text-slate-950"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(expense)}
                  className="text-[12px] font-semibold text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatementFinancialSummary({ statement }: { statement: StatementItem }) {
  if (!statement.landlordAbsorbedFee) {
    return (
      <p className="mt-1 text-[12px] font-medium text-zinc-500">
        Rent received: {formatCurrency(statement.netReceived)}
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-zinc-500">
      <span>Rent paid: {formatCurrency(statement.rentPaid)}</span>
      <span>AvenueBoard fee: -{formatCurrency(statement.avenueBoardFee)}</span>
      <span className="font-semibold text-slate-700">
        Net received: {formatCurrency(statement.netReceived)}
      </span>
    </div>
  );
}

function ExpenseModal({
  title,
  properties,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  properties: PropertyItem[];
  form: ExpenseForm;
  setForm: React.Dispatch<React.SetStateAction<ExpenseForm>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-[680px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-zinc-500">
              Record property expenses for cleaner reporting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <SelectInput
            label="Property"
            value={form.propertyId}
            onChange={(value) => setForm((prev) => ({ ...prev, propertyId: value }))}
            options={properties.map((property) => ({
              label: property.property_label,
              value: property.id,
            }))}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectInput
              label="Category"
              value={form.category}
              onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              options={expenseCategories.map((category) => ({
                label: category,
                value: category,
              }))}
            />
            <InputField
              label="Amount"
              value={form.amount}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, amount: value.replace(/[^\d.]/g, "") }))
              }
              placeholder="250"
            />
            <InputField
              label="Date"
              value={form.paidDate}
              onChange={(value) => setForm((prev) => ({ ...prev, paidDate: value }))}
              type="date"
            />
          </div>

          <InputField
            label="Vendor / Description"
            value={form.description}
            onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="Example: Plumbing repair"
          />

          <label className="flex items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 text-[13.5px] font-semibold text-slate-700">
            Optional recurring expense
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, recurring: event.target.checked }))
              }
              className="h-4 w-4"
            />
          </label>

          <label className="flex min-h-[86px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 py-4 text-center text-[13px] font-medium text-zinc-500 hover:bg-zinc-50">
            <input
              type="file"
              className="hidden"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  receiptName: event.target.files?.[0]?.name || "",
                }))
              }
            />
            <span className="font-semibold text-slate-700">
              Upload receipt
            </span>
            <span className="mt-1">
              {form.receiptName || "Optional PDF, image, or receipt file"}
            </span>
          </label>
        </div>

        <div className="mt-7 grid gap-3 sm:flex sm:justify-end">
          <button
            onClick={onClose}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="h-11 rounded-2xl bg-slate-950 px-6 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteExpenseModal({
  expenseName,
  deleting,
  onClose,
  onConfirm,
}: {
  expenseName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[22px] font-semibold text-red-600">
          !
        </div>
        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.04em] text-zinc-900">
          Delete expense?
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
          This will permanently delete{" "}
          <span className="font-semibold text-zinc-900">{expenseName}</span>.
          This action cannot be undone.
        </p>
        <div className="mt-7 grid gap-3 sm:flex sm:justify-end">
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-11 rounded-2xl bg-red-600 px-6 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[16px] outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:text-[14px]"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[16px] outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100 sm:text-[14px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizeExpense(item: any): ExpenseItem {
  return {
    ...item,
    properties: Array.isArray(item.properties)
      ? item.properties[0] || null
      : item.properties,
  } as ExpenseItem;
}

function normalizeExpenses(items: any[]): ExpenseItem[] {
  return items.map((item) => normalizeExpense(item));
}

function normalizeRelatedRows(items: any[]) {
  return items.map((item) => ({
    ...item,
    properties: Array.isArray(item.properties)
      ? item.properties[0] || null
      : item.properties,
  }));
}

function getDateRange(range: RangeId) {
  const today = startOfDay(new Date());
  if (range === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { start, end: endOfMonth(start), label: "Last Month" };
  }
  if (range === "ytd") {
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: endOfMonth(today),
      label: "Year to Date",
    };
  }
  if (range === "custom") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { start, end: endOfMonth(today), label: "Custom Range" };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start, end: endOfMonth(today), label: "This Month" };
}

function buildTrendRows(payments: RentPaymentItem[], range: { end: Date }) {
  const months = Array.from({ length: 6 }, (_item, index) => {
    return new Date(range.end.getFullYear(), range.end.getMonth() - (5 - index), 1);
  });

  return months.map((month) => {
    const rows = payments.filter((payment) => {
      const date = parseLocalDate(payment.due_date || payment.paid_at || "");
      return (
        date &&
        date.getFullYear() === month.getFullYear() &&
        date.getMonth() === month.getMonth()
      );
    });

    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      collected: rows
        .filter((payment) => isPaid(payment.status))
        .reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
      pending: rows
        .filter((payment) => !isPaid(payment.status) && !isLate(payment))
        .reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
      late: rows
        .filter((payment) => isLate(payment))
        .reduce((sum, payment) => sum + getPaymentAmount(payment), 0),
    };
  });
}

function buildExpenseBreakdown(expenses: ExpenseItem[]) {
  const colors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-500",
    "bg-violet-600",
    "bg-red-500",
    "bg-zinc-500",
    "bg-sky-500",
    "bg-slate-700",
  ];
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  if (!total) return [];

  return breakdownCategories
    .map((category, index) => {
      const amount = expenses
        .filter((expense) => normalizeExpenseCategory(expense.category) === category)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      return {
        category,
        amount,
        percent: Math.round((amount / total) * 100),
        color: colors[index % colors.length],
      };
    })
    .filter((item) => item.amount > 0);
}

function buildStatements(
  payments: RentPaymentItem[],
  preferences: LeasePreferenceItem[],
  leases: LeaseItem[],
  selectedYear: number
): StatementItem[] {
  const preferenceMap = new Map(
    preferences.map((preference) => [
      preference.lease_id,
      parseLandlordAbsorbsResidentPlatformFee(
        preference.landlord_absorbs_fee
      ),
    ])
  );
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startMonth = resolveStatementStartMonth(leases, payments, currentMonth);

  return Array.from({ length: 12 }, (_item, index) => {
    const month = new Date(selectedYear, index, 1);
    const monthPayments = payments.filter(
      (payment) => isPaid(payment.status) && paymentBelongsToStatementMonth(payment, month)
    );
    const rentPaid = monthPayments.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0
    );
    const avenueBoardFee = monthPayments.reduce((sum, payment) => {
      if (!payment.lease_id || !preferenceMap.get(payment.lease_id)) return sum;
      return sum + AVENUEBOARD_PLATFORM_FEE_CENTS / 100;
    }, 0);

    return {
      month,
      rentPaid,
      avenueBoardFee,
      netReceived: Math.max(rentPaid - avenueBoardFee, 0),
      landlordAbsorbedFee: avenueBoardFee > 0,
      available: month >= startMonth && month <= currentMonth,
      unavailableReason:
        month < startMonth
          ? "before_lease_start"
          : month > currentMonth
            ? "future"
            : undefined,
    };
  });
}

function resolveStatementStartMonth(
  leases: LeaseItem[],
  payments: RentPaymentItem[],
  fallback: Date
) {
  const leaseMonths = leases
    .map((lease) => parseLocalDate(lease.start_date || ""))
    .filter(isDateValue)
    .map((date) => new Date(date.getFullYear(), date.getMonth(), 1));
  const months = leaseMonths;

  if (!months.length) return fallback;

  return months.reduce((earliest, month) => (month < earliest ? month : earliest));
}

function isDateValue(value: Date | null): value is Date {
  return value instanceof Date;
}

function paymentBelongsToStatementMonth(payment: RentPaymentItem, month: Date) {
  const targetKey = formatCycleKey(month);
  const normalizedCycleKey = String(payment.rent_cycle_key || "").slice(0, 7);

  if (normalizedCycleKey === targetKey) return true;

  const periodDate = parsePeriodMonth(payment.period_label);
  if (periodDate && formatCycleKey(periodDate) === targetKey) return true;

  const dueDate = parseLocalDate(payment.due_date || "");
  if (dueDate && formatCycleKey(dueDate) === targetKey) return true;

  const paidDate = parseLocalDate(payment.paid_at || "");
  if (paidDate && formatCycleKey(paidDate) === targetKey) return true;

  const createdDate = parseLocalDate(payment.created_at || "");
  return Boolean(createdDate && formatCycleKey(createdDate) === targetKey);
}

function parsePeriodMonth(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(`1 ${value}`);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }

  return null;
}

function getPaymentAmount(payment: RentPaymentItem) {
  if (payment.rent_amount_cents && Number(payment.rent_amount_cents) > 0) {
    return Number(payment.rent_amount_cents) / 100;
  }
  return Number(payment.amount || 0);
}

function isPaid(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return ["paid", "completed", "succeeded", "success"].includes(normalized);
}

function isLate(payment: RentPaymentItem) {
  if (isPaid(payment.status)) return false;
  const normalized = String(payment.status || "").toLowerCase();
  if (["late", "overdue", "failed"].includes(normalized)) return true;
  const dueDate = parseLocalDate(payment.due_date || "");
  return Boolean(dueDate && dueDate < startOfDay(new Date()));
}

function normalizeExpenseCategory(category?: string | null) {
  if (!category) return "Other";
  if (category === "Taxes") return "Property Tax";
  return expenseCategories.includes(category) || breakdownCategories.includes(category)
    ? category
    : "Other";
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseLocalDate(value) : value;
  if (!date) return "Not available";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCycleKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const [datePart] = value.split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return startOfDay(new Date(parts[0], parts[1] - 1, parts[2]));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function colorToCss(color: string) {
  const map: Record<string, string> = {
    "bg-blue-600": "#2563EB",
    "bg-emerald-600": "#059669",
    "bg-amber-500": "#F59E0B",
    "bg-violet-600": "#7C3AED",
    "bg-red-500": "#EF4444",
    "bg-zinc-500": "#71717A",
    "bg-sky-500": "#0EA5E9",
    "bg-slate-700": "#334155",
  };
  return map[color] || "#71717A";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
