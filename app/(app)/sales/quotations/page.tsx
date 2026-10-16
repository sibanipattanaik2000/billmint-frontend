"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { ApiError, api, formatINR } from "@/lib/api";

type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "CONVERTED"
  | "EXPIRED";

type Customer = {
  id: string;
  name: string;
  businessName?: string | null;
};

type Item = {
  id: string;
  name: string;
  sku?: string | null;
  salePrice: number | string;
  gstRate?: number | string;
  hsnSac?: string | null;
  unit?: { shortName?: string } | null;
};

type QuotationItem = {
  id?: string;
  itemId?: string | null;
  itemName: string;
  hsnSac?: string | null;
  quantity: number | string;
  unit?: string | null;
  rate: number | string;
  gstRate: number | string;
  amount: number | string;
  discountPercent?: number | string;
};

type Quotation = {
  id: string;
  quotationNumber: string;
  date: string;
  expiryDate?: string | null;
  status: QuotationStatus;
  subtotal?: number | string;
  grandTotal: number | string;
  notes?: string | null;
  terms?: string | null;
  customer?: Customer | null;
  items?: QuotationItem[];
};

type QuotationLineForm = {
  itemId: string;
  itemName: string;
  quantity: string;
  rate: string;
  gstRate: string;
  discountPercent: string;
  hsnSac: string;
  unit: string;
};

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CONVERTED: "Converted",
  EXPIRED: "Expired",
};

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CONVERTED: "bg-violet-100 text-violet-700",
  EXPIRED: "bg-amber-100 text-amber-800",
};

