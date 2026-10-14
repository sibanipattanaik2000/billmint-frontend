
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, formatINR } from "@/lib/api";

interface CashBankAccount {
  id: string;
  name: string;
  accountNumber?: string | null;
  bankName?: string | null;
  branch?: string | null;
  currentBalance: number | string;
  openingBalance?: number | string;
  isCash: boolean;
  status: "ACTIVE" | "ARCHIVED";
}

interface CashBankTransaction {
  id: string;
  date: string;
  type: string;
  description: string | null;
  amount: number | string;
  balance: number | string;
  accountId: string;
  accountName: string;
  isCash: boolean;
  referenceType?: string | null;
  referenceId?: string | null;
}

type PaymentDirection = "in" | "out";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function amountOf(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function transactionLabel(type: string): string {
  const labels: Record<string, string> = {
    OPENING: "Opening Balance",
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
    RECEIPT: "Payment In",
    PAYMENT: "Payment Out",
    ADJUSTMENT: "Adjustment",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

function isIncoming(type: string): boolean {
  return [
    "OPENING",
    "DEPOSIT",
    "TRANSFER_IN",
    "RECEIPT",
  ].includes(type);
}

export default function CashBankPage() {
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [transactions, setTransactions] = useState<CashBankTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Cash" | "Bank">("All");
  const [activeTab, setActiveTab] = useState<"transactions" | "accounts">(
    "transactions",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [paymentDirection, setPaymentDirection] =
    useState<PaymentDirection | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountIsCash, setAccountIsCash] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const loadCashBank = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await api.cashBankAccounts({
        page: 1,
        limit: 100,
        status: "ACTIVE",
      });

      const loadedAccounts = response.data ?? [];
      setAccounts(loadedAccounts);

      const statementResults = await Promise.all(
        loadedAccounts.map(async (account: CashBankAccount) => {
          const result = await api.cashBankStatement(account.id, {
            page: 1,
            limit: 100,
          });

          return (result.data.statement.transactions ?? []).map((txn) => ({
            id: txn.id,
            date: txn.date,
            type: txn.type,
            description: txn.description,
            amount: txn.amount,
            balance: txn.balance,
            accountId: account.id,
            accountName: account.name,
            isCash: account.isCash,
            referenceType: txn.referenceType,
            referenceId: txn.referenceId,
          }));
        }),
      );

      setTransactions(
        statementResults
          .flat()
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cash and bank data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCashBank();
  }, [loadCashBank]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "ACTIVE"),
    [accounts],
  );

  const cashBalance = activeAccounts
    .filter((account) => account.isCash)
    .reduce((sum, account) => sum + amountOf(account.currentBalance), 0);

  const bankBalance = activeAccounts
    .filter((account) => !account.isCash)
    .reduce((sum, account) => sum + amountOf(account.currentBalance), 0);

  const totalBalance = cashBalance + bankBalance;

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions.filter((txn) => {
      const matchesSearch =
        !term ||
        [
          txn.description ?? "",
          txn.type,
          transactionLabel(txn.type),
          txn.accountName,
          txn.referenceId ?? "",
          txn.referenceType ?? "",
        ].some((value) => value.toLowerCase().includes(term));

      const matchesFilter =
        filter === "All" || (filter === "Cash" ? txn.isCash : !txn.isCash);

      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  function openPayment(direction: PaymentDirection) {
    setPaymentDirection(direction);
    setPaymentError("");
    setPaymentAmount("");
    setPaymentDate(today());
    setPaymentMethod("CASH");
    setPaymentAccountId(
      activeAccounts.find((account) => account.isCash)?.id ??
        activeAccounts[0]?.id ??
        "",
    );
    setPaymentReference("");
    setPaymentNotes("");
  }

  function closePayment() {
    if (paymentSaving) return;
    setPaymentDirection(null);
    setPaymentError("");
  }

  async function savePayment() {
    if (!paymentDirection) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter an amount greater than zero.");
      return;
    }

    if (Math.round(amount * 100) !== amount * 100) {
      setPaymentError("Amount cannot have more than two decimal places.");
      return;
    }

    if (!paymentDate) {
      setPaymentError("Select the payment date.");
      return;
    }

    if (!paymentAccountId) {
      setPaymentError("Create or select a cash/bank account first.");
      return;
    }

    setPaymentSaving(true);
    setPaymentError("");

    try {
      const payload = {
        amount,
        date: new Date(`${paymentDate}T12:00:00`).toISOString(),
        paymentMethod,
        bankAccountId: paymentAccountId,
        reference: paymentReference.trim() || null,
        notes: paymentNotes.trim() || null,
      };

      if (paymentDirection === "in") {
        await api.createPaymentIn(payload);
      } else {
        await api.createPaymentOut(payload);
      }

      setPaymentDirection(null);
      await loadCashBank(true);
    } catch (err) {
      setPaymentError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Unable to save payment. Please try again.",
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function saveAccount() {
    const name = accountName.trim();

    if (!name) {
      setAccountError("Enter an account name.");
      return;
    }

    const balance = Number(openingBalance);

    if (!Number.isFinite(balance) || balance < 0) {
      setAccountError("Opening balance must be zero or greater.");
      return;
    }

    if (Math.round(balance * 100) !== balance * 100) {
      setAccountError("Opening balance cannot have more than two decimals.");
      return;
    }

    if (!accountIsCash && ifsc.trim() &&
      !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim())) {
      setAccountError("Enter a valid IFSC code or leave it blank.");
      return;
    }

    setAccountSaving(true);
    setAccountError("");

    try {
      await api.createBankAccount({
        name,
        isCash: accountIsCash,
        openingBalance: balance,
        accountNumber: accountIsCash ? null : accountNumber.trim() || null,
        bankName: accountIsCash ? null : bankName.trim() || null,
        branch: accountIsCash ? null : branch.trim() || null,
        ifsc: accountIsCash ? null : ifsc.trim().toUpperCase() || null,
      });

      setShowAccountForm(false);
      setAccountName("");
      setAccountIsCash(false);
      setAccountNumber("");
      setBankName("");
      setBranch("");
      setIfsc("");
      setOpeningBalance("0");
      await loadCashBank(true);
    } catch (err) {
      setAccountError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Cash &amp; Bank</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage account balances and money movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openPayment("in")}
            disabled={loading || activeAccounts.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            + Cash/Bank In
          </button>
          <button
            type="button"
            onClick={() => openPayment("out")}
            disabled={loading || activeAccounts.length === 0}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            + Cash/Bank Out
          </button>
          <button
            type="button"
            onClick={() => void loadCashBank(true)}
            disabled={loading || refreshing}
            className="border px-3 py-2 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b bg-gray-50">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Cash in Hand</div>
          <div className="text-2xl font-bold text-green-600">
            {formatINR(cashBalance)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Bank Balance</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatINR(bankBalance)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatINR(totalBalance)}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 flex gap-6 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "transactions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Transactions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "accounts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Cash &amp; Bank Accounts ({activeAccounts.length})
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div>{error}</div>
            <button
              type="button"
              onClick={() => void loadCashBank()}
              className="mt-2 font-medium underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-500">
            Loading cash and bank data...
          </div>
        ) : activeTab === "transactions" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2">
                {(["All", "Cash", "Bank"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      filter === value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <input
                type="search"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="border rounded px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-gray-500">
                    <th className="py-3 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => {
                    const incoming = isIncoming(txn.type);
                    const amount = amountOf(txn.amount);

                    return (
                      <tr key={`${txn.accountId}-${txn.id}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 whitespace-nowrap">{formatDate(txn.date)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              incoming
                                ? "bg-green-100 text-green-700"
                                : txn.type === "ADJUSTMENT"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {transactionLabel(txn.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 min-w-48">
                          {txn.description || "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {txn.accountName}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          incoming ? "text-green-600" : "text-red-600"
                        }`}>
                          {incoming ? "+" : txn.type === "ADJUSTMENT" ? "" : "−"}{" "}
                          {formatINR(amount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {formatINR(txn.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  {search || filter !== "All"
                    ? "No transactions match your filters."
                    : "No transactions recorded yet."}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => {
                  setAccountError("");
                  setShowAccountForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                + Add Cash/Bank Account
              </button>
            </div>

            {activeAccounts.length === 0 ? (
              <div className="border border-dashed rounded-xl py-14 px-6 text-center">
                <div className="font-medium text-gray-800">No cash or bank accounts yet</div>
                <p className="text-sm text-gray-500 mt-2">
                  Add an account to record payments and track balances.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAccountForm(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Create your first account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="border rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        account.isCash ? "bg-green-100" : "bg-blue-100"
                      }`}>
                        {account.isCash ? "💵" : "🏦"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold break-words">{account.name}</div>
                        <div className="text-sm text-gray-500">
                          {account.isCash
                            ? "Cash account"
                            : [account.bankName, account.branch].filter(Boolean).join(" · ") || "Bank account"}
                        </div>
                        {!account.isCash && account.accountNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            Account ending {account.accountNumber.slice(-4)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${
                      account.isCash ? "text-green-600" : "text-blue-600"
                    }`}>
                      {formatINR(account.currentBalance)}
                    </div>
                    <div className="text-xs text-gray-500">Current balance</div>
                    <div className="flex gap-2 mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          openPayment("in");
                          setPaymentAccountId(account.id);
                        }}
                        className="flex-1 border border-green-200 text-green-700 hover:bg-green-50 rounded-md px-3 py-2 text-sm"
                      >
                        Money In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          openPayment("out");
                          setPaymentAccountId(account.id);
                        }}
                        className="flex-1 border border-red-200 text-red-700 hover:bg-red-50 rounded-md px-3 py-2 text-sm"
                      >
                        Money Out
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {paymentDirection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void savePayment();
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">
                  {paymentDirection === "in" ? "Record Payment In" : "Record Payment Out"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will create a payment record and update the selected account.
                </p>
              </div>
              <button type="button" onClick={closePayment} className="text-2xl text-gray-500" aria-label="Close">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {paymentError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Cash/Bank Account *</label>
                <select
                  required
                  value={paymentAccountId}
                  onChange={(event) => setPaymentAccountId(event.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select account</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {formatINR(account.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Payment Method *</label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Reference Number</label>
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  maxLength={200}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Optional transaction/reference number"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Description / Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder={paymentDirection === "in" ? "Reason for money received" : "Reason for payment"}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={closePayment} disabled={paymentSaving} className="border px-5 py-2 rounded-md text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSaving || activeAccounts.length === 0}
                className={`px-6 py-2 rounded-md text-sm font-medium text-white disabled:opacity-60 ${
                  paymentDirection === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {paymentSaving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAccountForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveAccount();
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Cash/Bank Account</h2>
              <button type="button" onClick={() => !accountSaving && setShowAccountForm(false)} className="text-2xl text-gray-500" aria-label="Close">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {accountError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {accountError}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Account Type *</label>
                <select
                  value={accountIsCash ? "cash" : "bank"}
                  onChange={(event) => setAccountIsCash(event.target.value === "cash")}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Cash Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Account Name *</label>
                <input
                  required
                  maxLength={150}
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder={accountIsCash ? "e.g. Cash in Hand" : "e.g. SBI Current Account"}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              {!accountIsCash && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                    <input value={bankName} onChange={(event) => setBankName(event.target.value)} maxLength={150} className="w-full border rounded-md px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                      <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} maxLength={100} className="w-full border rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">IFSC</label>
                      <input value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} maxLength={11} className="w-full border rounded-md px-3 py-2 uppercase" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Branch</label>
                    <input value={branch} onChange={(event) => setBranch(event.target.value)} maxLength={150} className="w-full border rounded-md px-3 py-2" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Opening Balance *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(event.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use the actual opening balance. This creates an opening-balance transaction.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button type="button" onClick={() => setShowAccountForm(false)} disabled={accountSaving} className="border px-5 py-2 rounded-md text-sm">
                Cancel
              </button>
              <button type="submit" disabled={accountSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-60">
                {accountSaving ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
