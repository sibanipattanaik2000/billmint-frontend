"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  type: "Cash In" | "Cash Out" | "Bank In" | "Bank Out" | "Transfer";
  description: string;
  amount: number;
  paymentMode: "Cash" | "Bank";
  balance: number;
}

const initialTransactions: Transaction[] = [
  {
    id: "1",
    date: "19/09/2026, 09:15 PM",
    type: "Cash In",
    description: "Sale - LIVANDER (Invoice #18616)",
    amount: 23000,
    paymentMode: "Cash",
    balance: 85400,
  },
  {
    id: "2",
    date: "19/09/2026, 08:50 PM",
    type: "Bank In",
    description: "Sale - JYOTI RANJAN BISWAL (ICICI SCAN)",
    amount: 33500,
    paymentMode: "Bank",
    balance: 326700,
  },
  {
    id: "3",
    date: "19/09/2026, 07:40 PM",
    type: "Bank In",
    description: "Sale - RAJESH PANDA (ICICI SCAN)",
    amount: 6500,
    paymentMode: "Bank",
    balance: 293200,
  },
  {
    id: "4",
    date: "18/09/2026, 11:30 AM",
    type: "Bank Out",
    description: "Purchase - TECH SUPPLIERS PVT LTD",
    amount: 125000,
    paymentMode: "Bank",
    balance: 286700,
  },
  {
    id: "5",
    date: "17/09/2026, 04:20 PM",
    type: "Bank Out",
    description: "Purchase - MOBILE WORLD DISTRIBUTORS",
    amount: 62500,
    paymentMode: "Bank",
    balance: 411700,
  },
  {
    id: "6",
    date: "16/09/2026, 02:10 PM",
    type: "Cash Out",
    description: "Office Expenses",
    amount: 2500,
    paymentMode: "Cash",
    balance: 62400,
  },
  {
    id: "7",
    date: "15/09/2026, 10:00 AM",
    type: "Transfer",
    description: "Cash deposited to Bank",
    amount: 50000,
    paymentMode: "Cash",
    balance: 64900,
  },
];

export default function CashBankPage() {
  const router = useRouter();
  const [transactions] = useState<Transaction[]>(initialTransactions);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Cash" | "Bank">("All");
  const [activeTab, setActiveTab] = useState<"transactions" | "accounts">("transactions");

  const cashBalance = 85400;
  const bankBalance = 326700;
  const totalBalance = cashBalance + bankBalance;

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.description.toLowerCase().includes(search.toLowerCase()) ||
      txn.type.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" || txn.paymentMode === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cash & Bank</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/cash-bank/add?type=in")}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium"
          >
            + Cash/Bank In
          </button>
          <button
            onClick={() => router.push("/cash-bank/add?type=out")}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium"
          >
            + Cash/Bank Out
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b bg-gray-50">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Cash in Hand</div>
          <div className="text-2xl font-bold text-green-600">
            ₹ {cashBalance.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Bank Balance</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹ {bankBalance.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹ {totalBalance.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-6 border-b">
        <button
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
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "accounts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Bank Accounts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {activeTab === "transactions" && (
          <>
            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {(["All", "Cash", "Bank"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      filter === f
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Transactions Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left text-gray-500">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{txn.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            txn.type.includes("In")
                              ? "bg-green-100 text-green-700"
                              : txn.type === "Transfer"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{txn.description}</td>
                      <td className="py-3 px-4">{txn.paymentMode}</td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          txn.type.includes("In")
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {txn.type.includes("In") ? "+" : "-"} ₹
                        {txn.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ₹ {txn.balance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  No transactions found
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "accounts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Account */}
            <div className="border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                    💵
                  </div>
                  <div>
                    <div className="font-semibold">Cash in Hand</div>
                    <div className="text-sm text-gray-500">Petty Cash</div>
                  </div>
                </div>
                <button className="text-blue-600 text-sm hover:underline">
                  Adjust
                </button>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">
                ₹ {cashBalance.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-gray-500">Current Balance</div>
            </div>

            {/* Bank Account */}
            <div className="border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                    🏦
                  </div>
                  <div>
                    <div className="font-semibold">ICICI Bank</div>
                    <div className="text-sm text-gray-500">XXXX XXXX 4521</div>
                  </div>
                </div>
                <button className="text-blue-600 text-sm hover:underline">
                  Adjust
                </button>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                ₹ {bankBalance.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-gray-500">Current Balance</div>
            </div>

            {/* Add Bank Account */}
            <button className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition">
              <span className="text-3xl mb-2">+</span>
              <span className="text-sm font-medium">Add Bank Account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
