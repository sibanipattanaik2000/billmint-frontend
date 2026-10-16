
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, formatINR } from "@/lib/api";

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
}

interface BankAccount {
  id: string;
  name: string;
  isCash?: boolean;
  status?: string;
}

interface PaymentOut {
  id: string;
  date: string;
  amount: number | string;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  supplier?: Supplier | null;
  bankAccount?: BankAccount | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function numericAmount(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PaymentOutPage() {
  const [payments, setPayments] = useState<PaymentOut[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [bankAccountId, setBankAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.paymentsOut({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
      });

      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load supplier payments.",
      );
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadFormOptions = useCallback(async () => {
    try {
      const [supplierResponse, accountResponse] = await Promise.all([
        api.suppliers({ page: 1, limit: 100, status: "ACTIVE" }),
        api.cashBankAccounts({ page: 1, limit: 100, status: "ACTIVE" }),
      ]);

      const supplierRecords = Array.isArray(supplierResponse.data)
        ? (supplierResponse.data as Supplier[])
        : [];

      const accountRecords = Array.isArray(accountResponse.data)
        ? (accountResponse.data as BankAccount[])
        : [];

      setSuppliers(supplierRecords);
      setAccounts(accountRecords);

      setSupplierId((current) => current || supplierRecords[0]?.id || "");
      setBankAccountId((current) => current || accountRecords[0]?.id || "");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers and cash/bank accounts.",
      );
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPayments();
    }, search.trim() ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [loadPayments, search]);

  useEffect(() => {
    void loadFormOptions();
  }, [loadFormOptions]);

  const totalPaid = payments.reduce(
    (sum, payment) => sum + numericAmount(payment.amount),
    0,
  );

  const resetForm = () => {
    setSupplierId(suppliers[0]?.id || "");
    setAmount("");
    setPaymentMethod("CASH");
    setBankAccountId(accounts[0]?.id || "");
    setReference("");
    setNotes("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setFormError("");
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
    void loadFormOptions();
  };

  const handleSave = async () => {
    setFormError("");

    const parsedAmount = Number(amount);

    if (!supplierId) {
      setFormError("Please select a supplier.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setFormError("Amount can have at most two decimal places.");
      return;
    }

    if (!paymentDate) {
      setFormError("Please select the payment date.");
      return;
    }

    if (
      paymentMethod !== "CASH" &&
      paymentMethod !== "BANK_TRANSFER" &&
      paymentMethod !== "UPI" &&
      paymentMethod !== "CHEQUE" &&
      paymentMethod !== "CARD" &&
      paymentMethod !== "OTHER"
    ) {
      setFormError("Please select a valid payment method.");
      return;
    }

    setSaving(true);

    try {
      await api.createPaymentOut({
        supplierId,
        amount: parsedAmount,
        date: new Date(`${paymentDate}T12:00:00`).toISOString(),
        paymentMethod,
        bankAccountId: bankAccountId || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });

      setShowForm(false);
      resetForm();
      await loadPayments();
    } catch (err) {
      setFormError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Unable to record the supplier payment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Payment Out</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record and review payments made to suppliers.
          </p>
        </div>

        <button
          type="button"
          onClick={openForm}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Record Payment
        </button>
      </header>

      <section className="border-b bg-gray-50 px-6 py-4">
        <p className="text-sm text-gray-500">Total Paid</p>
        <p className="mt-1 text-2xl font-bold text-blue-700">
          {formatINR(totalPaid)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Total of the supplier payments currently loaded.
        </p>
      </section>

      <div className="flex justify-end border-b px-6 py-3">
        <input
          type="search"
          placeholder="Search supplier payments..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Search supplier payments"
        />
      </div>

      <main className="flex-1 overflow-auto px-6 py-4">
        {error ? (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadPayments()}
              className="mt-3 rounded border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <p className="py-16 text-center text-sm text-gray-500">
            Loading supplier payments…
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-3 pr-3">Date</th>
                    <th className="py-3 pr-3">Reference</th>
                    <th className="py-3 pr-3">Supplier</th>
                    <th className="py-3 pr-3">Payment Method</th>
                    <th className="py-3 pr-3">Account / Notes</th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 pr-3">
                        {formatDate(payment.date)}
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {payment.reference || payment.id.slice(0, 8)}
                      </td>
                      <td className="py-3 pr-3">
                        {payment.supplier?.name || "Unassigned supplier"}
                      </td>
                      <td className="py-3 pr-3">{payment.paymentMethod}</td>
                      <td className="py-3 pr-3 text-gray-500">
                        {[payment.bankAccount?.name, payment.notes]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatINR(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {payments.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                {search.trim()
                  ? "No supplier payments match your search."
                  : "No supplier payments found."}
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-out-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b px-6 py-4">
              <h2 id="payment-out-title" className="text-lg font-semibold">
                Record Supplier Payment
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close payment form"
                className="text-2xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </header>

            <div className="space-y-4 p-6">
              {formError && (
                <p
                  role="alert"
                  className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {formError}
                </p>
              )}

              <label className="block text-sm font-medium text-gray-600">
                Supplier <span className="text-red-500">*</span>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={saving || suppliers.length === 0}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.phone ? ` — ${supplier.phone}` : ""}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-700">
                    No active suppliers found. Add or activate a supplier first.
                  </span>
                )}
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Amount <span className="text-red-500">*</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Payment Date <span className="text-red-500">*</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Payment Method <span className="text-red-500">*</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Cash / Bank Account
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="">No account selected</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  The backend may require an account for this transaction.
                </span>
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Reference Number
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={200}
                  placeholder="Transaction ID or cheque number"
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder="Optional payment details"
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !suppliers.length}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Payment"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
