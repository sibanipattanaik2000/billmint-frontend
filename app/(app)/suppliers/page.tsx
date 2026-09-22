"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  payable: number;
  totalPurchase: number;
}

const initialSuppliers: Supplier[] = [
  {
    id: "1",
    name: "TECH SUPPLIERS PVT LTD",
    phone: "0674-1234567",
    email: "contact@techsuppliers.com",
    gstin: "21AAAAA0000A1Z5",
    address: "Industrial Area, Bhubaneswar",
    payable: 125000,
    totalPurchase: 410500,
  },
  {
    id: "2",
    name: "MOBILE WORLD DISTRIBUTORS",
    phone: "9937001122",
    email: "sales@mobileworld.in",
    gstin: "21BBBBB1111B1Z5",
    address: "Cuttack Road, Bhubaneswar",
    payable: 87500,
    totalPurchase: 243500,
  },
  {
    id: "3",
    name: "ODISHA ELECTRONICS",
    phone: "9876504321",
    address: "Saheed Nagar, Bhubaneswar",
    payable: 0,
    totalPurchase: 156000,
  },
  {
    id: "4",
    name: "SMART GADGETS WHOLESALE",
    phone: "9090901234",
    gstin: "21CCCCC2222C1Z5",
    payable: 32000,
    totalPurchase: 89000,
  },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    initialSuppliers[0]
  );

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  const totalPayable = suppliers.reduce((sum, s) => sum + s.payable, 0);
  const totalPurchase = suppliers.reduce((sum, s) => sum + s.totalPurchase, 0);

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Left Suppliers List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Suppliers</h1>
            <button
              onClick={() => router.push("/parties/new?type=Supplier")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded"
            >
              + Add Supplier
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 border-b bg-gray-50 text-sm grid grid-cols-2 gap-2">
          <div>
            <div className="text-gray-500 text-xs">Total Payable</div>
            <div className="font-semibold text-red-500">
              ₹ {totalPayable.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Total Purchase</div>
            <div className="font-semibold">
              ₹ {totalPurchase.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier)}
              className={`px-4 py-3 border-b cursor-pointer hover:bg-blue-50 ${
                selectedSupplier?.id === supplier.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="font-medium text-sm">{supplier.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{supplier.phone}</div>

              {supplier.payable > 0 && (
                <div className="mt-1.5 text-xs text-red-500 font-medium">
                  Pay: ₹ {supplier.payable.toLocaleString("en-IN")}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No suppliers found
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 overflow-auto">
        {selectedSupplier ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">{selectedSupplier.name}</h2>
                <div className="text-sm text-gray-500 mt-1">
                  Supplier • {selectedSupplier.phone}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    router.push(`/parties/${selectedSupplier.id}/edit`)
                  }
                  className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    router.push(
                      `/purchases/new?supplier=${selectedSupplier.id}`
                    )
                  }
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded text-sm"
                >
                  + Create Purchase
                </button>
              </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="text-sm text-red-700 mb-1">To Pay</div>
                <div className="text-2xl font-bold text-red-700">
                  ₹ {selectedSupplier.payable.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-1">Total Purchase</div>
                <div className="text-2xl font-bold text-blue-700">
                  ₹ {selectedSupplier.totalPurchase.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 text-sm mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="font-medium">{selectedSupplier.phone}</div>
                </div>
                {selectedSupplier.email && (
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium">{selectedSupplier.email}</div>
                  </div>
                )}
              </div>

              {selectedSupplier.gstin && (
                <div>
                  <div className="text-gray-500">GSTIN</div>
                  <div className="font-medium">{selectedSupplier.gstin}</div>
                </div>
              )}

              {selectedSupplier.address && (
                <div>
                  <div className="text-gray-500">Address</div>
                  <div className="font-medium">{selectedSupplier.address}</div>
                </div>
              )}
            </div>

            {/* Recent Purchases Placeholder */}
            <div>
              <h3 className="font-medium mb-3">Recent Purchases</h3>
              <div className="border rounded-lg p-8 text-center text-gray-400 text-sm">
                No recent purchases to show
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">🏭</div>
              <p>Select a supplier to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}