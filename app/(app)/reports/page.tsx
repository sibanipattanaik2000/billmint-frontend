"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatINR } from "@/lib/api";

type ReportKey =
  | "sale-summary"
  | "party-wise-sales"
  | "item-wise-sales"
  | "purchase-summary"
  | "stock-summary"
  | "low-stock"
  | "receivable"
  | "payable"
  | "expense"
  | "payment-collection";

type ReportDefinition = {
  key: ReportKey;
  title: string;
  description: string;
  category: string;
  icon: string;
  dates?: boolean;
};

type ReportRow = Record<string, unknown>;

const reportDefinitions: ReportDefinition[] = [
  {
    key: "sale-summary",
    title: "Sales Summary",
    description: "Invoice totals, tax, collections and daily sales.",
    category: "Sales",
    icon: "📈",
    dates: true,
  },
  {
    key: "party-wise-sales",
    title: "Party-wise Sales",
    description: "Sales, collections and balances by customer.",
    category: "Sales",
    icon: "👥",
    dates: true,
  },
  {
    key: "item-wise-sales",
    title: "Item-wise Sales",
    description: "Quantities sold and revenue by item.",
    category: "Sales",
    icon: "📦",
    dates: true,
  },
  {
    key: "purchase-summary",
    title: "Purchase Summary",
    description: "Purchase totals and supplier balances.",
    category: "Purchase",
    icon: "🛒",
    dates: true,
  },
  {
    key: "stock-summary",
    title: "Stock Summary",
    description: "Current inventory quantities and estimated values.",
    category: "Inventory",
    icon: "📊",
  },
  {
    key: "low-stock",
    title: "Low Stock",
    description: "Items at or below their configured minimum stock.",
    category: "Inventory",
    icon: "⚠️",
  },
  {
    key: "receivable",
    title: "Receivables",
    description: "Outstanding balances on sales invoices.",
    category: "Party",
    icon: "💰",
    dates: true,
  },
  {
    key: "payable",
    title: "Payables",
    description: "Outstanding balances on purchase invoices.",
    category: "Party",
    icon: "💸",
    dates: true,
  },
  {
    key: "expense",
    title: "Expense Report",
    description: "Recorded expenses and expense totals.",
    category: "Expense",
    icon: "📉",
    dates: true,
  },
  {
    key: "payment-collection",
    title: "Daily Payment Collection",
    description: "Money received by Cash, UPI, Card and other payment methods.",
    category: "Sales",
    icon: "💳",
    dates: true,
  },
];

const categories = [
  "All",
  "Sales",
  "Purchase",
  "Inventory",
  "Party",
  "Expense",
];

const moneyFields = new Set([
  "total",
  "totalSales",
  "purchaseAmount",
  "salesAmount",
  "taxableAmount",
  "stockCostValue",
  "stockSaleValue",
  "grandTotal",
  "paidAmount",
  "balanceAmount",
  "outstandingAmount",
  "totalAmount",
  "amount",
  "subtotal",
  "discountAmount",
  "cgstAmount",
  "sgstAmount",
  "igstAmount",
  "cessAmount",
  "purchasePrice",
  "salePrice",
]);

const hiddenFields = new Set([
  "id",
  "customerId",
  "supplierId",
  "categoryId",
  "itemId",
]);

function dateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load this report.";
}

function getReportRows(key: ReportKey, result: any): ReportRow[] {
  if (!result) return [];

  switch (key) {
    case "sale-summary":
      return Array.isArray(result.daily) ? result.daily : [];
    case "party-wise-sales":
      return Array.isArray(result) ? result : [];
    case "item-wise-sales":
      return Array.isArray(result) ? result : [];
    case "purchase-summary":
      return Array.isArray(result.suppliers) ? result.suppliers : [];
    case "stock-summary":
      return Array.isArray(result.data) ? result.data : [];
    case "low-stock":
      return Array.isArray(result) ? result : [];
    case "receivable":
    case "payable":
      return Array.isArray(result.data) ? result.data : [];
    case "expense":
      return Array.isArray(result.data) ? result.data : [];
    case "payment-collection":
      return Array.isArray(result.data) ? result.data : [];
    default:
      return [];
  }
}

