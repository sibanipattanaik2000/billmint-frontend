"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Item {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  stockValue: number;
  itemCode?: string;
}

interface Transaction {
  type: string;
  invoice: string;
  name: string;
  date: string;
  quantity: number;
  price: number;
  status: string;
}

// Mock database (in real project replace with API / Prisma / Supabase)
const mockItems: Record<string, Item> = {
  "1": {
    id: "1",
    name: "ONEPLUS 3",
    quantity: 1,
    salePrice: 8000,
    purchasePrice: 0,
    stockValue: 0,
    itemCode: "OP3",
  },
  "14": {
    id: "14",
    name: "REALME C 31",
    quantity: 1,
    salePrice: 7500,
    purchasePrice: 0,
    stockValue: 0,
    itemCode: "RC31",
  },
};

const mockTransactions: Record<string, Transaction[]> = {
  "1": [
    {
      type: "Opening Stock",
      invoice: "",
      name: "Opening Stock",
      date: "12/04/2021",
      quantity: 1,
      price: 0,
      status: "",
    },
  ],
  "14": [
    {
      type: "Sale",
      invoice: "7516",
      name: "PRABIN KUMAR SATPATHY",
      date: "13/05/2023",
      quantity: 1,
      price: 7500,
      status: "Paid",
    },
    {
      type: "Opening Stock",
      invoice: "",
      name: "Opening Stock",
      date: "13/05/2023",
      quantity: 1,
      price: 0,
      status: "",
    },
  ],
};

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const foundItem = mockItems[id];
    const foundTxns = mockTransactions[id] || [];

    if (foundItem) {
      setItem(foundItem);
      setTransactions(foundTxns);
    } else {
      // fallback for unknown id
      setItem({
        id,
        name: "Unknown Item",
        quantity: 0,
        salePrice: 0,
        purchasePrice: 0,
        stockValue: 0,
      });
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <button
            onClick={() => router.push("/items")}
            className="text-blue-600 hover:underline"
          >
            ← Back to Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/items")}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{item.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/items/${item.id}/edit`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium"
          >
            ADJUST ITEM
          </button>
          <Link
            href={`/items/${item.id}/edit`}
            className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded text-sm"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Price & Stock Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">SALE PRICE</div>
            <div className="text-lg font-semibold">
              ₹ {item.salePrice.toLocaleString("en-IN")}.00
              <span className="text-sm font-normal text-gray-500 ml-1">(excl)</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">PURCHASE PRICE</div>
            <div className="text-lg font-semibold">
              ₹ {item.purchasePrice.toLocaleString("en-IN")}.00
              <span className="text-sm font-normal text-gray-500 ml-1">(excl)</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">STOCK QUANTITY</div>
            <div className="text-lg font-semibold">{item.quantity}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">STOCK VALUE</div>
            <div className="text-lg font-semibold">
              ₹ {item.stockValue.toLocaleString("en-IN")}.00
            </div>
          </div>
        </div>

        {/* Item Code */}
        {item.itemCode && (
          <div className="mb-6">
            <span className="text-sm text-gray-500">Item Code: </span>
            <span className="font-medium">{item.itemCode}</span>
          </div>
        )}

        {/* Transactions Table */}
        <div>
          <h2 className="font-medium text-gray-700 mb-3">TRANSACTIONS</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">INVOICE/RE...</th>
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">QUANTITY</th>
                  <th className="py-3 px-4">PRICE / UNIT</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.map((txn, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{txn.type}</td>
                      <td className="py-3 px-4">{txn.invoice || "—"}</td>
                      <td className="py-3 px-4">{txn.name}</td>
                      <td className="py-3 px-4">{txn.date}</td>
                      <td className="py-3 px-4">{txn.quantity}</td>
                      <td className="py-3 px-4">
                        {txn.price > 0
                          ? `₹ ${txn.price.toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {txn.status === "Paid" ? (
                          <span className="text-green-600 font-medium">Paid</span>
                        ) : (
                          txn.status || "—"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No transactions to show
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}