"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Expense {
  id: string;
  date: string;
  expenseNo: string;
  category: string;
  description: string;
  paymentType: string;
  amount: number;
}

const initialExpenses: Expense[] = [
  {
    id: "1",
    date: "19/09/2026",
    expenseNo: "EXP-001",
    category: "Rent",
    description: "Shop Rent - September",
    paymentType: "BANK",
    amount: 15000,
  },
  {
    id: "2",
    date: "18/09/2026",
    expenseNo: "EXP-002",
    category: "Electricity",
    description: "Electricity Bill",
    paymentType: "UPI",
    amount: 4200,
  },
  {
    id: "3",
    date: "17/09/2026",
    expenseNo: "EXP-003",
    category: "Salary",
    description: "Staff Salary - September",
    paymentType: "BANK",
    amount: 45000,
  },
  {
    id: "4",
    date: "16/09/2026",
    expenseNo: "EXP-004",
    category: "Transport",
    description: "Delivery charges",
    paymentType: "CASH",
    amount: 1800,
  },
  {
    id: "5",
    date: "15/09/2026",
    expenseNo: "EXP-005",
    category: "Office Supplies",
    description: "Stationery & packing material",
    paymentType: "CASH",
    amount: 2500,
  },
];

const categories = [
  "Rent",
  "Electricity",
  "Salary",
  "Transport",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Internet",
  "Miscellaneous",
];

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("Rent");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState("CASH");
  const [expenseDate] = useState(new Date().toLocaleDateString("en-GB"));

  const filtered = expenses.filter((exp) => {
    const matchesSearch =
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      exp.expenseNo.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleSave = () => {
    if (!description.trim()) {
      alert("Please enter description");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      date: expenseDate,
      expenseNo: `EXP-${String(expenses.length + 1).padStart(3, "0")}`,
      category,
      description,
      paymentType,
      amount,
    };

    setExpenses([newExpense, ...expenses]);
    alert("Expense recorded successfully!");
    setShowForm(false);

    // Reset
    setCategory("Rent");
    setDescription("");
    setAmount(0);
    setPaymentType("CASH");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Expenses</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          + Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="text-sm text-gray-500">Total Expenses</div>
        <div className="text-2xl font-bold text-red-500">
          ₹ {totalExpense.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterCategory("All")}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
              filterCategory === "All"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
                filterCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Expense No</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Payment Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((exp) => (
              <tr key={exp.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{exp.date}</td>
                <td className="py-3 font-medium">{exp.expenseNo}</td>
                <td className="py-3">
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {exp.category}
                  </span>
                </td>
                <td className="py-3">{exp.description}</td>
                <td className="py-3">{exp.paymentType}</td>
                <td className="py-3 text-right font-medium text-red-500">
                  ₹ {exp.amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No expenses found
          </div>
        )}
      </div>

      {/* ========== ADD EXPENSE MODAL ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-600">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this expense for?"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option>CASH</option>
                    <option>BANK</option>
                    <option>UPI</option>
                    <option>CARD</option>
                    <option>OTHERS</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Date: <span className="font-medium">{expenseDate}</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowForm(false)}
                className="border px-5 py-2 rounded-md text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}