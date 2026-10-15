"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, formatINR } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface BankAccount {
  id: string;
  name: string;
  isCash?: boolean;
  currentBalance?: number | string;
  status?: string;
}

interface PaymentIn {
  id: string;
  date: string;
  amount: number | string;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  customer?: Customer | null;
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function numericAmount(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PaymentInPage() {
  const [payments, setPayments] = useState<PaymentIn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.paymentsIn({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
      });

      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment receipts.",
      );
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadFormOptions = useCallback(async () => {
    try {
      const [customerResponse, accountResponse] = await Promise.all([
        api.customers({
          page: 1,
          limit: 100,
          status: "ACTIVE",
        }),
        api.cashBankAccounts({
          page: 1,
          limit: 100,
          status: "ACTIVE",
        }),
      ]);

      const customerRecords = Array.isArray(customerResponse.data)
        ? (customerResponse.data as Customer[])
        : [];

      const accountRecords = Array.isArray(accountResponse.data)
        ? (accountResponse.data as BankAccount[])
        : [];

      setCustomers(customerRecords);
      setAccounts(accountRecords);

      setCustomerId((current) =>
        current || customerRecords[0]?.id || "",
      );

      setBankAccountId((current) =>
        current || accountRecords[0]?.id || "",
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to load customers and accounts.",
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

  const totalReceived = payments.reduce(
    (sum, payment) => sum + numericAmount(payment.amount),
    0,
  );

  const resetForm = () => {
    setCustomerId(customers[0]?.id || "");
    setAmount("");
    setPaymentType("CASH");
    setBankAccountId(accounts[0]?.id || "");
    setReferenceNo("");
    setDescription("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
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

    if (!customerId) {
      setFormError("Please select a customer.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter an amount greater than zero.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setFormError("Amount can have at most two decimal places.");
      return;
    }

    if (!bankAccountId) {
      setFormError(
        "Please select an active cash or bank account before recording the receipt.",
      );
      return;
    }

    if (!receiptDate) {
      setFormError("Please select the receipt date.");
      return;
    }

    setSaving(true);

    try {
      await api.createPaymentIn({
        customerId,
        amount: parsedAmount,
        date: new Date(`${receiptDate}T12:00:00`).toISOString(),
        paymentMethod: paymentType,
        bankAccountId,
        reference: referenceNo.trim() || undefined,
        notes: description.trim() || undefined,
      });

      setShowForm(false);
      resetForm();

      await loadPayments();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to record the payment. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Payment In
        </h1>

        <button
          type="button"
          onClick={openForm}
          className="rounded-md bg-green-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-600"
        >
          + Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-500">
          Total Received
        </div>
        <div className="text-2xl font-bold text-green-600">
          {formatINR(totalReceived)}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Total of the receipts currently loaded
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-end border-b px-6 py-3">
        <input
          type="search"
          placeholder="Search payments..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Search payments"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
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
          <div className="py-16 text-center text-sm text-gray-500">
            Loading payment receipts...
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Receipt / Reference</th>
                  <th className="py-2 pr-3">Party Name</th>
                  <th className="py-2 pr-3">Payment Type</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 text-right">Amount</th>
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
                      {payment.customer?.name || "Unassigned customer"}
                    </td>

                    <td className="py-3 pr-3">
                      {payment.paymentMethod}
                    </td>

                    <td className="py-3 pr-3 text-gray-500">
                      {[
                        payment.notes,
                        payment.bankAccount?.name,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>

                    <td className="py-3 text-right font-medium text-green-600">
                      {formatINR(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payments.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                {search.trim()
                  ? "No payment records match your search."
                  : "No payment receipts found. Record your first payment to get started."}
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-in-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2
                id="payment-in-title"
                className="text-lg font-semibold"
              >
                Record Payment In
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
            </div>

            <div className="space-y-4 p-6">
              {formError && (
                <div
                  role="alert"
                  className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="payment-customer"
                  className="text-sm text-gray-600"
                >
                  Customer <span className="text-red-500">*</span>
                </label>

                <select
                  id="payment-customer"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  disabled={saving || customers.length === 0}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">
                    {customers.length
                      ? "Select customer"
                      : "No active customers found"}
                  </option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` — ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment-amount"
                  className="text-sm text-gray-600"
                >
                  Amount <span className="text-red-500">*</span>
                </label>

                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="payment-method"
                    className="text-sm text-gray-600"
                  >
                    Payment Type
                  </label>

                  <select
                    id="payment-method"
                    value={paymentType}
                    onChange={(event) => setPaymentType(event.target.value)}
                    disabled={saving}
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="BANK">BANK</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="payment-account"
                    className="text-sm text-gray-600"
                  >
                    Deposit To <span className="text-red-500">*</span>
                  </label>

                  <select
                    id="payment-account"
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                    disabled={saving || accounts.length === 0}
                    className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">
                      {accounts.length
                        ? "Select cash/bank account"
                        : "No active accounts found"}
                    </option>

                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                        {account.isCash ? " (Cash)" : ""}
                      </option>
                    ))}
                  </select>

                  {accounts.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Create an active account in Cash & Bank before recording a receipt.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-reference"
                  className="text-sm text-gray-600"
                >
                  Reference No.
                </label>

                <input
                  id="payment-reference"
                  type="text"
                  maxLength={200}
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-notes"
                  className="text-sm text-gray-600"
                >
                  Description / Notes
                </label>

                <textarea
                  id="payment-notes"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  maxLength={5000}
                  placeholder="Invoice reference or additional notes"
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-date"
                  className="text-sm text-gray-600"
                >
                  Receipt Date
                </label>

                <input
                  id="payment-date"
                  type="date"
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 rounded-b-xl border-t bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-md border px-5 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || customers.length === 0 || accounts.length === 0}
                className="rounded-md bg-green-500 px-6 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}