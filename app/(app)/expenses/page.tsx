
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatINR } from "@/lib/api";

interface ExpenseCategory {
  id: string;
  name: string;
  isSystem?: boolean;
}

interface Expense {
  id: string;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  description: string | null;
  paymentMethod: string | null;
  amount: number | string;
  notes?: string | null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("Rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );

  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.expenseCategories();
      const records = response.data ?? [];

      setCategories(records);

      if (records.length) {
        setCategoryId((current) =>
          records.some((item) => item.id === current)
            ? current
            : records[0].id,
        );
        setCategoryName(records[0].name);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load expense categories.",
      );
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const selectedCategory = categories.find(
        (item) => item.name === filterCategory,
      );

      const response = await api.expenses({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
        categoryId: selectedCategory?.id,
      });
console.log("[EXPENSES FRONTEND RESPONSE]", response);
      setExpenses(response.data ?? []);
      console.log("[EXPENSES DISPLAY CHECK]", {
  count: response.data?.length,
  firstExpense: response.data?.[0],
  activeCategory: filterCategory,
  search,
});
      setTotalExpense(Number(response.summary?.totalAmount ?? 0));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, [categories, filterCategory, search]);
useEffect(() => {
  console.log("[EXPENSES STATE CHECK]", {
    count: expenses.length,
    expenses,
    loading,
    error,
  });
}, [expenses, loading, error]);
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadExpenses();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadExpenses]);

  const handleCategoryChange = (name: string) => {
    setCategoryName(name);
    setCategoryId(
      categories.find((item) => item.name === name)?.id ?? "",
    );
  };

  const handleSave = async () => {
    setNotice("");
    setError("");

    const parsedAmount = Number(amount);

    if (!description.trim()) {
      setError("Please enter an expense description.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    if (!expenseDate || Number.isNaN(new Date(expenseDate).getTime())) {
      setError("Please select a valid expense date.");
      return;
    }

    setSaving(true);

    try {
      await api.createExpense({
        amount: parsedAmount,
        date: new Date(`${expenseDate}T12:00:00`).toISOString(),
        categoryId: categoryId || null,
        category: categoryName.trim() || null,
        description: description.trim(),
        paymentMethod: paymentType,
      });

      setShowForm(false);
      setDescription("");
      setAmount("");
      setPaymentType("CASH");
      setNotice("Expense recorded successfully.");

      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  const displayedExpenses = expenses;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Expenses</h1>

        <button
          onClick={() => {
            setError("");
            setNotice("");
            setShowForm(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Expense
        </button>
      </div>

      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-500">Total Expenses</div>
        <div className="text-2xl font-bold text-red-500">
          {formatINR(totalExpense)}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 border-b px-6 py-3 lg:flex-row lg:items-center">
        <div className="flex gap-2 overflow-x-auto">
          {["All", ...categories.map((item) => item.name)].map((name) => (
            <button
              key={name}
              onClick={() => setFilterCategory(name)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-sm ${
                filterCategory === name
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search expenses..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 lg:w-64"
        />
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && !showForm && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              onClick={() => void loadExpenses()}
              className="font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Expense ID</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Payment Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {displayedExpenses.map((expense) => (
              <tr key={expense.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{formatDate(expense.date)}</td>
                <td className="py-3 font-medium" title={expense.id}>
                  {expense.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="py-3">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {expense.category?.name ?? "Uncategorized"}
                  </span>
                </td>
                <td className="py-3">{expense.description || "—"}</td>
                <td className="py-3">{expense.paymentMethod || "—"}</td>
                <td className="py-3 text-right font-medium text-red-500">
                  {formatINR(Number(expense.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && !error && displayedExpenses.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No expenses found
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-sm text-gray-500">
            Loading expenses...
          </div>
        )}

        {!loading && !error && displayedExpenses.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            Showing up to 100 matching expenses.
          </p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close"
                className="text-2xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="text-sm text-gray-600">Category</label>
                <select
                  value={categoryName}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.length === 0 && (
                    <option value="Rent">Rent</option>
                  )}
                  {categories.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No saved categories found. The category will be created
                    when the expense is saved.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this expense for?"
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(event) => setPaymentType(event.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="BANK">BANK</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="OTHERS">OTHERS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Expense Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 rounded-b-xl border-t bg-gray-50 px-6 py-4">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-md border px-5 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-md bg-red-500 px-6 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
