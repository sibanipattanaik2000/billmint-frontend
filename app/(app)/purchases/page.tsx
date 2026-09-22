"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PurchaseInvoice {
  id: string;
  date: string;
  invoiceNo: string;
  partyName: string;
  transaction: string;
  paymentType: string;
  amount: number;
  balance: number;
  status: "Paid" | "Unpaid" | "Partial";
}

const initialPurchases: PurchaseInvoice[] = [
  {
    id: "P-1001",
    date: "18/09/2026, 11:30 AM",
    invoiceNo: "P-1001",
    partyName: "TECH SUPPLIERS PVT LTD",
    transaction: "Purchase",
    paymentType: "BANK",
    amount: 125000,
    balance: 0,
    status: "Paid",
  },
  {
    id: "P-1002",
    date: "17/09/2026, 04:15 PM",
    invoiceNo: "P-1002",
    partyName: "MOBILE WORLD DISTRIBUTORS",
    transaction: "Purchase",
    paymentType: "UPI",
    amount: 87500,
    balance: 25000,
    status: "Partial",
  },
  {
    id: "P-1003",
    date: "16/09/2026, 02:40 PM",
    invoiceNo: "P-1003",
    partyName: "TECH SUPPLIERS PVT LTD",
    transaction: "Purchase",
    paymentType: "CASH",
    amount: 42000,
    balance: 42000,
    status: "Unpaid",
  },
  {
    id: "P-1004",
    date: "15/09/2026, 10:05 AM",
    invoiceNo: "P-1004",
    partyName: "MOBILE WORLD DISTRIBUTORS",
    transaction: "Purchase",
    paymentType: "BANK",
    amount: 156000,
    balance: 0,
    status: "Paid",
  },
];

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(initialPurchases);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = purchases.filter(
    (inv) =>
      inv.partyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchase = purchases.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = purchases.reduce(
    (sum, inv) => sum + (inv.amount - inv.balance),
    0
  );
  const totalBalance = purchases.reduce((sum, inv) => sum + inv.balance, 0);

  // Excel Export
  const exportToExcel = () => {
    const headers = [
      "Date",
      "Invoice No",
      "Party Name",
      "Transaction",
      "Payment Type",
      "Amount",
      "Balance",
      "Status",
    ];

    const rows = purchases.map((inv) => [
      inv.date,
      inv.invoiceNo,
      inv.partyName,
      inv.transaction,
      inv.paymentType,
      inv.amount,
      inv.balance,
      inv.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Purchase_Invoices_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Import
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const dataLines = lines.slice(1);

      const imported: PurchaseInvoice[] = dataLines.map((line, index) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          id: cols[1] || `IMP-P-${Date.now()}-${index}`,
          date: cols[0] || new Date().toLocaleString("en-GB"),
          invoiceNo: cols[1] || `IMP-P-${index + 1}`,
          partyName: cols[2] || "Unknown",
          transaction: cols[3] || "Purchase",
          paymentType: cols[4] || "CASH",
          amount: Number(cols[5]) || 0,
          balance: Number(cols[6]) || 0,
          status: (cols[7] as "Paid" | "Unpaid" | "Partial") || "Unpaid",
        };
      });

      setPurchases((prev) => [...imported, ...prev]);
      alert(`${imported.length} purchase invoices imported successfully!`);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleShare = (inv: PurchaseInvoice) => {
    const text = `Purchase Invoice #${inv.invoiceNo}\nParty: ${inv.partyName}\nAmount: ₹${inv.amount}\nStatus: ${inv.status}`;
    if (navigator.share) {
      navigator.share({ title: `Purchase ${inv.invoiceNo}`, text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Invoice details copied to clipboard!");
    }
  };

  const handlePrintSingle = (inv: PurchaseInvoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Invoice ${inv.invoiceNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { margin-bottom: 5px; }
            .meta { margin-bottom: 30px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Purchase Invoice</h1>
          <div class="meta">
            <strong>Invoice No:</strong> ${inv.invoiceNo}<br/>
            <strong>Date:</strong> ${inv.date}<br/>
            <strong>Party:</strong> ${inv.partyName}<br/>
            <strong>Payment:</strong> ${inv.paymentType}<br/>
            <strong>Status:</strong> ${inv.status}
          </div>
          <table>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
            <tr>
              <td>Purchase</td>
              <td>₹ ${inv.amount.toLocaleString("en-IN")}</td>
              <td>₹ ${inv.balance.toLocaleString("en-IN")}</td>
            </tr>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">Purchase Invoices</h1>
          <span className="text-gray-400">▼</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/purchases/new")}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md font-medium"
          >
            + Add Purchase
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Filter by:</span>
          <select className="border rounded px-2 py-1">
            <option>Custom</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="border rounded px-2 py-1" />
          <span>To</span>
          <input type="date" className="border rounded px-2 py-1" />
        </div>
        <select className="border rounded px-2 py-1">
          <option>SUREBUY STORE</option>
        </select>
        <select className="border rounded px-2 py-1">
          <option>All Users</option>
        </select>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 flex gap-10 border-b">
        <div>
          <div className="text-sm text-gray-500">Total Purchase Amount</div>
          <div className="text-2xl font-bold">
            ₹ {totalPurchase.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Paid</div>
          <div className="text-lg font-semibold text-green-600">
            ₹ {totalPaid.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-lg font-semibold text-red-500">
            ₹ {totalBalance.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-700">Transactions</h2>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleExcelImport}
              className="hidden"
            />

            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              📊 Excel
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              📥 Import
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              🖨️ Print
            </button>

            <input
              type="text"
              placeholder="Search Transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-52 ml-2"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Invoice no.</th>
              <th className="py-2 pr-3">Party Name</th>
              <th className="py-2 pr-3">Transaction</th>
              <th className="py-2 pr-3">Payment Type</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3 text-right">Balance</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-blue-50">
                <td
                  className="py-3 cursor-pointer"
                  onClick={() => router.push(`/purchases/${inv.id}`)}
                >
                  {inv.date}
                </td>
                <td
                  className="py-3 cursor-pointer"
                  onClick={() => router.push(`/purchases/${inv.id}`)}
                >
                  {inv.invoiceNo}
                </td>
                <td
                  className="py-3 font-medium cursor-pointer"
                  onClick={() => router.push(`/purchases/${inv.id}`)}
                >
                  {inv.partyName}
                </td>
                <td className="py-3 text-blue-600">{inv.transaction}</td>
                <td className="py-3">{inv.paymentType}</td>
                <td className="py-3 text-right">
                  ₹ {inv.amount.toLocaleString("en-IN")}
                </td>
                <td
                  className={`py-3 text-right ${
                    inv.balance > 0 ? "text-red-500" : ""
                  }`}
                >
                  ₹ {inv.balance.toLocaleString("en-IN")}
                </td>
                <td
                  className={`py-3 font-medium ${
                    inv.status === "Paid"
                      ? "text-green-600"
                      : inv.status === "Partial"
                      ? "text-orange-500"
                      : "text-red-500"
                  }`}
                >
                  {inv.status}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShare(inv)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Share
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handlePrintSingle(inv)}
                      className="text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            No purchase invoices found
          </div>
        )}
      </div>
    </div>
  );
}