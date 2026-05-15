"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateProfile } from "@/lib/getOrCreateProfile";

type PropertyItem = {
  id: string;
  property_label: string;
};

type ExpenseItem = {
  id: string;
  profile_id: string;
  property_id: string;
  description: string;
  category: string | null;
  amount: number;
  paid_date: string;
  created_at: string;
  properties?: {
    property_label: string;
  } | null;
};

const categories = [
  "Maintenance",
  "Repairs",
  "Utilities",
  "Insurance",
  "HOA",
  "Taxes",
  "Cleaning",
  "Other",
];

const emptyExpenseForm = {
  propertyId: "",
  description: "",
  category: "Maintenance",
  amount: "",
  paidDate: new Date().toISOString().slice(0, 10),
};

export default function ExpensesPage() {
  const router = useRouter();

  const [profileId, setProfileId] = useState("");
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseItem | null>(null);

  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);

  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  useEffect(() => {
    async function loadExpensesPage() {
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
          console.error("Properties load error:", propertyError);
        } else {
          const loadedProperties = (propertyData || []) as PropertyItem[];
          setProperties(loadedProperties);

          setExpenseForm((prev) => ({
            ...prev,
            propertyId: loadedProperties[0]?.id || "",
          }));
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
          console.error("Expenses load error:", expenseError);
        } else {
          setExpenses(normalizeExpenses(expenseData || []));
        }
      } catch (error) {
        console.error("Expenses page load error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadExpensesPage();
  }, [router]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

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
      category: expense.category || "Maintenance",
      amount: String(expense.amount || ""),
      paidDate: expense.paid_date || new Date().toISOString().slice(0, 10),
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

    if (editingExpense) {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          property_id: expenseForm.propertyId,
          description: expenseForm.description.trim(),
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          paid_date: expenseForm.paidDate,
        })
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
        console.error("Expense update error:", error);
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
        property_id: expenseForm.propertyId,
        description: expenseForm.description.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        paid_date: expenseForm.paidDate,
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
      console.error("Expense insert error:", error);
      setSavingExpense(false);
      return;
    }

    setExpenses((prev) => [normalizeExpense(data), ...prev]);

    setExpenseForm({
      ...emptyExpenseForm,
      propertyId: properties[0]?.id || "",
      paidDate: new Date().toISOString().slice(0, 10),
    });

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
      console.error("Expense delete error:", error);
      setDeletingExpense(false);
      return;
    }

    setExpenses((prev) => prev.filter((item) => item.id !== deleteExpense.id));
    setDeleteExpense(null);
    setDeletingExpense(false);
  }

  function exportExpenses() {
    const rows = [
      ["Property", "Description", "Category", "Amount", "Paid Date"],
      ...expenses.map((expense) => [
        expense.properties?.property_label || "Unknown Property",
        expense.description,
        expense.category || "",
        String(expense.amount),
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
    link.download = "avenueboard-expenses.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading expenses...
      </div>
    );
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <p className="mt-1 text-[14px] text-zinc-500">
            Track property expenses in a clean list view.
          </p>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-hidden">
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold">Expense List</h2>

              <p className="mt-1 text-[12px] text-zinc-500">
                {expenses.length} records • ${totalExpenses.toLocaleString()}{" "}
                total
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openAddExpense}
                disabled={properties.length === 0}
                className="h-10 rounded-2xl bg-[#B9476D] px-5 text-[13px] font-semibold text-white transition hover:bg-[#A93F64] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                + Add Expense
              </button>

              <button
                onClick={exportExpenses}
                className="h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1.1fr_2fr_1fr_1fr_150px] border-b border-zinc-100 bg-[#FAFAFA] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            <span>Property</span>
            <span>Description</span>
            <span>Category</span>
            <span>Paid Date</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <div className="flex flex-col items-center justify-center py-14">
                  <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-zinc-900">
                    No expenses added
                  </h3>

                  <p className="mt-3 max-w-[420px] text-center text-[14px] leading-6 text-zinc-500">
                    Track maintenance, repairs, HOA fees, utilities, and other
                    property expenses in one place.
                  </p>
                </div>
              </div>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="grid grid-cols-[1.1fr_2fr_1fr_1fr_150px] items-center border-b border-zinc-100 px-5 py-4 text-[13px] hover:bg-zinc-50"
                >
                  <p className="truncate font-semibold text-zinc-900">
                    {expense.properties?.property_label || "Unknown Property"}
                  </p>

                  <p className="truncate text-zinc-600">
                    {expense.description}
                  </p>

                  <p className="truncate text-zinc-500">
                    {expense.category || "Other"}
                  </p>

                  <p className="text-zinc-500">
                    {formatDate(expense.paid_date)}
                  </p>

                  <div className="flex items-center justify-end gap-3">
                    <p className="font-semibold text-zinc-900">
                      ${Number(expense.amount).toLocaleString()}
                    </p>

                    <button
                      onClick={() => openEditExpense(expense)}
                      className="text-[12px] font-semibold text-[#B9476D] hover:text-[#A93F64]"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => setDeleteExpense(expense)}
                      className="text-[12px] font-semibold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {expenseOpen && (
        <ModalShell
          title={editingExpense ? "Edit Expense" : "Add Expense"}
          subtitle={
            editingExpense
              ? "Update this expense record."
              : "Record a property expense for tracking and reports."
          }
          onClose={() => {
            setExpenseOpen(false);
            setEditingExpense(null);
          }}
        >
          <div className="space-y-4">
            <SelectInput
              label="Property"
              value={expenseForm.propertyId}
              onChange={(value) =>
                setExpenseForm({ ...expenseForm, propertyId: value })
              }
              options={properties.map((property) => ({
                label: property.property_label,
                value: property.id,
              }))}
            />

            <InputField
              label="Description"
              value={expenseForm.description}
              onChange={(value) =>
                setExpenseForm({ ...expenseForm, description: value })
              }
              placeholder="Example: Plumbing repair"
            />

            <div className="grid grid-cols-3 gap-3">
              <SelectInput
                label="Category"
                value={expenseForm.category}
                onChange={(value) =>
                  setExpenseForm({ ...expenseForm, category: value })
                }
                options={categories.map((category) => ({
                  label: category,
                  value: category,
                }))}
              />

              <InputField
                label="Amount"
                value={expenseForm.amount}
                onChange={(value) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: value.replace(/[^\d.]/g, ""),
                  })
                }
                placeholder="250"
              />

              <InputField
                label="Paid Date"
                value={expenseForm.paidDate}
                onChange={(value) =>
                  setExpenseForm({ ...expenseForm, paidDate: value })
                }
                type="date"
              />
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <button
              onClick={() => {
                setExpenseOpen(false);
                setEditingExpense(null);
              }}
              className="h-11 rounded-2xl border border-zinc-200 bg-white px-6 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveExpense}
              disabled={savingExpense}
              className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
            >
              {savingExpense
                ? "Saving..."
                : editingExpense
                ? "Save Changes"
                : "Save Expense"}
            </button>
          </div>
        </ModalShell>
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
    </>
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

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[620px] rounded-[28px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.04em]">
              {title}
            </h2>
            <p className="mt-1 text-[13px] text-zinc-500">{subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        {children}
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
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

        <div className="mt-7 flex justify-end gap-3">
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
            className="h-11 rounded-2xl bg-[#B9476D] px-6 text-[14px] font-semibold text-white hover:bg-[#A93F64] disabled:opacity-50"
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
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-[#FAFAFA] px-4 text-[14px] outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
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
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-[#FAFAFA] px-4 text-[14px] outline-none focus:border-[#B9476D] focus:bg-white focus:ring-4 focus:ring-[#B9476D]/10"
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

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}