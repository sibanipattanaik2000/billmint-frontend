"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Printer,
  Search,
  Share2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";

interface SaleInvoice {
  id: string;
  date: string;
  invoiceNo: string;
  partyName: string;
  transaction: string;
  paymentType: string;
  amount: number;
  balance: number;
  status: "Paid" | "Unpaid";
}

const STORAGE_KEY = "billmint-sale-invoices";

const initialInvoices: SaleInvoice[] = [
  {
    id: "18616",
    date: "19/08/2026, 09:09 PM",
    invoiceNo: "18616",
    partyName: "LIVANDER",
    transaction: "Sale",
    paymentType: "CARD",
    amount: 23000,
    balance: 0,
    status: "Paid",
  },
  {
    id: "18615",
    date: "19/09/2026, 08:45 PM",
    invoiceNo: "18615",
    partyName: "JYOTI RANJAN BISWAL",
    transaction: "Sale",
    paymentType: "ICICI SCAN",
    amount: 33500,
    balance: 0,
    status: "Paid",
  },
  {
    id: "18614",
    date: "19/09/2026, 07:30 PM",
    invoiceNo: "18614",
    partyName: "RAJESH PANDA",
    transaction: "Sale",
    paymentType: "ICICI SCAN",
    amount: 6500,
    balance: 0,
    status: "Paid",
  },
  {
    id: "18613",
    date: "19/09/2026, 06:15 PM",
    invoiceNo: "18613",
    partyName: "MIHIR RANJAN TRIPATHY",
    transaction: "Sale",
    paymentType: "OTHERS",
    amount: 7000,
    balance: 7000,
    status: "Unpaid",
  },
  {
    id: "18612",
    date: "19/09/2026, 05:00 PM",
    invoiceNo: "18612",
    partyName: "ANIL KUMAR DAS",
    transaction: "Sale",
    paymentType: "ICICI SCAN",
    amount: 51500,
    balance: 0,
    status: "Paid",
  },
  {
    id: "18611",
    date: "19/09/2026, 04:20 PM",
    invoiceNo: "18611",
    partyName: "RAJAT KUMAR SAHOO",
    transaction: "Sale",
    paymentType: "ICICI SCAN",
    amount: 20000,
    balance: 0,
    status: "Paid",
  },
];

function normalizeInvoice(row: Record<string, unknown>): SaleInvoice | null {
  const invoiceNo = String(
    row["Invoice no."] ??
      row["Invoice No"] ??
      row["Invoice Number"] ??
      row.invoiceNo ??
      "",
  ).trim();

  if (!invoiceNo) return null;

  const amountValue = Number(
    String(row.Amount ?? row.amount ?? 0).replace(/[₹,\s]/g, ""),
  );

  const balanceValue = Number(
    String(row.Balance ?? row.balance ?? 0).replace(/[₹,\s]/g, ""),
  );

  const statusValue = String(row.Status ?? row.status ?? "").trim();

  return {
    id: String(row.ID ?? row.id ?? invoiceNo),
    date: String(row.Date ?? row.date ?? ""),
    invoiceNo,
    partyName: String(row["Party Name"] ?? row.partyName ?? "").trim(),
    transaction: String(row.Transaction ?? row.transaction ?? "Sale").trim(),
    paymentType: String(row["Payment Type"] ?? row.paymentType ?? "").trim(),
    amount: Number.isFinite(amountValue) ? amountValue : 0,
    balance: Number.isFinite(balanceValue) ? balanceValue : 0,
    status:
      statusValue.toLowerCase() === "unpaid" || balanceValue > 0
        ? "Unpaid"
        : "Paid",
  };
}