function getReportColumns(key: ReportKey): string[] {
  switch (key) {
    case "sale-summary":
      return ["date", "invoices", "total"];
    case "party-wise-sales":
      return [
        "customerName",
        "phone",
        "invoiceCount",
        "totalSales",
        "paidAmount",
        "balanceAmount",
      ];
    case "item-wise-sales":
      return [
        "itemName",
        "quantitySold",
        "lineCount",
        "taxableAmount",
        "salesAmount",
      ];
    case "purchase-summary":
      return [
        "supplierName",
        "invoiceCount",
        "purchaseAmount",
        "paidAmount",
        "balanceAmount",
      ];
    case "stock-summary":
      return [
        "name",
        "sku",
        "category",
        "currentStock",
        "minimumStock",
        "stockCostValue",
        "stockSaleValue",
      ];
    case "low-stock":
      return [
        "name",
        "sku",
        "category",
        "currentStock",
        "minimumStock",
        "shortage",
        "stockCostValue",
      ];
    case "receivable":
      return [
        "invoiceNumber",
        "date",
        "dueDate",
        "customer",
        "grandTotal",
        "paidAmount",
        "balanceAmount",
      ];
    case "payable":
      return [
        "billNumber",
        "date",
        "dueDate",
        "supplier",
        "grandTotal",
        "paidAmount",
        "balanceAmount",
      ];
    case "expense":
      return ["date", "category", "description", "paymentMethod", "amount"];
    case "payment-collection":
      return [
        "date",
        "source",
        "partyOrCategory",
        "invoiceNumbers",
        "method",
        "bankAccountName",
        "reference",
        "description",
        "amount",
      ];
  }
}

function getCellValue(row: ReportRow, field: string): unknown {
  if (field === "customer" || field === "supplier") {
    const party = row[field];

    if (party && typeof party === "object") {
      return (party as Record<string, unknown>).name ?? "—";
    }

    return "—";
  }

  if (field === "category") {
    const category = row.category;

    if (category && typeof category === "object") {
      return (category as Record<string, unknown>).name ?? "—";
    }

    return category ?? "—";
  }

  return row[field];
}

