"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatINR } from "@/lib/api";

type PartyType = "Customer" | "Supplier" | "Both";
type FilterType = "All" | "Customer" | "Supplier";

interface Party {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  type: PartyType;
  receivable: number;
  payable: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  gstin?: string | null;
  businessName?: string | null;
  openingBalance?: number | string | null;
  currentBalance?: number | string | null;
  creditLimit?: number | string | null;
  status?: string;
  totalPurchase?: number;
  totalPurchases?: number;
}

function toAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function mapCustomer(customer: any): Party {
  const balance = toAmount(customer.currentBalance ?? customer.openingBalance);

  return {
    ...customer,
    type: "Customer",
    receivable: Math.max(0, balance),
    payable: Math.max(0, -balance),
  };
}

function mapSupplier(supplier: any): Party {
  const balance = toAmount(supplier.currentBalance ?? supplier.openingBalance);

  return {
    ...supplier,
    type: "Supplier",
    receivable: Math.max(0, -balance),
    payable: Math.max(0, balance),
    totalPurchase: toAmount(supplier.totalPurchase ?? supplier.totalPurchases),
  };
}

export default function CustomersPage() {
  const router = useRouter();

  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("All");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadParties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = {
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
        status: "ACTIVE",
      };

      const requests: Promise<{
        data: any[];
      }>[] = [];

      if (filterType !== "Supplier") {
        requests.push(api.customers(query));
      }

      if (filterType !== "Customer") {
        requests.push(api.suppliers(query));
      }

      const responses = await Promise.all(requests);
      let index = 0;

      const customers =
        filterType !== "Supplier"
          ? (responses[index++].data ?? []).map(mapCustomer)
          : [];

      const suppliers =
        filterType !== "Customer"
          ? (responses[index].data ?? []).map(mapSupplier)
          : [];

      const combined = [...customers, ...suppliers].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setParties(combined);

      setSelectedParty((current) => {
        if (!current) return null;

        return (
          combined.find(
            (party) => party.id === current.id && party.type === current.type,
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load parties from the server.",
      );
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  const openParty = async (party: Party) => {
    setSelectedParty(party);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response =
        party.type === "Supplier"
          ? await api.supplier(party.id)
          : await api.customer(party.id);

      const details =
        party.type === "Supplier"
          ? mapSupplier(response.data)
          : mapCustomer(response.data);

      setSelectedParty(details);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "Unable to load account details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredParties = useMemo(() => {
    const term = search.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesSearch =
        !term ||
        party.name.toLowerCase().includes(term) ||
        (party.phone ?? "").toLowerCase().includes(term) ||
        (party.email ?? "").toLowerCase().includes(term) ||
        (party.gstin ?? "").toLowerCase().includes(term);

      const matchesType =
        filterType === "All" ||
        party.type === filterType ||
        party.type === "Both";

      return matchesSearch && matchesType;
    });
  }, [parties, search, filterType]);

  const totalReceivable = parties.reduce(
    (sum, party) => sum + party.receivable,
    0,
  );

  const totalPayable = parties.reduce((sum, party) => sum + party.payable, 0);

  return (
    <div className="flex h-full min-h-0 flex-1 self-stretch overflow-hidden bg-white">
      {" "}
      {/* Left Parties List */}
      <div className="flex h-full min-h-0 w-full flex-col self-stretch border-r border-gray-200 md:w-80 md:shrink-0">
        {" "}
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Customers</h1>

            <button
              type="button"
              onClick={() =>
                router.push(
                  filterType === "Supplier"
                    ? "/customers/new?type=Supplier"
                    : "/customers/new",
                )
              }
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              + Add {filterType === "Supplier" ? "Supplier" : "Customer"}
            </button>
          </div>

          <div className="relative mb-3">
            <input
              type="search"
              placeholder="Search parties..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded border py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
          </div>

          <div className="flex gap-1 text-xs">
            {(["All", "Customer", "Supplier"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded px-3 py-1 ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        {/* Live account summaries */}
        <div className="grid grid-cols-2 gap-2 border-b bg-gray-50 px-4 py-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">To Receive</div>
            <div className="font-semibold text-green-600">
              {formatINR(totalReceivable)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">To Pay</div>
            <div className="font-semibold text-red-500">
              {formatINR(totalPayable)}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading parties...
            </div>
          ) : error ? (
            <div className="p-5">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadParties()}
                className="mt-3 rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Try again
              </button>
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {search
                ? "No matching parties found"
                : "No parties found. Add your first record to get started."}
            </div>
          ) : (
            filteredParties.map((party) => (
              <button
                key={`${party.type}-${party.id}`}
                type="button"
                onClick={() => void openParty(party)}
                className={`w-full cursor-pointer border-b px-4 py-3 text-left hover:bg-blue-50 ${
                  selectedParty?.id === party.id &&
                  selectedParty?.type === party.type
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {party.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {party.phone || party.email || "No contact details"}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                      party.type === "Customer"
                        ? "bg-green-100 text-green-700"
                        : party.type === "Supplier"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {party.type}
                  </span>
                </div>

                {(party.receivable > 0 || party.payable > 0) && (
                  <div className="mt-1.5 text-xs">
                    {party.receivable > 0 && (
                      <span className="mr-3 text-green-600">
                        Rec: {formatINR(party.receivable)}
                      </span>
                    )}

                    {party.payable > 0 && (
                      <span className="text-red-500">
                        Pay: {formatINR(party.payable)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        {!loading && !error && filteredParties.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-gray-500">
            Showing {filteredParties.length} loaded records
            {filteredParties.length >= 100
              ? " · More records may be available"
              : ""}
          </div>
        )}
      </div>
      {/* Right Detail Panel */}
      <div className="hidden min-w-0 flex-1 overflow-auto md:block">
        {selectedParty ? (
          <div className="p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedParty.name}</h2>
                <div className="mt-1 text-sm text-gray-500">
                  {selectedParty.type} • {selectedParty.phone || "No phone"}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      selectedParty.type === "Supplier"
                        ? `/parties/${selectedParty.id}/edit`
                        : `/customers/${selectedParty.id}/edit`,
                    )
                  }
                  className="rounded border px-4 py-1.5 text-sm hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      selectedParty.type === "Supplier"
                        ? `/purchases/new?supplier=${selectedParty.id}`
                        : `/sales/new?party=${selectedParty.id}`,
                    )
                  }
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  {selectedParty.type === "Supplier"
                    ? "+ Create Purchase"
                    : "+ Create Sale"}
                </button>
              </div>
            </div>

            {detailError && (
              <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
                {detailError}
              </p>
            )}

            {detailLoading && (
              <p className="mb-4 text-sm text-gray-500">
                Refreshing account details...
              </p>
            )}

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <div className="mb-1 text-sm text-green-700">To Receive</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatINR(selectedParty.receivable)}
                </div>
              </div>

              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="mb-1 text-sm text-red-700">To Pay</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatINR(selectedParty.payable)}
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{selectedParty.phone || "—"}</div>
              </div>

              <div>
                <div className="text-gray-500">Email</div>
                <div className="font-medium">{selectedParty.email || "—"}</div>
              </div>

              <div>
                <div className="text-gray-500">Business Name</div>
                <div className="font-medium">
                  {selectedParty.businessName || "—"}
                </div>
              </div>

              <div>
                <div className="text-gray-500">GSTIN</div>
                <div className="font-medium">{selectedParty.gstin || "—"}</div>
              </div>

              <div className="sm:col-span-2">
                <div className="text-gray-500">Address</div>
                <div className="font-medium">
                  {[
                    selectedParty.address,
                    selectedParty.city,
                    selectedParty.state,
                    selectedParty.pinCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
              </div>

              {selectedParty.creditLimit != null &&
                selectedParty.type !== "Supplier" && (
                  <div>
                    <div className="text-gray-500">Credit Limit</div>
                    <div className="font-medium">
                      {formatINR(selectedParty.creditLimit)}
                    </div>
                  </div>
                )}

              <div>
                <div className="text-gray-500">Account Status</div>
                <div className="font-medium">
                  {selectedParty.status || "ACTIVE"}
                </div>
              </div>
            </div>

            {selectedParty.type === "Supplier" && (
              <div className="mb-8 rounded-lg border p-4">
                <div className="text-sm text-gray-500">Total Purchase</div>
                <div className="mt-1 text-2xl font-bold">
                  {formatINR(selectedParty.totalPurchase ?? 0)}
                </div>
              </div>
            )}

            <section>
              <h3 className="mb-3 font-medium">Recent Transactions</h3>

              <div className="overflow-x-auto rounded-lg border">
                {selectedParty.type === "Supplier" ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Reference</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Amount
                        </th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedParty as any).purchases?.map(
                        (purchase: any) => (
                          <tr key={purchase.id}>
                            <td className="px-4 py-3">
                              {purchase.invoiceNumber ||
                                purchase.purchaseNumber ||
                                purchase.id}
                            </td>
                            <td className="px-4 py-3">
                              {purchase.date
                                ? new Date(purchase.date).toLocaleDateString(
                                    "en-IN",
                                  )
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatINR(
                                purchase.grandTotal ?? purchase.totalAmount,
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {purchase.status || "—"}
                            </td>
                          </tr>
                        ),
                      )}

                      {!(selectedParty as any).purchases?.length && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            No purchase transactions available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Invoice</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Due
                        </th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedParty as any).sales?.map((sale: any) => (
                        <tr key={sale.id}>
                          <td className="px-4 py-3">
                            {sale.invoiceNumber || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {sale.date
                              ? new Date(sale.date).toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatINR(sale.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatINR(sale.balanceAmount)}
                          </td>
                          <td className="px-4 py-3">{sale.status || "—"}</td>
                        </tr>
                      ))}

                      {!(selectedParty as any).sales?.length && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            No sales transactions available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mb-3 text-4xl">👥</div>
              <p>Select a party to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
