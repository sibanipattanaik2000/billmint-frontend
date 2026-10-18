
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  AlertCircle,
  Boxes,
  CheckCircle2,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";

const SHELF_ORDER = ["A", "B", "C", "D", "E", "Z", "H", "ZR", "R"];

interface Shelf {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { stocks: number };
}

interface ItemOption {
  id: string;
  name: string;
  sku?: string | null;
  currentStock: number | string;
  unit?: { name?: string | null; shortName?: string | null } | null;
}

interface ShelfStockRow {
  id: string;
  quantity: number | string;
  item: ItemOption & {
    barcode?: string | null;
    minimumStock?: number | string | null;
  };
}

interface ShelfStockResponse {
  shelf: Shelf;
  stocks: ShelfStockRow[];
}

function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export default function ShelfManagementPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [stockData, setStockData] = useState<ShelfStockResponse | null>(null);
  const [search, setSearch] = useState("");

  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [destinationShelfId, setDestinationShelfId] = useState("");
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("1");
  const [transferReason, setTransferReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadShelvesAndItems = useCallback(async () => {
    setError("");

    const [shelfResponse, itemResponse] = await Promise.all([
      api.shelves(),
      api.items({ page: 1, limit: 100 }),
    ]);

    const shelfData = Array.isArray(shelfResponse.data)
      ? (shelfResponse.data as Shelf[])
      : [];

    const orderedShelves = [...shelfData].sort(
      (a, b) =>
        SHELF_ORDER.indexOf(a.name) - SHELF_ORDER.indexOf(b.name),
    );

    const firstItems = Array.isArray(itemResponse.data)
      ? (itemResponse.data as ItemOption[])
      : [];

    const totalPages = Math.max(
      1,
      Number(itemResponse.pagination?.totalPages || 1),
    );

    const allItems = [...firstItems];

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await api.items({ page, limit: 100 });
      if (Array.isArray(response.data)) {
        allItems.push(...(response.data as ItemOption[]));
      }
    }

    setShelves(orderedShelves);
    setItems(allItems);

    setSelectedShelfId((current) => {
      if (orderedShelves.some((shelf) => shelf.id === current)) {
        return current;
      }
      return orderedShelves[0]?.id ?? "";
    });

    setDestinationShelfId((current) => {
      if (
        current &&
        orderedShelves.some((shelf) => shelf.id === current)
      ) {
        return current;
      }
      return orderedShelves.find(
        (shelf) => shelf.id !== selectedShelfId,
      )?.id ?? "";
    });
  }, [selectedShelfId]);

  const loadShelfStock = useCallback(async (shelfId: string) => {
    if (!shelfId) {
      setStockData(null);
      return;
    }

    setStockLoading(true);
    setError("");

    try {
      const response = await api.shelfStock(shelfId);
      setStockData(response.data as ShelfStockResponse);
    } catch (err) {
      setStockData(null);
      setError(errorMessage(err));
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      setLoading(true);
      try {
        await loadShelvesAndItems();
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, [loadShelvesAndItems]);

  useEffect(() => {
    void loadShelfStock(selectedShelfId);
  }, [selectedShelfId, loadShelfStock]);

  const currentStocks = stockData?.stocks ?? [];

  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentStocks;

    return currentStocks.filter((stock) =>
      [
        stock.item.name,
        stock.item.sku,
        stock.item.barcode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [currentStocks, search]);

  const totalUnitsOnShelf = currentStocks.reduce(
    (total, stock) => total + numberValue(stock.quantity),
    0,
  );

  const allocatedItemIds = new Set(currentStocks.map((stock) => stock.item.id));
  const selectedItem = items.find((item) => item.id === itemId);
  const transferItemOptions = currentStocks.filter(
    (stock) => numberValue(stock.quantity) > 0,
  );

  async function refreshAll() {
    setRefreshing(true);
    setError("");
    setSuccess("");

    try {
      await loadShelvesAndItems();
      if (selectedShelfId) await loadShelfStock(selectedShelfId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAllocate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedShelfId || !itemId || numberValue(quantity) <= 0) {
      setError("Choose a shelf, an item, and a quantity greater than zero.");
      return;
    }

    setSaving(true);
    try {
      await api.placeShelfStock(selectedShelfId, {
        itemId,
        quantity: numberValue(quantity),
      });

      setSuccess("Stock allocated to the selected shelf.");
      setQuantity("1");
      setItemId("");
      await loadShelfStock(selectedShelfId);
      await loadShelvesAndItems();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !selectedShelfId ||
      !transferItemId ||
      !destinationShelfId ||
      destinationShelfId === selectedShelfId ||
      numberValue(transferQuantity) <= 0
    ) {
      setError("Choose an item, a different destination shelf, and a valid quantity.");
      return;
    }

    setSaving(true);
    try {
      await api.transferShelfStock({
        itemId: transferItemId,
        fromShelfId: selectedShelfId,
        toShelfId: destinationShelfId,
        quantity: numberValue(transferQuantity),
        reason: transferReason.trim() || undefined,
      });

      setSuccess("Stock transferred successfully.");
      setTransferQuantity("1");
      setTransferReason("");
      setTransferItemId("");
      await loadShelfStock(selectedShelfId);
      await loadShelvesAndItems();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Shelf Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track where inventory is stored and transfer stock between shelves.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading || refreshing || saving}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Configured shelves</p>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? "—" : shelves.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Items on selected shelf</p>
              <p className="text-2xl font-bold text-slate-900">
                {stockLoading ? "—" : currentStocks.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Units on selected shelf</p>
              <p className="text-2xl font-bold text-slate-900">
                {stockLoading ? "—" : totalUnitsOnShelf.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-slate-900">Your shelves</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a shelf to view its stock, allocate items, or transfer stock out.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {SHELF_ORDER.map((name) => (
              <div key={name} className="card h-24 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {SHELF_ORDER.map((name) => {
              const shelf = shelves.find((entry) => entry.name === name);
              const selected = shelf?.id === selectedShelfId;

              return (
                <button
                  key={name}
                  type="button"
                  disabled={!shelf || !shelf.isActive}
                  onClick={() => {
                    if (shelf) {
                      setSelectedShelfId(shelf.id);
                      setSuccess("");
                      setError("");
                    }
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">{name}</span>
                    <Warehouse
                      className={`h-4 w-4 ${selected ? "text-brand-600" : "text-slate-400"}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {shelf ? `${shelf._count?.stocks ?? 0} stock lines` : "Not configured"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedShelfId && (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <form
              onSubmit={handleAllocate}
              className="card space-y-4 p-5"
            >
              <div>
                <h2 className="font-semibold text-slate-900">Allocate stock</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Put existing inventory onto shelf {stockData?.shelf.name ?? ""}.
                  This does not increase overall inventory.
                </p>
              </div>

              <div>
                <label htmlFor="allocate-item" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Inventory item
                </label>
                <select
                  id="allocate-item"
                  required
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  className="input w-full"
                >
                  <option value="">Select an item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.sku ? ` (${item.sku})` : ""} — overall stock: {numberValue(item.currentStock)}
                    </option>
                  ))}
                </select>
                {selectedItem && (
                  <p className="mt-1 text-xs text-slate-500">
                    Overall stock: {numberValue(selectedItem.currentStock)}{" "}
                    {selectedItem.unit?.shortName || selectedItem.unit?.name || "units"}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="allocate-quantity" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Quantity to allocate
                </label>
                <input
                  id="allocate-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading || !itemId || numberValue(quantity) <= 0}
                className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Package className="h-4 w-4" />
                {saving ? "Saving..." : "Allocate to shelf"}
              </button>
            </form>

            <form
              onSubmit={handleTransfer}
              className="card space-y-4 p-5"
            >
              <div>
                <h2 className="font-semibold text-slate-900">Transfer between shelves</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Move stock from shelf {stockData?.shelf.name ?? ""} to another shelf.
                </p>
              </div>

              <div>
                <label htmlFor="transfer-item" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Item currently on this shelf
                </label>
                <select
                  id="transfer-item"
                  required
                  value={transferItemId}
                  onChange={(event) => setTransferItemId(event.target.value)}
                  className="input w-full"
                >
                  <option value="">Select stock to transfer</option>
                  {transferItemOptions.map((stock) => (
                    <option key={stock.item.id} value={stock.item.id}>
                      {stock.item.name} — on shelf: {numberValue(stock.quantity)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="transfer-destination" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Destination shelf
                </label>
                <select
                  id="transfer-destination"
                  required
                  value={destinationShelfId}
                  onChange={(event) => setDestinationShelfId(event.target.value)}
                  className="input w-full"
                >
                  <option value="">Select destination</option>
                  {shelves
                    .filter((shelf) => shelf.isActive && shelf.id !== selectedShelfId)
                    .map((shelf) => (
                      <option key={shelf.id} value={shelf.id}>
                        Shelf {shelf.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="transfer-quantity" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    id="transfer-quantity"
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={transferQuantity}
                    onChange={(event) => setTransferQuantity(event.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label htmlFor="transfer-reason" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Reason (optional)
                  </label>
                  <input
                    id="transfer-reason"
                    type="text"
                    maxLength={255}
                    value={transferReason}
                    onChange={(event) => setTransferReason(event.target.value)}
                    placeholder="e.g. Reorganizing"
                    className="input w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  !transferItemId ||
                  !destinationShelfId ||
                  destinationShelfId === selectedShelfId ||
                  numberValue(transferQuantity) <= 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {saving ? "Processing..." : "Transfer stock"}
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Shelf {stockData?.shelf.name ?? ""} inventory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quantities currently allocated to this shelf.
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, code or barcode"
                  className="input w-full pl-9"
                />
              </div>
            </div>

            {stockLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading shelf inventory...
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-medium text-slate-700">
                  {currentStocks.length === 0 ? "No stock allocated to this shelf yet" : "No matching items"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {currentStocks.length === 0
                    ? "Use Allocate stock above to assign existing inventory."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Item code</th>
                      <th className="px-4 py-3 text-right font-medium">On shelf</th>
                      <th className="px-4 py-3 text-right font-medium">Overall stock</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStocks.map((stock) => (
                      <tr key={stock.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {stock.item.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {stock.item.sku || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {numberValue(stock.quantity).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {numberValue(stock.item.currentStock).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {stock.item.unit?.shortName || stock.item.unit?.name || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
