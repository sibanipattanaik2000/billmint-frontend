"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

type ModuleType =
  | "parties"
  | "items"
  | "sale-invoices"
  | "purchase-invoices"
  | "expenses";

type TabType = "export" | "import";
type CsvRow = Record<string, string>;

type ImportResult = {
  created: number;
  failed: number;
  errors: string[];
  failedRows: CsvRow[];
};

const MODULES: { id: ModuleType; label: string; icon: string }[] = [
  { id: "parties", label: "Parties (Customers & Suppliers)", icon: "👥" },
  { id: "items", label: "Items / Products", icon: "📦" },
  { id: "sale-invoices", label: "Sale Invoices", icon: "🧾" },
  { id: "purchase-invoices", label: "Purchase Invoices", icon: "🛒" },
  { id: "expenses", label: "Expenses", icon: "💸" },
];

const CSV_HEADERS: Record<ModuleType, string[]> = {
  parties: [
    "Name",
    "Type",
    "Phone",
    "Email",
    "Business Name",
    "Address",
    "City",
    "State",
    "PIN Code",
    "GSTIN",
    "PAN",
    "Opening Balance",
    "Notes",
  ],
  items: [
    "Name",
    "Model Name",
    "SKU",
    "Device Code",
    "Barcode",
    "IMEI",
    "Category ID",
    "Brand ID",
    "Unit ID",
    "Supplier ID",
    "Description",
    "Purchase Price",
    "Sale Price",
    "MRP",
    "Opening Stock",
    "Minimum Stock",
    "GST Rate",
    "HSN/SAC",
    "Discount Percent",
    "Track Batch",
    "Track Serial",
    "Track Expiry",
  ],
  "sale-invoices": [
    "Date",
    "Invoice Number",
    "Customer",
    "Status",
    "Grand Total",
    "Paid Amount",
    "Balance Amount",
  ],
  "purchase-invoices": [
    "Date",
    "Bill Number",
    "Supplier",
    "Status",
    "Grand Total",
    "Paid Amount",
    "Balance Amount",
  ],
  expenses: [
    "Date",
    "Category",
    "Description",
    "Amount",
    "Payment Method",
    "Notes",
  ],
};

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\r\n");
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = input.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unclosed quoted field.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((values) =>
    values.some((value) => value.trim() !== ""),
  );
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * IMEIs are identifiers, not quantities.
 * Read raw Excel values so formatting does not convert an identifier
 * into a scientific-notation display string.
 */
function spreadsheetCellToString(
  value: unknown,
  header: string,
  rowNumber: number,
): string {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  const normalizedHeader = normalizeHeader(header);
  const isImeiColumn =
    normalizedHeader === "imei" || normalizedHeader === "imei number";

  if (
    isImeiColumn &&
    /^\d+(?:\.\d+)?[eE][+-]?\d+$/.test(text)
  ) {
    throw new Error(
      `Data row ${rowNumber}: IMEI is written in scientific notation ("${text}"). Enter the original 15-digit IMEI as text. If Excel has rounded the original digits, they cannot be recovered from this value.`,
    );
  }

  return text;
}

function spreadsheetToObjects(grid: unknown[][]): {
  headers: string[];
  rows: CsvRow[];
} {
  const trimmedGrid = grid.map((sourceRow) => {
    const row = [...sourceRow];

    while (
      row.length > 0 &&
      String(row[row.length - 1] ?? "").trim() === ""
    ) {
      row.pop();
    }

    return row;
  });

  const nonEmptyRows = trimmedGrid.filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );

  if (nonEmptyRows.length < 2) {
    throw new Error(
      "The file must contain a header row and at least one data row.",
    );
  }

  const originalHeaders = nonEmptyRows[0].map((value) =>
    String(value ?? "").trim(),
  );

  const normalizedHeaders = originalHeaders.map(normalizeHeader);

  if (normalizedHeaders.some((header) => !header)) {
    throw new Error("The file contains an empty column header.");
  }

  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new Error(
      "The file contains duplicate column headers. Rename duplicate columns and upload again.",
    );
  }

  const rows: CsvRow[] = nonEmptyRows.slice(1).map((values, rowIndex) => {
    const hasExtraData = values
      .slice(originalHeaders.length)
      .some((value) => String(value ?? "").trim() !== "");

    if (hasExtraData) {
      throw new Error(
        `Data row ${rowIndex + 2} contains values beyond the last header column. Add the missing column header or correct the spreadsheet.`,
      );
    }

    const row: CsvRow = {};

    normalizedHeaders.forEach((header, index) => {
      row[header] = spreadsheetCellToString(
        values[index],
        header,
        rowIndex + 2,
      );
    });

    return row;
  });

  return { headers: originalHeaders, rows };
}

function parseBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (!value?.trim()) return defaultValue;

  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "1", "y"].includes(normalized)) return true;
  if (["false", "no", "0", "n"].includes(normalized)) return false;

  throw new Error(
    `Expected Yes/No or True/False, but received "${value}".`,
  );
}

function getField(row: CsvRow, name: string): string {
  const normalized = normalizeHeader(name);
  const direct = row[normalized];

  if (direct !== undefined) return direct;

  const aliases: Record<string, string[]> = {
    name: ["item name"],
    imei: ["imei number"],
    "opening stock": ["quantity"],
  };

  for (const alias of aliases[normalized] ?? []) {
    const value = row[alias];
    if (value !== undefined) return value;
  }

  return "";
}

function getItemField(row: CsvRow, name: string): string {
  const directValue = getField(row, name);

  if (directValue) return directValue;

  const aliases: Record<string, string[]> = {
    Name: ["Item Name"],
    IMEI: ["IMEI Number"],
  };

  for (const alias of aliases[name] ?? []) {
    const value = getField(row, alias);
    if (value) return value;
  }

  return "";
}

function getItemOpeningStock(row: CsvRow): number {
  return (
    optionalNumber(row, "Opening Stock") ??
    optionalNumber(row, "Quantity") ??
    0
  );
}

function getItemTrackSerial(
  row: CsvRow,
  imei: string | undefined,
): boolean {
  const value = getField(row, "Track Serial");

  // Infer serial tracking if IMEI exists and Track Serial is blank.
  if (!value.trim()) return Boolean(imei);

  // Honor an explicit Yes/No selection.
  return parseBoolean(value);
}

function optionalNumber(
  row: CsvRow,
  name: string,
): number | undefined {
  const value = getField(row, name);
  if (!value) return undefined;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return parsed;
}

function requiredNumber(row: CsvRow, name: string): number {
  const value = optionalNumber(row, name);

  if (value === undefined) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function optionalValue(value: string): string | undefined {
  return value.trim() || undefined;
}

function toIsoDate(value: string): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
  }

  return date.toISOString();
}

