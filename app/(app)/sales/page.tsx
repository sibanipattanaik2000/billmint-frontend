"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  Share2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api, ApiError } from "@/lib/api";

interface SaleInvoice {
  id: string;
  date: string;
  invoiceNo: string;
  partyName: string;
  transaction: string;
  paymentType: string;
  amount: number;
  balance: number;
  status: string;
}

interface BackendSale {
  id?: string | number;
  invoiceNumber?: string | number | null;
  date?: string | Date | null;
  customer?: { id?: string; name?: string | null } | null;
  grandTotal?: string | number | null;
  balanceAmount?: string | number | null;
  paidAmount?: string | number | null;
  paymentMethod?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₹,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    value &&
    typeof value === "object" &&
    "toString" in value
  ) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatDate(value: unknown): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInvoiceDate(value: string): string {
  if (!value || value === "—") return "";

  const datePart = value.trim().split(",")[0];
  const match = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeSale(sale: BackendSale): SaleInvoice {
  const amount = toNumber(sale.grandTotal);
  const balance = Math.max(0, toNumber(sale.balanceAmount));
  const backendStatus = String(sale.status ?? "").toUpperCase();

  let status: string;

  if (backendStatus === "CANCELLED") {
    status = "Cancelled";
  } else if (backendStatus === "DRAFT") {
    status = "Draft";
  } else if (balance <= 0) {
    status = "Paid";
  } else if (balance >= amount && amount > 0) {
    status = "Unpaid";
  } else {
    status = "Partial";
  }

  return {
    id: String(sale.id ?? ""),
    date: formatDate(sale.date),
    invoiceNo: String(sale.invoiceNumber ?? sale.id ?? "—"),
    partyName: String(sale.customer?.name ?? "Walk-in Customer"),
    transaction: "Sale",
    paymentType: String(sale.paymentMethod ?? "—")
      .replaceAll("_", " ")
      .toUpperCase(),
    amount,
    balance,
    status,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export default function SaleInvoicesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInvoices = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.sales({
        page: 1,
        limit: 100,
      });

      if (!response || !Array.isArray(response.data)) {
        throw new Error("The server returned an unexpected sales response.");
      }

      const normalized = (response.data as BackendSale[])
        .map(normalizeSale)
        .filter((invoice) => invoice.id !== "");

      setInvoices(normalized);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to load sale invoices.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filtered = invoices.filter((invoice) => {
    const query = search.trim().toLowerCase();
    const invoiceDate = getInvoiceDate(invoice.date);

    const matchesSearch =
      invoice.partyName.toLowerCase().includes(query) ||
      invoice.invoiceNo.toLowerCase().includes(query);

    const matchesFromDate = !fromDate || (!!invoiceDate && invoiceDate >= fromDate);
    const matchesToDate = !toDate || (!!invoiceDate && invoiceDate <= toDate);

    const matchesStatus =
      statusFilter === "ALL" ||
      invoice.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesFromDate && matchesToDate && matchesStatus;
  });

  const totalSales = filtered.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );

  const totalBalance = filtered.reduce(
    (sum, invoice) => sum + invoice.balance,
    0,
  );

  const totalReceived = filtered.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.amount - invoice.balance),
    0,
  );

  const handleExcelExport = () => {
    try {
      const excelData = filtered.map((invoice) => ({
        ID: invoice.id,
        Date: invoice.date,
        "Invoice no.": invoice.invoiceNo,
        "Party Name": invoice.partyName,
        Transaction: invoice.transaction,
        "Payment Type": invoice.paymentType,
        Amount: invoice.amount,
        Balance: invoice.balance,
        Status: invoice.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 18 },
        { wch: 28 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sale Invoices");
      XLSX.writeFile(workbook, "BillMint-Sale-Invoices.xlsx");
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Unable to export the Excel file.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();

      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
        alert("Please select a valid Excel file.");
        return;
      }

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
      });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        alert("The Excel file does not contain a sheet.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheetName],
        { defval: "" },
      );

      const validRows = rows.filter((row) => {
        const invoiceNo = String(
          row["Invoice no."] ??
            row["Invoice No"] ??
            row["Invoice Number"] ??
            row.invoiceNo ??
            "",
        ).trim();

        return invoiceNo.length > 0;
      });

      if (validRows.length === 0) {
        alert("No valid invoice rows were found in the Excel file.");
        return;
      }

      alert(
        `Found ${validRows.length} invoice rows. Excel import is not connected to the backend yet, so no database records were changed. Use Excel export to download the current server records.`,
      );
    } catch (err) {
      console.error("Excel import failed:", err);
      alert("Unable to read this Excel file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleShare = async (invoice: SaleInvoice) => {
    const shareText = [
      "BillMint Sale Invoice",
      "",
      `Invoice No: ${invoice.invoiceNo}`,
      `Date: ${invoice.date}`,
      `Party: ${invoice.partyName}`,
      `Transaction: ${invoice.transaction}`,
      `Payment Type: ${invoice.paymentType}`,
      `Amount: ₹ ${formatINR(invoice.amount)}`,
      `Balance: ₹ ${formatINR(invoice.balance)}`,
      `Status: ${invoice.status}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `BillMint Invoice ${invoice.invoiceNo}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Invoice details copied to clipboard.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(shareText);
        alert("Invoice details copied to clipboard.");
      } catch {
        alert("Unable to share this invoice.");
      }
    }
  };

  const handleRowPrint = (invoice: SaleInvoice) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Please allow pop-ups in your browser to print the invoice.");
      return;
    }

    const safeInvoiceNo = escapeHtml(invoice.invoiceNo);
    const safeDate = escapeHtml(invoice.date);
    const safePartyName = escapeHtml(invoice.partyName);
    const safePaymentType = escapeHtml(invoice.paymentType);
    const safeStatus = escapeHtml(invoice.status);
    const safeTransaction = escapeHtml(invoice.transaction);
    const amount = formatINR(invoice.amount);
    const balance = formatINR(invoice.balance);
    const received = formatINR(Math.max(0, invoice.amount - invoice.balance));

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Sale Invoice ${safeInvoiceNo}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 36px;
              color: #222;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
            }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 2px solid #222;
              padding-bottom: 20px;
              margin-bottom: 28px;
            }
            .brand { font-size: 28px; font-weight: 700; }
            .title { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 24px;
            }
            .detail { border: 1px solid #ddd; padding: 14px; border-radius: 6px; }
            .label { color: #777; font-size: 11px; margin-bottom: 6px; }
            .value { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #f5f5f5; }
            .right { text-align: right; }
            .total { margin: 24px 0 0 auto; width: 300px; max-width: 100%; }
            .total-row { display: flex; justify-content: space-between; gap: 20px; padding: 8px 0; }
            .grand-total { font-size: 19px; font-weight: 700; border-top: 2px solid #222; padding-top: 12px; }
            .footer { margin-top: 48px; text-align: center; color: #777; font-size: 12px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <main class="invoice">
            <header class="header">
              <div class="brand">BillMint</div>
              <div>
                <div class="title">SALE INVOICE</div>
                <div>Invoice No: ${safeInvoiceNo}</div>
                <div>Date: ${safeDate}</div>
              </div>
            </header>

            <section class="details">
              <div class="detail">
                <div class="label">PARTY NAME</div>
                <div class="value">${safePartyName}</div>
              </div>
              <div class="detail">
                <div class="label">PAYMENT TYPE</div>
                <div class="value">${safePaymentType}</div>
              </div>
              <div class="detail">
                <div class="label">TRANSACTION</div>
                <div class="value">${safeTransaction}</div>
              </div>
              <div class="detail">
                <div class="label">STATUS</div>
                <div class="value">${safeStatus}</div>
              </div>
            </section>

            <table>
              <thead>
                <tr><th>Description</th><th class="right">Amount</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sale Invoice ${safeInvoiceNo}</td>
                  <td class="right">₹ ${amount}</td>
                </tr>
              </tbody>
            </table>

            <section class="total">
              <div class="total-row"><span>Total Amount</span><strong>₹ ${amount}</strong></div>
              <div class="total-row"><span>Received</span><strong>₹ ${received}</strong></div>
              <div class="total-row"><span>Balance</span><strong>₹ ${balance}</strong></div>
              <div class="total-row grand-total"><span>Invoice Total</span><span>₹ ${amount}</span></div>
            </section>

            <footer class="footer">Generated by BillMint</footer>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelImport}
        className="hidden"
      />

      {/* Header — existing layout retained */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">Sale Invoices</h1>
          <span className="text-gray-400">▼</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleImportClick}
            title="Import Excel"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <Upload size={16} />
            Import
          </button>

          <button
            onClick={handleExcelExport}
            title="Export to Excel"
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

          <button
            onClick={() => window.print()}
            title="Print"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <Printer size={16} />
            Print
          </button>

          <button
            onClick={() => window.print()}
            title="Save as PDF"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <FileText size={16} />
            PDF
          </button>

          <button
            onClick={() => router.push("/sales/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-medium"
          >
            + Add Sale
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4 text-sm flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Filter by:</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border rounded px-2 py-1 bg-white"
            aria-label="Filter invoices by status"
          >
            <option value="ALL">All invoices</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="border rounded px-2 py-1"
            aria-label="From date"
          />
          <span>To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="border rounded px-2 py-1"
            aria-label="To date"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setFromDate("");
            setToDate("");
            setStatusFilter("ALL");
            setSearch("");
          }}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear filters
        </button>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 flex gap-10 border-b flex-wrap">
        <div>
          <div className="text-sm text-gray-500">Total Sales Amount</div>
          <div className="text-2xl font-bold">
            ₹ {formatINR(totalSales)}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Received</div>
          <div className="text-lg font-semibold text-green-600">
            ₹ {formatINR(totalReceived)}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-lg font-semibold text-red-500">
            ₹ {formatINR(totalBalance)}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between gap-3 mb-3 print:hidden">
          <h2 className="font-medium text-gray-700">Transactions</h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search Transactions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-56 max-w-full"
              aria-label="Search transactions"
            />

            <button
              type="button"
              onClick={() => void loadInvoices(true)}
              disabled={loading || refreshing}
              className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-50"
              title="Refresh invoices from server"
              aria-label="Refresh invoices"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <button
              type="button"
              className="p-1.5 border rounded hover:bg-gray-50"
              title="Search"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 rounded-md p-4 text-sm text-red-700">
            <p className="font-medium">Unable to load sale invoices.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadInvoices(true)}
              className="mt-3 rounded bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[950px]">
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
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    Loading sale invoices from the server…
                  </td>
                </tr>
              ) : !error && filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-blue-50">
                  <td className="py-3 pr-3 whitespace-nowrap">{invoice.date}</td>

                  <td
                    className="py-3 pr-3 text-blue-600 hover:underline cursor-pointer"
                    onClick={() => router.push(`/sales/${encodeURIComponent(invoice.id)}`)}
                  >
                    {invoice.invoiceNo}
                  </td>

                  <td
                    className="py-3 pr-3 font-medium cursor-pointer"
                    onClick={() => router.push(`/sales/${encodeURIComponent(invoice.id)}`)}
                  >
                    {invoice.partyName}
                  </td>

                  <td className="py-3 pr-3 text-blue-600">
                    {invoice.transaction}
                  </td>

                  <td className="py-3 pr-3">{invoice.paymentType}</td>

                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    ₹ {formatINR(invoice.amount)}
                  </td>

                  <td
                    className={`py-3 pr-3 text-right whitespace-nowrap ${
                      invoice.balance > 0 ? "text-red-500" : ""
                    }`}
                  >
                    ₹ {formatINR(invoice.balance)}
                  </td>

                  <td
                    className={`py-3 pr-3 font-medium ${
                      invoice.status === "Paid"
                        ? "text-green-600"
                        : invoice.status === "Cancelled"
                          ? "text-gray-500"
                          : invoice.status === "Draft"
                            ? "text-amber-600"
                            : "text-red-500"
                    }`}
                  >
                    {invoice.status}
                  </td>

                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleShare(invoice)}
                        title="Share Invoice"
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                      >
                        <Share2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRowPrint(invoice)}
                        title="Print Invoice"
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                      >
                        <Printer size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/sales/${encodeURIComponent(invoice.id)}`)}
                        title="View Invoice"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    {invoices.length === 0
                      ? "No sale invoices are available in your account yet."
                      : "No transactions match your search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && invoices.length > 100 && (
          <p className="mt-3 text-xs text-gray-500">
            Showing the first 100 invoices returned by the API. Pagination can be added to load the remaining records.
          </p>
        )}
      </div>

      <div className="hidden print:block text-center text-xs text-gray-500 py-4">
        BillMint — Sale Invoices
      </div>
    </div>
  );
}
