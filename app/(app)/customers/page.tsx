"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Party {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: "Customer" | "Supplier" | "Both";
  receivable: number;
  payable: number;
  address?: string;
  gstin?: string;
}

const initialParties: Party[] = [
  {
    id: "1",
    name: "LIVANDER",
    phone: "9994164499",
    type: "Customer",
    receivable: 0,
    payable: 0,
    address: "RASULKARN",
  },
  {
    id: "2",
    name: "JYOTI RANJAN BISWAL",
    phone: "9876543210",
    type: "Customer",
    receivable: 0,
    payable: 0,
  },
  {
    id: "3",
    name: "RAJESH PANDA",
    phone: "9123456780",
    type: "Customer",
    receivable: 0,
    payable: 0,
  },
  {
    id: "4",
    name: "MIHIR RANJAN TRIPATHY",
    phone: "9988776655",
    type: "Customer",
    receivable: 7000,
    payable: 0,
  },
  {
    id: "5",
    name: "ANIL KUMAR DAS",
    phone: "9876501234",
    type: "Customer",
    receivable: 0,
    payable: 0,
  },
  {
    id: "6",
    name: "RAJAT KUMAR SAHOO",
    phone: "9090909090",
    type: "Customer",
    receivable: 0,
    payable: 0,
  },
  {
    id: "7",
    name: "TECH SUPPLIERS PVT LTD",
    phone: "0674-1234567",
    type: "Supplier",
    receivable: 0,
    payable: 125000,
    gstin: "21AAAAA0000A1Z5",
  },
  {
    id: "8",
    name: "MOBILE WORLD DISTRIBUTORS",
    phone: "9937001122",
    type: "Supplier",
    receivable: 0,
    payable: 87500,
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Customer" | "Supplier">("All");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.name.toLowerCase().includes(search.toLowerCase()) ||
      party.phone.includes(search);
    const matchesType =
      filterType === "All" || party.type === filterType || party.type === "Both";
    return matchesSearch && matchesType;
  });

  const totalReceivable = parties.reduce((sum, p) => sum + p.receivable, 0);
  const totalPayable = parties.reduce((sum, p) => sum + p.payable, 0);

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Left Parties List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Customers</h1>
            <button
              onClick={() => router.push("/customers/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded"
            >
              + Add Customer 
            </button>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search parties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
          </div>

          <div className="flex gap-1 text-xs">
            {(["All", "Customer", "Supplier"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 border-b bg-gray-50 text-sm grid grid-cols-2 gap-2">
          <div>
            <div className="text-gray-500 text-xs">To Receive</div>
            <div className="font-semibold text-green-600">
              ₹ {totalReceivable.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">To Pay</div>
            <div className="font-semibold text-red-500">
              ₹ {totalPayable.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Parties List */}
        <div className="flex-1 overflow-y-auto">
          {filteredParties.map((party) => (
            <div
              key={party.id}
              onClick={() => setSelectedParty(party)}
              className={`px-4 py-3 border-b cursor-pointer hover:bg-blue-50 ${
                selectedParty?.id === party.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{party.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{party.phone}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    party.type === "Customer"
                      ? "bg-green-100 text-green-700"
                      : party.type === "Supplier"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {party.type}
                </span>
              </div>

              {(party.receivable > 0 || party.payable > 0) && (
                <div className="mt-1.5 text-xs">
                  {party.receivable > 0 && (
                    <span className="text-green-600 mr-3">
                      Rec: ₹{party.receivable.toLocaleString("en-IN")}
                    </span>
                  )}
                  {party.payable > 0 && (
                    <span className="text-red-500">
                      Pay: ₹{party.payable.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredParties.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No parties found
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 overflow-auto">
        {selectedParty ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{selectedParty.name}</h2>
                <div className="text-sm text-gray-500 mt-1">
                  {selectedParty.type} • {selectedParty.phone}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/parties/${selectedParty.id}/edit`)}
                  className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => router.push(`/sales/new?party=${selectedParty.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm"
                >
                  + Create Sale
                </button>
              </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">To Receive</div>
                <div className="text-2xl font-bold text-green-700">
                  ₹ {selectedParty.receivable.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="text-sm text-red-700 mb-1">To Pay</div>
                <div className="text-2xl font-bold text-red-700">
                  ₹ {selectedParty.payable.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium">{selectedParty.phone}</div>
                </div>
                {selectedParty.email && (
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium">{selectedParty.email}</div>
                  </div>
                )}
              </div>

              {selectedParty.address && (
                <div>
                  <div className="text-gray-500">Address</div>
                  <div className="font-medium">{selectedParty.address}</div>
                </div>
              )}

              {selectedParty.gstin && (
                <div>
                  <div className="text-gray-500">GSTIN</div>
                  <div className="font-medium">{selectedParty.gstin}</div>
                </div>
              )}
            </div>

            {/* Recent Transactions Placeholder */}
            <div className="mt-10">
              <h3 className="font-medium mb-3">Recent Transactions</h3>
              <div className="border rounded-lg p-8 text-center text-gray-400 text-sm">
                No transactions yet
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">👥</div>
              <p>Select a party to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}