function dateOnly(value: unknown): string {
  if (!value) return "";

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toISOString().slice(0, 10);
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function fetchAllPages<T>(
  fetchPage: (params: { page: number; limit: number }) => Promise<{
    data: T[];
    pagination?: { totalPages?: number };
  }>,
): Promise<T[]> {
  const all: T[] = [];
  const limit = 100;
  let page = 1;

  while (true) {
    const result = await fetchPage({ page, limit });

    if (!Array.isArray(result.data)) {
      throw new Error("The server returned an invalid data response.");
    }

    all.push(...result.data);

    const totalPages = result.pagination?.totalPages;

    if (typeof totalPages !== "number" || page >= totalPages) {
      break;
    }

    page += 1;

    if (page > 10000) {
      throw new Error(
        "Export stopped because the page limit was exceeded.",
      );
    }
  }

  return all;
}

function ensureSupportedImport(module: ModuleType): void {
  if (
    module === "sale-invoices" ||
    module === "purchase-invoices"
  ) {
    throw new Error(
      "Invoice import is not enabled. Invoice creation requires validation of invoice line items, party references, numbering, stock and payment balances. Export is available.",
    );
  }
}

function validateItemRows(rows: CsvRow[]): string[] {
  const errors: string[] = [];
  const seenSku = new Set<string>();
  const seenBarcode = new Set<string>();
  const seenImei = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const name = getItemField(row, "Name");
      if (!name) throw new Error("Name is required.");

      const sku = optionalValue(getItemField(row, "SKU"));
      const barcode = optionalValue(getItemField(row, "Barcode"));
      const imei = optionalValue(getItemField(row, "IMEI"));

      const openingStock = getItemOpeningStock(row);
      const purchasePrice = optionalNumber(row, "Purchase Price") ?? 0;
      const salePrice = optionalNumber(row, "Sale Price") ?? 0;
      const mrp = optionalNumber(row, "MRP");
      const minimumStock = optionalNumber(row, "Minimum Stock") ?? 0;
      const gstRate = optionalNumber(row, "GST Rate") ?? 18;
      const discountPercent =
        optionalNumber(row, "Discount Percent") ?? 0;

      const trackSerial = getItemTrackSerial(row, imei);

      if (
        purchasePrice < 0 ||
        salePrice < 0 ||
        (mrp !== undefined && mrp < 0) ||
        openingStock < 0 ||
        minimumStock < 0
      ) {
        throw new Error("Prices and stock cannot be negative.");
      }

      if (gstRate < 0 || gstRate > 100) {
        throw new Error("GST Rate must be between 0 and 100.");
      }

      if (discountPercent < 0 || discountPercent > 100) {
        throw new Error(
          "Discount Percent must be between 0 and 100.",
        );
      }

      if (trackSerial) {
        if (!imei || !/^\d{15}$/.test(imei)) {
          throw new Error(
            "Track Serial requires an IMEI containing exactly 15 digits.",
          );
        }

        if (openingStock > 1) {
          throw new Error(
            "A serialized item can have maximum opening stock of 1. Each individual IMEI represents one physical device.",
          );
        }
      } else if (imei) {
        throw new Error(
          "Provide an IMEI only when Track Serial is Yes.",
        );
      }

      const identifiers: Array<
        [string | undefined, Set<string>, string]
      > = [
        [sku, seenSku, "SKU"],
        [barcode, seenBarcode, "Barcode"],
        [imei, seenImei, "IMEI"],
      ];

      for (const [value, seen, label] of identifiers) {
        if (!value) continue;

        if (seen.has(value)) {
          throw new Error(
            `Duplicate ${label} "${value}" in this file.`,
          );
        }

        seen.add(value);
      }
    } catch (error) {
      errors.push(
        `Row ${rowNumber}: ${
          error instanceof Error
            ? error.message
            : "Invalid item data."
        }`,
      );
    }
  });

  return errors;
}

