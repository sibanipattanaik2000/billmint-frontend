
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

interface InventoryUnit {
  id: string;
  itemCode?: string | null;
  imei?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  sourceCode?: string | null;
  status: string;
  purchasePrice?: string | number | null;
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
  imei?: string | null;
  deviceCode?: string | null;
  sourceStoreCode?: string | null;
  inventoryUnits?: InventoryUnit[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantity(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
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

function statusLabel(status?: string | null): string {
  return String(status ?? "ACTIVE").replaceAll("_", " ");
}

function statusClass(status?: string | null): string {
  const value = String(status ?? "").toUpperCase();

  switch (value) {
    case "AVAILABLE":
    case "ACTIVE":
    case "RETURNED":
      return "bg-green-50 text-green-700";

    case "RESERVED":
    case "IN_TRANSIT":
      return "bg-amber-50 text-amber-700";

    case "SOLD":
      return "bg-blue-50 text-blue-700";

    case "DAMAGED":
    case "LOST":
    case "INACTIVE":
      return "bg-red-50 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div
        className={`text-sm font-medium text-gray-800 break-words ${
          mono ? "font-mono" : ""
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function PriceCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 min-w-0">
      <div className="text-xs font-medium tracking-wide text-gray-500 mb-2">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900 break-words">
        {value}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

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
      <div className="flex-1 flex items-center justify-center bg-white min-h-[300px]">
        <div className="text-sm text-gray-500">
          Loading item details from the server…
        </div>
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

          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
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

  const units = item.inventoryUnits ?? [];
  const movements = item.stockMovements ?? [];

  const quantity = toNumber(item.currentStock);
  const salePrice = toNumber(item.salePrice);
  const purchasePrice = toNumber(item.purchasePrice);
  const mrp = toNumber(item.mrp);
  const minimumStock = toNumber(item.minimumStock);

  // A missing purchase price means the backend has not supplied cost data.
  // This also allows branch responses with redacted cost fields to stay private.
  const canViewPurchasePrice =
    hasValue(item.purchasePrice) ||
    units.some((unit) => hasValue(unit.purchasePrice));

  const unitCostTotal = units.reduce((total, unit) => {
    return hasValue(unit.purchasePrice)
      ? total + toNumber(unit.purchasePrice)
      : total;
  }, 0);

  const stockValue = hasValue(item.purchasePrice)
    ? quantity * purchasePrice
    : unitCostTotal;

  const hasStockValue =
    hasValue(item.purchasePrice) || units.some((unit) => hasValue(unit.purchasePrice));

  const deviceSourceCodes = [
    ...new Set(
      units
        .map((unit) => unit.sourceCode)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const deviceImeis = units
    .map((unit) => unit.imei)
    .filter((value): value is string => Boolean(value));

  const isLowStock =
    minimumStock > 0 && quantity <= minimumStock;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      {/* HEADER */}
      <div className="px-4 sm:px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
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
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
              {item.name}
            </h1>

            <p className="text-xs text-gray-500 mt-1">
              Item Code: {item.sku || item.deviceCode || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              router.push(`/items/${encodeURIComponent(item.id)}/edit`)
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium"
          >
            ADJUST ITEM
          </button>

          <Link
            href={`/items/${encodeURIComponent(item.id)}/edit`}
            className="border border-gray-300 hover:bg-gray-50 px-3 sm:px-4 py-2 rounded text-xs sm:text-sm"
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

      {/* REFRESH ERROR */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* PRICE AND STOCK CARDS */}
        <section className="mb-8">
          <h2 className="font-medium text-gray-700 mb-3">
            PRICE & STOCK SUMMARY
          </h2>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              canViewPurchasePrice
                ? "xl:grid-cols-4"
                : "xl:grid-cols-2"
            } gap-4`}
          >
            <PriceCard
              label="SALE PRICE"
              value={`₹ ${formatINR(salePrice)}`}
              description="Selling price (excluding tax, if applicable)"
            />

            {hasValue(item.mrp) && (
              <PriceCard
                label="MRP"
                value={`₹ ${formatINR(mrp)}`}
                description="Maximum retail price"
              />
            )}

            <div className="bg-gray-50 rounded-lg p-4 min-w-0">
              <div className="text-xs font-medium tracking-wide text-gray-500 mb-2">
                STOCK QUANTITY
              </div>

              <div className="text-lg font-semibold text-gray-900">
                {formatQuantity(quantity)}
                {item.unit?.shortName ? ` ${item.unit.shortName}` : ""}
              </div>

              {minimumStock > 0 && (
                <p
                  className={`text-xs mt-1 ${
                    isLowStock ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  Minimum stock: {formatQuantity(minimumStock)}
                  {isLowStock ? " • Low stock" : ""}
                </p>
              )}
            </div>

            {canViewPurchasePrice && (
              <>
                <PriceCard
                  label="PURCHASE PRICE"
                  value={
                    hasValue(item.purchasePrice)
                      ? `₹ ${formatINR(purchasePrice)}`
                      : "Device-level cost"
                  }
                  description="Purchase cost information"
                />

                {hasStockValue && (
                  <PriceCard
                    label="STOCK VALUE"
                    value={`₹ ${formatINR(stockValue)}`}
                    description={
                      hasValue(item.purchasePrice)
                        ? "Current stock × purchase price"
                        : "Total available device-level purchase cost"
                    }
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* ITEM DETAILS */}
        <section className="mb-8">
          <h2 className="font-medium text-gray-700 mb-3">
            ITEM DETAILS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border rounded-lg p-4 sm:p-5">
            <DetailField
              label="Item Name"
              value={item.name}
            />

            <DetailField
              label="Item Code / SKU"
              value={item.sku || item.deviceCode || "—"}
              mono
            />

            <DetailField
              label="Device Source Codes"
              value={deviceSourceCodes.length > 0
                ? deviceSourceCodes.join(", ")
                : "—"}
              mono
            />

            <DetailField
              label="Source Store Code"
              value={item.sourceStoreCode || "—"}
              mono
            />

            <DetailField
              label="IMEI"
              value={
                deviceImeis.length > 0
                  ? deviceImeis.join(", ")
                  : item.imei || "—"
              }
              mono
            />

            <DetailField
              label="Barcode"
              value={item.barcode || "—"}
              mono
            />

            <DetailField
              label="Category"
              value={item.category?.name || "—"}
            />

            <DetailField
              label="Brand"
              value={item.brand?.name || "—"}
            />

            <DetailField
              label="Unit"
              value={item.unit?.name || item.unit?.shortName || "—"}
            />

            <DetailField
              label="Supplier"
              value={item.supplier?.name || "—"}
            />

            <DetailField
              label="GST Rate"
              value={hasValue(item.gstRate)
                ? `${toNumber(item.gstRate)}%`
                : "—"}
            />

            <DetailField
              label="HSN / SAC"
              value={item.hsnSac || "—"}
              mono
            />

            <DetailField
              label="Opening Stock"
              value={hasValue(item.openingStock)
                ? formatQuantity(toNumber(item.openingStock))
                : "—"}
            />

            <DetailField
              label="Minimum Stock"
              value={hasValue(item.minimumStock)
                ? formatQuantity(minimumStock)
                : "—"}
            />

            <DetailField
              label="Status"
              value={
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs ${statusClass(
                    item.status,
                  )}`}
                >
                  {statusLabel(item.status)}
                </span>
              }
            />

            {item.description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-gray-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {item.description}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* PHYSICAL DEVICE REGISTER */}
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-medium text-gray-700">
                PHYSICAL DEVICE REGISTER
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Individual device records linked to this item.
              </p>
            </div>

            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1">
              {units.length} device{units.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[850px]">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="py-3 px-4">ITEM CODE</th>
                  <th className="py-3 px-4">SOURCE CODE</th>
                  <th className="py-3 px-4">IMEI</th>
                  <th className="py-3 px-4">SERIAL NUMBER</th>
                  <th className="py-3 px-4">BARCODE</th>
                  {canViewPurchasePrice && (
                    <th className="py-3 px-4 text-right">
                      PURCHASE PRICE
                    </th>
                  )}
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>

              <tbody>
                {units.length > 0 ? (
                  units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium">
                        {unit.itemCode ||
                          item.deviceCode ||
                          item.sku ||
                          "—"}
                      </td>

                      <td className="py-3 px-4 text-indigo-700 font-medium">
                        {unit.sourceCode || "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {unit.imei || "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {unit.serialNumber || "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {unit.barcode || "—"}
                      </td>

                      {canViewPurchasePrice && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {hasValue(unit.purchasePrice)
                            ? `₹ ${formatINR(toNumber(unit.purchasePrice))}`
                            : "—"}
                        </td>
                      )}

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${statusClass(
                            unit.status,
                          )}`}
                        >
                          {statusLabel(unit.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canViewPurchasePrice ? 7 : 6}
                      className="py-10 text-center text-gray-400"
                    >
                      No individual device records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* STOCK MOVEMENTS */}
        <section className="mb-4">
          <div className="mb-3">
            <h2 className="font-medium text-gray-700">
              STOCK MOVEMENTS & TRANSACTIONS
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Stock-in, stock-out, sales, purchases, returns and adjustments.
            </p>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-gray-500">
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">REFERENCE TYPE</th>
                  <th className="py-3 px-4">REFERENCE ID</th>
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
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium">
                        {movementLabel(movement)}
                      </td>

                      <td className="py-3 px-4">
                        {movement.referenceType
                          ? movement.referenceType.replaceAll("_", " ")
                          : "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {movement.referenceId || "—"}
                      </td>

                      <td className="py-3 px-4 max-w-[260px] whitespace-normal break-words">
                        {movement.notes || "—"}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(movement.date)}
                      </td>

                      <td className="py-3 px-4 text-right text-green-700">
                        {toNumber(movement.quantityIn) > 0
                          ? formatQuantity(toNumber(movement.quantityIn))
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-right text-red-600">
                        {toNumber(movement.quantityOut) > 0
                          ? formatQuantity(toNumber(movement.quantityOut))
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-right font-medium">
                        {movement.balance != null
                          ? formatQuantity(toNumber(movement.balance))
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-gray-400"
                    >
                      No stock movements have been recorded for this item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Showing the stock movements returned by the backend. The current
            API response may be limited to the latest 50 movements.
          </p>
        </section>
      </div>
    </div>
  );
}