function getInvoiceDate(value: string): string {
  const datePart = value.trim().split(",")[0];
  const match = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

export default function SaleInvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<SaleInvoice[]>(initialInvoices);

  const [search, setSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filtered = invoices.filter((inv) => {
    const invoiceDate = getInvoiceDate(inv.date);

    const matchesSearch =
      inv.partyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase());

    const matchesFromDate = !fromDate || invoiceDate >= fromDate;

    const matchesToDate = !toDate || invoiceDate <= toDate;

    return matchesSearch && matchesFromDate && matchesToDate;
  });

  /*
   * Load previously saved invoice data.
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setInvoices(parsed);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialInvoices));
      }
    } catch (error) {
      console.error("Failed to load sale invoices:", error);
    }
  }, []);

  /*
   * Save invoices whenever they change.
   */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (error) {
      console.error("Failed to save sale invoices:", error);
    }
  }, [invoices]);

  const totalSales = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const totalReceived = invoices.reduce(
    (sum, inv) => sum + (inv.amount - inv.balance),
    0,
  );

  const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

  /*
   * REAL EXCEL EXPORT
   *
   * Creates an actual .xlsx file.
   */
  const handleExcelExport = () => {
    try {
      const excelData = invoices.map((inv) => ({
        ID: inv.id,
        Date: inv.date,
        "Invoice no.": inv.invoiceNo,
        "Party Name": inv.partyName,
        Transaction: inv.transaction,
        "Payment Type": inv.paymentType,
        Amount: inv.amount,
        Balance: inv.balance,
        Status: inv.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet["!cols"] = [
        { wch: 12 },
        { wch: 24 },
        { wch: 15 },
        { wch: 28 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Sale Invoices");

      XLSX.writeFile(workbook, "BillMint-Sale-Invoices.xlsx");
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Unable to export Excel file.");
    }
  };

  /*
   * Open system file picker for Excel import.
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /*
   * REAL EXCEL IMPORT
   *
   * Reads an edited .xlsx file and updates
   * Sale Invoices with the Excel data.
   */
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

      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        alert("The Excel file does not contain a sheet.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: "",
        },
      );

      const importedInvoices = rows
        .map(normalizeInvoice)
        .filter((invoice): invoice is SaleInvoice => invoice !== null);

      if (importedInvoices.length === 0) {
        alert("No valid Sale Invoice data was found in the Excel file.");
        return;
      }

      setInvoices(importedInvoices);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedInvoices));

      alert(
        `${importedInvoices.length} sale invoice${
          importedInvoices.length === 1 ? "" : "s"
        } imported successfully.`,
      );
    } catch (error) {
      console.error("Excel import failed:", error);
      alert(
        "Unable to read the Excel file. Please use the Excel file exported from BillMint.",
      );
    } finally {
      /*
       * Allows selecting the same file again later.
       */
      event.target.value = "";
    }
  };

  /*
   * Print the complete Sale Invoice page.
   */
  const handlePrint = () => {
    window.print();
  };

  /*
   * PDF uses the browser's print dialog.
   * User can select "Save as PDF".
   */
  const handlePDF = () => {
    window.print();
  };

  /*
   * Share an individual invoice.
   */
  const handleShare = async (invoice: SaleInvoice) => {
    const shareText = `
BillMint Sale Invoice

Invoice No: ${invoice.invoiceNo}
Date: ${invoice.date}
Party: ${invoice.partyName}
Transaction: ${invoice.transaction}
Payment Type: ${invoice.paymentType}
Amount: ₹ ${invoice.amount.toLocaleString("en-IN")}
Balance: ₹ ${invoice.balance.toLocaleString("en-IN")}
Status: ${invoice.status}
`.trim();

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
    } catch (error) {
      /*
       * User closing the native share window
       * should not show an error.
       */
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        alert("Invoice details copied to clipboard.");
      } catch {
        alert("Unable to share this invoice.");
      }
    }
  };

  /*
   * Print one invoice.
   */
  const handleRowPrint = (invoice: SaleInvoice) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Please allow pop-ups in your browser to print the invoice.");
      return;
    }

    const amount = invoice.amount.toLocaleString("en-IN");

    const balance = invoice.balance.toLocaleString("en-IN");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNo}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, Helvetica, sans-serif;
              color: #222;
              background: #fff;
            }

            .invoice {
              max-width: 800px;
              margin: 0 auto;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #222;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            .brand {
              font-size: 28px;
              font-weight: 700;
            }

            .title {
              font-size: 22px;
              font-weight: 700;
              text-align: right;
            }

            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
              margin-bottom: 30px;
            }

            .detail {
              border: 1px solid #ddd;
              padding: 14px;
              border-radius: 6px;
            }

            .label {
              color: #777;
              font-size: 12px;
              margin-bottom: 5px;
            }

            .value {
              font-size: 15px;
              font-weight: 600;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }

            th {
              background: #f5f5f5;
            }

            .right {
              text-align: right;
            }

            .total {
              margin-top: 25px;
              margin-left: auto;
              width: 300px;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }

            .grand-total {
              font-size: 20px;
              font-weight: 700;
              border-top: 2px solid #222;
              padding-top: 12px;
            }

            .status {
              font-weight: 700;
            }

            .footer {
              margin-top: 50px;
              text-align: center;
              color: #777;
              font-size: 12px;
            }

            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>

        <body>
          <div class="invoice">

            <div class="header">
              <div class="brand">
                BillMint
              </div>

              <div>
                <div class="title">
                  SALE INVOICE
                </div>

                <div>
                  Invoice No: ${invoice.invoiceNo}
                </div>

                <div>
                  Date: ${invoice.date}
                </div>
              </div>
            </div>

            <div class="details">

              <div class="detail">
                <div class="label">
                  PARTY NAME
                </div>

                <div class="value">
                  ${escapeHtml(invoice.partyName)}
                </div>
              </div>

              <div class="detail">
                <div class="label">
                  PAYMENT TYPE
                </div>

                <div class="value">
                  ${escapeHtml(invoice.paymentType)}
                </div>
              </div>

              <div class="detail">
                <div class="label">
                  TRANSACTION
                </div>

                <div class="value">
                  ${escapeHtml(invoice.transaction)}
                </div>
              </div>

              <div class="detail">
                <div class="label">
                  STATUS
                </div>

                <div class="value status">
                  ${escapeHtml(invoice.status)}
                </div>
              </div>

            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    Sale Invoice ${invoice.invoiceNo}
                  </td>

                  <td class="right">
                    ₹ ${amount}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="total">

              <div class="total-row">
                <span>Total Amount</span>
                <strong>
                  ₹ ${amount}
                </strong>
              </div>

              <div class="total-row">
                <span>Balance</span>
                <strong>
                  ₹ ${balance}
                </strong>
              </div>

              <div class="total-row grand-total">
                <span>Payable</span>
                <span>
                  ₹ ${amount}
                </span>
              </div>

            </div>

            <div class="footer">
              Generated by BillMint
            </div>

          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Hidden Excel file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelImport}
        className="hidden"
      />

      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-800">Sale Invoices</h1>

          <span className="text-gray-400">▼</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Excel */}
          <button
            onClick={handleImportClick}
            title="Import Excel"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <Upload size={16} />
            Import
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExcelExport}
            title="Export to Excel"
            className="flex items-center gap-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            title="Print"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <Printer size={16} />
            Print
          </button>

          {/* PDF */}
          <button
            onClick={handlePDF}
            title="Save as PDF"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium"
          >
            <FileText size={16} />
            PDF
          </button>

          {/* Add Sale */}
          <button
            onClick={() => router.push("/sales/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-medium"
          >
            + Add Sale
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-4 text-sm print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Filter by:</span>

          <select className="border rounded px-2 py-1">
            <option>Custom</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-1"
          />

          <span>To</span>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
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
          <div className="text-sm text-gray-500">Total Sales Amount</div>

          <div className="text-2xl font-bold">
            ₹ {totalSales.toLocaleString("en-IN")}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Received</div>

          <div className="text-lg font-semibold text-green-600">
            ₹ {totalReceived.toLocaleString("en-IN")}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Balance</div>

          <div className="text-lg font-semibold text-red-500">
            ₹ {totalBalance.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3 print:hidden">
          <h2 className="font-medium text-gray-700">Transactions</h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search Transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-56"
            />

            <button
              className="p-1.5 border rounded hover:bg-gray-50"
              title="Search"
            >
              <Search size={16} />
            </button>
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
                <td className="py-3">{inv.date}</td>

                <td
                  className="py-3 cursor-pointer"
                  onClick={() => router.push(`/sales/${inv.id}`)}
                >
                  {inv.invoiceNo}
                </td>

                <td
                  className="py-3 font-medium cursor-pointer"
                  onClick={() => router.push(`/sales/${inv.id}`)}
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
                    inv.status === "Paid" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {inv.status}
                </td>

                {/* Actions */}
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {/* Share */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(inv);
                      }}
                      title="Share Invoice"
                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* Print */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowPrint(inv);
                      }}
                      title="Print Invoice"
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                    >
                      <Printer size={16} />
                    </button>

                    {/* More */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sales/${inv.id}`);
                      }}
                      title="More"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 py-4">
        BillMint — Sale Invoices
      </div>
    </div>
  );
}

/*
 * Prevent invoice data from breaking the
 * HTML used by the individual print window.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