function displayCell(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (moneyFields.has(field)) {
    return formatINR(value as number | string);
  }

  if (field === "date" || field === "dueDate") {
    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function columnLabel(field: string): string {
  const labels: Record<string, string> = {
    date: "Date",
    dueDate: "Due Date",
    invoices: "Invoices",
    invoiceCount: "Invoices",
    invoiceNumber: "Invoice No.",
    billNumber: "Bill No.",
    customerName: "Customer",
    supplierName: "Supplier",
    phone: "Phone",
    itemName: "Item",
    quantitySold: "Qty Sold",
    lineCount: "Lines",
    total: "Sales",
    totalSales: "Total Sales",
    purchaseAmount: "Purchases",
    salesAmount: "Sales Amount",
    taxableAmount: "Taxable Value",
    paidAmount: "Paid",
    balanceAmount: "Balance",
    grandTotal: "Invoice Total",
    outstandingAmount: "Outstanding",
    currentStock: "Current Stock",
    minimumStock: "Minimum Stock",
    stockCostValue: "Stock Cost Value",
    stockSaleValue: "Stock Sale Value",
    purchasePrice: "Purchase Price",
    salePrice: "Sale Price",
    shortage: "Shortage",
    paymentMethod: "Payment Method",
    amount: "Amount",
    description: "Description",
    category: "Category",
    sku: "SKU",
    name: "Item",
    discountAmount: "Discount",
    subtotal: "Subtotal",
    cgstAmount: "CGST",
    sgstAmount: "SGST",
    igstAmount: "IGST",
    cessAmount: "Cess",
    invoiceNumbers: "Invoice No.",
    method: "Payment Type",
    reference: "Reference",
    source: "Collection Source",
    partyOrCategory: "Customer / Category",
    bankAccountName: "Cash / Bank Account",
  };

  return (
    labels[field] ??
    field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

function downloadCsv(title: string, rows: ReportRow[], columns: string[]) {
  if (!rows.length) return;

  const escapeCsv = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map((field) => escapeCsv(columnLabel(field))).join(","),
    ...rows.map((row) =>
      columns
        .map((field) => escapeCsv(displayCell(field, getCellValue(row, field))))
        .join(","),
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<ReportKey>("sale-summary");

  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return dateString(date);
  });

  const [to, setTo] = useState(() => dateString(new Date()));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedReport = reportDefinitions.find(
    (report) => report.key === selectedKey,
  )!;

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reportDefinitions.filter((report) => {
      const matchesCategory =
        activeCategory === "All" || report.category === activeCategory;

      const matchesSearch =
        !query ||
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const loadReport = useCallback(async () => {
    if (from && to && from > to && selectedReport.dates) {
      setError("The start date cannot be later than the end date.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const params = selectedReport.dates
      ? { from: from || undefined, to: to || undefined }
      : undefined;

    try {
      let response: any;

      switch (selectedKey) {
        case "sale-summary":
          response = await api.reportSaleSummary(params);
          break;
        case "party-wise-sales":
          response = await api.reportPartyWiseSales(params);
          break;
        case "item-wise-sales":
          response = await api.reportItemWiseSales(params);
          break;
        case "purchase-summary":
          response = await api.reportPurchaseSummary(params);
          break;
        case "stock-summary":
          response = await api.reportStockSummary();
          break;
        case "low-stock":
          response = await api.reportLowStock();
          break;
        case "receivable":
          response = await api.reportReceivable(params);
          break;
        case "payable":
          response = await api.reportPayable(params);
          break;
        case "expense":
          response = await api.reportExpense(params);
          break;
        case "payment-collection":
          response = await api.reportPaymentCollection(params);
          break;
      }
      if (!response || !response.data) {
        throw new Error(
          "The payment collection report returned no data. Check the backend API and server logs.",
        );
      }
      setResult(response.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedKey, selectedReport.dates]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);
  useEffect(() => {
    if (selectedKey === "payment-collection") {
      const today = dateString(new Date());
      setFrom(today);
      setTo(today);
    }
  }, [selectedKey]);
  const rows = useMemo(
    () => getReportRows(selectedKey, result),
    [selectedKey, result],
  );

  const columns = useMemo(
    () =>
      getReportColumns(selectedKey).filter((field) => !hiddenFields.has(field)),
    [selectedKey],
  );

  const summary = result?.summary ?? {};
  const showSummary =
    selectedKey !== "party-wise-sales" &&
    selectedKey !== "item-wise-sales" &&
    selectedKey !== "low-stock";

  const summaryCards = useMemo(() => {
    if (!result) return [];

    switch (selectedKey) {
      case "sale-summary":
        return [
          ["Invoices", summary.invoiceCount],
          ["Sales Total", summary.grandTotal, true],
          ["Collected", summary.paidAmount, true],
          ["Outstanding", summary.balanceAmount, true],
          ["Taxable Value", summary.taxableAmount, true],
          ["Discount", summary.discountAmount, true],
        ];
      case "purchase-summary":
        return [
          ["Purchase Invoices", summary.invoiceCount],
          ["Purchase Total", summary.grandTotal, true],
          ["Paid", summary.paidAmount, true],
          ["Outstanding", summary.balanceAmount, true],
        ];
      case "stock-summary":
        return [
          ["Active Items", summary.itemCount],
          ["Total Units", summary.totalUnits],
          ["Stock Cost Value", summary.stockCostValue, true],
          ["Stock Sale Value", summary.stockSaleValue, true],
          ["Low Stock Items", summary.lowStockCount],
        ];
      case "receivable":
      case "payable":
        return [
          ["Open Invoices", summary.invoiceCount],
          ["Outstanding", summary.outstandingAmount, true],
        ];
      case "expense":
        return [
          ["Expense Records", summary.expenseCount],
          ["Total Expenses", summary.totalAmount, true],
        ];
      case "payment-collection":
        return [
          ["Total Collected", summary.total, true],
          ["Cash", summary.cash, true],
          ["UPI", summary.upi, true],
          ["Card", summary.card, true],
          ["Bank Transfer", summary.bank, true],
          ["Other", summary.other, true],
          ["Transactions", summary.paymentCount],
        ];
      default:
        return [];
    }
  }, [result, selectedKey, summary]);

  return (
    <div className="min-h-full flex-1 bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Business insights
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Reports
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Live reports generated from your BillMint business records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "↻ Refresh report"}
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="report-search"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Find a report
                </label>
                <input
                  id="report-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reports…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {selectedReport.dates && (
                <>
                  <div>
                    <label
                      htmlFor="report-from"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      From
                    </label>
                    <input
                      id="report-from"
                      type="date"
                      value={from}
                      max={to || undefined}
                      onChange={(event) => setFrom(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-to"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      To
                    </label>
                    <input
                      id="report-to"
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={(event) => setTo(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                setFrom(dateString(first));
                setTo(dateString(now));
              }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              This month
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Available reports</h2>
            <span className="text-xs text-slate-500">
              {filteredReports.length} report
              {filteredReports.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => (
              <button
                type="button"
                key={report.key}
                onClick={() => setSelectedKey(report.key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedKey === report.key
                    ? "border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {report.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {report.title}
                      </h3>
                      {selectedKey === report.key && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {report.description}
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {report.category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No reports match your search.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedReport.icon}</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedReport.title}
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {selectedReport.description}
                {selectedReport.dates &&
                  ` • ${from || "All dates"} to ${to || "Today"}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadCsv(selectedReport.title, rows, columns)}
                disabled={loading || rows.length === 0}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↓ Export CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    selectedKey === "payment-collection"
                      ? "/payments"
                      : selectedKey === "sale-summary" ||
                          selectedKey === "party-wise-sales" ||
                          selectedKey === "item-wise-sales"
                        ? "/sales"
                        : selectedKey === "purchase-summary"
                          ? "/purchases"
                          : selectedKey === "stock-summary" ||
                              selectedKey === "low-stock"
                            ? "/items"
                            : selectedKey === "expense"
                              ? "/expenses"
                              : "/cash-bank",
                  )
                }
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Open module →
              </button>
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">Unable to load this report</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void loadReport()}
                className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold hover:bg-rose-100"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-14 text-center text-sm text-slate-500">
              Loading real report data…
            </div>
          ) : (
            !error &&
            result && (
              <>
                {showSummary && summaryCards.length > 0 && (
                  <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {summaryCards.map(([label, value, isMoney]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <p className="text-xs font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-2 break-words text-xl font-bold text-slate-900">
                          {value === null || value === undefined
                            ? "—"
                            : isMoney
                              ? formatINR(value as number | string)
                              : Number(value).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {columns.map((field) => (
                          <th
                            key={field}
                            className="whitespace-nowrap px-4 py-3 font-semibold"
                          >
                            {columnLabel(field)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(columns.length, 1)}
                            className="px-5 py-12 text-center text-slate-500"
                          >
                            No records found for this report and date range.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, index) => (
                          <tr
                            key={String(
                              row.id ??
                                row.date ??
                                row.itemId ??
                                row.customerId ??
                                index,
                            )}
                            className="hover:bg-slate-50"
                          >
                            {columns.map((field) => (
                              <td
                                key={field}
                                className="whitespace-nowrap px-4 py-3 text-slate-700"
                              >
                                {displayCell(field, getCellValue(row, field))}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedKey === "sale-summary" && (
                  <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                    The table shows daily totals. Invoice and tax aggregates
                    above are returned by the backend.
                  </div>
                )}
              </>
            )
          )}

          {!loading && !error && !result && (
            <div className="p-12 text-center text-sm text-slate-500">
              Select a report to load your business data.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Related modules</h2>
          <p className="mt-1 text-sm text-slate-500">
            Open existing pages for invoice and transaction details.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["Sales Invoices", "/sales"],
              ["Purchase Invoices", "/purchases"],
              ["Items & Inventory", "/items"],
              ["Cash & Bank", "/cash-bank"],
              ["Expenses", "/expenses"],
            ].map(([label, href]) => (
              <button
                type="button"
                key={href}
                onClick={() => router.push(href)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
              >
                {label} →
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
