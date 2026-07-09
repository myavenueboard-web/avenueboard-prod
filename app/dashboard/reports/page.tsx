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
import {
  getLeaseFirstPaymentCycleDate,
  getLeasePaymentAmountForCycle,
  type LeaseAmountLike,
} from "@/lib/leasePaymentAmounts";
import {
  getCollectedRentPayments,
} from "@/lib/rentPaymentClassification";

type PropertyItem = {
  id: string;
  property_label: string;
  street_address?: string | null;
  unit_name?: string | null;
  city?: string | null;
  state_name?: string | null;
  zip?: string | null;
  bank_status?: string | null;
};

type LeaseTenantItem = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  tenant_role?: string | null;
};

type LeaseItem = {
  id: string;
  property_id: string;
  monthly_rent: number;
  start_date: string | null;
  end_date: string | null;
  rent_due_day?: string | null;
  lease_setup_type?: string | null;
  payment_tracking_start_date?: string | null;
  lease_status?: string | null;
  ended_at?: string | null;
  properties?: { property_label: string } | null;
  lease_tenants?: LeaseTenantItem[];
  lease_amounts?: Array<LeaseAmountLike & { id?: string }>;
};

type RentPaymentItem = {
  id: string;
  property_id: string;
  lease_id: string | null;
  tenant_access_id?: string | null;
  amount: number | null;
  rent_cycle_key?: string | null;
  rent_amount_cents?: number | null;
  tenant_service_fee_cents?: number | null;
  status: string | null;
  period_label: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  source?: string | null;
  receipt_url?: string | null;
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
  expense_frequency?: string | null;
  created_at?: string;
  properties?: { property_label: string } | null;
};

type ExpenseKind = "one_time" | "recurring";

type ExpenseManagementRow = {
  id: string;
  sourceExpenseId?: string;
  type: ExpenseKind;
  category: string;
  description: string;
  propertyId: string;
  property: string;
  createdOn: string;
  amount: number;
};

type ExpenseForm = {
  propertyId: string;
  expenseType: ExpenseKind;
  category: string;
  amount: string;
  paidDate: string;
  description: string;
};

type PropertyLeaseOverviewRow = {
  propertyId: string;
  propertyName: string;
  address: string;
  leaseStatus: string;
  leaseStatusTone: "green" | "blue" | "red" | "gray";
  hasLease: boolean;
  leaseStart: string;
  leaseEnd: string;
  leaseLength: string;
  rent: string;
  nextDue: string;
  nextDueTone: "green" | "orange" | "red" | "gray";
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
};

type FinancialOverviewMetrics = {
  rentLabel: string;
  expenseLabel: string;
  rentCollected: number;
  expectedRent: number;
  remainingRent: number;
  progressPercent: number;
  totalExpenses: number;
  expenseRatioLabel?: string;
  expenseRatioPercent?: string;
  expenseRatioText?: string;
  expenseRatioAccent: boolean;
};

type AppliedCustomRange = {
  start: string;
  end: string;
};

type TabId = "overview" | "expenses";
type RangeId = "this_month" | "last_month" | "ytd" | "custom";

const expenseCategories = [
  "Mortgage",
  "Property Tax",
  "Insurance",
  "Utilities",
  "Maintenance",
  "HOA / PM",
  "Other",
];

const breakdownCategories = [
  "Mortgage",
  "Property Tax",
  "Insurance",
  "Maintenance",
  "HOA / PM",
  "Utilities",
  "Other",
];

const expenseBreakdownPalette = [
  "#113E78",
  "#63C6BF",
  "#91C1F5",
  "#A979E4",
  "#F3B23D",
  "#B7DB8B",
  "#C9CED6",
];

const fixedRecurringExpenseCategories = ["Mortgage", "Property Tax", "Insurance"];

