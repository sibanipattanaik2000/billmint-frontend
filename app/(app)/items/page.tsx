"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { ApiError, api, formatINR } from "@/lib/api";

interface Item {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  imei?: string | null;
  description?: string | null;
  purchasePrice?: number | string | null;
  salePrice?: number | string | null;
  mrp?: number | string | null;
  openingStock?: number | string | null;
  currentStock?: number | string | null;
  minimumStock?: number | string | null;
  gstRate?: number | string | null;
  hsnSac?: string | null;
  discountPercent?: number | string | null;
  imageUrl?: string | null;
  trackBatch?: boolean;
  trackSerial?: boolean;
  trackExpiry?: boolean;
  status?: string;
  sourceStoreCode?: string | null;
  modelName?: string | null;
  deviceCode?: string | null;
  inventoryUnits?: {
    id: string;
    itemCode: string | null;
    imei: string | null;
    serialNumber: string | null;
    status: string;
    purchasePrice: number | string | null;
  }[];
  createdAt?: string;
  updatedAt?: string;
  category?: { id?: string; name?: string } | null;
  brand?: { id?: string; name?: string } | null;
  unit?: { id?: string; name?: string; shortName?: string } | null;
  supplier?: { id?: string; name?: string } | null;
  stockMovements?: StockMovement[];
}

interface ItemModelGroup {
  modelName: string;
  totalStock: number;
  items: Item[];
}

