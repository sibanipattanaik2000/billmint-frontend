
"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

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
};

const MODULES: {
  id: ModuleType;
  label: string;
  icon: string;
}[] = [
  {
    id: "parties",
    label: "Parties (Customers & Suppliers)",
    icon: "👥",
  },
  {
    id: "items",
    label: "Items / Products",
    icon: "📦",
  },
  {
    id: "sale-invoices",
    label: "Sale Invoices",
    icon: "🧾",
  },
  {
    id: "purchase-invoices",
    label: "Purchase Invoices",
    icon: "🛒",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: "💸",
  },
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
    "SKU",
    "Barcode",
    "Description",
    "Purchase Price",
    "Sale Price",
    "MRP",
    "Opening Stock",
    "Minimum Stock",
    "GST Rate",
    "HSN/SAC",
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

/**
 * Parses quoted CSV cells, escaped quotes, and commas inside cells.
 * Excel .xlsx/.xls binary files are intentionally not accepted here.
 */
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
    } else if (char === "\r") {
      // Ignore CR in CRLF line endings.
    } else {
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

function rowsToObjects(input: string): CsvRow[] {
  const rows = parseCsv(input);

  if (rows.length < 2) {
    throw new Error("The CSV must contain a header and at least one data row.");
  }

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase(),
  );

  if (headers.some((header) => !header)) {
    throw new Error("The CSV contains an empty column header.");
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV contains duplicate column headers.");
  }

  return rows.slice(1).map((values) => {
    const result: CsvRow = {};

    headers.forEach((header, index) => {
      result[header] = (values[index] ?? "").trim();
    });

    return result;
  });
}

function getField(row: CsvRow, name: string): string {
  return row[name.toLowerCase()] ?? "";
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

function requiredNumber(
  row: CsvRow,
  name: string,
): number {
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

function numericValue(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
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
  fetchPage: (params: {
    page: number;
    limit: number;
  }) => Promise<{
    data: T[];
    pagination?: {
      totalPages?: number;
    };
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

    if (
      typeof totalPages !== "number" ||
      page >= totalPages
    ) {
      break;
    }

    page += 1;

    if (page > 10000) {
      throw new Error("Export stopped because the page limit was exceeded.");
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
      "Invoice CSV import is not enabled. BillMint must validate invoice line items, party references, numbering, stock and payment balances together. Export is available for these modules.",
    );
  }
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
  };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      if (module === "parties") {
        const name = getField(row, "Name");
        const type = getField(row, "Type").toLowerCase();

        if (!name) {
          throw new Error("Name is required.");
        }

        if (type !== "customer" && type !== "supplier") {
          throw new Error(
            'Type must be either "Customer" or "Supplier".',
          );
        }

        const common = {
          name,
          phone: optionalValue(getField(row, "Phone")),
          email: optionalValue(getField(row, "Email")),
          businessName: optionalValue(getField(row, "Business Name")),
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
      }

      if (module === "items") {
        const name = getField(row, "Name");

        if (!name) {
          throw new Error("Name is required.");
        }

        const payload = {
          name,
          sku: optionalValue(getField(row, "SKU")),
          barcode: optionalValue(getField(row, "Barcode")),
          description: optionalValue(getField(row, "Description")),
          purchasePrice: optionalNumber(row, "Purchase Price") ?? 0,
          salePrice: optionalNumber(row, "Sale Price") ?? 0,
          mrp: optionalNumber(row, "MRP") ?? null,
          openingStock: optionalNumber(row, "Opening Stock") ?? 0,
          minimumStock: optionalNumber(row, "Minimum Stock") ?? 0,
          gstRate: optionalNumber(row, "GST Rate") ?? 18,
          hsnSac: optionalValue(getField(row, "HSN/SAC")),
          trackBatch: false,
          trackSerial: false,
          trackExpiry: false,
        };

        if (
          payload.purchasePrice < 0 ||
          payload.salePrice < 0 ||
          (payload.mrp !== null && payload.mrp < 0) ||
          payload.openingStock < 0 ||
          payload.minimumStock < 0 ||
          payload.gstRate < 0 ||
          payload.gstRate > 100
        ) {
          throw new Error(
            "Prices and stock cannot be negative; GST Rate must be between 0 and 100.",
          );
        }

        await api.createItem(payload);
      }

      if (module === "expenses") {
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

        // The existing backend accepts category as a name and
        // resolves it through its expense service.
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

  const selectedLabel =
    MODULES.find((module) => module.id === selectedModule)?.label ??
    selectedModule;

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

  async function handleExport(): Promise<void> {
    setBusy(true);
    setStatus("");
    setErrors([]);

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

        rows = items.map((item) => [
          item.name,
          item.sku,
          item.barcode,
          item.description,
          item.purchasePrice,
          item.salePrice,
          item.mrp,
          item.currentStock,
          item.minimumStock,
          item.gstRate,
          item.hsnSac,
        ]);
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
        `billmint_${selectedModule}_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
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

    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error(
          "Only CSV files are supported right now. Save your Excel sheet as CSV and upload it again.",
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be 5 MB or less.");
      }

      ensureSupportedImport(selectedModule);

      const text = await file.text();
      const rows = rowsToObjects(text);

      if (rows.length > 500) {
        throw new Error(
          "A maximum of 500 records can be imported per file.",
        );
      }

      const result = await importRows(selectedModule, rows);

      setStatus(
        `Import finished: ${result.created} created, ${result.failed} failed. Check the row errors below before retrying.`,
      );

      setErrors(result.errors);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Import failed. No success has been assumed.",
      );
    } finally {
      setBusy(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="border-b px-6 py-5">
        <h1 className="text-xl font-semibold text-gray-900">
          Import / Export
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Download real business records or import supported CSV data.
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
                  Download a template, enter your data without changing the
                  column headers, and upload the completed CSV.
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
                  <button
                    type="button"
                    disabled={busy}
                    onClick={downloadTemplate}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Download CSV template
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImport}
                    disabled={busy}
                    className="block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:border-blue-400"
                  />

                  <p className="text-xs text-gray-500">
                    CSV only · Maximum 5 MB and 500 rows per file.
                    Each record is sent to the backend individually.
                  </p>
                </>
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
