
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, RefreshCw, Send, Package } from "lucide-react";
import { ApiError, api } from "@/lib/api";

type Store = {
  storeCode: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  sku?: string | null;
  modelName?: string | null;
  currentStock?: number | string | null;
  trackSerial?: boolean;
  status?: string;
};

type TransferLine = {
  itemId: string;
  quantity: string;
};

type Transfer = {
  id: string;
  transferNumber: string;
  status: string;
  createdAt: string;
  fromBusiness?: { name: string; storeCode: string };
  toBusiness?: { name: string; storeCode: string };
  items?: Array<{
    quantity: number | string;
    sourceItem?: { name: string; sku?: string | null };
    destinationItem?: { name: string; sku?: string | null };
  }>;
};

function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StockTransfersPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [toStoreCode, setToStoreCode] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([
    { itemId: "", quantity: "1" },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [storeResponse, itemResponse, transferResponse] =
        await Promise.all([
          api.stores(),
          api.items({ page: 1, limit: 100 }),
          api.stockTransfers(),
        ]);

      setStores(storeResponse.data || []);
      setItems(itemResponse.data || []);
      setTransfers(transferResponse.data || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load stock transfer data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const eligibleItems = items.filter(
    (item) =>
      item.status !== "INACTIVE" &&
      item.trackSerial !== true &&
      numberValue(item.currentStock) > 0,
  );

  const selectedStore = stores.find(
    (store) => store.storeCode === toStoreCode,
  );

  function updateLine(
    index: number,
    field: keyof TransferLine,
    value: string,
  ) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { itemId: "", quantity: "1" },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1
        ? [{ itemId: "", quantity: "1" }]
        : current.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!toStoreCode) {
      setError("Select a destination store.");
      return;
    }

    if (lines.some((line) => !line.itemId || numberValue(line.quantity) <= 0)) {
      setError("Select an item and enter a quantity greater than zero for every line.");
      return;
    }

    const seen = new Set<string>();
    for (const line of lines) {
      if (seen.has(line.itemId)) {
        setError("Each item can appear only once in a transfer. Combine its quantities into one line.");
        return;
      }
      seen.add(line.itemId);

      const item = eligibleItems.find((entry) => entry.id === line.itemId);
      if (!item) {
        setError("One selected item is unavailable or uses serial tracking.");
        return;
      }

      if (numberValue(line.quantity) > numberValue(item.currentStock)) {
        setError(`Insufficient stock for "${item.name}". Available: ${item.currentStock}.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await api.createStockTransfer({
        toStoreCode,
        items: lines.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
        })),
        notes: notes.trim() || undefined,
      });

      const transferNumber = response.data?.transferNumber || "Transfer";
      setSuccess(`${transferNumber} completed successfully.`);
      setToStoreCode("");
      setLines([{ itemId: "", quantity: "1" }]);
      setNotes("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to complete this stock transfer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Stock Transfers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Move eligible inventory between registered BillMint stores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <form
        onSubmit={submitTransfer}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Create transfer</h2>
            <p className="text-xs text-slate-500">
              Stock changes are committed immediately when the transfer succeeds.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Destination store
            </label>
            <select
              value={toStoreCode}
              onChange={(event) => setToStoreCode(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select destination store</option>
              {stores.map((store) => (
                <option key={store.storeCode} value={store.storeCode}>
                  {store.name} ({store.storeCode})
                </option>
              ))}
            </select>
            {selectedStore && (
              <p className="mt-1.5 text-xs text-slate-500">
                Destination: {selectedStore.name} · {selectedStore.storeCode}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Transfer notes
            </label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={5000}
              placeholder="Reason or reference (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Items to transfer
            </h3>
            <button
              type="button"
              onClick={addLine}
              disabled={lines.length >= 100}
              className="text-sm font-medium text-blue-700 hover:text-blue-800 disabled:opacity-40"
            >
              + Add item
            </button>
          </div>

          {lines.map((line, index) => {
            const selectedItem = eligibleItems.find(
              (item) => item.id === line.itemId,
            );

            return (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_130px_auto]"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Item
                  </label>
                  <select
                    value={line.itemId}
                    onChange={(event) =>
                      updateLine(index, "itemId", event.target.value)
                    }
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select item</option>
                    {eligibleItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.modelName || item.name}
                        {item.sku ? ` · ${item.sku}` : ""}
                        {` · Stock ${item.currentStock}`}
                      </option>
                    ))}
                  </select>
                  {selectedItem && (
                    <p className="mt-1 text-xs text-slate-500">
                      Available stock: {selectedItem.currentStock}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    max={selectedItem ? numberValue(selectedItem.currentStock) : undefined}
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, "quantity", event.target.value)
                    }
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {eligibleItems.length === 0 && !loading && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No eligible stock found. This screen currently excludes serial-tracked items and items with zero stock.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={submitting || loading || eligibleItems.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Transferring..." : "Complete transfer"}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 p-5">
          <Package className="h-5 w-5 text-slate-500" />
          <div>
            <h2 className="font-semibold text-slate-900">Transfer history</h2>
            <p className="text-xs text-slate-500">
              Recent transfers sent or received by your store.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="p-10 text-center">
            <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              No transfers found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Completed transfers will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Transfer</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {transfer.transferNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {transfer.fromBusiness?.name || "—"}
                      <div className="text-xs text-slate-400">
                        {transfer.fromBusiness?.storeCode || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {transfer.toBusiness?.name || "—"}
                      <div className="text-xs text-slate-400">
                        {transfer.toBusiness?.storeCode || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(transfer.items || []).map((item, index) => (
                        <div key={`${transfer.id}-${index}`}>
                          {item.sourceItem?.name || item.destinationItem?.name || "Item"}
                          {" × "}
                          {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {transfer.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(transfer.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
