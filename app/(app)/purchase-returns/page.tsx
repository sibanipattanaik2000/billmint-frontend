
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ApiError, api, formatINR } from "@/lib/api";

interface Supplier {
  id: string;
  name?: string | null;
  businessName?: string | null;
}

interface PurchaseItem {
  id?: string;
  itemId?: string | null;
  itemName?: string;
  name?: string;
  quantity: number | string;
  rate?: number | string;
  purchasePrice?: number | string;
  taxAmount?: number | string;
  item?: {
    id: string;
    name: string;
  } | null;
}

interface Purchase {
  id: string;
  billNumber?: string;
  date: string;
  grandTotal: number | string;
  status?: string; // Add this field
  supplierId?: string | null;
  supplier?: Supplier | null;
  items?: PurchaseItem[];
}

interface ReturnItem {
  id: string;
  itemId?: string | null;
  itemName: string;
  quantity: number | string;
  rate: number | string;
  taxAmount?: number | string;
  amount: number | string;
}

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  date: string;
  grandTotal: number | string;
  notes?: string | null;
  supplier?: Supplier | null;
  purchase?: {
    id: string;
    billNumber?: string | null;
  } | null;
  items?: ReturnItem[];
}

interface ReturnLineDraft {
  itemId: string;
  itemName: string;
  purchasedQuantity: number;
  quantity: string;
  rate: string;
  taxAmount: string;
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

function supplierName(supplier?: Supplier | null) {
  return supplier?.businessName || supplier?.name || "Supplier not specified";
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [lines, setLines] = useState<ReturnLineDraft[]>([]);
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [returnResponse, purchaseResponse] = await Promise.all([
        api.purchaseReturns({ page: 1, limit: 100 }),
        api.purchases({ page: 1, limit: 100 }),
      ]);

      setReturns(returnResponse.data ?? []);
      setPurchases(purchaseResponse.data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredReturns = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return returns;

    return returns.filter((entry) =>
      [
        entry.returnNumber,
        entry.purchase?.billNumber,
        supplierName(entry.supplier),
        entry.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [returns, search]);

  const totalValue = filteredReturns.reduce(
    (sum, entry) => sum + Number(entry.grandTotal || 0),
    0,
  );

  const loadSelectedPurchase = async (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setSelectedPurchase(null);
    setLines([]);
    setError("");
    setSuccess("");

    if (!purchaseId) return;

    setLoadingPurchase(true);

    try {
      const response = await api.purchase(purchaseId);
      const purchase = response.data as Purchase;

      if (!purchase || !Array.isArray(purchase.items)) {
        throw new Error(
          "The selected purchase has no item details available to return.",
        );
      }

      setSelectedPurchase(purchase);
      setLines(
        purchase.items.map((item) => ({
          itemId: item.itemId || item.item?.id || "",
          itemName:
            item.itemName || item.item?.name || item.name || "Unnamed item",
          purchasedQuantity: Number(item.quantity || 0),
          quantity: "",
          rate: String(item.rate ?? item.purchasePrice ?? 0),
          taxAmount: String(item.taxAmount ?? 0),
        })),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingPurchase(false);
    }
  };

  const updateLine = (
    index: number,
    field: "quantity" | "rate" | "taxAmount",
    value: string,
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const selectedLines = lines.filter((line) => Number(line.quantity) > 0);

  const returnTotal = selectedLines.reduce((sum, line) => {
    return (
      sum +
      Number(line.quantity) * Number(line.rate) +
      Number(line.taxAmount || 0)
    );
  }, 0);

  const submitReturn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPurchaseId || !selectedPurchase) {
      setError("Select the original purchase invoice first.");
      return;
    }

    if (selectedLines.length === 0) {
      setError("Enter a return quantity for at least one item.");
      return;
    }

    for (const line of selectedLines) {
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      const taxAmount = Number(line.taxAmount || 0);

      if (!line.itemId) {
        setError(
          `The item "${line.itemName}" has no linked inventory item ID and cannot be returned through this form.`,
        );
        return;
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > line.purchasedQuantity
      ) {
        setError(
          `Enter a valid return quantity for "${line.itemName}". It cannot exceed the quantity on the original invoice.`,
        );
        return;
      }

      if (
        !Number.isFinite(rate) ||
        rate < 0 ||
        !Number.isFinite(taxAmount) ||
        taxAmount < 0
      ) {
        setError(`Enter valid amounts for "${line.itemName}".`);
        return;
      }
    }

    setSubmitting(true);

    try {
      await api.createPurchaseReturn({
        purchaseId: selectedPurchase.id,
        supplierId: selectedPurchase.supplierId || selectedPurchase.supplier?.id,
        date: new Date(`${returnDate}T12:00:00`).toISOString(),
        notes: notes.trim() || null,
        items: selectedLines.map((line) => ({
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          taxAmount: Number(line.taxAmount || 0),
        })),
      });

      setSuccess(
        "Purchase return recorded. The backend has processed the inventory reduction.",
      );
      setShowForm(false);
      setSelectedPurchaseId("");
      setSelectedPurchase(null);
      setLines([]);
      setNotes("");
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      <header className="flex flex-col justify-between gap-4 border-b bg-white px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
              <ArrowLeftRight size={21} />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Purchase Returns
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Record goods returned to suppliers against original purchase invoices.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            <Plus size={17} />
            New Return
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-5 overflow-auto p-5 sm:p-7">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Returns loaded</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {filteredReturns.length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Return value shown</p>
            <p className="mt-2 text-2xl font-bold text-orange-600">
              {formatINR(totalValue)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Based on the records currently loaded
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Purchase invoices loaded</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {purchases.length}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Return history</h2>
              <p className="mt-1 text-xs text-gray-500">
                Latest records returned by the backend
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search return, supplier, bill..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Return number</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Purchase bill</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Items
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Return total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Loader2 className="mx-auto animate-spin text-orange-600" />
                      <p className="mt-2 text-sm text-gray-500">
                        Loading purchase returns…
                      </p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <ArrowLeftRight
                        size={30}
                        className="mx-auto text-gray-300"
                      />
                      <p className="mt-3 font-medium text-gray-700">
                        No purchase returns found
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Existing records will appear here when returned by the
                        backend.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {entry.returnNumber}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {supplierName(entry.supplier)}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {entry.purchase?.billNumber || "—"}
                      </td>
                      <td className="px-5 py-4 text-right text-gray-700">
                        {entry.items?.length ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900">
                        {formatINR(entry.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            The list shows up to 100 records from the current API response.
          </div>
        </section>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/40 sm:items-center sm:p-5">
          <form
            onSubmit={submitReturn}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Create purchase return
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select the original invoice and enter the quantities being returned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Original purchase invoice *
                  </label>
                  <select
                    required
                    value={selectedPurchaseId}
                    onChange={(event) =>
                      void loadSelectedPurchase(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500"
                  >
                    <option value="">Select purchase invoice</option>
                    {purchases
                      .filter((purchase) => purchase.status !== "CANCELLED")
                      .map((purchase) => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.billNumber || purchase.id} —{" "}
                          {supplierName(purchase.supplier)} —{" "}
                          {formatINR(purchase.grandTotal)}
                        </option>
                      ))}
                  </select>
                  {purchases.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      No purchase invoices were returned by the API.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Return date *
                  </label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {selectedPurchase && (
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3 text-sm">
                  <p className="font-semibold text-gray-900">
                    {selectedPurchase.billNumber || "Purchase invoice"}
                  </p>
                  <p className="mt-1 text-gray-600">
                    Supplier: {supplierName(selectedPurchase.supplier)}
                  </p>
                  <p className="mt-1 text-gray-600">
                    Invoice date: {formatDate(selectedPurchase.date)}
                  </p>
                </div>
              )}

              {loadingPurchase ? (
                <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading invoice items…
                </div>
              ) : selectedPurchase ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-3">Item</th>
                        <th className="px-3 py-3 text-right">Purchased</th>
                        <th className="px-3 py-3">Return qty</th>
                        <th className="px-3 py-3">Rate</th>
                        <th className="px-3 py-3">Tax amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, index) => (
                        <tr key={`${line.itemId}-${index}`}>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-800">
                              {line.itemName}
                            </p>
                            {!line.itemId && (
                              <p className="mt-1 text-xs text-red-600">
                                No linked inventory ID
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-600">
                            {line.purchasedQuantity}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={line.purchasedQuantity}
                              step="any"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(index, "quantity", event.target.value)
                              }
                              placeholder="0"
                              className="w-24 rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.rate}
                              onChange={(event) =>
                                updateLine(index, "rate", event.target.value)
                              }
                              className="w-24 rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-orange-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.taxAmount}
                              onChange={(event) =>
                                updateLine(index, "taxAmount", event.target.value)
                              }
                              className="w-24 rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-orange-500"
                            />
                          </td>
                        </tr>
                      ))}
                      {lines.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            This invoice has no item lines to return.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
                  Select a purchase invoice to load its actual item lines.
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Reason for return, damaged goods, supplier reference…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-xs text-gray-500">
                  Estimated return total
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatINR(returnTotal)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingPurchase ||
                    !selectedPurchase ||
                    selectedLines.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? "Saving return…" : "Save purchase return"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
