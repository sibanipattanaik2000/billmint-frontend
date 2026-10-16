"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
};

type Item = {
  id: string;
  name: string;
  sku?: string | null;
  currentStock?: number | string;
  unit?: { shortName?: string | null } | null;
};

type ChallanItem = {
  id: string;
  itemId: string;
  quantity: string;
  notes: string;
};

type DeliveryChallan = {
  id: string;
  challanNumber: string;
  date: string;
  reason?: string | null;
  transportInfo?: string | null;
  notes?: string | null;
  customer?: Customer | null;
  items: Array<{
    id: string;
    itemId?: string | null;
    itemName: string;
    quantity: number | string;
    unit?: string | null;
    notes?: string | null;
  }>;
};

const PAGE_SIZE = 20;

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function dateLabel(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}

function emptyItem(): ChallanItem {
  return {
    id: crypto.randomUUID(),
    itemId: "",
    quantity: "1",
    notes: "",
  };
}

export default function DeliveryChallanPage() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const [transportInfo, setTransportInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([
    emptyItem(),
  ]);

  const loadChallans = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.deliveryChallans({
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
      });

      setChallans(Array.isArray(response.data) ? response.data : []);
      setTotal(response.pagination?.total ?? 0);
      setTotalPages(response.pagination?.totalPages ?? 0);
    } catch (err) {
      setError(errorMessage(err));
      setChallans([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadChallans();
  }, [loadChallans]);

  const itemLineCount = useMemo(
    () =>
      challans.reduce(
        (sum, challan) => sum + (challan.items?.length ?? 0),
        0,
      ),
    [challans],
  );

  function resetForm() {
    setCustomerId("");
    setChallanDate(new Date().toISOString().slice(0, 10));
    setReason("");
    setTransportInfo("");
    setNotes("");
    setChallanItems([emptyItem()]);
    setFormError("");
  }

  async function openForm() {
    setShowForm(true);
    setFormError("");
    setLoadingForm(true);

    try {
      const [customerResponse, itemResponse] = await Promise.all([
        api.customers({ page: 1, limit: 100, status: "ACTIVE" }),
        api.items({ page: 1, limit: 100, status: "ACTIVE" }),
      ]);

      setCustomers(
        Array.isArray(customerResponse.data)
          ? customerResponse.data
          : [],
      );

      setItems(
        Array.isArray(itemResponse.data)
          ? itemResponse.data
          : [],
      );
    } catch (err) {
      setFormError(
        `Could not load customers or items: ${errorMessage(err)}`,
      );
    } finally {
      setLoadingForm(false);
    }
  }

  function updateItem(
    id: string,
    field: "itemId" | "quantity" | "notes",
    value: string,
  ) {
    setChallanItems((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (!customerId) {
      setFormError("Select a customer.");
      return;
    }

    if (!challanDate) {
      setFormError("Select the challan date.");
      return;
    }

    if (challanItems.some((row) => !row.itemId)) {
      setFormError("Select an item for every row.");
      return;
    }

    if (
      challanItems.some(
        (row) =>
          !row.quantity.trim() ||
          !Number.isFinite(Number(row.quantity)) ||
          Number(row.quantity) <= 0 ||
          Math.abs(Number(row.quantity) * 1000 -
            Math.round(Number(row.quantity) * 1000)) > 0.000001,
      )
    ) {
      setFormError(
        "Quantities must be greater than zero and have at most three decimal places.",
      );
      return;
    }

    const payload = {
      customerId,
      date: new Date(`${challanDate}T12:00:00`).toISOString(),
      reason: reason.trim() || null,
      transportInfo: transportInfo.trim() || null,
      notes: notes.trim() || null,
      items: challanItems.map((row) => {
        const item = items.find((entry) => entry.id === row.itemId);

        return {
          itemId: row.itemId,
          itemName: item?.name,
          quantity: Number(row.quantity),
          unit: item?.unit?.shortName ?? null,
          notes: row.notes.trim() || null,
        };
      }),
    };

    setSaving(true);

    try {
      await api.createDeliveryChallan(payload);

      setShowForm(false);
      resetForm();
      setPage(1);
      setSearch("");
      setNotice("Delivery challan saved successfully.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Delivery Challans
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer dispatch records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void openForm()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Challan
        </button>
      </header>

      <section className="grid gap-4 border-b bg-gray-50 px-6 py-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Total Challans</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
          <p className="mt-1 text-xs text-gray-500">
            Total matching saved records
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Item Lines on This Page</p>
          <p className="mt-1 text-2xl font-semibold">{itemLineCount}</p>
          <p className="mt-1 text-xs text-gray-500">
            Calculated from returned challan records
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {total > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                page * PAGE_SIZE,
                total,
              )} of ${total}`
            : "No saved challans"}
        </p>

        <input
          type="search"
          aria-label="Search delivery challans"
          placeholder="Search number, customer or reason..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border px-3 py-2 text-sm sm:max-w-sm"
        />
      </div>

      {notice && (
        <p role="status" className="mx-6 mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </p>
      )}

      {error && (
        <div role="alert" className="mx-6 mt-4 flex justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadChallans()}>
            Retry
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Challan No.</th>
              <th className="py-3 pr-4">Customer</th>
              <th className="py-3 pr-4">Item Lines</th>
              <th className="py-3 pr-4">Total Quantity</th>
              <th className="py-3 pr-4">Transport</th>
              <th className="py-3 pr-4">Reason</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-500">
                  Loading saved challans…
                </td>
              </tr>
            ) : challans.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-500">
                  {search.trim()
                    ? "No challans match your search."
                    : "No delivery challans have been created yet."}
                </td>
              </tr>
            ) : (
              challans.map((challan) => (
                <tr key={challan.id} className="border-b hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pr-4">
                    {dateLabel(challan.date)}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {challan.challanNumber}
                  </td>
                  <td className="py-3 pr-4">
                    {challan.customer?.businessName ||
                      challan.customer?.name ||
                      "—"}
                    {challan.customer?.phone && (
                      <p className="mt-1 text-xs text-gray-500">
                        {challan.customer.phone}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">{challan.items.length}</td>
                  <td className="py-3 pr-4">
                    {challan.items
                      .reduce(
                        (sum, row) => sum + Number(row.quantity || 0),
                        0,
                      )
                      .toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 pr-4">
                    {challan.transportInfo || "—"}
                  </td>
                  <td className="py-3 pr-4">{challan.reason || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t py-4">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form
            onSubmit={handleSave}
            className="my-6 max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Create Delivery Challan
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Customers and items are loaded from BillMint.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                aria-label="Close form"
                className="px-2 text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              {formError && (
                <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </p>
              )}

              {loadingForm ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Loading customers and items…
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="customerId" className="text-sm font-medium">
                        Customer *
                      </label>
                      <select
                        id="customerId"
                        required
                        value={customerId}
                        onChange={(event) => setCustomerId(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.businessName || customer.name}
                            {customer.phone ? ` — ${customer.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="challanDate" className="text-sm font-medium">
                        Challan Date *
                      </label>
                      <input
                        id="challanDate"
                        type="date"
                        required
                        value={challanDate}
                        onChange={(event) => setChallanDate(event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="transportInfo" className="text-sm font-medium">
                        Transport / Vehicle Details
                      </label>
                      <input
                        id="transportInfo"
                        maxLength={1000}
                        value={transportInfo}
                        onChange={(event) => setTransportInfo(event.target.value)}
                        placeholder="Vehicle number or transport details"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="reason" className="text-sm font-medium">
                        Reason
                      </label>
                      <input
                        id="reason"
                        maxLength={500}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Reason for dispatch"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {customers.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No active customers were returned. Add or activate a customer first.
                    </p>
                  )}

                  {items.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No active items were returned. Add or activate items first.
                    </p>
                  )}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium">Items *</h3>
                      <button
                        type="button"
                        disabled={challanItems.length >= 100 || items.length === 0}
                        onClick={() =>
                          setChallanItems((current) => [
                            ...current,
                            emptyItem(),
                          ])
                        }
                        className="rounded-md border px-3 py-2 text-sm text-blue-700 disabled:opacity-40"
                      >
                        + Add Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {challanItems.map((row, index) => {
                        const selected = items.find(
                          (item) => item.id === row.itemId,
                        );

                        return (
                          <div
                            key={row.id}
                            className="grid gap-3 rounded-lg border bg-gray-50 p-3 sm:grid-cols-[2fr_0.7fr_1.4fr_auto]"
                          >
                            <div>
                              <label htmlFor={`item-${row.id}`} className="text-xs font-medium">
                                Item {index + 1}
                              </label>
                              <select
                                id={`item-${row.id}`}
                                required
                                value={row.itemId}
                                onChange={(event) =>
                                  updateItem(row.id, "itemId", event.target.value)
                                }
                                className={inputClass}
                              >
                                <option value="">Select item</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.sku ? ` (${item.sku})` : ""}
                                  </option>
                                ))}
                              </select>
                              {selected && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Current stock: {Number(selected.currentStock ?? 0)}
                                  {" "}{selected.unit?.shortName || ""}
                                </p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`qty-${row.id}`} className="text-xs font-medium">
                                Quantity
                              </label>
                              <input
                                id={`qty-${row.id}`}
                                type="number"
                                min="0.001"
                                max="999999999999999"
                                step="0.001"
                                required
                                value={row.quantity}
                                onChange={(event) =>
                                  updateItem(row.id, "quantity", event.target.value)
                                }
                                className={inputClass}
                              />
                            </div>

                            <div>
                              <label htmlFor={`notes-${row.id}`} className="text-xs font-medium">
                                Item Notes
                              </label>
                              <input
                                id={`notes-${row.id}`}
                                maxLength={1000}
                                value={row.notes}
                                onChange={(event) =>
                                  updateItem(row.id, "notes", event.target.value)
                                }
                                className={inputClass}
                                placeholder="Optional"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={challanItems.length === 1}
                              onClick={() =>
                                setChallanItems((current) =>
                                  current.filter((entry) => entry.id !== row.id),
                                )
                              }
                              className="self-end rounded-md border px-3 py-2 text-sm text-red-600 disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Creating a challan does not deduct stock, create a sale, or record a payment.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="notes" className="text-sm font-medium">
                      Delivery Instructions / Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      maxLength={5000}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-md border bg-white px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  loadingForm ||
                  customers.length === 0 ||
                  items.length === 0
                }
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Challan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}