const emptyExpenseForm: ExpenseForm = {
  propertyId: "",
  expenseType: "one_time",
  category: "Maintenance",
  amount: "",
  paidDate: new Date().toISOString().slice(0, 10),
  description: "",
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
  const [selectedRange, setSelectedRange] = useState<RangeId>("ytd");
  const [customFinancialRange, setCustomFinancialRange] =
    useState<AppliedCustomRange | null>(null);
  const [statementMenu, setStatementMenu] = useState("");
  const [selectedStatementYear, setSelectedStatementYear] = useState(
    new Date().getFullYear()
  );

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<ExpenseManagementRow | null>(null);
  const [deleteExpense, setDeleteExpense] =
    useState<ExpenseManagementRow | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [expenseRows, setExpenseRows] = useState<ExpenseManagementRow[]>([]);
  const [expenseFilter, setExpenseFilter] = useState<ExpensePreviewFilter>("all");
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({});
  const [propertyOverviewError, setPropertyOverviewError] = useState(false);

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
        setPropertyOverviewError(false);

        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, property_label, street_address, unit_name, city, state_name, zip, bank_status")
          .eq("owner_profile_id", profile.id)
          .order("created_at", { ascending: false });

        if (propertyError) {
          console.warn("Reports properties load warning:", propertyError);
          setPropertyOverviewError(true);
        }

        const loadedProperties = (propertyData || []) as PropertyItem[];
        setProperties(loadedProperties);
        setExpenseForm((prev) => ({
          ...prev,
          propertyId: loadedProperties[0]?.id || "",
        }));

        const propertyIds = loadedProperties.map((property) => property.id);

        if (propertyIds.length > 0) {
          const [
            { data: leaseData, error: leaseError },
            { data: propertyPaymentData, error: propertyPaymentError },
          ] = await Promise.all([
            supabase
              .from("leases")
              .select(
                `
                id,
                property_id,
                monthly_rent,
                start_date,
                end_date,
                rent_due_day,
                lease_setup_type,
                payment_tracking_start_date,
                lease_status,
                ended_at,
                lease_amounts (
                  id,
                  amount_type,
                  amount
                ),
                lease_tenants (
                  id,
                  first_name,
                  last_name,
                  email,
                  phone,
                  tenant_role
                ),
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
                tenant_access_id,
                amount,
                rent_cycle_key,
                rent_amount_cents,
                tenant_service_fee_cents,
                status,
                period_label,
                due_date,
                paid_at,
                created_at,
                stripe_payment_intent_id,
                stripe_checkout_session_id,
                source,
                receipt_url,
                properties (
                  property_label
                )
              `
              )
              .in("property_id", propertyIds)
              .order("due_date", { ascending: false }),
          ]);

          if (leaseError) {
            console.warn("Reports leases load warning:", leaseError);
            setPropertyOverviewError(true);
          }
          if (propertyPaymentError) {
            console.warn("Reports property payments load warning:", propertyPaymentError);
          }

          const normalizedLeases = normalizeRelatedRows(leaseData || []) as LeaseItem[];
          setLeases(normalizedLeases);

          const leaseIds = normalizedLeases.map((lease) => lease.id);
          let leasePaymentData: any[] = [];
          let tenantAccessPaymentData: any[] = [];
          let timelinePaymentData: any[] = [];

          if (leaseIds.length > 0) {
            const { data, error } = await supabase
              .from("rent_payments")
              .select(
                `
                id,
                property_id,
                lease_id,
                tenant_access_id,
                amount,
                rent_cycle_key,
                rent_amount_cents,
                tenant_service_fee_cents,
                status,
                period_label,
                due_date,
                paid_at,
                created_at,
                stripe_payment_intent_id,
                stripe_checkout_session_id,
                source,
                receipt_url,
                properties (
                  property_label
                )
              `
              )
              .in("lease_id", leaseIds)
              .order("due_date", { ascending: false });

            if (error) {
              console.warn("Reports lease payments load warning:", error);
            }

            leasePaymentData = data || [];

            const timelinePaymentResults = await Promise.all(
              normalizedLeases.map((lease) =>
                supabase
                  .from("rent_payments")
                  .select("*")
                  .eq("lease_id", lease.id)
                  .order("created_at", { ascending: true })
              )
            );

            timelinePaymentData = timelinePaymentResults.flatMap((result) => {
              if (result.error) {
                console.warn("Reports timeline payments load warning:", result.error);
                return [];
              }

              return result.data || [];
            });

            const { data: tenantAccessData, error: tenantAccessError } = await supabase
              .from("tenant_access")
              .select("id, property_id, lease_id")
              .in("property_id", propertyIds)
              .in("lease_id", leaseIds);

            if (tenantAccessError) {
              console.warn("Reports tenant access load warning:", tenantAccessError);
            }

            const tenantAccessIds = (tenantAccessData || []).map((row) => row.id);

            if (tenantAccessIds.length > 0) {
              const { data: accessPayments, error: accessPaymentError } = await supabase
                .from("rent_payments")
                .select(
                  `
                  id,
                  property_id,
                  lease_id,
                  tenant_access_id,
                  amount,
                  rent_cycle_key,
                  rent_amount_cents,
                  tenant_service_fee_cents,
                  status,
                  period_label,
                  due_date,
                  paid_at,
                  created_at,
                  stripe_payment_intent_id,
                  stripe_checkout_session_id,
                  source,
                  receipt_url,
                  properties (
                    property_label
                  )
                `
                )
                .in("tenant_access_id", tenantAccessIds)
                .order("created_at", { ascending: false });

              if (accessPaymentError) {
                console.warn(
                  "Reports tenant access payments load warning:",
                  accessPaymentError
                );
              }

              tenantAccessPaymentData = accessPayments || [];
            }
          }

          const mergedPayments = mergeRentPayments([
            ...normalizeRelatedRows(propertyPaymentData || []),
            ...normalizeRelatedRows(leasePaymentData),
            ...normalizeRelatedRows(tenantAccessPaymentData),
            ...normalizeRelatedRows(timelinePaymentData),
          ]) as RentPaymentItem[];
          setRentPayments(
            mergedPayments
          );

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

        const normalizedExpenses = normalizeExpenses(expenseData || []);
        setExpenses(normalizedExpenses);
        setExpenseRows(buildExpenseManagementRows(normalizedExpenses, loadedProperties));
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
  const expenseBreakdownMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);
  const expenseBreakdown = useMemo(
    () =>
      buildMonthlyExpenseBreakdown(
        expenseRows,
        selectedProperty,
        expenseBreakdownMonth
      ),
    [expenseBreakdownMonth, expenseRows, selectedProperty]
  );
  const recentExpenses = filteredExpenses.slice(0, 5);
  const financialOverviewMetrics = useMemo(
    () =>
      buildFinancialOverviewMetrics({
        selectedProperty,
        selectedRange,
        customRange: customFinancialRange,
        leases,
        rentPayments,
        expenses: expenseRows,
      }),
    [
      customFinancialRange,
      expenseRows,
      leases,
      rentPayments,
      selectedProperty,
      selectedRange,
    ]
  );
  const propertyLeaseOverviewRows = useMemo(
    () => buildPropertyLeaseOverviewRows(properties, leases),
    [leases, properties]
  );
  const visibleExpenseRows = useMemo(() => {
    if (expenseFilter === "all") return expenseRows;
    return expenseRows.filter((row) => row.type === expenseFilter);
  }, [expenseFilter, expenseRows]);
  const expenseFilterCounts = useMemo(
    () => ({
      all: expenseRows.length,
      one_time: expenseRows.filter((row) => row.type === "one_time").length,
      recurring: expenseRows.filter((row) => row.type === "recurring").length,
    }),
    [expenseRows]
  );
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

  function openAddExpense(category?: string) {
    setEditingExpense(null);
    setExpenseErrors({});
    setExpenseForm({
      ...emptyExpenseForm,
      propertyId: properties[0]?.id || "",
      category: category ? normalizeExpenseCategory(category) : emptyExpenseForm.category,
      paidDate: new Date().toISOString().slice(0, 10),
    });
    setExpenseOpen(true);
  }

  function openEditExpense(expense: ExpenseManagementRow) {
    setEditingExpense(expense);
    setExpenseErrors({});
    setExpenseForm({
      propertyId: expense.propertyId,
      description: expense.description || "",
      category: normalizeExpenseCategory(expense.category),
      amount: String(expense.amount || ""),
      paidDate: expense.createdOn || new Date().toISOString().slice(0, 10),
      expenseType: expense.type,
    });
    setExpenseOpen(true);
  }

  async function handleSaveExpense() {
    const errors = validateExpenseForm(expenseForm);
    setExpenseErrors(errors);
    if (Object.keys(errors).length > 0 || !profileId) {
      if (!profileId) {
        setExpenseErrors((prev) => ({
          ...prev,
          save: "Unable to save expense. Please try again.",
        }));
      }
      return;
    }

    setSavingExpense(true);
    setExpenseErrors({});

    const payload = {
      property_id: expenseForm.propertyId,
      description: expenseForm.description.trim() || "N/A",
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      paid_date: expenseForm.paidDate,
      expense_frequency: toExpenseFrequencyValue(expenseForm.expenseType),
    };

    const propertyName =
      properties.find((property) => property.id === expenseForm.propertyId)
        ?.property_label || "Unknown Property";

    if (editingExpense) {
      if (!editingExpense.sourceExpenseId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Expense update missing sourceExpenseId:", {
            editingExpense,
            payload,
          });
        }
        setExpenseErrors({
          save:
            process.env.NODE_ENV === "development"
              ? "Save failed: missing expense id"
              : "Unable to save expense. Please try again.",
        });
        setSavingExpense(false);
        return;
      }

      const updateResponse = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingExpense.sourceExpenseId)
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
      const { data, error } = updateResponse;

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Expense update failed:", {
            table: "expenses",
            where: {
              id: editingExpense.sourceExpenseId,
              profile_id: profileId,
            },
            payload,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            },
            response: updateResponse,
          });
        }
        setExpenseErrors({
          save:
            process.env.NODE_ENV === "development"
              ? `Save failed: ${error.message}${error.code ? ` (${error.code})` : ""}`
              : "Unable to save expense. Please try again.",
        });
        setSavingExpense(false);
        return;
      }

      if (!data) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Expense update returned no row:", editingExpense.sourceExpenseId);
        }
        setExpenseErrors({
          save: "Unable to save expense. Please try again.",
        });
        setSavingExpense(false);
        return;
      }

      const normalizedExpense = normalizeExpense(data);
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === normalizedExpense.id ? normalizedExpense : item
        )
      );
      setExpenseRows((prev) =>
        prev.map((item) =>
          item.id === editingExpense.id
            ? {
                ...expenseToManagementRow(normalizedExpense, item.id, expenseForm.expenseType),
              }
            : item
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

    const normalizedExpense = normalizeExpense(data);
    setExpenses((prev) => [normalizedExpense, ...prev]);
    setExpenseRows((prev) => [
      {
        ...expenseToManagementRow(
          normalizedExpense,
          generateExpenseDisplayId(prev, expenseForm.paidDate),
          expenseForm.expenseType
        )
      },
      ...prev,
    ]);
    setExpenseOpen(false);
    setEditingExpense(null);
    setSavingExpense(false);
  }

  async function handleDeleteExpense() {
    if (!deleteExpense || !profileId) return;

    setDeletingExpense(true);

    if (!deleteExpense.sourceExpenseId) {
      setExpenseRows((prev) => prev.filter((item) => item.id !== deleteExpense.id));
      setDeleteExpense(null);
      setEditingExpense(null);
      setExpenseOpen(false);
      setDeletingExpense(false);
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", deleteExpense.sourceExpenseId)
      .eq("profile_id", profileId);

    if (error) {
      console.warn("Expense delete warning:", error);
      setDeletingExpense(false);
      return;
    }

    setExpenses((prev) =>
      prev.filter((item) => item.id !== deleteExpense.sourceExpenseId)
    );
    setExpenseRows((prev) => prev.filter((item) => item.id !== deleteExpense.id));
    setDeleteExpense(null);
    setEditingExpense(null);
    setExpenseOpen(false);
    setDeletingExpense(false);
  }

  function exportExpenses() {
    downloadCsv(
      "avenueboard-expenses.csv",
      [
        ["Expense ID", "Type", "Category", "Description", "Property", "Created On", "Amount"],
        ...visibleExpenseRows.map((expense) => [
          expense.id,
          formatExpenseKind(expense.type),
          expense.category,
          expense.description || "N/A",
          expense.property,
          formatDate(expense.createdOn),
          formatCurrency(expense.amount),
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
          <div className="flex gap-5">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Analytics
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
                  customRange={customFinancialRange}
                  setCustomRange={setCustomFinancialRange}
                />

                <FinancialOverviewSummary
                  metrics={financialOverviewMetrics}
                  propertyRows={propertyLeaseOverviewRows}
                  propertyRowsError={propertyOverviewError}
                  onViewAllProperties={() => router.push("/dashboard")}
                  onOpenProperty={(propertyId) =>
                    router.push(`/dashboard/properties/${propertyId}`)
                  }
                />
              </section>

              <div className="flex min-w-0 min-h-[calc(100vh-185px)] flex-col">
                <ExpenseBreakdownSection
                  items={expenseBreakdown}
                  rangeLabel={getMonthlyExpenseBreakdownLabel(expenseBreakdownMonth)}
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
                    onClick={() => openAddExpense()}
                    disabled={properties.length === 0}
                    className="h-10 rounded-2xl bg-slate-950 px-4 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              <ExpenseManagementPreviewTable
                rows={visibleExpenseRows}
                filter={expenseFilter}
                counts={expenseFilterCounts}
                onFilterChange={setExpenseFilter}
                onEdit={openEditExpense}
              />
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
          errors={expenseErrors}
          saving={savingExpense}
          deleting={deletingExpense}
          onClose={() => {
            if (savingExpense) return;
            setExpenseOpen(false);
            setEditingExpense(null);
            setExpenseErrors({});
          }}
          onSave={handleSaveExpense}
          onDelete={
            editingExpense
              ? () => {
                  setDeleteExpense(editingExpense);
                }
              : undefined
          }
        />
      )}

      {deleteExpense && (
        <DeleteExpenseModal
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

function FinancialOverviewSummary({
  metrics,
  propertyRows,
  propertyRowsError,
  onViewAllProperties,
  onOpenProperty,
}: {
  metrics: FinancialOverviewMetrics;
  propertyRows: PropertyLeaseOverviewRow[];
  propertyRowsError: boolean;
  onViewAllProperties: () => void;
  onOpenProperty: (propertyId: string) => void;
}) {
  return (
    <div className="px-5 pt-10">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,0.86fr)] gap-12">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.055em] text-slate-500">
            {metrics.rentLabel}
          </p>
          <p className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.07em] text-slate-950">
            {formatCurrency(metrics.rentCollected)}
          </p>
          <p className="mt-5 text-[14px] font-medium text-slate-500">
            {metrics.expectedRent > 0
              ? (
                <>
                  of {formatCurrency(metrics.expectedRent)} expected{" "}
                  <ExpectedRentTooltip />
                </>
              )
              : "No expected rent available"}
          </p>

          <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(metrics.progressPercent, 100)}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-[14px] font-semibold">
            <span className="text-emerald-600">
              {metrics.progressPercent}% collected
            </span>
            <span className="text-slate-500">
              {formatCurrency(metrics.remainingRent)} remaining
            </span>
          </div>
        </div>

        <div className="bg-zinc-200" />

        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.055em] text-slate-500">
            {metrics.expenseLabel}
          </p>
          <p className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.07em] text-slate-950">
            {formatCurrency(metrics.totalExpenses)}
          </p>
          <div className="mt-9 flex items-center gap-4">
            <span className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-4 text-[13px] font-semibold text-slate-600">
              {metrics.expenseRatioLabel ? (
                metrics.expenseRatioLabel
              ) : (
                <>
                  <span
                    className={
                      metrics.expenseRatioAccent
                        ? "text-red-500"
                        : "text-slate-500"
                    }
                  >
                    {metrics.expenseRatioPercent}
                  </span>
                  <span className="ml-1 text-slate-500">
                    {metrics.expenseRatioText}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <PropertiesLeaseOverview
        rows={propertyRows}
        error={propertyRowsError}
        onViewAllProperties={onViewAllProperties}
        onOpenProperty={onOpenProperty}
      />
    </div>
  );
}

function ExpectedRentTooltip() {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="How expected rent is calculated"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-semibold text-slate-400 outline-none transition hover:text-slate-700 focus-visible:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-200"
      >
        ⓘ
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 hidden w-[310px] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-[12px] font-medium leading-5 text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.14)] group-hover:block group-focus-within:block">
        Expected rent is calculated from lease start and end dates, monthly rent,
        and the selected reporting period. Year to Date uses the full calendar
        year, but only counts months where the lease is active. For All
        Properties, this amount is summed across all leases in the selected
        period.
      </span>
    </span>
  );
}