interface StockMovement {
  id: string;
  date: string;
  type: string;
  quantityIn?: number | string | null;
  quantityOut?: number | string | null;
  balance?: number | string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMovementType(type: string): string {
  const normalized = type.replace(/[_-]+/g, " ").trim().toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function movementQuantity(movement: StockMovement): number {
  const quantityIn = toNumber(movement.quantityIn);
  const quantityOut = toNumber(movement.quantityOut);

  if (quantityIn > 0) return quantityIn;
  if (quantityOut > 0) return -quantityOut;

  return 0;
}

function isAvailableUnit(status: string): boolean {
  return status === "AVAILABLE" || status === "RETURNED";
}

export default function ItemsPage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [deletingItem, setDeletingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modelGroups, setModelGroups] = useState<ItemModelGroup[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  const loadItems = useCallback(
    async (currentPage: number, currentSearch: string) => {
      setError("");

      try {
        const response = await api.itemModels();
        const result = response as unknown as {
          success: boolean;
          data: ItemModelGroup[];
        };

        const groups = Array.isArray(result.data) ? result.data : [];
        setModelGroups(groups);

        const query = currentSearch.trim().toLowerCase();

        const filteredGroups = groups.filter((group) => {
          if (group.modelName.toLowerCase().includes(query)) return true;

          return group.items.some((item) =>
            [
              item.name,
              item.modelName,
              item.sku,
              item.deviceCode,
              item.sourceStoreCode,
              item.barcode,
              item.imei,
              item.brand?.name,
              ...(item.inventoryUnits ?? []).map((unit) => unit.itemCode),
              ...(item.inventoryUnits ?? []).map((unit) => unit.imei),
            ].some((value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(query),
            ),
          );
        });

        const nextTotalPages = Math.ceil(filteredGroups.length / limit);
        const safePage = Math.max(
          1,
          Math.min(currentPage, nextTotalPages || 1),
        );

        setTotal(filteredGroups.length);
        setTotalPages(nextTotalPages);

        const visibleGroups = filteredGroups.slice(
          (safePage - 1) * limit,
          safePage * limit,
        );

        setItems(filteredGroups.flatMap((group) => group.items));

        setSelectedItem((current) => {
          if (!visibleGroups.length) return null;

          if (current) {
            const matchingItem = visibleGroups
              .flatMap((group) => group.items)
              .find((item) => item.id === current.id);

            if (matchingItem) return matchingItem;
          }

          return visibleGroups[0].items[0] ?? null;
        });

        if (safePage !== currentPage) setPage(safePage);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Unable to load items.",
        );
        setItems([]);
        setModelGroups([]);
        setSelectedItem(null);
        setTotal(0);
        setTotalPages(0);
      }
    },
    [limit],
  );

  const handleDeleteItem = async () => {
    if (!selectedItem || deletingItem) return;

    const confirmed = window.confirm(
      `Permanently delete "${selectedItem.name}"?\n\n` +
        "This cannot be undone. Items linked to transactions will be protected.",
    );

    if (!confirmed) return;

    const itemId = selectedItem.id;

    setDeletingItem(true);
    setError("");

    try {
      await api.deleteItem(itemId);
      setSelectedItem(null);
      setRequestVersion((version) => version + 1);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to delete this item.",
      );
    } finally {
      setDeletingItem(false);
    }
  };

  useEffect(() => {
    let active = true;

    setLoading(true);

    const timer = window.setTimeout(async () => {
      await loadItems(page, search);

      if (active) setLoading(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, requestVersion, loadItems, search]);

  useEffect(() => {
    if (!selectedItem?.id) return;

    let active = true;
    setDetailLoading(true);

    api
      .item(selectedItem.id)
      .then((response) => {
        if (active) setSelectedItem(response.data as Item);
      })
      .catch(() => {
        // Keep the list data visible if detail loading fails.
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedItem?.id]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const refresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      await loadItems(page, search);
    } finally {
      setRefreshing(false);
    }
  };

  const stockValue = useMemo(() => {
    if (!selectedItem) return 0;

    return (
      toNumber(selectedItem.currentStock) * toNumber(selectedItem.purchasePrice)
    );
  }, [selectedItem]);

  const stockStatus = useMemo(() => {
    if (!selectedItem) return "unknown";

    const currentStock = toNumber(selectedItem.currentStock);
    const minimumStock = toNumber(selectedItem.minimumStock);

    if (currentStock <= 0) return "out";
    if (minimumStock > 0 && currentStock <= minimumStock) return "low";

    return "available";
  }, [selectedItem]);

  const movements = selectedItem?.stockMovements || [];

  const selectedModelGroup = useMemo(() => {
    if (!selectedItem) return null;

    const modelName =
      selectedItem.modelName?.trim() || selectedItem.name.trim();

    return modelGroups.find((group) => group.modelName === modelName) ?? null;
  }, [selectedItem, modelGroups]);

  const physicalUnits = useMemo(
    () =>
      (selectedModelGroup?.items ?? []).flatMap((item) =>
        (item.inventoryUnits ?? []).map((unit) => ({ item, unit })),
      ),
    [selectedModelGroup],
  );

  const trackedAvailableUnits = useMemo(
    () =>
      (selectedModelGroup?.items ?? []).reduce(
        (count, item) =>
          count +
          (item.inventoryUnits?.filter((unit) => isAvailableUnit(unit.status))
            .length ?? 0),
        0,
      ),
    [selectedModelGroup],
  );

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return modelGroups.filter(
      (group) =>
        group.modelName.toLowerCase().includes(query) ||
        group.items.some((item) =>
          [
            item.name,
            item.modelName,
            item.sku,
            item.deviceCode,
            item.barcode,
            item.imei,
            item.brand?.name,
            ...(item.inventoryUnits ?? []).map((unit) => unit.itemCode),
            ...(item.inventoryUnits ?? []).map((unit) => unit.imei),
          ].some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(query),
          ),
        ),
    );
  }, [modelGroups, search]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-white">
      {/* LEFT ITEM LIST */}
      <aside className="w-[330px] shrink-0 border-r border-slate-200 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Items</h1>
              <p className="text-xs text-slate-500 mt-1">
                {total} {total === 1 ? "item" : "items"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/items/new")}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code, barcode..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="text-xs text-red-700">{error}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Item</span>
          <span>Stock</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-md bg-slate-100"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No items found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {search.trim()
                    ? "Try another search."
                    : "Add your first item to start managing inventory."}
                </p>

                {!search.trim() && (
                  <button
                    type="button"
                    onClick={() => router.push("/items/new")}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredGroups
              .slice((page - 1) * limit, page * limit)
              .map((group) => {
                const stock = toNumber(group.totalStock);
                const selected = group.items.some(
                  (item) => item.id === selectedItem?.id,
                );

                return (
                  <button
                    type="button"
                    key={group.modelName}
                    onClick={() => {
                      const firstItem = group.items[0];
                      if (firstItem) setSelectedItem(firstItem);
                    }}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                      selected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div className="min-w-0">
                        <div
                          className={`truncate text-sm ${
                            selected
                              ? "font-semibold text-blue-700"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {group.modelName}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {group.items.length}{" "}
                          {group.items.length === 1
                            ? "item record"
                            : "item records"}
                        </div>

                        <div className="mt-1 truncate text-xs text-indigo-600">
                          Source Store:{" "}
                          {Array.from(
                            new Set(
                              group.items
                                .map((item) => item.sourceStoreCode?.trim())
                                .filter((code): code is string =>
                                  Boolean(code),
                                ),
                            ),
                          ).join(", ") || "Not specified"}
                        </div>
                      </div>

                      <div
                        className={`text-sm font-medium ${
                          stock <= 0 ? "text-red-600" : "text-slate-600"
                        }`}
                      >
                        {stock}
                      </div>
                    </div>
                  </button>
                );
              })
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="border-t border-slate-200 px-3 py-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT DETAIL PANEL */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        {!selectedItem ? (
          <div className="flex min-h-full items-center justify-center px-6">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-base font-semibold text-slate-800">
                No item selected
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select an item from the list.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {selectedItem.name}
                  </h2>

                  {stockStatus === "out" && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      Out of stock
                    </span>
                  )}
                  {stockStatus === "low" && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Low stock
                    </span>
                  )}
                  {stockStatus === "available" && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      In stock
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    Item Code:{" "}
                    <strong className="font-medium text-slate-700">
                      {selectedItem.sku || "—"}
                    </strong>
                  </span>
                  <span>
                    Barcode:{" "}
                    <strong className="font-medium text-slate-700">
                      {selectedItem.barcode || "—"}
                    </strong>
                  </span>
                  {selectedItem.hsnSac && (
                    <span>
                      HSN/SAC:{" "}
                      <strong className="font-medium text-slate-700">
                        {selectedItem.hsnSac}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing || detailLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <Link
                  href={`/items/${selectedItem.id}/edit`}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </Link>

                <button
                  type="button"
                  onClick={() => router.push(`/items/${selectedItem.id}/edit`)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Adjust Stock
                </button>

                <button
                  type="button"
                  onClick={handleDeleteItem}
                  disabled={deletingItem || detailLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingItem ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sale Price
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {formatINR(toNumber(selectedItem.salePrice))}
                </div>
                <div className="mt-1 text-xs text-slate-500">Selling price</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Purchase Price
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {formatINR(toNumber(selectedItem.purchasePrice))}
                </div>
                <div className="mt-1 text-xs text-slate-500">Cost price</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current Stock
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {toNumber(selectedItem.currentStock)}
                  {selectedItem.unit?.shortName
                    ? ` ${selectedItem.unit.shortName}`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Minimum: {toNumber(selectedItem.minimumStock)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Stock Value
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  {formatINR(stockValue)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Current stock × purchase price
                </div>
              </div>
            </div>

            {/* PHYSICAL STOCK REGISTER */}
            <section className="mb-6 overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Physical Stock Units
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Available and sold units recorded against this model.
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {trackedAvailableUnits} available units
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Item Code
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        IMEI
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Qty
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {physicalUnits.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center">
                          <Package className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            No tracked units recorded
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Units will appear here when inventory records
                            include IMEI or serial tracking.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      physicalUnits.map(({ item, unit }) => {
                        const isSold = unit.status === "SOLD";

                        return (
                          <tr
                            key={unit.id}
                            className={`border-b border-slate-100 last:border-b-0 ${
                              isSold ? "bg-red-50/40" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {unit.itemCode ||
                                item.deviceCode ||
                                item.sku ||
                                "—"}
                            </td>

                            <td className="px-4 py-3 font-mono text-xs text-slate-700">
                              {unit.imei || "—"}
                            </td>

                            <td className="px-4 py-3">
                              {isSold ? (
                                <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  SOLD OUT
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                    isAvailableUnit(unit.status)
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {unit.status}
                                </span>
                              )}
                            </td>

                            <td
                              className={`px-4 py-3 text-right font-medium ${
                                isSold ? "text-red-600" : "text-slate-800"
                              }`}
                            >
                              {isSold
                                ? 0
                                : isAvailableUnit(unit.status)
                                  ? 1
                                  : 0}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* DETAILS */}
            <section className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Item Details
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-xs text-slate-500">Item Code</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.sku || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Source Store Code
                  </div>
                  <div className="mt-1 text-sm font-medium text-indigo-700">
                    {selectedItem.sourceStoreCode || "Not specified"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Barcode</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.barcode || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">IMEI</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.imei || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">HSN / SAC</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.hsnSac || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Category</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.category?.name || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Brand</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.brand?.name || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Unit</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.unit?.shortName ||
                      selectedItem.unit?.name ||
                      "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Supplier</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.supplier?.name || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">GST Rate</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {toNumber(selectedItem.gstRate)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">MRP</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.mrp != null
                      ? formatINR(toNumber(selectedItem.mrp))
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Opening Stock</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {toNumber(selectedItem.openingStock)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Default Discount</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {toNumber(selectedItem.discountPercent)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Batch Tracking</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.trackBatch ? "Enabled" : "Disabled"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    IMEI / Serial Tracking
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.trackSerial ? "Enabled" : "Disabled"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Expiry Tracking</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedItem.trackExpiry ? "Enabled" : "Disabled"}
                  </div>
                </div>

                <div className="sm:col-span-2 xl:col-span-1">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedItem.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {selectedItem.status || "UNKNOWN"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedItem.description && (
                <div className="border-t border-slate-200 px-5 py-4">
                  <div className="text-xs text-slate-500">Description</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {selectedItem.description}
                  </p>
                </div>
              )}
            </section>

            {/* STOCK MOVEMENTS */}
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Stock Transactions
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Inventory movement recorded by the backend.
                  </p>
                </div>

                {detailLoading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Type
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reference
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Notes
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <Package className="mx-auto h-8 w-8 text-slate-300" />
                            <div className="mt-3 text-sm font-medium text-slate-700">
                              No stock transactions
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Transactions will appear here as stock changes.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        movements.map((movement) => {
                          const quantity = movementQuantity(movement);
                          const isIn = quantity > 0;

                          return (
                            <tr
                              key={movement.id}
                              className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium text-slate-800">
                                  {formatMovementType(movement.type)}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {movement.referenceType ||
                                movement.referenceId ? (
                                  <div>
                                    <div className="text-xs font-medium text-slate-700">
                                      {movement.referenceType
                                        ? formatMovementType(
                                            movement.referenceType,
                                          )
                                        : "Reference"}
                                    </div>
                                    {movement.referenceId && (
                                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                                        {movement.referenceId}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {formatDate(movement.date)}
                              </td>

                              <td className="px-4 py-3 text-right font-medium">
                                <span
                                  className={
                                    isIn
                                      ? "text-emerald-600"
                                      : quantity < 0
                                        ? "text-red-600"
                                        : "text-slate-700"
                                  }
                                >
                                  {isIn ? "+" : ""}
                                  {quantity}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-right font-medium text-slate-800">
                                {toNumber(movement.balance)}
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                {movement.notes || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* FOOTER INFO */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              {selectedItem.createdAt && (
                <span>Created: {formatDate(selectedItem.createdAt)}</span>
              )}
              {selectedItem.updatedAt && (
                <span>Last updated: {formatDate(selectedItem.updatedAt)}</span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