const FILTERS: Array<"ALL" | QuotationStatus> = [
  "ALL",
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "CONVERTED",
  "EXPIRED",
];

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyLine(): QuotationLineForm {
  return {
    itemId: "",
    itemName: "",
    quantity: "1",
    rate: "0",
    gstRate: "0",
    discountPercent: "0",
    hsnSac: "",
    unit: "",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | QuotationStatus>(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null,
  );
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [quotationDate, setQuotationDate] = useState(localDateValue());
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [lines, setLines] = useState<QuotationLineForm[]>([emptyLine()]);

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.quotations({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: filterStatus === "ALL" ? undefined : filterStatus,
      });

      setQuotations(Array.isArray(response.data) ? response.data : []);
      setTotal(numeric(response.pagination?.total));
    } catch (err) {
      setError(getErrorMessage(err));
      setQuotations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadQuotations();
      },
      search.trim() ? 250 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [loadQuotations, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summary = useMemo(() => {
    const count = quotations.length;
    const amount = quotations.reduce(
      (sum, quotation) => sum + numeric(quotation.grandTotal),
      0,
    );

    return { count, amount };
  }, [quotations]);

  async function openCreateForm() {
    setCreateOpen(true);
    setError("");
    setNotice("");
    setLoadingFormData(true);

    try {
      const [customerResponse, itemResponse] = await Promise.all([
        api.customers({ page: 1, limit: 100 }),
        api.items({ page: 1, limit: 100 }),
      ]);

      setCustomers(
        Array.isArray(customerResponse.data) ? customerResponse.data : [],
      );
      setItems(Array.isArray(itemResponse.data) ? itemResponse.data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingFormData(false);
    }
  }

  function resetCreateForm() {
    setCustomerId("");
    setQuotationDate(localDateValue());
    setExpiryDate("");
    setNotes("");
    setTerms("");
    setLines([emptyLine()]);
  }

  function updateLine(index: number, patch: Partial<QuotationLineForm>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function selectItem(index: number, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);

    if (!item) {
      updateLine(index, {
        itemId: "",
        itemName: "",
        rate: "0",
        gstRate: "0",
        hsnSac: "",
        unit: "",
      });
      return;
    }

    updateLine(index, {
      itemId: item.id,
      itemName: item.name,
      rate: String(numeric(item.salePrice)),
      gstRate: String(numeric(item.gstRate)),
      hsnSac: item.hsnSac ?? "",
      unit: item.unit?.shortName ?? "",
    });
  }

  const formTotal = lines.reduce((sum, line) => {
    const quantity = numeric(line.quantity);
    const rate = numeric(line.rate);
    const discount = Math.min(100, Math.max(0, numeric(line.discountPercent)));
    const gst = Math.min(100, Math.max(0, numeric(line.gstRate)));
    const taxable = quantity * rate * (1 - discount / 100);

    return sum + taxable * (1 + gst / 100);
  }, 0);

  async function handleCreateQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!lines.length) {
      setError("Add at least one item to the quotation.");
      return;
    }

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line.itemName.trim()) {
        setError(`Select an item for line ${index + 1}.`);
        return;
      }

      if (numeric(line.quantity) <= 0) {
        setError(`Quantity for line ${index + 1} must be greater than zero.`);
        return;
      }

      if (numeric(line.rate) < 0) {
        setError(`Rate for line ${index + 1} cannot be negative.`);
        return;
      }

      if (
        numeric(line.discountPercent) < 0 ||
        numeric(line.discountPercent) > 100
      ) {
        setError(`Discount for line ${index + 1} must be between 0 and 100.`);
        return;
      }

      if (numeric(line.gstRate) < 0 || numeric(line.gstRate) > 100) {
        setError(`GST rate for line ${index + 1} must be between 0 and 100.`);
        return;
      }
    }

    if (expiryDate && expiryDate < quotationDate) {
      setError("Valid till date cannot be earlier than the quotation date.");
      return;
    }

    setSaving(true);

    try {
      await api.createQuotation({
        customerId: customerId || null,
        date: new Date(`${quotationDate}T12:00:00`).toISOString(),
        expiryDate: expiryDate
          ? new Date(`${expiryDate}T12:00:00`).toISOString()
          : null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: lines.map((line) => ({
          itemId: line.itemId || null,
          itemName: line.itemName.trim(),
          hsnSac: line.hsnSac.trim() || null,
          quantity: numeric(line.quantity),
          rate: numeric(line.rate),
          discountPercent: numeric(line.discountPercent),
          gstRate: numeric(line.gstRate),
          unit: line.unit.trim() || null,
        })),
      });

      setCreateOpen(false);
      resetCreateForm();
      setPage(1);
      setFilterStatus("ALL");
      setSearch("");
      setNotice("Quotation created successfully.");
      await loadQuotations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(id: string) {
    setDetailOpen(true);
    setSelectedQuotation(null);
    setLoadingDetails(true);
    setError("");

    try {
      const response = await api.quotation(id);
      setSelectedQuotation(response.data as Quotation);
    } catch (err) {
      setError(getErrorMessage(err));
      setDetailOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function changeStatus(quotation: Quotation, status: QuotationStatus) {
    if (status === "CONVERTED") return;

    setError("");
    setNotice("");
    setUpdatingId(quotation.id);

    try {
      const response = await api.updateQuotationStatus(quotation.id, status);
      const updated = response.data as Quotation;

      setQuotations((current) =>
        current.map((entry) =>
          entry.id === quotation.id ? { ...entry, ...updated } : entry,
        ),
      );

      if (selectedQuotation?.id === quotation.id) {
        setSelectedQuotation((current) =>
          current ? { ...current, ...updated } : current,
        );
      }

      setNotice(`Quotation status changed to ${STATUS_LABELS[status]}.`);

      if (filterStatus !== "ALL" && filterStatus !== status) {
        await loadQuotations();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="flex-1 min-w-0 overflow-auto bg-slate-50">
      <div className="mx-auto max-w-screen-2xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Sales</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Quotations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage customer estimates before invoicing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void openCreateForm()}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            + Create quotation
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Quotations on this page</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.count}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {total} matching record{total === 1 ? "" : "s"} across all pages
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Amount on this page</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : formatINR(summary.amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total value of the currently displayed quotations
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => {
                    setPage(1);
                    setFilterStatus(status);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filterStatus === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "ALL" ? "All statuses" : STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search number or customer..."
              aria-label="Search quotations"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Quotation</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Valid till</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-slate-500"
                    >
                      Loading quotations from BillMint…
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="font-semibold text-slate-700">
                        No quotations found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Create a quotation or change your search and filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr
                      key={quotation.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {quotation.quotationNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {quotation.items?.length ?? 0} item
                          {quotation.items?.length === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {quotation.customer?.name || "Walk-in customer"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {formatDate(quotation.date)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {formatDate(quotation.expiryDate)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right font-semibold text-slate-900">
                        {formatINR(quotation.grandTotal)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[quotation.status] ?? STATUS_STYLES.DRAFT}`}
                        >
                          {STATUS_LABELS[quotation.status] ?? quotation.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void openDetails(quotation.id)}
                            className="font-semibold text-blue-700 hover:text-blue-900"
                          >
                            View
                          </button>
                          {quotation.status !== "CONVERTED" && (
                            <select
                              aria-label={`Change status for ${quotation.quotationNumber}`}
                              disabled={updatingId === quotation.id}
                              value={quotation.status}
                              onChange={(event) =>
                                void changeStatus(
                                  quotation,
                                  event.target.value as QuotationStatus,
                                )
                              }
                              className="max-w-32 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:opacity-50"
                            >
                              {(
                                [
                                  "DRAFT",
                                  "SENT",
                                  "ACCEPTED",
                                  "REJECTED",
                                  "EXPIRED",
                                ] as QuotationStatus[]
                              ).map((status) => (
                                <option key={status} value={status}>
                                  {STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {total === 0
                ? "No records"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <section className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Create quotation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Save an estimate without changing stock or creating a sale.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close create quotation form"
                className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-5 p-5">
              {loadingFormData ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Loading customers and items…
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Customer
                      <select
                        value={customerId}
                        onChange={(event) => setCustomerId(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                      >
                        <option value="">Walk-in / no customer selected</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.businessName
                              ? ` — ${customer.businessName}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Quotation date
                      <input
                        type="date"
                        required
                        value={quotationDate}
                        onChange={(event) =>
                          setQuotationDate(event.target.value)
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Valid till
                      <input
                        type="date"
                        min={quotationDate}
                        value={expiryDate}
                        onChange={(event) => setExpiryDate(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">Items</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setLines((current) => [...current, emptyLine()])
                        }
                        disabled={lines.length >= 100}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        + Add item
                      </button>
                    </div>

                    {items.length === 0 && (
                      <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        No active inventory items were returned. Add inventory
                        items first, then create a quotation.
                      </p>
                    )}

                    <div className="space-y-3">
                      {lines.map((line, index) => {
                        const quantity = numeric(line.quantity);
                        const rate = numeric(line.rate);
                        const discount = Math.min(
                          100,
                          Math.max(0, numeric(line.discountPercent)),
                        );
                        const taxable = quantity * rate * (1 - discount / 100);
                        const amount =
                          taxable * (1 + numeric(line.gstRate) / 100);

                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-slate-200 p-3"
                          >
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                              <label className="text-sm font-medium text-slate-700 md:col-span-5">
                                Inventory item
                                <select
                                  required
                                  value={line.itemId}
                                  onChange={(event) =>
                                    selectItem(index, event.target.value)
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                                >
                                  <option value="">Select item</option>
                                  {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                      {item.sku ? ` (${item.sku})` : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                                Qty
                                <input
                                  required
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={line.quantity}
                                  onChange={(event) =>
                                    updateLine(index, {
                                      quantity: event.target.value,
                                    })
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                />
                              </label>

                              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                                Rate (₹)
                                <input
                                  required
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.rate}
                                  onChange={(event) =>
                                    updateLine(index, {
                                      rate: event.target.value,
                                    })
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                />
                              </label>

                              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                                GST %
                                <input
                                  required
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={line.gstRate}
                                  onChange={(event) =>
                                    updateLine(index, {
                                      gstRate: event.target.value,
                                    })
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                />
                              </label>

                              <div className="flex items-end justify-end md:col-span-1">
                                <button
                                  type="button"
                                  disabled={lines.length === 1}
                                  onClick={() =>
                                    setLines((current) =>
                                      current.filter(
                                        (_, lineIndex) => lineIndex !== index,
                                      ),
                                    )
                                  }
                                  aria-label={`Remove item ${index + 1}`}
                                  className="rounded-lg px-2 py-2 text-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                                >
                                  ×
                                </button>
                              </div>

                              <label className="text-sm font-medium text-slate-700 md:col-span-3">
                                Discount %
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={line.discountPercent}
                                  onChange={(event) =>
                                    updateLine(index, {
                                      discountPercent: event.target.value,
                                    })
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                                />
                              </label>

                              <div className="md:col-span-9 md:flex md:items-end md:justify-end">
                                <p className="text-right text-sm text-slate-500">
                                  Line total:{" "}
                                  <span className="font-semibold text-slate-900">
                                    {formatINR(amount)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Notes
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                        placeholder="Optional notes for the customer"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Terms and conditions
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={terms}
                        onChange={(event) => setTerms(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                        placeholder="Optional quotation terms"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Estimated total including GST
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatINR(formTotal)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Final totals are calculated and validated by the
                        backend.
                      </p>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setCreateOpen(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          saving || loadingFormData || items.length === 0
                        }
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save quotation"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </section>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
          <section className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedQuotation?.quotationNumber ?? "Quotation details"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quotation saved in BillMint
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Close quotation details"
                className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <p className="p-10 text-center text-sm text-slate-500">
                Loading quotation details…
              </p>
            ) : selectedQuotation ? (
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Customer</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedQuotation.customer?.name || "Walk-in customer"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(selectedQuotation.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Valid till</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(selectedQuotation.expiryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[selectedQuotation.status] ?? STATUS_STYLES.DRAFT}`}
                    >
                      {STATUS_LABELS[selectedQuotation.status] ??
                        selectedQuotation.status}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">GST</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedQuotation.items ?? []).map((item, index) => (
                        <tr key={item.id ?? `${item.itemName}-${index}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {item.itemName}
                            </p>
                            {item.hsnSac && (
                              <p className="text-xs text-slate-500">
                                HSN/SAC: {item.hsnSac}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {numeric(item.quantity)} {item.unit ?? ""}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatINR(item.rate)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {numeric(item.gstRate)}%
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatINR(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">
                      {formatINR(selectedQuotation.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-900">
                      Grand total
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatINR(selectedQuotation.grandTotal)}
                    </span>
                  </div>
                </div>

                {selectedQuotation.notes && (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {selectedQuotation.notes}
                    </p>
                  </div>
                )}

                {selectedQuotation.terms && (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Terms and conditions
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {selectedQuotation.terms}
                    </p>
                  </div>
                )}

                {selectedQuotation.status !== "CONVERTED" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                    <span className="mr-2 text-sm font-semibold text-slate-700">
                      Update status:
                    </span>
                    {(
                      [
                        "DRAFT",
                        "SENT",
                        "ACCEPTED",
                        "REJECTED",
                        "EXPIRED",
                      ] as QuotationStatus[]
                    ).map((status) => (
                      <button
                        type="button"
                        key={status}
                        disabled={
                          updatingId === selectedQuotation.id ||
                          selectedQuotation.status === status
                        }
                        onClick={() =>
                          void changeStatus(selectedQuotation, status)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="p-10 text-center text-sm text-slate-500">
                Quotation details are unavailable.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
