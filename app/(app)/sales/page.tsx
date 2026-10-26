"use client";
import { createPortal } from "react-dom";
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

  if (value && typeof value === "object" && "toString" in value) {
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] =
    useState<SaleInvoice | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 8,
    left: 8,
  });

  const activeMenuInvoice = invoices.find(
    (invoice) => invoice.id === openMenuId,
  );

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

    const matchesFromDate =
      !fromDate || (!!invoiceDate && invoiceDate >= fromDate);
    const matchesToDate = !toDate || (!!invoiceDate && invoiceDate <= toDate);

    const matchesStatus =
      statusFilter === "ALL" || invoice.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesFromDate && matchesToDate && matchesStatus;
  });

  const totalSales = filtered.reduce((sum, invoice) => sum + invoice.amount, 0);

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

  const handleRowPrint = async (invoice: SaleInvoice) => {
    try {
      // Fetch the complete, real sale record from the backend.
      const response = await api.sale(invoice.id);
      const sale = response?.data as any;
      const businessResponse = await api.businessSettings();
      const issuingBusiness = businessResponse.data.business;
      const invoiceSettings = businessResponse.data.settings;
      if (!sale) {
        alert("Unable to fetch the complete invoice details.");
        return;
      }

      const esc = (value: unknown): string =>
        escapeHtml(value == null || value === "" ? "—" : String(value));
      const issuingStoreName = esc(issuingBusiness.name || "BillMint");

      const issuingStoreAddress = esc(
        [
          issuingBusiness.address,
          issuingBusiness.city,
          issuingBusiness.state,
          issuingBusiness.pinCode,
        ]
          .filter(Boolean)
          .join(", "),
      );

      const issuingStorePhone = esc(issuingBusiness.phone || "");
      const issuingStoreEmail = esc(issuingBusiness.email || "");
      const issuingStoreGstin = esc(issuingBusiness.gstin || "");

      const termsText =
        invoiceSettings.termsAndConditions?.trim() ||
        "Goods once sold are subject to the seller's stated return and replacement policy.";

      const termsHtml = termsText
        .split(/\\r?\\n/)
        .map((line: string) => `<p>${esc(line)}</p>`)
        .join("");
      const money = (value: unknown): string =>
        formatINR(toNumber(value)).replace(/^₹\s?/, "");

      const dateValue = sale.date ? new Date(sale.date) : new Date();
      const invoiceDate = Number.isNaN(dateValue.getTime())
        ? esc(invoice.date)
        : dateValue.toLocaleDateString("en-GB");

      const invoiceTime = Number.isNaN(dateValue.getTime())
        ? ""
        : dateValue.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });

      const invoiceNumber = esc(sale.invoiceNumber ?? invoice.invoiceNo);
      const customerName = esc(
        sale.customer?.name ?? invoice.partyName ?? "Walk-in Customer",
      );

      const customerAddress = esc(
        sale.customer?.address ??
          sale.customer?.billingAddress ??
          sale.customer?.city ??
          "",
      );

      const customerPhone = esc(
        sale.customer?.phone ?? sale.customer?.mobile ?? "",
      );

      const items: any[] = Array.isArray(sale.items)
        ? sale.items
        : Array.isArray(sale.saleItems)
          ? sale.saleItems
          : [];

      if (items.length === 0) {
        alert(
          "This sale record has no item details. Please check the sale details API before printing.",
        );
        return;
      }

      const itemRows = items
        .map((item: any, index: number) => {
          const product = item.item ?? item.product ?? {};
          const inventoryUnit =
            item.inventoryUnit ?? item.inventoryUnits?.[0] ?? {};

          const itemName =
            item.itemName ??
            item.name ??
            product.name ??
            product.modelName ??
            "Item";

          const itemCode =
            item.itemCode ?? item.sku ?? product.itemCode ?? product.sku ?? "";

          const imei =
            item.imei ??
            item.serialNumber ??
            inventoryUnit.imei ??
            inventoryUnit.serialNumber ??
            "";

          const quantity = toNumber(item.quantity) || 1;
          const rate = toNumber(
            item.rate ?? item.unitPrice ?? item.price ?? item.sellingPrice,
          );
          const amount =
            toNumber(item.amount ?? item.total ?? item.lineTotal) ||
            quantity * rate;

          return `
          <tr>
            <td class="number">${index + 1}</td>
            <td class="item-name">
              <strong>${esc(itemName)}</strong>
              ${itemCode ? `<div class="subline">ITEM CODE: ${esc(itemCode)}</div>` : ""}
              ${imei ? `<div class="subline">IMEI: ${esc(imei)}</div>` : ""}
            </td>
            <td class="center">${quantity}</td>
            <td class="right">₹ ${money(rate)}</td>
            <td class="right">₹ ${money(amount)}</td>
            <td>${esc(itemCode)}</td>
          </tr>
        `;
        })
        .join("");

      const quantityTotal = items.reduce(
        (sum: number, item: any) => sum + (toNumber(item.quantity) || 1),
        0,
      );

      const subtotal = toNumber(sale.subtotal ?? sale.grandTotal);
      const total = toNumber(sale.grandTotal ?? sale.totalAmount);
      const received = toNumber(sale.paidAmount);
      const balance = Math.max(
        0,
        toNumber(sale.balanceAmount ?? total - received),
      );

      const amountInWords = (amount: number): string => {
        if (amount === 0) return "Zero Rupees only";

        const ones = [
          "",
          "One",
          "Two",
          "Three",
          "Four",
          "Five",
          "Six",
          "Seven",
          "Eight",
          "Nine",
          "Ten",
          "Eleven",
          "Twelve",
          "Thirteen",
          "Fourteen",
          "Fifteen",
          "Sixteen",
          "Seventeen",
          "Eighteen",
          "Nineteen",
        ];
        const tens = [
          "",
          "",
          "Twenty",
          "Thirty",
          "Forty",
          "Fifty",
          "Sixty",
          "Seventy",
          "Eighty",
          "Ninety",
        ];

        const underThousand = (n: number): string => {
          let result = "";
          if (n >= 100) {
            result += `${ones[Math.floor(n / 100)]} Hundred `;
            n %= 100;
          }
          if (n >= 20) {
            result += `${tens[Math.floor(n / 10)]} `;
            n %= 10;
          }
          if (n > 0) result += `${ones[n]} `;
          return result.trim();
        };

        let n = Math.floor(Math.abs(amount));
        const parts: string[] = [];

        const crore = Math.floor(n / 10000000);
        if (crore) {
          parts.push(`${underThousand(crore)} Crore`);
          n %= 10000000;
        }

        const lakh = Math.floor(n / 100000);
        if (lakh) {
          parts.push(`${underThousand(lakh)} Lakh`);
          n %= 100000;
        }

        const thousand = Math.floor(n / 1000);
        if (thousand) {
          parts.push(`${underThousand(thousand)} Thousand`);
          n %= 1000;
        }

        if (n) parts.push(underThousand(n));

        return `${parts.join(" ")} Rupees only`;
      };

      const paymentMode = esc(
        String(sale.paymentMethod ?? invoice.paymentType ?? "Credit")
          .replaceAll("_", " ")
          .replaceAll("-", " "),
      );

      const printWindow = window.open("", "_blank", "width=1000,height=800");

      if (!printWindow) {
        alert("Please allow pop-ups in your browser to print the invoice.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Surebuy Invoice ${invoiceNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 14mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #111;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
          }

          .invoice-header {
            position: relative;
            border-bottom: 1px solid #555;
            padding: 0 6px 6px;
          }

          .store-name {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 5px;
          }

          .store-line {
            font-size: 12px;
            line-height: 19px;
          }

          .logo {
            position: absolute;
            right: 15px;
            top: 16px;
            width: 65px;
            max-height: 55px;
            object-fit: contain;
          }

          .invoice-title {
            text-align: center;
            font-size: 23px;
            font-weight: 700;
            margin: 15px 0 22px;
          }

          .billing {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin: 0 4px 12px;
          }

          .section-heading {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .customer-name {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .customer-line {
            line-height: 19px;
          }

          .invoice-meta {
            text-align: right;
          }

          .invoice-meta div {
            line-height: 24px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          thead {
            border-top: 1px solid #888;
            border-bottom: 1px solid #888;
          }

          th {
            text-align: left;
            padding: 6px 4px;
            font-size: 12px;
            font-weight: 700;
          }

          td {
            padding: 7px 4px;
            vertical-align: top;
            overflow-wrap: anywhere;
          }

          .number { width: 5%; }
          .item-name { width: 39%; }
          .qty { width: 8%; }
          .rate { width: 15%; }
          .amount { width: 15%; }
          .code { width: 18%; }

          .item-name strong {
            font-size: 12px;
            line-height: 16px;
          }

          .subline {
            font-size: 10px;
            margin-top: 3px;
            line-height: 13px;
          }

          .center { text-align: center; }
          .right { text-align: right; }

          .total-row {
            border-top: 1px solid #888;
            border-bottom: 1px solid #888;
            font-weight: 700;
          }

          .total-row td {
            padding-top: 7px;
            padding-bottom: 7px;
          }

          .bottom-section {
            display: grid;
            grid-template-columns: 1.05fr 1fr;
            gap: 28px;
            margin-top: 23px;
            page-break-inside: avoid;
          }

          .bottom-heading {
            font-weight: 700;
            font-size: 13px;
            margin-bottom: 9px;
          }

          .words {
            line-height: 20px;
            margin-bottom: 18px;
          }

          .terms p {
            line-height: 17px;
            margin: 0 0 12px;
          }

          .summary-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 11px;
            font-size: 12px;
          }

          .summary-line.total {
            font-weight: 700;
          }

          .summary-line.balance {
            border-bottom: 1px solid #888;
            padding-bottom: 7px;
          }

          .signature {
            margin-top: 25px;
            text-align: center;
            page-break-inside: avoid;
          }

          .signature-for {
            margin-bottom: 18px;
          }

          .signature-space {
            height: 44px;
          }

          .signature-label {
            font-weight: 700;
            font-size: 13px;
          }

          .page-header {
            display: none;
          }

          @media print {
            .page-header {
              display: block;
            }

            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
              <header class="invoice-header">
          <div class="store-name">${issuingStoreName}</div>
          ${issuingStoreAddress !== "—" ? `DIL3` : ""}
          ${issuingStorePhone !== "—" && issuingStorePhone ? `DIL4` : ""}
          ${issuingStoreEmail !== "—" && issuingStoreEmail ? `DIL5` : ""}
          ${issuingStoreGstin !== "—" && issuingStoreGstin ? `DIL6` : ""}
        </header>

        <div class="invoice-title">USED MOBILES</div>

        <section class="billing">
          <div>
            <div class="section-heading">Bill To</div>
            <div class="customer-name">${customerName}</div>
            ${customerAddress !== "—" ? `<div class="customer-line">${customerAddress}</div>` : ""}
            ${customerPhone !== "—" ? `<div class="customer-line">Contact No. : ${customerPhone}</div>` : ""}
          </div>

          <div class="invoice-meta">
            <div class="section-heading">Invoice Details</div>
            <div>Invoice No. : ${invoiceNumber}</div>
            <div>Date : ${esc(invoiceDate)}</div>
            <div>Time : ${esc(invoiceTime)}</div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th class="number">#</th>
              <th class="item-name">Item name</th>
              <th class="qty center">Quantity</th>
              <th class="rate right">Price/ Unit</th>
              <th class="amount right">Amount</th>
              <th class="code">Item Code</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="total-row">
              <td></td>
              <td>Total</td>
              <td class="center">${quantityTotal}</td>
              <td></td>
              <td class="right">₹ ${money(total)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <section class="bottom-section">
          <div>
            <div class="bottom-heading">Invoice Amount In Words</div>
            <div class="words">${esc(amountInWords(total))}</div>

            <div class="bottom-heading">Terms and Conditions</div>
                      <div class="terms">
              ${termsHtml}
            </div>
          </div>

          <div>
            <div class="summary-line">
              <span>Sub Total</span>
              <span>₹ ${money(subtotal)}</span>
            </div>
            <div class="summary-line total">
              <span>Total</span>
              <span>₹ ${money(total)}</span>
            </div>
            <div class="summary-line">
              <span>Received</span>
              <span>₹ ${money(received)}</span>
            </div>
            <div class="summary-line">
              <span>Balance</span>
              <span>₹ ${money(balance)}</span>
            </div>
            <div class="summary-line balance">
              <span>Payment mode</span>
              <span>${paymentMode}</span>
            </div>

            <div class="signature">
              <div class="signature-for">For: ${issuingStoreName}</div>
                            <div class="signature-space"></div>
              <div class="signature-label">Authorized Signatory</div>
            </div>
          </div>
        </section>
      </body>
      </html>
    `);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Invoice printing failed:", error);
      alert(
        error instanceof Error
          ? `Unable to print invoice: ${error.message}`
          : "Unable to print invoice. Please try again.",
      );
    }
  };
  const handleViewInvoice = (invoice: SaleInvoice) => {
    setOpenMenuId(null);
    router.push(`/sales/${encodeURIComponent(invoice.id)}`);
  };

  const handleEditInvoice = async (invoice: SaleInvoice) => {
    setOpenMenuId(null);

    try {
      setActionLoadingId(invoice.id);

      const response = await api.sale(invoice.id);
      const sale = response?.data;

      if (!sale) {
        alert("Unable to load this invoice.");
        return;
      }
      router.push(`/sales/new?edit=${encodeURIComponent(invoice.id)}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to open the invoice for editing.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelInvoice = async (invoice: SaleInvoice) => {
    setOpenMenuId(null);

    if (invoice.status === "Cancelled") {
      alert("This invoice is already cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel invoice ${invoice.invoiceNo}?\n\nThis operation may restore stock and serialized inventory. Continue only if this sale should be cancelled.`,
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(invoice.id);
      await api.cancelSale(invoice.id);
      await loadInvoices(true);
      alert(`Invoice ${invoice.invoiceNo} cancelled successfully.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to cancel this invoice.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteInvoice = (invoice: SaleInvoice) => {
    setOpenMenuId(null);
    setDeleteConfirmInvoice(invoice);
  };

  const confirmDeleteInvoice = async () => {
    const invoice = deleteConfirmInvoice;

    if (!invoice) return;

    try {
      setActionLoadingId(invoice.id);

      // The backend permanently deletes the invoice and its line rows.
      await api.deleteSale(invoice.id);

      // Remove it immediately from the visible Sales list.
      setInvoices((current) =>
        current.filter((entry) => entry.id !== invoice.id),
      );

      setDeleteConfirmInvoice(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete this invoice.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {" "}
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
            type="button"
            onClick={() => {
              if (filtered.length > 0) {
                void handleRowPrint(filtered[0]);
              } else {
                alert("No invoice is available to print.");
              }
            }}
            disabled={loading || filtered.length === 0}
            title="Print the first invoice in the current results"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            onClick={() => {
              if (filtered.length > 0) {
                void handleRowPrint(filtered[0]);
              } else {
                alert("No invoice is available to save as PDF.");
              }
            }}
            disabled={loading || filtered.length === 0}
            title="Save the first invoice in the current results as PDF"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium disabled:opacity-50"
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
          <div className="text-2xl font-bold">₹ {formatINR(totalSales)}</div>
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

        <div className="relative min-w-0 overflow-x-auto overflow-y-visible">
          {" "}
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
              ) : (
                !error &&
                filtered.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-blue-50">
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {invoice.date}
                    </td>

                    <td
                      className="py-3 pr-3 text-blue-600 hover:underline cursor-pointer"
                      onClick={() =>
                        router.push(`/sales/${encodeURIComponent(invoice.id)}`)
                      }
                    >
                      {invoice.invoiceNo}
                    </td>

                    <td
                      className="py-3 pr-3 font-medium cursor-pointer"
                      onClick={() =>
                        router.push(`/sales/${encodeURIComponent(invoice.id)}`)
                      }
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

                        <div>
                          <button
                            type="button"
                            title="More actions"
                            aria-label={`More actions for ${invoice.invoiceNo}`}
                            aria-expanded={openMenuId === invoice.id}
                            disabled={actionLoadingId === invoice.id}
                            onClick={(event) => {
                              if (openMenuId === invoice.id) {
                                setOpenMenuId(null);
                                return;
                              }

                              const rect =
                                event.currentTarget.getBoundingClientRect();
                              const menuWidth = 208;
                              const menuHeight = 220;
                              const spaceBelow =
                                window.innerHeight - rect.bottom;
                              const showAbove = spaceBelow < menuHeight + 12;

                              setMenuPosition({
                                top: Math.max(
                                  8,
                                  showAbove
                                    ? rect.top - menuHeight - 4
                                    : rect.bottom + 4,
                                ),
                                left: Math.max(
                                  8,
                                  Math.min(
                                    rect.right - menuWidth,
                                    window.innerWidth - menuWidth - 8,
                                  ),
                                ),
                              });

                              setOpenMenuId(invoice.id);
                            }}
                            className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId &&
                            activeMenuInvoice &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <>
                                <button
                                  type="button"
                                  aria-label="Close invoice actions"
                                  className="fixed inset-0 z-[9998] cursor-default"
                                  onClick={() => setOpenMenuId(null)}
                                />

                                <div
                                  style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                  }}
                                  className="fixed z-[9999] w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-gray-800 shadow-xl"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleViewInvoice(activeMenuInvoice);
                                    }}
                                    className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                                  >
                                    View Invoice
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      void handleRowPrint(activeMenuInvoice);
                                    }}
                                    className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                                  >
                                    Print Invoice
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      actionLoadingId === activeMenuInvoice.id
                                    }
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      void handleEditInvoice(activeMenuInvoice);
                                    }}
                                    className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    Edit Invoice
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      actionLoadingId ===
                                        activeMenuInvoice.id ||
                                      activeMenuInvoice.status === "Cancelled"
                                    }
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      void handleCancelInvoice(
                                        activeMenuInvoice,
                                      );
                                    }}
                                    className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                  >
                                    Cancel Invoice
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      actionLoadingId === activeMenuInvoice.id
                                    }
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      void handleDeleteInvoice(
                                        activeMenuInvoice,
                                      );
                                    }}
                                    className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Delete Invoice
                                  </button>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}

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
            Showing the first 100 invoices returned by the API. Pagination can
            be added to load the remaining records.
          </p>
        )}
      </div>
      <div className="hidden print:block text-center text-xs text-gray-500 py-4">
        BillMint — Sale Invoices
      </div>
      {deleteConfirmInvoice && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-invoice-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <span className="text-xl font-bold">!</span>
              </div>

              <div>
                <h2
                  id="delete-invoice-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Delete invoice permanently?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Are you sure you want to delete invoice{" "}
                  <strong>{deleteConfirmInvoice.invoiceNo}</strong>? This action
                  cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                disabled={actionLoadingId === deleteConfirmInvoice.id}
                onClick={() => setDeleteConfirmInvoice(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoadingId === deleteConfirmInvoice.id}
                onClick={() => void confirmDeleteInvoice()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoadingId === deleteConfirmInvoice.id
                  ? "Deleting..."
                  : "OK, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
