
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatINR } from "@/lib/api";

type Income = {
  id: string;
  amount: number | string;
  date: string;
  category?: string | null;
  paymentMethod: string;
  description?: string | null;
  notes?: string | null;
  reference?: string | null;
  bankAccountId?: string | null;
  bankAccount?: {
    id: string;
    name: string;
    isCash: boolean;
  } | null;
};

type Account = {
  id: string;
  name: string;
  isCash: boolean;
  status?: string;
};

type IncomeForm = {
  amount: string;
  date: string;
  category: string;
  paymentMethod: string;
  description: string;
  notes: string;
  reference: string;
  bankAccountId: string;
};

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function dateOnly(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const emptyForm = (): IncomeForm => ({
  amount: "",
  date: today(),
  category: "",
  paymentMethod: "CASH",
  description: "",
  notes: "",
  reference: "",
  bankAccountId: "",
});

export default function OtherIncomePage() {
  const [records, setRecords] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeForm>(emptyForm());
  const [serverTotal, setServerTotal] = useState(0);
  const [serverCount, setServerCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [incomeResponse, accountResponse] = await Promise.all([
        api.otherIncomes({ page: 1, limit: 100, search: search.trim() }),
        api.cashBankAccounts({ page: 1, limit: 100 }),
      ]);

      setRecords(incomeResponse.data ?? []);
      setServerTotal(Number(incomeResponse.summary?.totalAmount ?? 0));
      setServerCount(Number(incomeResponse.summary?.count ?? 0));
      setAccounts(
        (accountResponse.data ?? []).filter(
          (account: Account) => account.status !== "INACTIVE",
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load other income records.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const displayedTotal = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    [records],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEdit(record: Income) {
    setEditingId(record.id);
    setForm({
      amount: String(record.amount ?? ""),
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : today(),
      category: record.category ?? "",
      paymentMethod: record.paymentMethod ?? "CASH",
      description: record.description ?? "",
      notes: record.notes ?? "",
      reference: record.reference ?? "",
      bankAccountId: record.bankAccountId ?? "",
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function changeField<K extends keyof IncomeForm>(
    key: K,
    value: IncomeForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.date) {
      setError("Choose the income date.");
      return;
    }

    if (!form.paymentMethod.trim()) {
      setError("Choose a payment method.");
      return;
    }

    if (form.description.length > 1000 || form.notes.length > 5000) {
      setError("Description or notes exceed the allowed length.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      amount,
      date: form.date,
      category: form.category.trim() || null,
      paymentMethod: form.paymentMethod,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      reference: form.reference.trim() || null,
      bankAccountId: form.bankAccountId || null,
    };

    try {
      if (editingId) {
        await api.updateOtherIncome(editingId, payload);
        setNotice("Income record updated successfully.");
      } else {
        await api.createOtherIncome(payload);
        setNotice("Income recorded successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the income record.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: Income) {
    const confirmed = window.confirm(
      `Delete this income record of ${formatINR(Number(record.amount))}?\n\nIf it is linked to a cash/bank account, the backend will reverse its recorded balance impact.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.deleteOtherIncome(record.id);
      setNotice("Income record deleted and its recorded balance impact reversed.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the income record.",
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Accounting / Income
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Other Income
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Record income other than regular sales and track its account impact.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Add Income
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 sm:p-7">
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Income in loaded records</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatINR(displayedTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sum of the records currently displayed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Matching records</p>
            <p className="mt-2 text-2xl font-bold">{serverCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              Backend total: {formatINR(serverTotal)}
            </p>
          </div>
        </div>

        {error && !showForm && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadData()}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Income records</h2>
            <p className="mt-1 text-xs text-slate-500">
              Search uses the backend; up to 100 records are requested per load.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category, description..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-72"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category / Description</th>
                <th className="px-4 py-3 font-semibold">Payment method</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                    {dateOnly(record.date)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">
                      {record.category || "Uncategorized"}
                    </p>
                    <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                      {record.description || record.reference || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {record.paymentMethod || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {record.bankAccount?.name || "Not linked"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-emerald-700">
                    {formatINR(Number(record.amount))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      className="mr-3 font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(record)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && !error && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="font-medium text-slate-700">
                      No other income records found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add a record to see it here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {loading && (
            <div className="border-t border-slate-100 px-4 py-10 text-center text-sm text-slate-500">
              Loading income records...
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">
                  {editingId ? "Edit income" : "Add other income"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Save the record to your BillMint account.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg px-2 py-1 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => changeField("amount", event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Income date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => changeField("date", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.category}
                  onChange={(event) => changeField("category", event.target.value)}
                  placeholder="e.g. Interest, Commission"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Payment method *
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(event) => changeField("paymentMethod", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Cash / bank account
                </label>
                <select
                  value={form.bankAccountId}
                  onChange={(event) => changeField("bankAccountId", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Do not link to an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}{account.isCash ? " (Cash)" : " (Bank)"}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Select an account if this income should update its balance.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <input
                  type="text"
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) => changeField("description", event.target.value)}
                  placeholder="What was this income received for?"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Reference</label>
                <input
                  type="text"
                  maxLength={200}
                  value={form.reference}
                  onChange={(event) => changeField("reference", event.target.value)}
                  placeholder="Receipt or transaction reference"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Notes</label>
                <input
                  type="text"
                  maxLength={5000}
                  value={form.notes}
                  onChange={(event) => changeField("notes", event.target.value)}
                  placeholder="Optional internal note"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save changes" : "Save income"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
