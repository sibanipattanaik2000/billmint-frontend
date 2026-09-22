"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SaleReturn {
  id: string;
  date: string;
  creditNoteNo: string;
  partyName: string;
  originalInvoice: string;
  amount: number;
  reason: string;
  status: "Processed" | "Pending";
}

const initialReturns: SaleReturn[] = [
  {
    id: "1",
    date: "18/09/2026, 03:20 PM",
    creditNoteNo: "CN-001",
    partyName: "LIVANDER",
    originalInvoice: "18610",
    amount: 4500,
    reason: "Defective product",
    status: "Processed",
  },
  {
    id: "2",
    date: "16/09/2026, 11:45 AM",
    creditNoteNo: "CN-002",
    partyName: "RAJESH PANDA",
    originalInvoice: "18598",
    amount: 1200,
    reason: "Wrong item delivered",
    status: "Processed",
  },
  {
    id: "3",
    date: "14/09/2026, 05:10 PM",
    creditNoteNo: "CN-003",
    partyName: "JYOTI RANJAN BISWAL",
    originalInvoice: "18585",
    amount: 8500,
    reason: "Customer cancelled",
    status: "Pending",
  },
];

export default function SaleReturnPage() {
  const router = useRouter();
  const [returns] = useState<SaleReturn[]>(initialReturns);
  const [search, setSearch] = useState("");

  // New Credit Note form
  const [showForm, setShowForm] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [noteDate] = useState(new Date().toLocaleDateString("en-GB"));

  const filtered = returns.filter(
    (r) =>
      r.partyName.toLowerCase().includes(search.toLowerCase()) ||
      r.creditNoteNo.toLowerCase().includes(search.toLowerCase()) ||
      r.originalInvoice.includes(search)
  );

  const totalReturnAmount = returns.reduce((sum, r) => sum + r.amount, 0);

  const handleSave = () => {
    if (!partyName.trim()) {
      alert("Please enter party name");
      return;
    }
    if (!originalInvoice.trim()) {
      alert("Please enter original invoice number");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const payload = {
      partyName,
      originalInvoice,
      amount,
      reason,
      noteDate,
    };

    console.log("Creating Credit Note:", payload);
    alert("Credit Note created successfully!");
    setShowForm(false);

    // Reset
    setPartyName("");
    setOriginalInvoice("");
    setAmount(0);
    setReason("");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">
            Sale Return / Credit Note
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          + Create Credit Note
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-gray-50 flex gap-10">
        <div>
          <div className="text-sm text-gray-500">Total Credit Notes</div>
          <div className="text-2xl font-bold">{returns.length}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Return Amount</div>
          <div className="text-2xl font-bold text-red-500">
            ₹ {totalReturnAmount.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b flex justify-end">
        <input
          type="text"
          placeholder="Search credit notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Credit Note No</th>
              <th className="py-2 pr-3">Party Name</th>
              <th className="py-2 pr-3">Original Invoice</th>
              <th className="py-2 pr-3">Reason</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{item.date}</td>
                <td className="py-3 font-medium">{item.creditNoteNo}</td>
                <td className="py-3">{item.partyName}</td>
                <td className="py-3 text-blue-600">#{item.originalInvoice}</td>
                <td className="py-3 text-gray-500">{item.reason}</td>
                <td className="py-3 text-right font-medium text-red-500">
                  ₹ {item.amount.toLocaleString("en-IN")}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.status === "Processed"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No credit notes found
          </div>
        )}
      </div>

      {/* ========== CREATE CREDIT NOTE MODAL ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Create Credit Note</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-600">
                  Party Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Original Invoice No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={originalInvoice}
                  onChange={(e) => setOriginalInvoice(e.target.value)}
                  placeholder="e.g. 18616"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Return Amount <span className="text-red-500">*</span>
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
                <label className="text-sm text-gray-600">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select reason</option>
                  <option value="Defective product">Defective product</option>
                  <option value="Wrong item delivered">Wrong item delivered</option>
                  <option value="Customer cancelled">Customer cancelled</option>
                  <option value="Damaged in transit">Damaged in transit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="text-sm text-gray-500">
                Credit Note Date: <span className="font-medium">{noteDate}</span>
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
                Create Credit Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}