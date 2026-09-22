"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentIn {
  id: string;
  date: string;
  receiptNo: string;
  partyName: string;
  paymentType: string;
  amount: number;
  description: string;
}

const initialPayments: PaymentIn[] = [
  {
    id: "1",
    date: "19/09/2026, 09:20 PM",
    receiptNo: "RCPT-001",
    partyName: "LIVANDER",
    paymentType: "CASH",
    amount: 23000,
    description: "Against Invoice #18616",
  },
  {
    id: "2",
    date: "19/09/2026, 08:55 PM",
    receiptNo: "RCPT-002",
    partyName: "JYOTI RANJAN BISWAL",
    paymentType: "ICICI SCAN",
    amount: 33500,
    description: "Against Invoice #18615",
  },
  {
    id: "3",
    date: "18/09/2026, 03:40 PM",
    receiptNo: "RCPT-003",
    partyName: "RAJESH PANDA",
    paymentType: "UPI",
    amount: 6500,
    description: "Against Invoice #18614",
  },
  {
    id: "4",
    date: "17/09/2026, 11:15 AM",
    receiptNo: "RCPT-004",
    partyName: "ANIL KUMAR DAS",
    paymentType: "BANK",
    amount: 51500,
    description: "Against Invoice #18612",
  },
];

export default function PaymentInPage() {
  const router = useRouter();
  const [payments] = useState<PaymentIn[]>(initialPayments);
  const [search, setSearch] = useState("");

  // Form states for new payment
  const [showForm, setShowForm] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");
  const [receiptDate] = useState(new Date().toLocaleDateString("en-GB"));

  const filtered = payments.filter(
    (p) =>
      p.partyName.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleSave = () => {
    if (!partyName.trim()) {
      alert("Please enter party name");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const payload = {
      partyName,
      amount,
      paymentType,
      referenceNo,
      description,
      receiptDate,
    };

    console.log("Saving Payment In:", payload);
    alert("Payment In recorded successfully!");
    setShowForm(false);
    // Reset form
    setPartyName("");
    setAmount(0);
    setPaymentType("CASH");
    setReferenceNo("");
    setDescription("");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Payment In</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          + Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="text-sm text-gray-500">Total Received</div>
        <div className="text-2xl font-bold text-green-600">
          ₹ {totalReceived.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b flex justify-end">
        <input
          type="text"
          placeholder="Search payments..."
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
              <th className="py-2 pr-3">Receipt No</th>
              <th className="py-2 pr-3">Party Name</th>
              <th className="py-2 pr-3">Payment Type</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{payment.date}</td>
                <td className="py-3 font-medium">{payment.receiptNo}</td>
                <td className="py-3">{payment.partyName}</td>
                <td className="py-3">{payment.paymentType}</td>
                <td className="py-3 text-gray-500">{payment.description}</td>
                <td className="py-3 text-right font-medium text-green-600">
                  ₹ {payment.amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No payment records found
          </div>
        )}
      </div>

      {/* ========== RECORD PAYMENT MODAL ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Record Payment In</h2>
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
                  placeholder="Enter customer name"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
                    <option>ICICI SCAN</option>
                    <option>OTHERS</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Reference No.</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Against which invoice / notes"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="text-sm text-gray-500">
                Receipt Date: <span className="font-medium">{receiptDate}</span>
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
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}