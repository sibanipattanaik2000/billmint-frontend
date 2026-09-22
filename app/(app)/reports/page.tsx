"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  href: string;
}

const reportCategories = [
  "All",
  "Sales",
  "Purchase",
  "Inventory",
  "Party",
  "GST",
  "Cash & Bank",
  "Expense",
];

const allReports: ReportItem[] = [
  // Sales
  {
    id: "1",
    title: "Sale Summary",
    description: "Total sales with party-wise and item-wise breakdown",
    category: "Sales",
    icon: "📈",
    href: "/reports/sale-summary",
  },
  {
    id: "2",
    title: "Sale Invoices",
    description: "Detailed list of all sale invoices",
    category: "Sales",
    icon: "🧾",
    href: "/sales",
  },
  {
    id: "3",
    title: "Party Wise Sales",
    description: "Sales grouped by customer",
    category: "Sales",
    icon: "👥",
    href: "/reports/party-wise-sales",
  },
  {
    id: "4",
    title: "Item Wise Sales",
    description: "Best selling items report",
    category: "Sales",
    icon: "📦",
    href: "/reports/item-wise-sales",
  },

  // Purchase
  {
    id: "5",
    title: "Purchase Summary",
    description: "Total purchases with supplier-wise breakdown",
    category: "Purchase",
    icon: "🛒",
    href: "/reports/purchase-summary",
  },
  {
    id: "6",
    title: "Purchase Invoices",
    description: "Detailed list of all purchase invoices",
    category: "Purchase",
    icon: "📄",
    href: "/purchases",
  },

  // Inventory
  {
    id: "7",
    title: "Stock Summary",
    description: "Current stock quantity and value",
    category: "Inventory",
    icon: "📊",
    href: "/reports/stock-summary",
  },
  {
    id: "8",
    title: "Low Stock Alert",
    description: "Items below minimum stock level",
    category: "Inventory",
    icon: "⚠️",
    href: "/reports/low-stock",
  },
  {
    id: "9",
    title: "Item Report",
    description: "Complete item transaction history",
    category: "Inventory",
    icon: "🔍",
    href: "/items",
  },

  // Party
  {
    id: "10",
    title: "Party Statement",
    description: "Ledger of any party (customer/supplier)",
    category: "Party",
    icon: "📒",
    href: "/reports/party-statement",
  },
  {
    id: "11",
    title: "Receivable Report",
    description: "All pending receivables from customers",
    category: "Party",
    icon: "💰",
    href: "/reports/receivable",
  },
  {
    id: "12",
    title: "Payable Report",
    description: "All pending payables to suppliers",
    category: "Party",
    icon: "💸",
    href: "/reports/payable",
  },

  // GST
  {
    id: "13",
    title: "GSTR-1",
    description: "Outward supplies return",
    category: "GST",
    icon: "🏛️",
    href: "/reports/gstr1",
  },
  {
    id: "14",
    title: "GSTR-2",
    description: "Inward supplies return",
    category: "GST",
    icon: "🏛️",
    href: "/reports/gstr2",
  },
  {
    id: "15",
    title: "GSTR-3B",
    description: "Monthly summary return",
    category: "GST",
    icon: "🏛️",
    href: "/reports/gstr3b",
  },

  // Cash & Bank
  {
    id: "16",
    title: "Cash Flow",
    description: "Cash in and cash out summary",
    category: "Cash & Bank",
    icon: "💵",
    href: "/cash-bank",
  },
  {
    id: "17",
    title: "Bank Statement",
    description: "Bank account transaction history",
    category: "Cash & Bank",
    icon: "🏦",
    href: "/cash-bank",
  },

  // Expense
  {
    id: "18",
    title: "Expense Report",
    description: "All business expenses summary",
    category: "Expense",
    icon: "📉",
    href: "/reports/expense",
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filteredReports = allReports.filter((report) => {
    const matchesCategory =
      activeCategory === "All" || report.category === activeCategory;
    const matchesSearch =
      report.title.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="px-6 py-3 border-b bg-gray-50 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {reportCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredReports.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p>No reports found</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(report.href)}
                className="bg-white border rounded-xl p-5 text-left hover:shadow-md hover:border-blue-300 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{report.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">
                      {report.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {report.description}
                    </p>
                    <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {report.category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}