async function importRows(
  module: ModuleType,
  rows: CsvRow[],
): Promise<ImportResult> {
  ensureSupportedImport(module);

  const result: ImportResult = {
    created: 0,
    failed: 0,
    errors: [],
    failedRows: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      if (module === "parties") {
        const name = getField(row, "Name");
        const type = getField(row, "Type").toLowerCase();

        if (!name) throw new Error("Name is required.");

        if (type !== "customer" && type !== "supplier") {
          throw new Error(
            'Type must be either "Customer" or "Supplier".',
          );
        }

        const common = {
          name,
          phone: optionalValue(getField(row, "Phone")),
          email: optionalValue(getField(row, "Email")),
          businessName: optionalValue(
            getField(row, "Business Name"),
          ),
          address: optionalValue(getField(row, "Address")),
          city: optionalValue(getField(row, "City")),
          state: optionalValue(getField(row, "State")),
          pinCode: optionalValue(getField(row, "PIN Code")),
          gstin: optionalValue(getField(row, "GSTIN")),
          pan: optionalValue(getField(row, "PAN")),
          openingBalance:
            optionalNumber(row, "Opening Balance") ?? 0,
          notes: optionalValue(getField(row, "Notes")),
        };

        if (type === "customer") {
          await api.createCustomer(common);
        } else {
          await api.createSupplier(common);
        }
      } else if (module === "items") {
        const name = getItemField(row, "Name");
        if (!name) throw new Error("Name is required.");

        const imei = optionalValue(getItemField(row, "IMEI"));
        const trackSerial = getItemTrackSerial(row, imei);

        const payload = {
          name,
          sku: optionalValue(getItemField(row, "SKU")),
          barcode: optionalValue(getItemField(row, "Barcode")),
          imei,
          openingStock: getItemOpeningStock(row),
          modelName:
            optionalValue(getItemField(row, "Model Name")) ?? name,
          categoryId: optionalValue(getField(row, "Category ID")),
          brandId: optionalValue(getField(row, "Brand ID")),
          unitId: optionalValue(getField(row, "Unit ID")),
          supplierId: optionalValue(getField(row, "Supplier ID")),
          description: optionalValue(getField(row, "Description")),
          purchasePrice:
            optionalNumber(row, "Purchase Price") ?? 0,
          salePrice: optionalNumber(row, "Sale Price") ?? 0,
          mrp: optionalNumber(row, "MRP") ?? null,
          minimumStock: optionalNumber(row, "Minimum Stock") ?? 0,
          gstRate: optionalNumber(row, "GST Rate") ?? 18,
          hsnSac: optionalValue(getField(row, "HSN/SAC")),
          discountPercent:
            optionalNumber(row, "Discount Percent") ?? 0,
          trackBatch: parseBoolean(getField(row, "Track Batch")),
          trackSerial,
          trackExpiry: parseBoolean(getField(row, "Track Expiry")),
          deviceCode: optionalValue(getField(row, "Device Code")),
        };

        if (
          payload.purchasePrice < 0 ||
          payload.salePrice < 0 ||
          (payload.mrp !== null && payload.mrp < 0) ||
          payload.openingStock < 0 ||
          payload.minimumStock < 0
        ) {
          throw new Error("Prices and stock cannot be negative.");
        }

        if (payload.gstRate < 0 || payload.gstRate > 100) {
          throw new Error("GST Rate must be between 0 and 100.");
        }

        if (
          payload.discountPercent < 0 ||
          payload.discountPercent > 100
        ) {
          throw new Error(
            "Discount Percent must be between 0 and 100.",
          );
        }

        if (trackSerial) {
          if (!imei || !/^\d{15}$/.test(imei)) {
            throw new Error(
              "Track Serial requires an IMEI containing exactly 15 digits.",
            );
          }

          if (payload.openingStock > 1) {
            throw new Error(
              "A serialized item can have maximum opening stock of 1.",
            );
          }
        } else if (imei) {
          throw new Error(
            "Provide an IMEI only when Track Serial is Yes.",
          );
        }

        await api.createItem(payload);
      } else if (module === "expenses") {
        const amount = requiredNumber(row, "Amount");

        if (amount <= 0) {
          throw new Error("Amount must be greater than zero.");
        }

        const date = toIsoDate(getField(row, "Date"));
        const category = optionalValue(getField(row, "Category"));
        const description = optionalValue(
          getField(row, "Description"),
        );

        if (!category && !description) {
          throw new Error(
            "Provide a Category or Description for the expense.",
          );
        }

        await api.createExpense({
          amount,
          date,
          category,
          description,
          paymentMethod:
            optionalValue(getField(row, "Payment Method")) ?? "",
          notes: optionalValue(getField(row, "Notes")),
        });
      }

      result.created += 1;
    } catch (error) {
      result.failed += 1;

      const message =
        error instanceof Error ? error.message : "Unknown error";

      result.errors.push(`Row ${rowNumber}: ${message}`);
      result.failedRows.push(row);
    }
  }

  return result;
}

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<TabType>("export");
  const [selectedModule, setSelectedModule] =
    useState<ModuleType>("parties");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<CsvRow[]>([]);
  const [previewFileName, setPreviewFileName] = useState("");
  const [unsupportedColumns, setUnsupportedColumns] = useState<string[]>(
    [],
  );

  const selectedLabel =
    MODULES.find((module) => module.id === selectedModule)?.label ??
    selectedModule;

  function clearPreview(): void {
    setPreviewHeaders([]);
    setPreviewRows([]);
    setPreviewFileName("");
    setUnsupportedColumns([]);
  }

  function downloadTemplate(): void {
    if (
      selectedModule === "sale-invoices" ||
      selectedModule === "purchase-invoices"
    ) {
      setStatus(
        "Invoice templates are not offered for import because invoice creation requires validated line items and accounting reconciliation.",
      );
      setErrors([]);
      return;
    }

    downloadCsv(
      `billmint_${selectedModule}_template.csv`,
      toCsv(CSV_HEADERS[selectedModule], []),
    );

    setStatus("CSV template downloaded.");
    setErrors([]);
  }

  function downloadExcelTemplate(): void {
    if (
      selectedModule === "sale-invoices" ||
      selectedModule === "purchase-invoices"
    ) {
      setStatus(
        "Invoice templates are not offered for import because invoice creation requires validated line items and accounting reconciliation.",
      );
      setErrors([]);
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([
      CSV_HEADERS[selectedModule],
    ]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Import Template",
    );
    XLSX.writeFile(
      workbook,
      `billmint_${selectedModule}_template.xlsx`,
    );

    setStatus("Excel template downloaded.");
    setErrors([]);
  }

  async function handleExport(): Promise<void> {
    setBusy(true);
    setStatus("");
    setErrors([]);
    clearPreview();

    try {
      let headers: string[] = [];
      let rows: unknown[][] = [];

      if (selectedModule === "parties") {
        const [customers, suppliers] = await Promise.all([
          fetchAllPages<any>((params) => api.customers(params)),
          fetchAllPages<any>((params) => api.suppliers(params)),
        ]);

        headers = CSV_HEADERS.parties;

        rows = [
          ...customers.map((item) => [
            item.name,
            "Customer",
            item.phone,
            item.email,
            item.businessName,
            item.address,
            item.city,
            item.state,
            item.pinCode,
            item.gstin,
            item.pan,
            item.openingBalance,
            item.notes,
          ]),
          ...suppliers.map((item) => [
            item.name,
            "Supplier",
            item.phone,
            item.email,
            item.businessName,
            item.address,
            item.city,
            item.state,
            item.pinCode,
            item.gstin,
            item.pan,
            item.openingBalance,
            item.notes,
          ]),
        ];
      } else if (selectedModule === "items") {
        const items = await fetchAllPages<any>((params) =>
          api.items(params),
        );

        headers = CSV_HEADERS.items;

        const groupedItems = new Map<
          string,
          { item: any; stock: number }
        >();

        items.forEach((item, index) => {
          const modelName =
            item.modelName?.trim() || item.name?.trim() || "";

          // Never combine individual serial-tracked devices.
          const isSerialTracked = Boolean(item.trackSerial || item.imei);

          // Combine only records whose other importable fields match.
          const groupKey = isSerialTracked
            ? `serial:${item.id ?? index}`
            : JSON.stringify({
                modelName,
                name: item.name,
                sku: item.sku,
                deviceCode: item.deviceCode,
                barcode: item.barcode,
                categoryId: item.category?.id,
                brandId: item.brand?.id,
                unitId: item.unit?.id,
                supplierId: item.supplier?.id,
                description: item.description,
                purchasePrice: item.purchasePrice,
                salePrice: item.salePrice,
                mrp: item.mrp,
                minimumStock: item.minimumStock,
                gstRate: item.gstRate,
                hsnSac: item.hsnSac,
                discountPercent: item.discountPercent,
                trackBatch: item.trackBatch,
                trackSerial: item.trackSerial,
                trackExpiry: item.trackExpiry,
              });

          const existing = groupedItems.get(groupKey);

          if (existing) {
            existing.stock += Number(item.currentStock) || 0;
          } else {
            groupedItems.set(groupKey, {
              item,
              stock: Number(item.currentStock) || 0,
            });
          }
        });

        rows = Array.from(groupedItems.values()).map(
          ({ item, stock }) => [
            item.name,
            item.modelName ?? item.name,
            item.sku,
            item.deviceCode,
            item.barcode,
            item.imei,
            item.category?.id,
            item.brand?.id,
            item.unit?.id,
            item.supplier?.id,
            item.description,
            item.purchasePrice,
            item.salePrice,
            item.mrp,
            stock,
            item.minimumStock,
            item.gstRate,
            item.hsnSac,
            item.discountPercent,
            item.trackBatch,
            item.trackSerial,
            item.trackExpiry,
          ],
        );
      } else if (selectedModule === "sale-invoices") {
        const sales = await fetchAllPages<any>((params) =>
          api.sales(params),
        );

        headers = CSV_HEADERS["sale-invoices"];

        rows = sales.map((sale) => [
          dateOnly(sale.date),
          sale.invoiceNumber,
          sale.customer?.name,
          sale.status,
          sale.grandTotal,
          sale.paidAmount,
          sale.balanceAmount,
        ]);
      } else if (selectedModule === "purchase-invoices") {
        const purchases = await fetchAllPages<any>((params) =>
          api.purchases(params),
        );

        headers = CSV_HEADERS["purchase-invoices"];

        rows = purchases.map((purchase) => [
          dateOnly(purchase.date),
          purchase.billNumber,
          purchase.supplier?.name,
          purchase.status,
          purchase.grandTotal,
          purchase.paidAmount,
          purchase.balanceAmount,
        ]);
      } else {
        const expenses = await fetchAllPages<any>((params) =>
          api.expenses(params),
        );

        headers = CSV_HEADERS.expenses;

        rows = expenses.map((expense) => [
          dateOnly(expense.date),
          expense.category?.name ?? expense.category,
          expense.description,
          expense.amount,
          expense.paymentMethod,
          expense.notes,
        ]);
      }

      downloadCsv(
        `billmint_${selectedModule}_${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(headers, rows),
      );

      setStatus(
        `Export completed: ${rows.length} records downloaded from your account.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus("");
    setErrors([]);
    clearPreview();

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["csv", "xlsx", "xls"].includes(extension ?? "")) {
        throw new Error(
          "Choose an Excel (.xlsx, .xls) or CSV (.csv) file.",
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be 5 MB or less.");
      }

      ensureSupportedImport(selectedModule);

      let grid: unknown[][];

      if (extension === "csv") {
        grid = parseCsv(await file.text());
      } else {
        const workbook = XLSX.read(await file.arrayBuffer(), {
          type: "array",
          cellDates: true,
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error(
            "The Excel file does not contain a worksheet.",
          );
        }

        // Read underlying cell values, not formatted display values.
        grid = XLSX.utils.sheet_to_json(
          workbook.Sheets[firstSheetName],
          {
            header: 1,
            defval: "",
            raw: true,
          },
        ) as unknown[][];
      }

      const parsed = spreadsheetToObjects(grid);

      if (parsed.rows.length > 500) {
        throw new Error(
          "A maximum of 500 data rows can be imported per file.",
        );
      }

      const normalizedHeaders = parsed.headers.map(normalizeHeader);

      const itemHeaders = new Set([
        "name",
        "sku",
        "barcode",
        "model name",
        "device code",
        "item name",
        "imei number",
        "quantity",
        "imei",
        "item number",
        "item no",
        "item code",
        "purchase price",
        "sale price",
        "mrp",
        "opening stock",
        "minimum stock",
        "gst rate",
        "hsn/sac",
        "source code",
        "date of purchase",
        "purchase date",
        "remark",
        "remarks",
      ]);

      const partyHeaders = new Set([
        "type",
        "phone",
        "email",
        "opening balance",
      ]);

      const hasItemHeaders = normalizedHeaders.some((header) =>
        itemHeaders.has(header),
      );

      const hasPartyHeaders = normalizedHeaders.some((header) =>
        partyHeaders.has(header),
      );

      const detectedModule: ModuleType =
        hasItemHeaders && !hasPartyHeaders ? "items" : selectedModule;

      if (detectedModule !== selectedModule) {
        setSelectedModule(detectedModule);
      }

      const supportedHeaders = new Set(
        CSV_HEADERS[detectedModule].map(normalizeHeader),
      );

      const itemHeaderAliases = new Set([
        "item name",
        "imei number",
        "quantity",
      ]);

      const ignored = parsed.headers.filter((header) => {
        const normalized = normalizeHeader(header);

        return (
          !supportedHeaders.has(normalized) &&
          !(
            detectedModule === "items" &&
            itemHeaderAliases.has(normalized)
          )
        );
      });

      setPreviewHeaders(parsed.headers);
      setPreviewRows(parsed.rows);
      setPreviewFileName(file.name);
      setUnsupportedColumns(ignored);

      setStatus(
        `Preview ready: ${parsed.rows.length} data rows and ${parsed.headers.length} columns. Review the data before importing.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to read the selected file.",
      );
    } finally {
      setBusy(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (busy || previewRows.length === 0) return;

    setBusy(true);
    setStatus("");
    setErrors([]);

    try {
      ensureSupportedImport(selectedModule);

      if (
        unsupportedColumns.length > 0 &&
        unsupportedColumns.length === previewHeaders.length
      ) {
        throw new Error(
          "None of the spreadsheet columns match the selected module's supported template. Download the template and use its column headers.",
        );
      }

      if (selectedModule === "items") {
        const validationErrors = validateItemRows(previewRows);

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          throw new Error(
            "No items were imported. Correct the highlighted row errors and upload the corrected file again.",
          );
        }
      }

      const result = await importRows(selectedModule, previewRows);

      setStatus(
        `Import finished: ${result.created} created, ${result.failed} failed.`,
      );

      setErrors(result.errors);

      if (result.failed === 0) {
        clearPreview();
      } else {
        setPreviewRows(result.failedRows);
        setStatus(
          `Import finished: ${result.created} created, ${result.failed} failed. Only failed rows remain in the preview, so retrying will not re-import successful rows.`,
        );
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Import failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="border-b px-6 py-5">
        <h1 className="text-xl font-semibold text-gray-900">
          Import / Export
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Download real business records or preview and import supported
          spreadsheet data.
        </p>
      </header>

      <div className="flex gap-6 border-b px-6 pt-4">
        {(["export", "import"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setStatus("");
              setErrors([]);
              clearPreview();
            }}
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab === "export" ? "Export Data" : "Import Data"}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-6">
          <section>
            <label
              htmlFor="data-module"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Select module
            </label>

            <select
              id="data-module"
              value={selectedModule}
              disabled={busy}
              onChange={(event) => {
                setSelectedModule(event.target.value as ModuleType);
                setStatus("");
                setErrors([]);
                clearPreview();
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {MODULES.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
          </section>

          {activeTab === "export" ? (
            <section className="rounded-xl border border-gray-200 p-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="text-3xl">
                  {MODULES.find((item) => item.id === selectedModule)?.icon}
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Export {selectedLabel}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Fetches your authenticated business records from the
                    backend and downloads them as a CSV file.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleExport}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Processing..." : "Download CSV"}
              </button>
            </section>
          ) : (
            <section className="space-y-5 rounded-xl border border-gray-200 p-5">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Import {selectedLabel}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Download the template, enter your data without changing
                  the column headers, then upload a CSV or Excel file to
                  preview it before importing.
                </p>
              </div>

              {selectedModule === "sale-invoices" ||
              selectedModule === "purchase-invoices" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Invoice imports are intentionally disabled until a
                  dedicated backend workflow can validate invoice items,
                  numbering, stock and accounting balances. You can still
                  export existing invoices.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={downloadTemplate}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Download CSV template
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={downloadExcelTemplate}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Download Excel template
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleImport}
                    disabled={busy}
                    className="block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:border-blue-400"
                  />

                  <p className="text-xs text-gray-500">
                    Excel (.xlsx, .xls) and CSV supported · Maximum 5 MB
                    and 500 data rows per file. Excel imports read the
                    first worksheet. Uploaded data is previewed before
                    import.
                  </p>
                </>
              )}

              {previewRows.length > 0 && (
                <section className="mt-6 rounded-xl border border-blue-200 bg-white">
                  {unsupportedColumns.length > 0 && (
                    <div className="border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">
                        Some columns are preview-only and will not be
                        imported.
                      </p>
                      <p className="mt-1">
                        Unsupported columns: {unsupportedColumns.join(", ")}.
                        Use the downloaded template headers for fields
                        BillMint currently supports.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        Spreadsheet Preview
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {previewFileName} · {previewRows.length} rows ·{" "}
                        {previewHeaders.length} columns
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          clearPreview();
                          setStatus(
                            "Spreadsheet preview cleared. No records were imported.",
                          );
                          setErrors([]);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear Preview
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleConfirmImport}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy
                          ? "Importing..."
                          : `Import All ${previewRows.length} Rows`}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-gray-100">
                        <tr>
                          <th className="border-b border-r px-3 py-3 font-semibold">
                            #
                          </th>

                          {previewHeaders.map((header, index) => (
                            <th
                              key={`${header}-${index}`}
                              className="whitespace-nowrap border-b border-r px-3 py-3 font-semibold text-gray-700"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-blue-50">
                            <td className="border-b border-r px-3 py-2 text-gray-500">
                              {rowIndex + 1}
                            </td>

                            {previewHeaders.map((header, columnIndex) => (
                              <td
                                key={`${rowIndex}-${columnIndex}`}
                                className="max-w-[280px] whitespace-pre-wrap break-words border-b border-r px-3 py-2 text-gray-700"
                              >
                                {row[normalizeHeader(header)] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t bg-gray-50 p-3 text-xs text-gray-500">
                    Review the complete table before importing. Only
                    supported fields are saved. Any columns marked
                    preview-only are not stored in BillMint.
                  </div>
                </section>
              )}
            </section>
          )}

          {status && (
            <div
              role="status"
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800"
            >
              {status}
            </div>
          )}

          {errors.length > 0 && (
            <section
              aria-label="Import row errors"
              className="rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <h3 className="font-semibold text-red-800">
                Rows requiring attention
              </h3>

              <ul className="mt-2 max-h-64 list-disc space-y-1 overflow-auto pl-5 text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}