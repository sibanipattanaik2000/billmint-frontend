
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatINR } from "@/lib/api";

type SaleItem = {
  id: string;
  itemId: string | null;
  itemName: string;
  quantity: number | string;
  rate: number | string;
  taxableAmount?: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  item?: {
    id: string;
    name?: string;
    trackSerial?: boolean;
  } | null;
};

type Sale = {
  id: string;
  invoiceNumber: string;
  date: string;
  grandTotal: number | string;
  customerId?: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  items?: SaleItem[];
};

type SaleReturn = {
  id: string;
  returnNumber: string;
  date: string;
  grandTotal: number | string;
  subtotal: number | string;
  taxAmount: number | string;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  sale?: {
    id: string;
    invoiceNumber: string;
  } | null;
  items?: Array<{
    id: string;
    itemName: string;
    quantity: number | string;
    rate: number | string;
    taxAmount: number | string;
    amount: number | string;
  }>;
};

type ReturnLine = {
  saleItemId: string;
  quantity: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function numberValue(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function getLineTax(item: SaleItem): number {
  return (
    numberValue(item.cgstAmount) +
    numberValue(item.sgstAmount) +
    numberValue(item.igstAmount)
  );
}

function getEffectiveRate(item: SaleItem): number {
  const quantity = numberValue(item.quantity);

  if (quantity <= 0) return numberValue(item.rate);

  if (item.taxableAmount !== undefined) {
    return numberValue(item.taxableAmount) / quantity;
  }

  return numberValue(item.rate);
}

export default function SaleReturnPage() {
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);

  const [returnDate, setReturnDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([
    { saleItemId: "", quantity: "1" },
  ]);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await api.saleReturns({
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
      });

      setReturns(response.data ?? []);
    } catch (error) {
      setPageError(getErrorMessage(error));
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [search, refreshKey]);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    if (!showForm) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSalesLoading(true);

      try {
        const response = await api.sales({
          page: 1,
          limit: 50,
          search: salesSearch.trim() || undefined,
        });

        if (!cancelled) {
          setSales(response.data ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(
            `Unable to load sales: ${getErrorMessage(error)}`,
          );
        }
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showForm, salesSearch]);

  const selectableItems = useMemo(() => {
    return (selectedSale?.items ?? []).filter(
      (item) =>
        Boolean(item.itemId) &&
        item.item?.trackSerial !== true,
    );
  }, [selectedSale]);

  const totalReturnAmount = useMemo(() => {
    if (!selectedSale) return 0;

    return lines.reduce((total, line) => {
      const item = selectedSale.items?.find(
        (entry) => entry.id === line.saleItemId,
      );

      if (!item) return total;

      const quantity = numberValue(line.quantity);
      const soldQuantity = numberValue(item.quantity);

      if (quantity <= 0 || soldQuantity <= 0) return total;

      const rate = getEffectiveRate(item);
      const tax = (getLineTax(item) / soldQuantity) * quantity;

      return total + quantity * rate + tax;
    }, 0);
  }, [lines, selectedSale]);

  const totalReturnQuantity = useMemo(
    () =>
      lines.reduce(
        (total, line) => total + numberValue(line.quantity),
        0,
      ),
    [lines],
  );

  async function handleSaleChange(saleId: string) {
    setSelectedSaleId(saleId);
    setSelectedSale(null);
    setLines([{ saleItemId: "", quantity: "1" }]);
    setFormError("");

    if (!saleId) return;

    setSaleLoading(true);

    try {
      const response = await api.sale(saleId);
      setSelectedSale(response.data as Sale);
    } catch (error) {
      setFormError(
        `Unable to load the selected invoice: ${getErrorMessage(error)}`,
      );
    } finally {
      setSaleLoading(false);
    }
  }

  function updateLine(
    index: number,
    changes: Partial<ReturnLine>,
  ) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { saleItemId: "", quantity: "1" },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  function resetForm() {
    setSelectedSaleId("");
    setSelectedSale(null);
    setSalesSearch("");
    setReturnDate(new Date().toLocaleDateString("en-CA"));
    setNotes("");
    setLines([{ saleItemId: "", quantity: "1" }]);
    setFormError("");
  }

  async function handleSave() {
    setFormError("");
    setSuccessMessage("");

    if (!selectedSaleId || !selectedSale) {
      setFormError("Select the original sales invoice first.");
      return;
    }

    if (!returnDate) {
      setFormError("Select the return date.");
      return;
    }

    if (lines.length === 0) {
      setFormError("Add at least one item to return.");
      return;
    }

    const seenItems = new Set<string>();

    for (const line of lines) {
      if (!line.saleItemId) {
        setFormError("Select an item for every return line.");
        return;
      }

      if (seenItems.has(line.saleItemId)) {
        setFormError(
          "An item can only appear once in this return. Update its quantity instead.",
        );
        return;
      }

      seenItems.add(line.saleItemId);

      const item = selectableItems.find(
        (entry) => entry.id === line.saleItemId,
      );

      if (!item) {
        setFormError(
          "One of the selected items is not eligible for this return.",
        );
        return;
      }

      const quantity = Number(line.quantity);
      const soldQuantity = numberValue(item.quantity);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > soldQuantity
      ) {
        setFormError(
          `Enter a quantity greater than 0 and no more than ${soldQuantity} for ${item.itemName}. Previously returned quantities are validated by the server.`,
        );
        return;
      }
    }

    const payload = {
      saleId: selectedSale.id,
      customerId: selectedSale.customerId ?? selectedSale.customer?.id ?? null,
      date: returnDate,
      notes: notes.trim() || null,
      items: lines.map((line) => {
        const item = selectableItems.find(
          (entry) => entry.id === line.saleItemId,
        )!;

        const quantity = Number(line.quantity);
        const soldQuantity = numberValue(item.quantity);
        const rate = getEffectiveRate(item);
        const taxAmount =
          soldQuantity > 0
            ? (getLineTax(item) / soldQuantity) * quantity
            : 0;

        return {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity,
          rate: Number(rate.toFixed(2)),
          taxAmount: Number(taxAmount.toFixed(2)),
        };
      }),
    };

    setSaving(true);

    try {
      const response = await api.createSaleReturn(payload);
      const created = response.data as SaleReturn;

      setSuccessMessage(
        `Sale return ${created.returnNumber ?? ""} created successfully.`,
      );
      setShowForm(false);
      resetForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const totalReturnValue = returns.reduce(
    (sum, item) => sum + numberValue(item.grandTotal),
    0,
  );

  return (
    <div className="min-h-full flex-1 bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Sales management
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Sale Returns
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Record returned items against an original sales invoice.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setSuccessMessage("");
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Create Sale Return
          </button>
        </header>

        {successMessage && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="font-semibold"
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Sale Returns
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : returns.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Records returned by the API for this view
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Return Value
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-600">
              {loading ? "—" : formatINR(totalReturnValue)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Total for the records currently loaded
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Return register
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Search saved return records.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search return number, customer or notes"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-sm"
            />
          </div>

          {pageError && (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">Could not load sale returns</p>
              <p className="mt-1">{pageError}</p>
              <button
                type="button"
                onClick={() => void loadReturns()}
                className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 font-medium hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Return date</th>
                  <th className="px-5 py-3 font-semibold">Return number</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Original invoice</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Return amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                      Loading sale returns…
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <p className="font-medium text-slate-700">
                        No sale returns found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Saved returns will appear here when they exist.
                      </p>
                    </td>
                  </tr>
                ) : (
                  returns.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDate(item.date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-indigo-700">
                        {item.returnNumber}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {item.customer?.name ?? "Walk-in customer"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {item.sale?.invoiceNumber ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.items?.length ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-rose-600">
                        {formatINR(item.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-return-title"
            className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="sale-return-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Create sale return
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the original invoice and the items being returned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setShowForm(false);
                    resetForm();
                  }
                }}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sale-search"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Find original invoice
                  </label>
                  <input
                    id="sale-search"
                    type="search"
                    value={salesSearch}
                    onChange={(event) => setSalesSearch(event.target.value)}
                    placeholder="Search invoice or customer"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <select
                    value={selectedSaleId}
                    onChange={(event) =>
                      void handleSaleChange(event.target.value)
                    }
                    disabled={salesLoading || saving}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {salesLoading ? "Loading invoices…" : "Select invoice"}
                    </option>
                    {sales.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {sale.invoiceNumber} — {sale.customer?.name ?? "Walk-in"} —{" "}
                        {formatINR(sale.grandTotal)}
                      </option>
                    ))}
                  </select>
                  {!salesLoading && sales.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      No matching sales were returned by the server.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="return-date"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Return date
                  </label>
                  <input
                    id="return-date"
                    type="date"
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Customer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedSale?.customer?.name ??
                        (selectedSaleId ? "Walk-in customer" : "Select an invoice")}
                    </p>
                  </div>
                </div>
              </div>

              {saleLoading && (
                <p className="text-sm text-slate-500">
                  Loading invoice details…
                </p>
              )}

              {selectedSale && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Items to return
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose items from the selected invoice. Returnable quantity is checked again by the backend.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addLine}
                      disabled={saving || selectableItems.length === 0}
                      className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      + Add item
                    </button>
                  </div>

                  {selectableItems.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      This invoice has no eligible non-serialized inventory items for this return workflow. Serialized items require a separate serial-number return workflow.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lines.map((line, index) => {
                        const item = selectableItems.find(
                          (entry) => entry.id === line.saleItemId,
                        );
                        const soldQuantity = item
                          ? numberValue(item.quantity)
                          : 0;
                        const quantity = numberValue(line.quantity);
                        const rate = item ? getEffectiveRate(item) : 0;
                        const tax = item
                          ? soldQuantity > 0
                            ? (getLineTax(item) / soldQuantity) * quantity
                            : 0
                          : 0;

                        const usedIds = new Set(
                          lines
                            .filter((_, lineIndex) => lineIndex !== index)
                            .map((entry) => entry.saleItemId)
                            .filter(Boolean),
                        );

                        return (
                          <div
                            key={`${index}-${line.saleItemId}`}
                            className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_110px_120px_auto] sm:items-end"
                          >
                            <div>
                              <label
                                htmlFor={`return-item-${index}`}
                                className="mb-1.5 block text-xs font-medium text-slate-600"
                              >
                                Item
                              </label>
                              <select
                                id={`return-item-${index}`}
                                value={line.saleItemId}
                                onChange={(event) =>
                                  updateLine(index, {
                                    saleItemId: event.target.value,
                                  })
                                }
                                disabled={saving}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100"
                              >
                                <option value="">Select invoice item</option>
                                {selectableItems.map((entry) => (
                                  <option
                                    key={entry.id}
                                    value={entry.id}
                                    disabled={usedIds.has(entry.id)}
                                  >
                                    {entry.itemName} (sold: {numberValue(entry.quantity)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor={`return-qty-${index}`}
                                className="mb-1.5 block text-xs font-medium text-slate-600"
                              >
                                Quantity
                              </label>
                              <input
                                id={`return-qty-${index}`}
                                type="number"
                                min="0.001"
                                max={soldQuantity || undefined}
                                step="0.001"
                                value={line.quantity}
                                onChange={(event) =>
                                  updateLine(index, {
                                    quantity: event.target.value,
                                  })
                                }
                                disabled={saving}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100"
                              />
                            </div>

                            <div>
                              <p className="mb-1.5 text-xs font-medium text-slate-600">
                                Estimated amount
                              </p>
                              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                                {item && quantity > 0
                                  ? formatINR(quantity * rate + tax)
                                  : formatINR(0)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              disabled={saving || lines.length === 1}
                              aria-label={`Remove return item ${index + 1}`}
                              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="return-notes"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Notes / reason
                    </label>
                    <textarea
                      id="return-notes"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={saving}
                      maxLength={2000}
                      placeholder="Reason for return, inspection notes, or other details"
                      className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="rounded-xl bg-slate-900 p-4 text-white">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Items selected</span>
                      <span>{lines.filter((line) => line.saleItemId).length}</span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-300">
                          Total quantity
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {totalReturnQuantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-300">
                          Estimated return amount
                        </p>
                        <p className="mt-1 text-2xl font-bold">
                          {formatINR(totalReturnAmount)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      The backend calculates and stores the final return totals. Previously returned quantities and stock changes are validated on the server.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setShowForm(false);
                    resetForm();
                  }
                }}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || saleLoading || !selectedSale}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving return…" : "Save Sale Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
