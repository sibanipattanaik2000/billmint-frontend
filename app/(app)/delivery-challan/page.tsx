"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeliveryChallan {
  id: string;
  date: string;
  challanNo: string;
  partyName: string;
  itemsCount: number;
  amount: number;
  status: "Delivered" | "Pending" | "In Transit";
  vehicleNo?: string;
}

const initialChallans: DeliveryChallan[] = [
  {
    id: "1",
    date: "19/09/2026, 10:30 AM",
    challanNo: "DC-001",
    partyName: "LIVANDER",
    itemsCount: 3,
    amount: 23000,
    status: "Delivered",
    vehicleNo: "OD-02-AB-1234",
  },
  {
    id: "2",
    date: "18/09/2026, 04:15 PM",
    challanNo: "DC-002",
    partyName: "JYOTI RANJAN BISWAL",
    itemsCount: 2,
    amount: 33500,
    status: "Delivered",
    vehicleNo: "OD-05-XY-5678",
  },
  {
    id: "3",
    date: "17/09/2026, 11:00 AM",
    challanNo: "DC-003",
    partyName: "RAJESH PANDA",
    itemsCount: 1,
    amount: 6500,
    status: "In Transit",
    vehicleNo: "OD-01-CD-9012",
  },
  {
    id: "4",
    date: "16/09/2026, 02:45 PM",
    challanNo: "DC-004",
    partyName: "ANIL KUMAR DAS",
    itemsCount: 4,
    amount: 51500,
    status: "Pending",
  },
];

export default function DeliveryChallanPage() {
  const router = useRouter();
  const [challans] = useState<DeliveryChallan[]>(initialChallans);
  const [search, setSearch] = useState("");

  // New Challan form
  const [showForm, setShowForm] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [itemsCount, setItemsCount] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [challanDate] = useState(new Date().toLocaleDateString("en-GB"));

  const filtered = challans.filter(
    (c) =>
      c.partyName.toLowerCase().includes(search.toLowerCase()) ||
      c.challanNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalChallans = challans.length;
  const totalAmount = challans.reduce((sum, c) => sum + c.amount, 0);

  const handleSave = () => {
    if (!partyName.trim()) {
      alert("Please enter party name");
      return;
    }

    const payload = {
      partyName,
      vehicleNo,
      itemsCount,
      amount,
      notes,
      challanDate,
    };

    console.log("Creating Delivery Challan:", payload);
    alert("Delivery Challan created successfully!");
    setShowForm(false);

    // Reset form
    setPartyName("");
    setVehicleNo("");
    setItemsCount(1);
    setAmount(0);
    setNotes("");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Delivery Challan</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          + Create Challan
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-gray-50 flex gap-10">
        <div>
          <div className="text-sm text-gray-500">Total Challans</div>
          <div className="text-2xl font-bold">{totalChallans}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold">
            ₹ {totalAmount.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b flex justify-end">
        <input
          type="text"
          placeholder="Search delivery challans..."
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
              <th className="py-2 pr-3">Challan No</th>
              <th className="py-2 pr-3">Party Name</th>
              <th className="py-2 pr-3">Items</th>
              <th className="py-2 pr-3">Vehicle No</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((challan) => (
              <tr key={challan.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{challan.date}</td>
                <td className="py-3 font-medium">{challan.challanNo}</td>
                <td className="py-3">{challan.partyName}</td>
                <td className="py-3">{challan.itemsCount}</td>
                <td className="py-3 text-gray-500">
                  {challan.vehicleNo || "—"}
                </td>
                <td className="py-3 text-right font-medium">
                  ₹ {challan.amount.toLocaleString("en-IN")}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      challan.status === "Delivered"
                        ? "bg-green-100 text-green-700"
                        : challan.status === "In Transit"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {challan.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No delivery challans found
          </div>
        )}
      </div>

      {/* ========== CREATE CHALLAN MODAL ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Create Delivery Challan</h2>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">No. of Items</label>
                  <input
                    type="number"
                    min="1"
                    value={itemsCount}
                    onChange={(e) => setItemsCount(Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Amount</label>
                  <input
                    type="number"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. OD-02-AB-1234"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any delivery instructions..."
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="text-sm text-gray-500">
                Challan Date: <span className="font-medium">{challanDate}</span>
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Create Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}