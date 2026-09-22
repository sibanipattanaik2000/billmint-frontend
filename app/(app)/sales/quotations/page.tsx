"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Quotation {
  id: string;
  date: string;
  quotationNo: string;
  partyName: string;
  amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Converted";
  validTill: string;
}

const initialQuotations: Quotation[] = [
  {
    id: "1",
    date: "19/09/2026",
    quotationNo: "QT-001",
    partyName: "LIVANDER",
    amount: 28500,
    status: "Sent",
    validTill: "26/09/2026",
  },
  {
    id: "2",
    date: "18/09/2026",
    quotationNo: "QT-002",
    partyName: "JYOTI RANJAN BISWAL",
    amount: 42000,
    status: "Accepted",
    validTill: "25/09/2026",
  },
  {
    id: "3",
    date: "17/09/2026",
    quotationNo: "QT-003",
    partyName: "RAJESH PANDA",
    amount: 12500,
    status: "Draft",
    validTill: "24/09/2026",
  },
  {
    id: "4",
    date: "15/09/2026",
    quotationNo: "QT-004",
    partyName: "ANIL KUMAR DAS",
    amount: 67500,
    status: "Converted",
    validTill: "22/09/2026",
  },
  {
    id: "5",
    date: "14/09/2026",
    quotationNo: "QT-005",
    partyName: "MIHIR RANJAN TRIPATHY",
    amount: 9800,
    status: "Rejected",
    validTill: "21/09/2026",
  },
];

export default function EstimatePage() {
  const router = useRouter();
  const [quotations] = useState<Quotation[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.partyName.toLowerCase().includes(search.toLowerCase()) ||
      q.quotationNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "All" || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = quotations.reduce((sum, q) => sum + q.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700";
      case "Sent":
        return "bg-blue-100 text-blue-700";
      case "Accepted":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      case "Converted":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">
            Estimate / Quotation
          </h1>
        </div>
        <button
          onClick={() => router.push("/estimate/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          + Create Quotation
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-gray-50 flex gap-10">
        <div>
          <div className="text-sm text-gray-500">Total Quotations</div>
          <div className="text-2xl font-bold">{quotations.length}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold">
            ₹ {totalAmount.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="px-6 py-3 border-b flex items-center justify-between">
        <div className="flex gap-2">
          {["All", "Draft", "Sent", "Accepted", "Rejected", "Converted"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded text-sm ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        <input
          type="text"
          placeholder="Search quotations..."
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
              <th className="py-2 pr-3">Quotation No</th>
              <th className="py-2 pr-3">Party Name</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3">Valid Till</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{q.date}</td>
                <td className="py-3 font-medium">{q.quotationNo}</td>
                <td className="py-3">{q.partyName}</td>
                <td className="py-3 text-right font-medium">
                  ₹ {q.amount.toLocaleString("en-IN")}
                </td>
                <td className="py-3">{q.validTill}</td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      q.status
                    )}`}
                  >
                    {q.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/estimate/${q.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </button>
                    <span className="text-gray-300">|</span>
                    {q.status === "Accepted" && (
                      <button
                        onClick={() =>
                          router.push(`/sales/new?quotation=${q.id}`)
                        }
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Convert to Sale
                      </button>
                    )}
                    {(q.status === "Draft" || q.status === "Sent") && (
                      <button className="text-gray-600 hover:text-gray-900 text-sm">
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No quotations found
          </div>
        )}
      </div>
    </div>
  );
}