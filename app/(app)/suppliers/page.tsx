"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatINR } from "@/lib/api";

interface Purchase {
  id: string;
  billNumber?: string | null;
  date?: string | null;
  status?: string | null;
  grandTotal?: number | string | null;
  paidAmount?: number | string | null;
  balanceAmount?: number | string | null;
}

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  currentBalance?: number | string | null;
  openingBalance?: number | string | null;
  payable?: number | string | null;
  totalPurchase?: number | string | null;
  purchases?: Purchase[];
}

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function SuppliersPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.suppliers({
        page: 1,
        limit: 100,
        search: search.trim(),
        status: "ACTIVE",
      });

      const records = Array.isArray(response.data)
        ? (response.data as Supplier[])
        : [];

      setSuppliers(records);

      setSelectedSupplier((current) => {
        if (!current) return records[0] ?? null;

        return records.find((item) => item.id === current.id) ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers.",
      );
      setSuppliers([]);
      setSelectedSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSuppliers();
    }, search.trim() ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [loadSuppliers, search]);

  const loadSupplierDetails = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError("");

    try {
      const response = await api.supplier(id);
      const supplier = response.data as Supplier;

      setSelectedSupplier((current) =>
        current?.id === id ? { ...current, ...supplier } : current,
      );
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Unable to load supplier details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSupplier?.id) {
      void loadSupplierDetails(selectedSupplier.id);
    }
  }, [selectedSupplier?.id, loadSupplierDetails]);

  const totalPayable = suppliers.reduce(
    (sum, supplier) => sum + amount(supplier.payable ?? supplier.currentBalance),
    0,
  );

  const totalPurchase = suppliers.reduce(
    (sum, supplier) => sum + amount(supplier.totalPurchase),
    0,
  );

  const handleSelectSupplier = (supplier: Supplier) => {
    setDetailError("");
    setSelectedSupplier(supplier);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      {/* Left Suppliers List */}
      <div className="flex w-full min-h-0 flex-col border-r md:w-80 md:shrink-0">
        {/* Header */}
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Suppliers</h1>

            <button
              type="button"
              onClick={() => router.push("/parties/new?type=Supplier")}
              className="rounded bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
            >
              + Add Supplier
            </button>
          </div>

          <div className="relative">
            <input
              type="search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded border py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Search suppliers"
            />

            <span className="absolute left-2.5 top-2 text-gray-400">
              🔍
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 border-b bg-gray-50 px-4 py-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Total Payable</div>
            <div className="font-semibold text-red-500">
              {formatINR(totalPayable)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Total Purchase</div>
            <div className="font-semibold">
              {formatINR(totalPurchase)}
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading suppliers...
            </div>
          ) : error ? (
            <div className="p-5 text-sm text-red-600">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadSuppliers()}
                className="mt-3 rounded border px-3 py-1.5 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {search.trim()
                ? "No suppliers match your search."
                : "No suppliers found. Add your first supplier to get started."}
            </div>
          ) : (
            suppliers.map((supplier) => {
              const payable = amount(
                supplier.payable ?? supplier.currentBalance,
              );

              return (
                <button
                  type="button"
                  key={supplier.id}
                  onClick={() => handleSelectSupplier(supplier)}
                  className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-blue-50 ${
                    selectedSupplier?.id === supplier.id
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  <div className="break-words text-sm font-medium">
                    {supplier.name}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    {supplier.phone || "No phone number"}
                  </div>

                  {payable > 0 && (
                    <div className="mt-1.5 text-xs font-medium text-red-500">
                      Pay: {formatINR(payable)}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="min-w-0 flex-1 overflow-auto">
        {selectedSupplier ? (
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold">
                  {selectedSupplier.name}
                </h2>

                <div className="mt-1 text-sm text-gray-500">
                  Supplier • {selectedSupplier.phone || "No phone number"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/parties/${selectedSupplier.id}/edit`)
                  }
                  className="rounded border px-4 py-1.5 text-sm hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/purchases/new?supplier=${encodeURIComponent(
                        selectedSupplier.id,
                      )}`,
                    )
                  }
                  className="rounded bg-orange-500 px-4 py-1.5 text-sm text-white hover:bg-orange-600"
                >
                  + Create Purchase
                </button>
              </div>
            </div>

            {detailError && (
              <div
                role="alert"
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <span>{detailError}</span>
                <button
                  type="button"
                  onClick={() => void loadSupplierDetails(selectedSupplier.id)}
                  className="font-medium underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Balance Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="mb-1 text-sm text-red-700">To Pay</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatINR(
                    selectedSupplier.payable ??
                      selectedSupplier.currentBalance,
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-1 text-sm text-blue-700">
                  Total Purchase
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatINR(selectedSupplier.totalPurchase)}
                </div>
              </div>
            </div>

            {/* Supplier Details */}
            <div className="mb-8 space-y-4 text-sm">
              <h3 className="font-semibold">Supplier Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-gray-500">Phone</div>
                  <div className="break-words font-medium">
                    {selectedSupplier.phone || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">Email</div>
                  <div className="break-words font-medium">
                    {selectedSupplier.email || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">GSTIN</div>
                  <div className="break-words font-medium">
                    {selectedSupplier.gstin || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">Address</div>
                  <div className="break-words font-medium">
                    {[
                      selectedSupplier.address,
                      selectedSupplier.city,
                      selectedSupplier.state,
                      selectedSupplier.pinCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Purchases */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold">Recent Purchases</h3>

                {detailLoading && (
                  <span className="text-xs text-gray-500">
                    Refreshing...
                  </span>
                )}
              </div>

              {detailLoading && !selectedSupplier.purchases ? (
                <div className="rounded-lg border p-8 text-center text-sm text-gray-500">
                  Loading purchase history...
                </div>
              ) : (selectedSupplier.purchases ?? []).length === 0 ? (
                <div className="rounded-lg border p-8 text-center text-sm text-gray-400">
                  No recent purchases to show
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Bill No.</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Balance
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {(selectedSupplier.purchases ?? []).map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {purchase.billNumber || "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {displayDate(purchase.date)}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                              {purchase.status || "—"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {formatINR(purchase.grandTotal)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {formatINR(purchase.paidAmount)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {formatINR(purchase.balanceAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center p-6 text-gray-400">
            <div className="text-center">
              <div className="mb-3 text-4xl">🏭</div>
              <p>
                {loading
                  ? "Loading suppliers..."
                  : error
                    ? "Unable to load supplier details."
                    : "Select a supplier to view details"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}