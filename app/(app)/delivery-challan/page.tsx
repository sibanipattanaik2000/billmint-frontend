"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
  Trash2,
  Package,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  status?: string;
}

interface Item {
  id: string;
  name: string;
  status?: string;
  unit?: {
    name?: string;
    shortName?: string;
  } | null;
}

interface ChallanItem {
  id?: string;
  itemId?: string | null;
  itemName: string;
  quantity: number | string;
  unit?: string | null;
  notes?: string | null;
}

interface DeliveryChallan {
  id: string;
  challanNumber: string;
  date: string;
  reason?: string | null;
  transportInfo?: string | null;
  notes?: string | null;
  customer?: {
    id?: string;
    name?: string | null;
  } | null;
  items: ChallanItem[];
}

interface DraftItem {
  itemId: string;
  itemName: string;
  quantity: string;
  unit: string;
  notes: string;
}

const emptyItem = (): DraftItem => ({
  itemId: "",
  itemName: "",
  quantity: "1",
  unit: "",
  notes: "",
});

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export default function DeliveryChallanPage() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedChallan, setSelectedChallan] =
    useState<DeliveryChallan | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [reason, setReason] = useState("");
  const [transportInfo, setTransportInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([emptyItem()]);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [challanResponse, customerResponse, itemResponse] =
        await Promise.all([
          api.deliveryChallans({ page: 1, limit: 100 }),
          api.customers({ page: 1, limit: 100, status: "ACTIVE" }),
          api.items({ page: 1, limit: 100, status: "ACTIVE" }),
        ]);

      if (!Array.isArray(challanResponse.data)) {
        throw new Error("Unexpected delivery-challan response from server.");
      }

      setChallans(challanResponse.data as DeliveryChallan[]);
      setCustomers(
        Array.isArray(customerResponse.data)
          ? (customerResponse.data as Customer[])
          : [],
      );
      setItems(
        Array.isArray(itemResponse.data)
          ? (itemResponse.data as Item[])
          : [],
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredChallans = challans.filter((challan) => {
    const query = search.trim().toLowerCase();

    return (
      !query ||
      challan.challanNumber?.toLowerCase().includes(query) ||
      challan.customer?.name?.toLowerCase().includes(query) ||
      challan.reason?.toLowerCase().includes(query) ||
      challan.transportInfo?.toLowerCase().includes(query)
    );
  });

  function resetForm() {
    setCustomerId("");
    setReason("");
    setTransportInfo("");
    setNotes("");
    setDraftItems([emptyItem()]);
    setFormError("");
  }

  function updateDraftItem(
    index: number,
    field: keyof DraftItem,
    value: string,
  ) {
    setDraftItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        if (field === "itemId") {
          const selected = items.find((entry) => entry.id === value);

          return {
            ...item,
            itemId: value,
            itemName: selected?.name ?? item.itemName,
            unit:
              selected?.unit?.shortName ??
              selected?.unit?.name ??
              item.unit,
          };
        }

        return { ...item, [field]: value };
      }),
    );
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!date) {
      setFormError("Please select the challan date.");
      return;
    }

    if (draftItems.length === 0) {
      setFormError("Add at least one item.");
      return;
    }

    const normalizedItems = draftItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    }));

    for (let index = 0; index < normalizedItems.length; index++) {
      const item = normalizedItems[index];

      if (!item.itemId && !item.itemName.trim()) {
        setFormError(
          `Select an item or enter an item name in row ${index + 1}.`,
        );
        return;
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setFormError(
          `Enter a valid quantity greater than zero in row ${index + 1}.`,
        );
        return;
      }

      if (
        Math.abs(item.quantity * 1000 - Math.round(item.quantity * 1000)) >
        0.000001
      ) {
        setFormError(
          `Quantity in row ${index + 1} can have at most 3 decimal places.`,
        );
        return;
      }
    }

    setSaving(true);

    try {
      await api.createDeliveryChallan({
        customerId: customerId || null,
        date: new Date(`${date}T12:00:00`).toISOString(),
        reason: reason.trim() || null,
        transportInfo: transportInfo.trim() || null,
        notes: notes.trim() || null,
        items: normalizedItems.map((item) => ({
          itemId: item.itemId || null,
          itemName: item.itemName.trim() || undefined,
          quantity: item.quantity,
          unit: item.unit.trim() || null,
          notes: item.notes.trim() || null,
        })),
      });

      setShowForm(false);
      resetForm();
      setSuccessMessage("Delivery challan created successfully.");
      await loadData(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function openChallan(challan: DeliveryChallan) {
    setFormError("");

    try {
      const response = await api.deliveryChallan(challan.id);
      setSelectedChallan(response.data as DeliveryChallan);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Delivery Challans
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Record goods dispatched or delivered to customers.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setSuccessMessage("");
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Challan
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Loaded challans</p>
            <Truck className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {challans.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Latest records returned by the server
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Customers available</p>
            <Package className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {customers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active customers loaded from the server
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Items available</p>
            <Package className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {items.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active items loaded from the server
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Challan register</h2>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search challan or customer..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Challan number</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Items</th>
                <th className="px-5 py-3 font-semibold">Reason</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Loading delivery challans...
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Truck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-700">
                      No delivery challans found
                    </p>
                    <p className="mt-1 text-slate-500">
                      {search
                        ? "Try a different search."
                        : "Create a challan to record a dispatch."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-indigo-700">
                      {challan.challanNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(challan.date)}
                    </td>
                    <td className="px-5 py-4 text-slate-800">
                      {challan.customer?.name || "Walk-in / Unassigned"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {challan.items?.length ?? 0}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {challan.reason || "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void openChallan(challan)}
                        className="font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 py-8 sm:p-6">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create delivery challan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter dispatch details and item quantities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Customer
                  <select
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  >
                    <option value="">Unassigned / walk-in</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Challan date *
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Reason
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    placeholder="e.g. Goods sent for approval or repair"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Transport details
                  <input
                    value={transportInfo}
                    onChange={(event) => setTransportInfo(event.target.value)}
                    maxLength={1000}
                    placeholder="Transporter, vehicle number, tracking details..."
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Items</h3>
                  <button
                    type="button"
                    onClick={() => setDraftItems((current) => [...current, emptyItem()])}
                    disabled={draftItems.length >= 100}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    + Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {draftItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
                    >
                      <div>
                        <label className="text-xs font-medium text-slate-500">
                          Catalogue item
                        </label>
                        <select
                          value={item.itemId}
                          onChange={(event) =>
                            updateDraftItem(index, "itemId", event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="">Choose item (optional)</option>
                          {items.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                        {!item.itemId && (
                          <input
                            value={item.itemName}
                            onChange={(event) =>
                              updateDraftItem(index, "itemName", event.target.value)
                            }
                            placeholder="Or enter item name"
                            maxLength={255}
                            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />
                        )}
                      </div>

                      <label className="text-xs font-medium text-slate-500">
                        Quantity *
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          required
                          value={item.quantity}
                          onChange={(event) =>
                            updateDraftItem(index, "quantity", event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-500">
                        Unit
                        <input
                          value={item.unit}
                          onChange={(event) =>
                            updateDraftItem(index, "unit", event.target.value)
                          }
                          maxLength={50}
                          placeholder="pcs"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={draftItems.length === 1}
                          onClick={() =>
                            setDraftItems((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <label className="text-xs font-medium text-slate-500 sm:col-span-4">
                        Item notes
                        <input
                          value={item.notes}
                          onChange={(event) =>
                            updateDraftItem(index, "notes", event.target.value)
                          }
                          maxLength={1000}
                          placeholder="Optional item-specific notes"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                General notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder="Additional dispatch notes..."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                />
              </label>

              <p className="text-xs text-slate-500">
                A delivery challan records dispatch details only. It does not
                create a sales invoice or adjust stock.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Challan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedChallan && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 py-8 sm:p-6">
          <section className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedChallan.challanNumber}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedChallan.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChallan(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selectedChallan.customer?.name || "Unassigned / walk-in"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reason</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selectedChallan.reason || "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500">Transport details</p>
                  <p className="mt-1 text-slate-900">
                    {selectedChallan.transportInfo || "—"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-right">Quantity</th>
                      <th className="px-3 py-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedChallan.items?.map((item, index) => (
                      <tr key={item.id ?? `${item.itemName}-${index}`}>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-900">
                            {item.itemName}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-3">{item.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedChallan.notes && (
                <div>
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {selectedChallan.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setSelectedChallan(null)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