function PropertiesLeaseOverview({
  rows,
  error,
  onViewAllProperties,
  onOpenProperty,
}: {
  rows: PropertyLeaseOverviewRow[];
  error: boolean;
  onViewAllProperties: () => void;
  onOpenProperty: (propertyId: string) => void;
}) {
  const rowsListRef = useRef<HTMLDivElement | null>(null);
  const [rowsScrollThumb, setRowsScrollThumb] = useState({
    top: 0,
    height: 88,
  });
  const [rowsCanScroll, setRowsCanScroll] = useState(false);

  function updatePropertyRowsScrollbar() {
    const list = rowsListRef.current;
    if (!list) return;

    const maxScroll = list.scrollHeight - list.clientHeight;
    const canScroll = maxScroll > 0;
    const thumbHeight = Math.min(88, list.clientHeight || 88);
    const thumbTop =
      canScroll
        ? (list.scrollTop / maxScroll) * (list.clientHeight - thumbHeight)
        : 0;

    setRowsCanScroll(canScroll);
    setRowsScrollThumb({
      top: thumbTop,
      height: thumbHeight,
    });
  }

  useLayoutEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      updatePropertyRowsScrollbar();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [rows.length, error]);

  return (
    <div className="mt-14">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[17px] font-semibold tracking-[-0.035em] text-slate-950">
            Properties &amp; Lease Overview
          </h3>
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
            {rows.length} of {rows.length} properties
          </span>
        </div>

        <button
          type="button"
          onClick={onViewAllProperties}
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

      <div className="mt-8 overflow-visible">
        <div className="w-full">
          <div className="grid grid-cols-[2.3fr_1.65fr_1.45fr_1.9fr_24px] gap-5 border-b border-zinc-200 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <span>Property</span>
            <span>Lease Term</span>
            <span>Rent</span>
            <span>Tenant</span>
            <span />
          </div>

          {error ? (
            <div className="flex min-h-[180px] items-center justify-center border-b border-zinc-100 px-6 py-10 text-center">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
                  Unable to load property overview.
                </p>
                <p className="mt-2 text-[13.5px] font-medium text-slate-500">
                  Please refresh and try again.
                </p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center border-b border-zinc-100 px-6 py-10 text-center">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.035em] text-slate-950">
                  No properties yet.
                </p>
                <p className="mt-2 text-[13.5px] font-medium text-slate-500">
                  Add a property to see lease and rent details here.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={rowsListRef}
                onScroll={updatePropertyRowsScrollbar}
                className="max-h-[300px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="divide-y divide-zinc-100">
                  {rows.map((row) => (
                    <div
                      key={row.propertyId}
                      className="grid grid-cols-[2.3fr_1.65fr_1.45fr_1.9fr_24px] items-center gap-5 py-7"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-slate-950">
                          {row.propertyName}
                        </p>
                        <p className="mt-1.5 truncate text-[13.5px] font-medium text-slate-500">
                          {row.address}
                        </p>
                        <p
                          className={`mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${
                            row.leaseStatusTone === "green"
                              ? "text-emerald-600"
                              : row.leaseStatusTone === "blue"
                                ? "text-blue-600"
                                : row.leaseStatusTone === "red"
                                  ? "text-red-600"
                                  : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              row.leaseStatusTone === "green"
                                ? "bg-emerald-500"
                                : row.leaseStatusTone === "blue"
                                  ? "bg-blue-500"
                                  : row.leaseStatusTone === "red"
                                    ? "bg-red-500"
                                    : "bg-slate-300"
                            }`}
                          />
                          {row.leaseStatus}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        {row.hasLease ? (
                          <>
                            <p className="text-[15px] font-semibold leading-5 text-slate-950">
                              {row.leaseStart}
                            </p>
                            <p className="text-[15px] font-semibold leading-5 text-slate-950">
                              <span className="text-slate-500">→</span>{" "}
                              {row.leaseEnd}
                            </p>
                          </>
                        ) : (
                          <p className="text-[15px] font-semibold leading-5 text-slate-950">
                            No active lease
                          </p>
                        )}
                        <p className="text-[13.5px] font-medium text-slate-500">
                          {row.leaseLength}
                        </p>
                      </div>

                      <div>
                        <p className="text-[16px] font-semibold text-slate-950">
                          {row.rent}
                        </p>
                        <p
                          className={`mt-1.5 text-[13.5px] font-semibold ${
                            row.nextDueTone === "green"
                              ? "text-emerald-600"
                              : row.nextDueTone === "orange"
                                ? "text-orange-600"
                                : row.nextDueTone === "red"
                                  ? "text-red-600"
                                  : "text-slate-500"
                          }`}
                        >
                          {row.nextDue}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-slate-950">
                          {row.tenantName}
                        </p>
                        <p className="mt-1.5 truncate text-[13.5px] font-medium text-slate-500">
                          {row.tenantEmail}
                        </p>
                        <p className="mt-1 truncate text-[13.5px] font-medium text-slate-500">
                          {row.tenantPhone}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label={`Open ${row.propertyName} dashboard`}
                        onClick={() => onOpenProperty(row.propertyId)}
                        className="flex h-8 w-6 items-center justify-end justify-self-end text-slate-950 transition hover:text-[#2563EB]"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className="h-5 w-5"
                          strokeWidth={2.2}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute -right-[43px] top-0 h-full w-1">
                <div
                  className="w-[3px] rounded-full bg-slate-800/90"
                  style={{
                    height: `${rowsScrollThumb.height}px`,
                    transform: `translateY(${rowsScrollThumb.top}px)`,
                  }}
                />
              </div>

              {!rowsCanScroll && (
                <p className="mt-3 text-center text-[12px] font-medium text-slate-400">
                  All properties shown
                </p>
              )}
            </div>
          )}
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
  customRange,
  setCustomRange,
}: {
  properties: PropertyItem[];
  selectedProperty: string;
  setSelectedProperty: (value: string) => void;
  selectedRange: RangeId;
  setSelectedRange: (value: RangeId) => void;
  customRange: AppliedCustomRange | null;
  setCustomRange: (value: AppliedCustomRange | null) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState("");
  const [pendingEnd, setPendingEnd] = useState("");
  const [customError, setCustomError] = useState("");
  const customRef = useRef<HTMLDivElement | null>(null);

  const today = startOfDay(new Date());
  const minCustomDate = toDateInputValue(
    new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
  );
  const maxCustomDate = toDateInputValue(
    new Date(today.getFullYear() + 2, today.getMonth(), today.getDate())
  );

  function openCustomPicker() {
    const fallbackRange = getDateRange("this_month");
    setPendingStart(customRange?.start || toDateInputValue(fallbackRange.start));
    setPendingEnd(customRange?.end || toDateInputValue(fallbackRange.end));
    setCustomError("");
    setCustomOpen(true);
  }

  function handleRangeClick(id: RangeId) {
    if (id === "custom") {
      openCustomPicker();
      return;
    }

    setCustomOpen(false);
    setCustomError("");
    setSelectedRange(id);
  }

  function handleApplyCustomRange() {
    const start = parseLocalDate(pendingStart);
    const end = parseLocalDate(pendingEnd);
    const min = parseLocalDate(minCustomDate);
    const max = parseLocalDate(maxCustomDate);

    if (!start || !end) {
      setCustomError("Start date and end date are required.");
      return;
    }
    if (start > end) {
      setCustomError("Start date cannot be after end date.");
      return;
    }
    if ((min && start < min) || (max && end > max)) {
      setCustomError("Choose dates within two years of today.");
      return;
    }

    setCustomRange({ start: pendingStart, end: pendingEnd });
    setSelectedRange("custom");
    setCustomOpen(false);
    setCustomError("");
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        customRef.current &&
        !customRef.current.contains(event.target as Node)
      ) {
        setCustomOpen(false);
        setCustomError("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCustomOpen(false);
        setCustomError("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-nowrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="shrink-0 text-[18px] font-semibold tracking-[-0.035em] text-slate-950">
          Financial Overview
        </h2>
        <FinancialOverviewPropertyDropdown
          properties={properties}
          selectedProperty={selectedProperty}
          onSelect={setSelectedProperty}
        />
      </div>

      <div ref={customRef} className="relative shrink-0">
        <div className="inline-flex h-10 items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-1">
          {[
            ["ytd", "Year to Date"],
            ["this_month", "This Month"],
            ["custom", "Custom"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleRangeClick(id as RangeId)}
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

        {customOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <p className="text-[14px] font-semibold text-slate-950">
              Custom range
            </p>
            <div className="mt-4 grid gap-3">
              <DateRangeInput
                label="Start Date"
                value={pendingStart}
                min={minCustomDate}
                max={maxCustomDate}
                onChange={(value) => {
                  setPendingStart(value);
                  setCustomError("");
                }}
              />
              <DateRangeInput
                label="End Date"
                value={pendingEnd}
                min={minCustomDate}
                max={maxCustomDate}
                onChange={(value) => {
                  setPendingEnd(value);
                  setCustomError("");
                }}
              />
            </div>
            {customError ? (
              <p className="mt-3 text-[12px] font-medium text-red-500">
                {customError}
              </p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(false);
                  setCustomError("");
                }}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-[12.5px] font-semibold text-slate-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-4 text-[12.5px] font-semibold text-white transition hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DateRangeInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-medium text-slate-950 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function FinancialOverviewPropertyDropdown({
  properties,
  selectedProperty,
  onSelect,
}: {
  properties: PropertyItem[];
  selectedProperty: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel =
    selectedProperty === "all"
      ? `All Properties (${properties.length})`
      : properties.find((property) => property.id === selectedProperty)
          ?.property_label || "All Properties";
  const options = [
    { value: "all", label: `All Properties (${properties.length})` },
    ...properties.map((property) => ({
      value: property.id,
      label: property.property_label,
    })),
  ];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative min-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white pl-4 pr-5 text-left text-[13.5px] font-semibold text-slate-800 outline-none transition hover:border-zinc-300 hover:bg-zinc-50/50 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-3 h-4 w-4 shrink-0 text-slate-500 transition duration-150 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      <div
        className={`absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition duration-150 ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        role="listbox"
      >
        {options.map((option) => {
          const selected = option.value === selectedProperty;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] font-semibold transition ${
                selected
                  ? "bg-slate-50 text-slate-950"
                  : "text-slate-600 hover:bg-zinc-50 hover:text-slate-950"
              }`}
              role="option"
              aria-selected={selected}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {selected ? (
                <Check
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[#2563EB]"
                  strokeWidth={2.4}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExpenseBreakdownSection({
  items,
  rangeLabel,
  onAddExpense,
  addExpenseDisabled,
}: {
  items: ReturnType<typeof buildMonthlyExpenseBreakdown>;
  rangeLabel: string;
  onAddExpense: (category?: string) => void;
  addExpenseDisabled: boolean;
}) {
  const displayTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const empty = displayTotal <= 0;
  const segmentValue = empty ? 100 / Math.max(items.length, 1) : 0;
  let offset = 0;
  const gradient = items
    .map((item) => {
      const start = offset;
      const end = offset + (empty ? segmentValue : (item.amount / displayTotal) * 100);
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
            See where your money is going monthly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAddExpense()}
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
                {empty ? (
                  <p className="max-w-[90px] text-[20px] font-semibold leading-6 tracking-[-0.045em] text-slate-950">
                    Add expenses
                  </p>
                ) : (
                  <>
                    <p className="text-[12px] font-medium text-slate-500">
                      Total Expenses
                    </p>
                    <p className="mt-2 text-[29px] font-semibold tracking-[-0.065em] text-slate-950">
                      {formatCurrency(displayTotal)}
                    </p>
                    <p className="mt-1.5 text-[12px] font-medium text-slate-500">
                      {rangeLabel}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mr-5 max-w-[300px] space-y-1.5 justify-self-end">
          {items.map((item) => (
            <div
              key={item.category}
              className="group/expense-row grid grid-cols-[auto_auto_minmax(0,1fr)_72px] items-center gap-x-3.5 text-[14px]"
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
              {item.amount <= 0 ? (
                <button
                  type="button"
                  onClick={() => onAddExpense(item.category)}
                  disabled={addExpenseDisabled}
                  className="justify-self-end text-right text-[13px] font-semibold text-[#2563EB] transition hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  + Add
                </button>
              ) : (
                <span
                  className="relative justify-self-end text-right font-semibold tabular-nums text-slate-950"
                  tabIndex={0}
                >
                  {formatCurrency(item.amount)}
                  <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-max max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium leading-4 text-slate-600 opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition duration-150 group-hover/expense-row:opacity-100 group-focus-within/expense-row:opacity-100">
                    Manage this expense from the Expenses tab.
                  </span>
                </span>
              )}
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
      className={`relative flex h-12 w-[140px] items-center justify-center text-[15px] font-semibold transition ${
        active ? "text-slate-950" : "text-zinc-500 hover:text-slate-800"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-[3px] w-[140px] -translate-x-1/2 rounded-full bg-slate-950 transition-all duration-200 ease-out" />
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

function ExpenseManagementPreviewTable({
  rows,
  filter,
  counts,
  onFilterChange,
  onEdit,
}: {
  rows: ExpenseManagementRow[];
  filter: ExpensePreviewFilter;
  counts: Record<ExpensePreviewFilter, number>;
  onFilterChange: (filter: ExpensePreviewFilter) => void;
  onEdit: (expense: ExpenseManagementRow) => void;
}) {
  const filters: { id: ExpensePreviewFilter; label: string; count: number }[] = [
    { id: "all", label: "All Expenses", count: counts.all },
    { id: "one_time", label: "One-Time", count: counts.one_time },
    { id: "recurring", label: "Recurring", count: counts.recurring },
  ];
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
                onClick={() => onFilterChange(item.id)}
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
            {rows.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center px-6 py-12 text-center">
                <div>
                  <h3 className="text-[20px] font-semibold tracking-[-0.045em] text-slate-950">
                    No expenses added yet.
                  </h3>
                  <p className="mt-2 text-[14px] font-medium text-slate-500">
                    Use Add Expense to start tracking property costs.
                  </p>
                </div>
              </div>
            ) : (
              rows.map((row) => {
              const recurring = row.type === "recurring";

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
                      {formatExpenseKind(row.type)}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800">{row.category}</span>
                  <span
                    className={`truncate font-medium ${
                      row.description && row.description !== "N/A"
                        ? "text-slate-600"
                        : "text-slate-400"
                    }`}
                  >
                    {row.description || "N/A"}
                  </span>
                  <span className="truncate font-semibold text-slate-800">
                    {row.property}
                  </span>
                  <span className="font-medium text-slate-500">
                    {formatDate(row.createdOn)}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-slate-950">
                    {formatCurrency(row.amount)}
                  </span>
                  <span className="text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="text-[13px] font-semibold text-slate-700 transition hover:text-slate-950 hover:underline"
                    >
                      Edit
                    </button>
                  </span>
                </div>
              );
            })
            )}
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
  errors,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  title: string;
  properties: PropertyItem[];
  form: ExpenseForm;
  setForm: React.Dispatch<React.SetStateAction<ExpenseForm>>;
  errors: Record<string, string>;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const editing = title === "Edit Expense";
  const fixedFrequencyCategory = isFixedRecurringExpenseCategory(form.category);
  const typeLabel = fixedFrequencyCategory ? "Expense Frequency" : "Expense Type";
  const typeOptions = fixedFrequencyCategory
    ? [
        { id: "recurring" as const, label: "Monthly" },
        { id: "one_time" as const, label: "Yearly" },
      ]
    : [
        { id: "one_time" as const, label: "One-Time" },
        { id: "recurring" as const, label: "Recurring" },
      ];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="max-h-[92dvh] w-full max-w-[860px] overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.25)] sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="expense-modal-title"
              className="text-[24px] font-semibold tracking-[-0.05em] text-slate-950"
            >
              {title}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-zinc-500">
              {editing
                ? "Update this property expense."
                : "Record property expenses for cleaner reporting."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close expense modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <SelectInput
              label="Property"
              value={form.propertyId}
              error={errors.propertyId}
              onChange={(value) => setForm((prev) => ({ ...prev, propertyId: value }))}
              options={properties.map((property) => ({
                label: property.property_label,
                value: property.id,
              }))}
            />

            <div>
              <label className="text-[13px] font-medium text-zinc-700">
                {typeLabel}
              </label>
              <div className="mt-2 grid grid-cols-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
                {typeOptions.map((option) => {
                  const active = form.expenseType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, expenseType: option.id }))
                      }
                      className={`h-10 rounded-xl text-[13px] font-semibold transition ${
                        active
                          ? "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <SelectInput
              label="Category"
              value={form.category}
              error={errors.category}
              onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              options={expenseCategories.map((category) => ({
                label: category,
                value: category,
              }))}
            />
          </div>

          <div className="space-y-4">
            <InputField
              label="Amount"
              value={form.amount}
              error={errors.amount}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, amount: value.replace(/[^\d.]/g, "") }))
              }
              placeholder="250.00"
            />
            <InputField
              label="Date"
              value={form.paidDate}
              error={errors.paidDate}
              onChange={(value) => setForm((prev) => ({ ...prev, paidDate: value }))}
              type="date"
            />

            <InputField
              label="Vendor / Description"
              value={form.description}
              onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Example: Plumbing repair"
            />
          </div>
        </div>

        <div className="mt-7">
          {errors.save ? (
            <p className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {errors.save}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {editing && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving || deleting}
              className="h-11 rounded-2xl border border-red-100 bg-white px-5 text-[14px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete Expense
            </button>
          ) : (
            <span />
          )}
          <div className="grid gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || deleting}
              className="h-11 rounded-2xl bg-slate-950 px-6 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Save Expense"}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteExpenseModal({
  deleting,
  onClose,
  onConfirm,
}: {
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
          Delete this expense?
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-zinc-500">
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
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-[16px] outline-none transition focus:ring-4 sm:text-[14px] ${
          error
            ? "border-red-300 focus:border-red-300 focus:ring-red-50"
            : "border-zinc-200 focus:border-slate-300 focus:ring-slate-100"
        }`}
      />
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  error?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-[16px] outline-none transition focus:ring-4 sm:text-[14px] ${
          error
            ? "border-red-300 focus:border-red-300 focus:ring-red-50"
            : "border-zinc-200 focus:border-slate-300 focus:ring-slate-100"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-red-500">{error}</p>
      ) : null}
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

function buildFinancialOverviewMetrics({
  selectedProperty,
  selectedRange,
  customRange,
  leases,
  rentPayments,
  expenses,
}: {
  selectedProperty: string;
  selectedRange: RangeId;
  customRange: AppliedCustomRange | null;
  leases: LeaseItem[];
  rentPayments: RentPaymentItem[];
  expenses: ExpenseManagementRow[];
}): FinancialOverviewMetrics {
  const allPropertiesSelected = selectedProperty === "all";
  const metricRange = getFinancialOverviewRange(selectedRange, customRange);
  const scopedLeases = leases.filter((lease) => {
    if (allPropertiesSelected) return true;
    return lease.property_id === selectedProperty;
  });
  const scopedLeaseIds = new Set(scopedLeases.map((lease) => lease.id));
  const scopedPayments = rentPayments.filter((payment) => {
    if (allPropertiesSelected) return true;
    return (
      payment.property_id === selectedProperty ||
      Boolean(payment.lease_id && scopedLeaseIds.has(payment.lease_id))
    );
  });
  const expectedRentRange = getFinancialOverviewExpectedRentRange(
    selectedRange,
    customRange
  );
  const expectedRent = getExpectedRentFromLeases(scopedLeases, expectedRentRange);
  const actualRentPayments = getCollectedRentPayments(
    scopedPayments,
    (payment) => isPaymentInFinancialRange(payment, metricRange)
  );
  const rentCollected = actualRentPayments.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const expenseRange = getFinancialOverviewExpenseRange(selectedRange, customRange);
  const totalExpenses = getFinancialOverviewExpenseTotal(
    expenses,
    scopedLeases,
    selectedProperty,
    expenseRange
  );
  const progressPercent = expectedRent
    ? Math.round((rentCollected / expectedRent) * 100)
    : 0;
  const labelSuffix = getFinancialOverviewLabelSuffix(selectedRange, customRange);
  const expenseRatio = getExpenseRatioParts(totalExpenses, rentCollected);

  return {
    rentLabel: `Rent Collected ${labelSuffix}`,
    expenseLabel: `Total Expenses ${labelSuffix}`,
    rentCollected,
    expectedRent,
    remainingRent: Math.max(expectedRent - rentCollected, 0),
    progressPercent,
    totalExpenses,
    ...expenseRatio,
  };
}

function getFinancialOverviewRange(
  selectedRange: RangeId,
  customRange: AppliedCustomRange | null
) {
  const today = startOfDay(new Date());
  if (selectedRange === "custom" && customRange) {
    const start = parseLocalDate(customRange.start);
    const end = parseLocalDate(customRange.end);
    if (start && end) return { start, end };
  }

  const range = getDateRange(selectedRange);
  return {
    start: range.start,
    end: selectedRange === "ytd" ? today : range.end,
  };
}

function getFinancialOverviewExpenseRange(
  selectedRange: RangeId,
  customRange: AppliedCustomRange | null
) {
  if (selectedRange === "custom" && customRange) {
    const start = parseLocalDate(customRange.start);
    const end = parseLocalDate(customRange.end);
    if (start && end) return { start, end };
  }

  return getDateRange(selectedRange);
}

function getFinancialOverviewExpectedRentRange(
  selectedRange: RangeId,
  customRange: AppliedCustomRange | null
) {
  if (selectedRange === "ytd") {
    const today = new Date();
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: new Date(today.getFullYear(), 11, 31),
    };
  }

  return getFinancialOverviewRange(selectedRange, customRange);
}

function getFinancialOverviewExpenseTotal(
  expenses: ExpenseManagementRow[],
  leases: LeaseItem[],
  selectedProperty: string,
  range: { start: Date; end: Date }
) {
  const coverage = getFinancialOverviewExpenseCoverage(leases, range);

  // Financial Overview expenses are normalized by reporting period and lease overlap
  // so annual expenses do not distort rent-vs-expense percentages.
  return expenses.reduce((sum, expense) => {
    if (selectedProperty !== "all" && expense.propertyId !== selectedProperty) {
      return sum;
    }

    const propertyCoverage = coverage.get(expense.propertyId);
    if (!propertyCoverage || propertyCoverage.months.size === 0) return sum;

    return (
      sum +
      getFinancialOverviewExpenseAmount(
        expense,
        propertyCoverage.months,
        propertyCoverage.ranges
      )
    );
  }, 0);
}

function getFinancialOverviewExpenseCoverage(
  leases: LeaseItem[],
  range: { start: Date; end: Date }
) {
  const coverage = new Map<
    string,
    { months: Set<string>; ranges: Array<{ start: Date; end: Date }> }
  >();

  leases.forEach((lease) => {
    const leaseCoverage = getLeaseCoverageForRange(lease, range);
    if (!leaseCoverage) return;

    const propertyCoverage =
      coverage.get(lease.property_id) || {
        months: new Set<string>(),
        ranges: [],
      };

    propertyCoverage.ranges.push(leaseCoverage);
    getMonthStartsBetween(leaseCoverage.start, leaseCoverage.end).forEach((month) => {
      propertyCoverage.months.add(formatCycleKey(month));
    });
    coverage.set(lease.property_id, propertyCoverage);
  });

  return coverage;
}

function getLeaseCoverageForRange(
  lease: LeaseItem,
  range: { start: Date; end: Date }
) {
  const leaseStart = parseLocalDate(lease.start_date || "");
  if (!leaseStart) return null;

  const leaseEnd = parseLocalDate(lease.end_date || "");
  const rangeStart = startOfDay(range.start);
  const rangeEnd = startOfDay(range.end);
  const overlapStart = leaseStart > rangeStart ? leaseStart : rangeStart;
  const overlapEnd = leaseEnd && leaseEnd < rangeEnd ? leaseEnd : rangeEnd;
  if (overlapEnd < overlapStart) return null;

  return { start: overlapStart, end: overlapEnd };
}

function getFinancialOverviewExpenseAmount(
  expense: ExpenseManagementRow,
  coveredMonths: Set<string>,
  coveredRanges: Array<{ start: Date; end: Date }>
) {
  const amount = Number(expense.amount || 0);
  if (amount <= 0) return 0;

  const category = normalizeExpenseCategory(expense.category);
  const coveredMonthCount = coveredMonths.size;
  if (coveredMonthCount === 0) return 0;

  if (isFixedRecurringExpenseCategory(category)) {
    return expense.type === "recurring"
      ? amount * coveredMonthCount
      : (amount / 12) * coveredMonthCount;
  }

  if (expense.type === "recurring") {
    return amount * coveredMonthCount;
  }

  return expenseDateFallsInCoverage(expense, coveredRanges) ? amount : 0;
}

function expenseDateFallsInCoverage(
  expense: ExpenseManagementRow,
  coveredRanges: Array<{ start: Date; end: Date }>
) {
  const expenseDate = parseLocalDate(expense.createdOn);
  if (!expenseDate) return false;
  return coveredRanges.some(
    (coverage) => expenseDate >= coverage.start && expenseDate <= coverage.end
  );
}

function getMonthStartsBetween(start: Date, end: Date) {
  const months: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= finalMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getExpectedRentFromLeases(
  leases: LeaseItem[],
  range: { start: Date; end: Date }
) {
  return leases.reduce((sum, lease) => {
    return sum + getExpectedRentForLease(lease, range);
  }, 0);
}

function getExpectedRentForLease(
  lease: LeaseItem,
  range: { start: Date; end: Date }
) {
  const monthlyRent = Number(lease.monthly_rent || 0);
  const leaseStart = parseLocalDate(lease.start_date || "");
  if (!monthlyRent || !leaseStart) return 0;

  const leaseEnd = parseLocalDate(lease.end_date || "");
  const rangeStart = startOfDay(range.start);
  const rangeEnd = startOfDay(range.end);
  const overlapStart = leaseStart > rangeStart ? leaseStart : rangeStart;
  const overlapEnd = leaseEnd && leaseEnd < rangeEnd ? leaseEnd : rangeEnd;
  if (overlapEnd < overlapStart) return 0;

  const firstCycleDate =
    getLeaseFirstPaymentCycleDate({
      startDate: lease.start_date,
      paymentTrackingStartDate: lease.payment_tracking_start_date,
      leaseSetupType: lease.lease_setup_type,
      leaseAmounts: lease.lease_amounts || [],
    }) || new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1);

  let expected = 0;
  const cursor = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), 1);
  const finalMonth = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), 1);

  while (cursor <= finalMonth) {
    if (leaseOverlapsMonth(leaseStart, leaseEnd, cursor)) {
      expected += getLeasePaymentAmountForCycle({
        cycleDate: new Date(cursor),
        firstCycleDate,
        monthlyRent,
        leaseSetupType: lease.lease_setup_type,
        leaseAmounts: lease.lease_amounts || [],
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return expected;
}

function leaseOverlapsMonth(
  leaseStart: Date,
  leaseEnd: Date | null,
  monthStart: Date
) {
  const monthEnd = endOfMonth(monthStart);
  return leaseStart <= monthEnd && (!leaseEnd || leaseEnd >= monthStart);
}

function getFinancialPaymentAmount(payment: RentPaymentItem, lease?: LeaseItem) {
  const paymentAmount = getPaymentAmount(payment);
  if (paymentAmount > 0) return paymentAmount;
  if (!lease) return 0;

  const cycleDate = getFinancialPaymentCycleDate(payment);
  const firstCycleDate =
    getLeaseFirstPaymentCycleDate({
      startDate: lease.start_date,
      paymentTrackingStartDate: lease.payment_tracking_start_date,
      leaseSetupType: lease.lease_setup_type,
      leaseAmounts: lease.lease_amounts || [],
    }) || getLeaseStartMonth(lease.start_date);

  if (!cycleDate || !firstCycleDate) return Number(lease.monthly_rent || 0);

  return getLeasePaymentAmountForCycle({
    cycleDate,
    firstCycleDate,
    monthlyRent: Number(lease.monthly_rent || 0),
    leaseSetupType: lease.lease_setup_type,
    leaseAmounts: lease.lease_amounts || [],
  });
}

function isPaymentInFinancialRange(
  payment: RentPaymentItem,
  range: { start: Date; end: Date }
) {
  const cycleDate = getFinancialPaymentCycleDate(payment);
  if (cycleDate) return cycleDate >= range.start && cycleDate <= range.end;

  return isDateInRange(payment.paid_at || payment.created_at || payment.due_date || "", range);
}

function getFinancialPaymentCycleDate(payment: RentPaymentItem) {
  const cycleKeyDate = parseCycleKeyMonth(payment.rent_cycle_key);
  if (cycleKeyDate) return cycleKeyDate;

  const periodDate = parsePeriodMonth(payment.period_label);
  if (periodDate) return periodDate;

  const dueDate = parseLocalDate(payment.due_date || "");
  if (dueDate) return new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

  const paidDate = parseLocalDate(payment.paid_at || "");
  if (paidDate) return new Date(paidDate.getFullYear(), paidDate.getMonth(), 1);

  const createdDate = parseLocalDate(payment.created_at || "");
  return createdDate
    ? new Date(createdDate.getFullYear(), createdDate.getMonth(), 1)
    : null;
}

function parseCycleKeyMonth(value?: string | null) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function getLeaseStartMonth(value?: string | null) {
  const date = parseLocalDate(value || "");
  return date ? new Date(date.getFullYear(), date.getMonth(), 1) : null;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isDateInRange(value: string, range: { start: Date; end: Date }) {
  const date = parseLocalDate(value);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function getFinancialOverviewLabelSuffix(
  selectedRange: RangeId,
  customRange: AppliedCustomRange | null
) {
  if (selectedRange === "ytd") return "YTD";
  if (selectedRange === "custom") {
    const start = customRange?.start ? parseLocalDate(customRange.start) : null;
    const end = customRange?.end ? parseLocalDate(customRange.end) : null;
    if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
    return "Custom Range";
  }

  const today = new Date();
  return today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getExpenseBreakdownRangeLabel(
  selectedRange: RangeId,
  customRange: AppliedCustomRange | null
) {
  if (selectedRange === "custom") {
    const start = customRange?.start ? parseLocalDate(customRange.start) : null;
    const end = customRange?.end ? parseLocalDate(customRange.end) : null;
    if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
    return "Custom Range";
  }

  return getDateRange(selectedRange).label;
}

function getMonthlyExpenseBreakdownLabel(month: Date) {
  return month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getExpenseRatioParts(totalExpenses: number, rentCollected: number): {
  expenseRatioLabel?: string;
  expenseRatioPercent?: string;
  expenseRatioText?: string;
  expenseRatioAccent: boolean;
} {
  if (rentCollected <= 0) {
    return {
      expenseRatioLabel: "No rent collected yet",
      expenseRatioAccent: false,
    };
  }

  const percent = totalExpenses <= 0
    ? 0
    : Math.round((totalExpenses / rentCollected) * 100);

  return {
    expenseRatioPercent: `${percent}%`,
    expenseRatioText: "of rent collected",
    expenseRatioAccent: totalExpenses > 0,
  };
}

function buildPropertyLeaseOverviewRows(
  properties: PropertyItem[],
  leases: LeaseItem[]
): PropertyLeaseOverviewRow[] {
  return properties.map((property) => {
    const propertyLeases = leases.filter((lease) => lease.property_id === property.id);
    const lease = selectOverviewLease(propertyLeases);
    const tenant = selectOverviewTenant(lease?.lease_tenants || []);
    const leaseActive = Boolean(lease && isLeaseOverviewActive(lease));
    const overviewStatus = getPropertyOverviewStatus({
      property,
      lease,
      leaseActive,
      tenant,
    });

    return {
      propertyId: property.id,
      propertyName: property.property_label || "Rental property",
      address: formatOverviewAddress(property),
      leaseStatus: overviewStatus.label,
      leaseStatusTone: overviewStatus.tone,
      hasLease: Boolean(lease),
      leaseStart: lease?.start_date ? formatDate(lease.start_date) : "—",
      leaseEnd: lease?.end_date ? formatDate(lease.end_date) : "—",
      leaseLength: lease ? formatLeaseDuration(lease.start_date, lease.end_date) : "—",
      rent: lease?.monthly_rent
        ? `${formatCurrency(Number(lease.monthly_rent))} / month`
        : "Rent not set",
      nextDue: lease ? formatNextRentDue(lease).label : "Next due date not set",
      nextDueTone: lease ? formatNextRentDue(lease).tone : "gray",
      tenantName: tenant ? getOverviewTenantName(tenant) : "No tenant assigned",
      tenantEmail: tenant?.email || "Email not added",
      tenantPhone: tenant?.phone || "Phone not added",
    };
  });
}

function selectOverviewLease(leases: LeaseItem[]) {
  if (!leases.length) return null;
  const activeLease = leases.find(isLeaseOverviewActive);
  return activeLease || leases[0];
}

function getPropertyOverviewStatus({
  property,
  lease,
  leaseActive,
  tenant,
}: {
  property: PropertyItem;
  lease: LeaseItem | null;
  leaseActive: boolean;
  tenant: LeaseTenantItem | null;
}): { label: string; tone: PropertyLeaseOverviewRow["leaseStatusTone"] } {
  if (!isPropertyBankConnected(property)) {
    return { label: "Action Needed", tone: "blue" };
  }
  if (leaseActive) {
    return { label: "Active Lease", tone: "green" };
  }
  if (!tenant) {
    return { label: "No tenant assigned", tone: "gray" };
  }
  if (!lease) {
    return { label: "No active lease", tone: "gray" };
  }
  const fallbackLabel = formatLeaseStatus(lease.lease_status);
  return {
    label: fallbackLabel,
    tone: isLeaseBlockingStatus(fallbackLabel) ? "red" : "gray",
  };
}

function isPropertyBankConnected(property: PropertyItem) {
  return String(property.bank_status || "").toLowerCase() === "connected";
}

function isLeaseBlockingStatus(label: string) {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("expired") ||
    normalized.includes("ended") ||
    normalized.includes("overdue") ||
    normalized.includes("failed")
  );
}

function isLeaseOverviewActive(lease: LeaseItem) {
  const normalizedStatus = String(lease.lease_status || "").toLowerCase();
  if (lease.ended_at || ["ended", "inactive", "terminated"].includes(normalizedStatus)) {
    return false;
  }
  if (normalizedStatus === "active") return true;
  const endDate = parseLocalDate(lease.end_date || "");
  return !endDate || endDate >= startOfDay(new Date());
}

function selectOverviewTenant(tenants: LeaseTenantItem[]) {
  return (
    tenants.find(
      (tenant) => String(tenant.tenant_role || "").toLowerCase() === "primary"
    ) ||
    tenants[0] ||
    null
  );
}

function getOverviewTenantName(tenant: LeaseTenantItem) {
  return `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || "Tenant";
}

function formatOverviewAddress(property: PropertyItem) {
  const unit = property.unit_name ? `Unit ${property.unit_name}` : "";
  const stateZip = [property.state_name, property.zip].filter(Boolean).join(" ");
  const cityStateZip = [property.city, stateZip].filter(Boolean).join(", ");
  const parts = [property.street_address, unit, cityStateZip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Address not added";
}

function formatLeaseStatus(status?: string | null) {
  if (!status) return "Lease not active";
  return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()} Lease`;
}

function formatLeaseDuration(startValue?: string | null, endValue?: string | null) {
  const start = parseLocalDate(startValue || "");
  const end = parseLocalDate(endValue || "");
  if (!start || !end) return "—";
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 1 : 0);
  if (months <= 0) return "—";
  return `${months} ${months === 1 ? "month" : "months"}`;
}

function formatNextRentDue(lease: LeaseItem): {
  label: string;
  tone: PropertyLeaseOverviewRow["nextDueTone"];
} {
  const dueDay = parseRentDueDay(lease.rent_due_day);
  if (!dueDay) return { label: "Next due date not set", tone: "gray" };

  const today = startOfDay(new Date());
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const nextDue =
    thisMonthDue >= today
      ? thisMonthDue
      : new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  const days = Math.round(
    (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days === 0) return { label: "Due today", tone: "green" };
  if (days > 0) {
    return {
      label: `Next due in ${days} ${days === 1 ? "day" : "days"}`,
      tone: "green",
    };
  }
  const overdueDays = Math.abs(days);
  return {
    label: `Past due by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
    tone: overdueDays > 7 ? "red" : "orange",
  };
}

function parseRentDueDay(value?: string | null) {
  if (!value) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const day = Number(match[0]);
  return Number.isFinite(day) ? Math.min(Math.max(day, 1), 28) : null;
}

function buildExpenseManagementRows(
  expenses: ExpenseItem[],
  properties: PropertyItem[]
): ExpenseManagementRow[] {
  const rows = [...expenses]
    .sort((a, b) => String(a.paid_date || "").localeCompare(String(b.paid_date || "")))
    .map((expense, index) =>
      expenseToManagementRow(
        expense,
        formatExpenseDisplayId(expense.paid_date, index + 1),
        undefined,
        properties
      )
    );

  return rows.sort((a, b) => String(b.createdOn).localeCompare(String(a.createdOn)));
}

function expenseToManagementRow(
  expense: ExpenseItem,
  displayId: string,
  type?: ExpenseKind,
  properties: PropertyItem[] = []
): ExpenseManagementRow {
  const propertyName =
    expense.properties?.property_label ||
    properties.find((property) => property.id === expense.property_id)?.property_label ||
    "Unknown Property";

  return {
    id: displayId,
    sourceExpenseId: expense.id,
    type: type || fromExpenseFrequencyValue(expense.expense_frequency),
    category: normalizeExpenseCategory(expense.category),
    description: expense.description || "",
    propertyId: expense.property_id,
    property: propertyName,
    createdOn: expense.paid_date,
    amount: Number(expense.amount || 0),
  };
}

function generateExpenseDisplayId(rows: ExpenseManagementRow[], paidDate: string) {
  const year = parseLocalDate(paidDate)?.getFullYear() || new Date().getFullYear();
  const maxSequence = rows.reduce((max, row) => {
    const match = row.id.match(/^EXP-(\d{4})-(\d{6})$/);
    if (!match || Number(match[1]) !== year) return max;
    return Math.max(max, Number(match[2]));
  }, 0);

  return formatExpenseDisplayId(paidDate, maxSequence + 1);
}

function formatExpenseDisplayId(paidDate: string, sequence: number) {
  const year = parseLocalDate(paidDate)?.getFullYear() || new Date().getFullYear();
  return `EXP-${year}-${String(sequence).padStart(6, "0")}`;
}

function validateExpenseForm(form: ExpenseForm) {
  const errors: Record<string, string> = {};
  if (!form.propertyId) errors.propertyId = "Choose a property.";
  if (!form.category) errors.category = "Choose a category.";
  if (!form.amount || Number(form.amount) <= 0) {
    errors.amount = "Enter a positive amount.";
  }
  if (!form.paidDate) errors.paidDate = "Choose a date.";
  return errors;
}

function formatExpenseKind(type: ExpenseKind) {
  return type === "recurring" ? "Recurring" : "One-Time";
}

function toExpenseFrequencyValue(type: ExpenseKind) {
  return type === "recurring" ? "recurring" : "one-time";
}

function fromExpenseFrequencyValue(value?: string | null): ExpenseKind {
  const normalized = String(value || "").toLowerCase().replace(/_/g, "-");
  return normalized === "recurring" ? "recurring" : "one_time";
}

function normalizeRelatedRows(items: any[]) {
  return items.map((item) => ({
    ...item,
    properties: Array.isArray(item.properties)
      ? item.properties[0] || null
      : item.properties,
  }));
}

function mergeRentPayments(items: any[]) {
  const paymentMap = new Map<string, any>();
  items.forEach((item) => {
    if (!item?.id) return;
    paymentMap.set(item.id, item);
  });
  return Array.from(paymentMap.values());
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

function buildMonthlyExpenseBreakdown(
  expenses: ExpenseManagementRow[],
  selectedProperty: string,
  month: Date
) {
  const monthlyAmounts = new Map<string, number>();

  expenses.forEach((expense) => {
    if (selectedProperty !== "all" && expense.propertyId !== selectedProperty) {
      return;
    }

    const category = normalizeExpenseCategory(expense.category);
    const amount = getMonthlyBreakdownExpenseAmount(expense, month);
    monthlyAmounts.set(category, (monthlyAmounts.get(category) || 0) + amount);
  });

  const total = Array.from(monthlyAmounts.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return breakdownCategories.map((category, index) => {
    const amount = monthlyAmounts.get(category) || 0;

    return {
      category,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: expenseBreakdownPalette[index % expenseBreakdownPalette.length],
    };
  });
}

function getMonthlyBreakdownExpenseAmount(
  expense: ExpenseManagementRow,
  month: Date
) {
  const amount = Number(expense.amount || 0);
  if (amount <= 0) return 0;

  const category = normalizeExpenseCategory(expense.category);
  if (isFixedRecurringExpenseCategory(category)) {
    return expense.type === "recurring" ? amount : amount / 12;
  }

  if (expense.type === "recurring") return amount;
  return expenseOccurredInMonth(expense, month) ? amount : 0;
}

function expenseOccurredInMonth(expense: ExpenseManagementRow, month: Date) {
  const expenseDate = parseLocalDate(expense.createdOn);
  return Boolean(
    expenseDate &&
      expenseDate.getFullYear() === month.getFullYear() &&
      expenseDate.getMonth() === month.getMonth()
  );
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
  return ["paid", "completed", "complete", "succeeded", "success", "posted"].includes(
    normalized
  );
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
  if (category === "HOA") return "HOA / PM";
  if (category === "Repairs") return "Maintenance";
  return expenseCategories.includes(category) || breakdownCategories.includes(category)
    ? category
    : "Other";
}

function isFixedRecurringExpenseCategory(category?: string | null) {
  return fixedRecurringExpenseCategories.includes(
    normalizeExpenseCategory(category)
  );
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

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
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
