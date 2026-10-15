"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface StockMovement {
  id: string;
  type?: string | null;
  date?: string | Date | null;
  quantityIn?: string | number | null;
  quantityOut?: string | number | null;
  balance?: string | number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}

interface Item {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  currentStock?: string | number | null;
  openingStock?: string | number | null;
  salePrice?: string | number | null;
  purchasePrice?: string | number | null;
  minimumStock?: string | number | null;
  mrp?: string | number | null;
  gstRate?: string | number | null;
  hsnSac?: string | null;
  status?: string | null;
  category?: { name?: string | null } | null;
  brand?: { name?: string | null } | null;
  unit?: { name?: string | null; shortName?: string | null } | null;
  supplier?: { name?: string | null } | null;
  stockMovements?: StockMovement[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function movementLabel(movement: StockMovement): string {
  const type = String(movement.type ?? "MOVEMENT").toUpperCase();

  const labels: Record<string, string> = {
    OPENING: "Opening Stock",
    PURCHASE: "Purchase",
    SALE: "Sale",
    SALE_RETURN: "Sale Return",
    PURCHASE_RETURN: "Purchase Return",
    ADJUSTMENT: "Stock Adjustment",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadItem = useCallback(
    async (manualRefresh = false) => {
      if (!id) {
        setError("Item ID is missing.");
        setLoading(false);
        return;
      }

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.item(id);

        if (!response?.data || typeof response.data !== "object") {
          throw new Error("The server returned an invalid item response.");
        }

        setItem(response.data as Item);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to load item details.";

        setError(message);

        if (err instanceof ApiError && err.status === 404) {
          setItem(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading item details from the server…</div>
      </div>
    );
  }

  if (!item && error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-gray-800">
            Unable to load item
          </h2>
          <p className="text-sm text-gray-500 mt-2">{error}</p>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={() => router.push("/items")}
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded text-sm"
            >
              Back to Items
            </button>

            <button
              type="button"
              onClick={() => void loadItem(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <button
            type="button"
            onClick={() => router.push("/items")}
            className="text-blue-600 hover:underline"
          >
            ← Back to Items
          </button>
        </div>
      </div>
    );
  }

  const quantity = toNumber(item.currentStock);
  const salePrice = toNumber(item.salePrice);
  const purchasePrice = toNumber(item.purchasePrice);
  const stockValue = quantity * purchasePrice;
  const movements = item.stockMovements ?? [];

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      {/* Header — existing layout retained */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/items")}
            className="text-gray-500 hover:text-gray-700 text-xl shrink-0"
            aria-label="Back to Items"
          >
            ←
          </button>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-800 truncate">
              {item.name}
            </h1>
            {item.sku && (
              <p className="text-xs text-gray-500 mt-1">
                Item Code: {item.sku}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => router.push(`/items/${encodeURIComponent(item.id)}/edit`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium"
          >
            ADJUST ITEM
          </button>

          <Link
            href={`/items/${encodeURIComponent(item.id)}/edit`}
            className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded text-sm"
          >
            Edit
          </Link>

          <button
            type="button"
            onClick={() => void loadItem(true)}
            disabled={refreshing}
            title="Refresh item details"
            aria-label="Refresh item details"
            className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Keep the page usable if refresh fails */}
      {error && (
        <div className="mx-6 mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
          <button
            type="button"
            onClick={() => void loadItem(true)}
            className="ml-3 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Price & Stock Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">SALE PRICE</div>
            <div className="text-lg font-semibold">
              ₹ {formatINR(salePrice)}
              <span className="text-sm font-normal text-gray-500 ml-1">
                (excl)
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">PURCHASE PRICE</div>
            <div className="text-lg font-semibold">
              ₹ {formatINR(purchasePrice)}
              <span className="text-sm font-normal text-gray-500 ml-1">
                (excl)
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">STOCK QUANTITY</div>
            <div className="text-lg font-semibold">
              {quantity.toLocaleString("en-IN")}
              {item.unit?.shortName ? ` ${item.unit.shortName}` : ""}
            </div>
            {toNumber(item.minimumStock) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum stock: {toNumber(item.minimumStock)}
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">STOCK VALUE</div>
            <div className="text-lg font-semibold">
              ₹ {formatINR(stockValue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on current stock × purchase price
            </p>
          </div>
        </div>

        {/* Item Details */}
        <div className="mb-8">
          <h2 className="font-medium text-gray-700 mb-3">ITEM DETAILS</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Item Code</p>
              <p className="text-sm font-medium">{item.sku || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Barcode</p>
              <p className="text-sm font-medium">{item.barcode || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <p className="text-sm font-medium">
                {item.category?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Brand</p>
              <p className="text-sm font-medium">{item.brand?.name || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Unit</p>
              <p className="text-sm font-medium">
                {item.unit?.name || item.unit?.shortName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Supplier</p>
              <p className="text-sm font-medium">
                {item.supplier?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">GST Rate</p>
              <p className="text-sm font-medium">
                {item.gstRate != null ? `${toNumber(item.gstRate)}%` : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">HSN / SAC</p>
              <p className="text-sm font-medium">{item.hsnSac || "—"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className="text-sm font-medium">
                {String(item.status ?? "ACTIVE").replaceAll("_", " ")}
              </p>
            </div>

            {item.description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Movements */}
        <div>
          <h2 className="font-medium text-gray-700 mb-3">TRANSACTIONS</h2>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[850px]">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">REFERENCE</th>
                  <th className="py-3 px-4">DETAILS</th>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4 text-right">QTY IN</th>
                  <th className="py-3 px-4 text-right">QTY OUT</th>
                  <th className="py-3 px-4 text-right">BALANCE</th>
                </tr>
              </thead>

              <tbody>
                {movements.length > 0 ? (
                  movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        {movementLabel(movement)}
                      </td>

                      <td className="py-3 px-4">
                        {movement.referenceId || "—"}
                      </td>

                      <td className="py-3 px-4">
                        {movement.notes || "—"}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(movement.date)}
                      </td>

                      <td className="py-3 px-4 text-right text-green-700">
                        {toNumber(movement.quantityIn) > 0
                          ? toNumber(movement.quantityIn).toLocaleString("en-IN")
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-right text-red-600">
                        {toNumber(movement.quantityOut) > 0
                          ? toNumber(movement.quantityOut).toLocaleString("en-IN")
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-right font-medium">
                        {movement.balance != null
                          ? toNumber(movement.balance).toLocaleString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No stock movements have been recorded for this item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Showing up to the latest 50 stock movements returned by the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
