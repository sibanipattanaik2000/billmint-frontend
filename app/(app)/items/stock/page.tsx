
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Package, RefreshCw, Search } from "lucide-react";
import { ApiError, api, formatINR } from "@/lib/api";

interface InventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  currentStock?: number | string | null;
  minimumStock?: number | string | null;
  purchasePrice?: number | string | null;
  salePrice?: number | string | null;
  status?: string;
  category?: { name?: string | null } | null;
  unit?: { shortName?: string | null; name?: string | null } | null;
}

function num(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function stockLabel(item: InventoryItem): string {
  const stock = num(item.currentStock);
  const minimum = num(item.minimumStock);

  if (stock <= 0) return "Out of stock";
  if (minimum > 0 && stock <= minimum) return "Low stock";
  return "In stock";
}

export default function StockSummaryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStock = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const first = await api.items({ page: 1, limit: 100 });
      const firstItems = Array.isArray(first.data)
        ? (first.data as InventoryItem[])
        : [];

      const totalPages = Math.max(
        1,
        Number(first.pagination?.totalPages || 1),
      );

      const allItems = [...firstItems];

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await api.items({ page, limit: 100 });
        if (Array.isArray(response.data)) {
          allItems.push(...(response.data as InventoryItem[]));
        }
      }

      setItems(allItems);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Unable to load stock summary.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.name, item.sku, item.category?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, search]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (result, item) => {
        const stock = num(item.currentStock);
        result.itemCount += 1;
        result.units += stock;
        result.purchaseValue += stock * num(item.purchasePrice);

        if (stock <= 0) result.outOfStock += 1;
        else if (num(item.minimumStock) > 0 && stock <= num(item.minimumStock)) {
          result.lowStock += 1;
        }

        return result;
      },
      {
        itemCount: 0,
        units: 0,
        purchaseValue: 0,
        lowStock: 0,
        outOfStock: 0,
      },
    );
  }, [filteredItems]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadStock();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Stock Summary
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Current inventory quantities and estimated stock value.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || refreshing}
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
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadStock()}
              className="mt-2 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Items"
          value={loading ? "—" : String(summary.itemCount)}
          detail="Matching inventory items"
        />
        <SummaryCard
          label="Total Units"
          value={loading ? "—" : summary.units.toLocaleString("en-IN")}
          detail="Current quantity across items"
        />
        <SummaryCard
          label="Low Stock"
          value={loading ? "—" : String(summary.lowStock)}
          detail="At or below minimum stock"
          warning={summary.lowStock > 0}
        />
        <SummaryCard
          label="Out of Stock"
          value={loading ? "—" : String(summary.outOfStock)}
          detail="Items with zero or less stock"
          warning={summary.outOfStock > 0}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Inventory</h2>
            <p className="mt-1 text-xs text-slate-500">
              Estimated value at purchase price:{" "}
              <span className="font-semibold text-slate-800">
                {loading ? "—" : formatINR(summary.purchaseValue)}
              </span>
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item, code or category..."
              aria-label="Search inventory"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Purchase Price</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Stock Value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Loading inventory from your account…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 font-medium text-slate-700">
                      No inventory items found
                    </p>
                    <p className="mt-1 text-slate-500">
                      {search
                        ? "Try a different search."
                        : "Add items to your inventory to see their stock here."}
                    </p>
                    {!search && (
                      <Link
                        href="/items"
                        className="mt-3 inline-block font-medium text-blue-600 hover:text-blue-700"
                      >
                        Open Items
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = num(item.currentStock);
                  const minimum = num(item.minimumStock);
                  const label = stockLabel(item);
                  const badgeClass =
                    label === "Out of stock"
                      ? "bg-red-50 text-red-700"
                      : label === "Low stock"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href="/items"
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.sku || "No item code"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatINR(num(item.purchasePrice))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {stock.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {item.unit?.shortName || item.unit?.name || ""}
                        </span>
                        {minimum > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            Minimum: {minimum}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatINR(stock * num(item.purchasePrice))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Showing {loading ? "…" : filteredItems.length} of{" "}
          {loading ? "…" : items.length} items.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${warning ? "text-amber-700" : "text-slate-900"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
