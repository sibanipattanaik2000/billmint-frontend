"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Item {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  stockValue: number;
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

const initialItems: Item[] = [
  { id: "1", name: "ONEPLUS 3", quantity: 1, salePrice: 8000, purchasePrice: 0, stockValue: 0 },
  { id: "2", name: "OPPO", quantity: 0, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "3", name: "10 OR D USED", quantity: 0, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "4", name: "11 PRO 256", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "5", name: "13 MINI 256GB", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "6", name: "2000 FOR REALME XT", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "7", name: "20W ADAPTER", quantity: 12, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "8", name: "20W ADAPTER", quantity: 111, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "9", name: "65 PLUS 128", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "10", name: "ACER ASPIRE3 3 A315-51", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "11", name: "ACER LAPTOP", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "12", name: "AGM 2 5G", quantity: 1, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "13", name: "AIRPODS REPLICA", quantity: 7, salePrice: 0, purchasePrice: 0, stockValue: 0 },
  { id: "14", name: "REALME C 31", quantity: 1, salePrice: 7500, purchasePrice: 0, stockValue: 0 },
];

const sampleTransactions: Transaction[] = [
  {
    type: "Opening Stock",
    invoice: "",
    name: "Opening Stock",
    date: "12/04/2021",
    quantity: 1,
    price: 0,
    status: "",
  },
];

export default function ItemsPage() {
  const router = useRouter();
  const [items] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item>(initialItems[0]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Left Product List */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="p-2">
          <button
            onClick={() => router.push("/items/new")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-medium"
          >
            + Add Item
          </button>
        </div>

        <div className="px-3 py-1.5 text-xs text-gray-500 flex justify-between border-b bg-gray-50">
          <span>ITEM</span>
          <span>QUANTITY</span>
        </div>

        <div className="flex-1 overflow-y-auto text-sm">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`px-3 py-2.5 cursor-pointer flex justify-between hover:bg-blue-50 ${
                selectedItem.id === item.id ? "bg-blue-50 font-medium" : ""
              }`}
            >
              <span className="truncate pr-2">{item.name}</span>
              <span className="text-gray-600">{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">{selectedItem.name}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/items/${selectedItem.id}/edit`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm"
            >
              ADJUST ITEM
            </button>
            <Link
              href={`/items/${selectedItem.id}/edit`}
              className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Price & Stock Info */}
        <div className="grid grid-cols-2 gap-6 text-sm mb-8">
          <div>
            <div className="text-gray-500 mb-1">SALE PRICE</div>
            <div className="font-medium text-base">
              ₹ {selectedItem.salePrice.toLocaleString("en-IN")}.00 (excl)
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">PURCHASE PRICE</div>
            <div className="font-medium text-base">
              ₹ {selectedItem.purchasePrice.toLocaleString("en-IN")}.00 (excl)
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">STOCK QUANTITY</div>
            <div className="font-medium text-base">{selectedItem.quantity}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">STOCK VALUE</div>
            <div className="font-medium text-base">
              ₹ {selectedItem.stockValue.toLocaleString("en-IN")}.00
            </div>
          </div>
        </div>

        {/* Transactions */}
        <h3 className="font-medium text-gray-700 mb-3">TRANSACTIONS</h3>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">INVOICE/RE...</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3">QUANTITY</th>
                <th className="py-2.5 px-3">PRICE / UNIT</th>
                <th className="py-2.5 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sampleTransactions.map((txn, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2.5 px-3">{txn.type}</td>
                  <td className="py-2.5 px-3">{txn.invoice}</td>
                  <td className="py-2.5 px-3">{txn.name}</td>
                  <td className="py-2.5 px-3">{txn.date}</td>
                  <td className="py-2.5 px-3">{txn.quantity}</td>
                  <td className="py-2.5 px-3">
                    {txn.price > 0 ? `₹ ${txn.price}` : ""}
                  </td>
                  <td className="py-2.5 px-3">{txn.status}</td>
                </tr>
              ))}
              {sampleTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No transactions to show
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}