
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  RefreshCw,
  Send,
  Package,
  ScanBarcode,
  CheckCircle2,
} from "lucide-react";
import { ApiError, api } from "@/lib/api";

type Store = {
  storeCode: string;
  name: string;
};

type AvailableUnit = {
  id: string;
  itemCode?: string | null;
  imei?: string | null;
  sourceCode?: string | null;
  barcode?: string | null;
  status: string;
  item: {
    id: string;
    name: string;
    modelName?: string | null;
    sku?: string | null;
    salePrice?: number | string | null;
  };
};

type TransferUnit = {
  id: string;
  status: "PENDING" | "RECEIVED" | string;
  barcode?: string | null;
  receivedAt?: string | null;
  inventoryUnit: {
    id: string;
    imei?: string | null;
    itemCode?: string | null;
    sourceCode?: string | null;
    status: string;
  };
};

type Transfer = {
  id: string;
  transferNumber: string;
  status: string;
  createdAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  fromBusiness?: { name: string; storeCode: string };
  toBusiness?: { name: string; storeCode: string };
  items: Array<{
    quantity: number | string;
    sourceItem?: { id: string; name: string; sku?: string | null };
    destinationItem?: { id: string; name: string; sku?: string | null };
    transferUnits: TransferUnit[];
  }>;
};

function formatDate(value?: string | null) {
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

function statusClass(status: string) {
  switch (status) {
    case "RECEIVED":
      return "bg-emerald-50 text-emerald-700";
    case "PARTIALLY_RECEIVED":
      return "bg-amber-50 text-amber-700";
    case "DISPATCHED":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function StockTransfersPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [toStoreCode, setToStoreCode] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const [receiptBarcodes, setReceiptBarcodes] = useState<
    Record<string, string>
  >({});
  const [receiptSelections, setReceiptSelections] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receivingTransferId, setReceivingTransferId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [storeResponse, unitResponse, transferResponse] =
        await Promise.all([
          api.stores(),
          api.stockTransferAvailableUnits(),
          api.stockTransfers(),
        ]);

      setStores(storeResponse.data || []);
      setUnits(unitResponse.data || []);
      setTransfers(transferResponse.data || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load stock transfer information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUnits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return units;

    return units.filter((unit) =>
      [
        unit.item.name,
        unit.item.modelName,
        unit.item.sku,
        unit.itemCode,
        unit.imei,
        unit.sourceCode,
        unit.barcode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [units, search]);

  const selectedCount = selectedUnitIds.length;

  function toggleUnit(unitId: string) {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );
  }

  function selectAllVisible() {
    const visibleIds = filteredUnits.map((unit) => unit.id);
    const allSelected = visibleIds.every((id) =>
      selectedUnitIds.includes(id),
    );

    setSelectedUnitIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
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

    if (selectedUnitIds.length === 0) {
      setError("Select at least one physical device.");
      return;
    }

    if (selectedUnitIds.length > 500) {
      setError("A transfer can contain a maximum of 500 devices.");
      return;
    }

    const selectedUnits = units.filter((unit) =>
      selectedUnitIds.includes(unit.id),
    );

    if (selectedUnits.length !== selectedUnitIds.length) {
      setError("Some selected devices are no longer available. Refresh stock.");
      return;
    }

    const grouped = new Map<string, string[]>();

    for (const unit of selectedUnits) {
      const ids = grouped.get(unit.item.id) || [];
      ids.push(unit.id);
      grouped.set(unit.item.id, ids);
    }

    setSubmitting(true);

    try {
      const response = await api.createStockTransfer({
        toStoreCode,
        items: Array.from(grouped.entries()).map(
          ([itemId, inventoryUnitIds]) => ({
            itemId,
            inventoryUnitIds,
          }),
        ),
        notes: notes.trim() || undefined,
      });

      const number = response.data?.transferNumber || "Transfer";
      setSuccess(
        `${number} dispatched. The devices are now in transit and will become available at the destination after receipt is confirmed.`,
      );

      setSelectedUnitIds([]);
      setToStoreCode("");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to dispatch the selected devices.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getPendingUnits(transfer: Transfer) {
    return (transfer.items || []).flatMap((item) =>
      (item.transferUnits || [])
        .filter((unit) => unit.status === "PENDING")
        .map((unit) => ({
          ...unit,
          itemName:
            item.destinationItem?.name ||
            item.sourceItem?.name ||
            "Device",
        })),
    );
  }

  async function receiveDevices(transfer: Transfer) {
    setError("");
    setSuccess("");

    const pending = getPendingUnits(transfer);
    const selected = pending.filter(
      (unit) => receiptSelections[unit.id],
    );

    if (selected.length === 0) {
      setError("Select at least one pending device to receive.");
      return;
    }

    const missingBarcode = selected.find(
      (unit) => (receiptBarcodes[unit.id] || "").trim().length < 3,
    );

    if (missingBarcode) {
      setError("Enter or scan a valid barcode for every selected device.");
      return;
    }

    const payload = selected.map((unit) => ({
      transferUnitId: unit.id,
      barcode: receiptBarcodes[unit.id].trim(),
    }));

    setReceivingTransferId(transfer.id);

    try {
      const response = await api.receiveStockTransfer(
        transfer.id,
        payload,
      );

      const received = response.data?.receivedCount ?? payload.length;
      const remaining = response.data?.pendingCount ?? 0;

      setSuccess(
        `${received} device(s) received successfully. ${remaining} device(s) remain pending in this transfer.`,
      );

      setReceiptSelections((current) => {
        const next = { ...current };
        selected.forEach((unit) => delete next[unit.id]);
        return next;
      });

      setReceiptBarcodes((current) => {
        const next = { ...current };
        selected.forEach((unit) => delete next[unit.id]);
        return next;
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to confirm receipt. Check the barcodes and try again.",
      );
    } finally {
      setReceivingTransferId("");
    }
  }

  const pendingTransfers = transfers.filter(
    (transfer) =>
      transfer.status === "DISPATCHED" ||
      transfer.status === "PARTIALLY_RECEIVED",
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Device Stock Transfers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dispatch individual IMEI-tracked devices and confirm their receipt
            using barcodes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
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
            <h2 className="font-semibold text-slate-900">
              Dispatch devices
            </h2>
            <p className="text-xs text-slate-500">
              Selected devices are marked in transit. The destination must
              confirm receipt before they become available there.
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select destination store</option>
              {stores.map((store) => (
                <option key={store.storeCode} value={store.storeCode}>
                  {store.name} ({store.storeCode})
                </option>
              ))}
            </select>
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Available devices
            </h3>
            <p className="text-xs text-slate-500">
              Only available serial-tracked devices with an IMEI are listed.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {selectedCount} selected
          </span>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search model, item code, IMEI, source code or barcode..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />

        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading available devices...</p>
        ) : filteredUnits.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            No available IMEI-tracked devices found for this store.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-12 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        filteredUnits.length > 0 &&
                        filteredUnits.every((unit) =>
                          selectedUnitIds.includes(unit.id),
                        )
                      }
                      onChange={selectAllVisible}
                      aria-label="Select all visible devices"
                    />
                  </th>
                  <th className="px-3 py-3">Device / model</th>
                  <th className="px-3 py-3">Item code</th>
                  <th className="px-3 py-3">IMEI</th>
                  <th className="px-3 py-3">Source code</th>
                  <th className="px-3 py-3">Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUnitIds.includes(unit.id)}
                        onChange={() => toggleUnit(unit.id)}
                        aria-label={`Select ${unit.imei || unit.item.id}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {unit.item.modelName || unit.item.name}
                      <div className="text-xs font-normal text-slate-500">
                        {unit.item.name}
                        {unit.item.sku ? ` · ${unit.item.sku}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {unit.itemCode || "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-700">
                      {unit.imei || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {unit.sourceCode || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {unit.barcode || "Not assigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setSelectedUnitIds([])}
            disabled={selectedCount === 0 || submitting}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-40"
          >
            Clear selection
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              loading ||
              selectedCount === 0 ||
              !toStoreCode
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting
              ? "Dispatching..."
              : `Dispatch ${selectedCount} device(s)`}
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ScanBarcode className="h-5 w-5 text-slate-600" />
          <div>
            <h2 className="font-semibold text-slate-900">
              Pending device receipts
            </h2>
            <p className="text-xs text-slate-500">
              Available to the destination store. Enter or scan each device's
              barcode to confirm receipt.
            </p>
          </div>
        </div>

        {pendingTransfers.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
            No pending transfers are waiting for receipt by this store.
          </p>
        ) : (
          pendingTransfers.map((transfer) => {
            const pending = getPendingUnits(transfer);

            return (
              <div
                key={transfer.id}
                className="space-y-4 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {transfer.transferNumber}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      From {transfer.fromBusiness?.name || "—"} (
                      {transfer.fromBusiness?.storeCode || "—"})
                      {" · "}
                      Dispatched {formatDate(transfer.dispatchedAt || transfer.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                      transfer.status,
                    )}`}
                  >
                    {transfer.status.replaceAll("_", " ")}
                  </span>
                </div>

                {pending.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No pending devices in this transfer.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Receive</th>
                            <th className="px-3 py-2">Device</th>
                            <th className="px-3 py-2">IMEI</th>
                            <th className="px-3 py-2">Item code</th>
                            <th className="px-3 py-2">Scan / enter barcode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pending.map((unit) => (
                            <tr key={unit.id}>
                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={!!receiptSelections[unit.id]}
                                  onChange={(event) =>
                                    setReceiptSelections((current) => ({
                                      ...current,
                                      [unit.id]: event.target.checked,
                                    }))
                                  }
                                  aria-label={`Receive ${unit.inventoryUnit.imei || unit.id}`}
                                />
                              </td>
                              <td className="px-3 py-3 font-medium text-slate-800">
                                {unit.itemName}
                              </td>
                              <td className="px-3 py-3 font-mono text-slate-700">
                                {unit.inventoryUnit.imei || "—"}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {unit.inventoryUnit.itemCode || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <input
                                  value={receiptBarcodes[unit.id] || ""}
                                  onChange={(event) =>
                                    setReceiptBarcodes((current) => ({
                                      ...current,
                                      [unit.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Scan barcode here"
                                  maxLength={100}
                                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void receiveDevices(transfer)}
                        disabled={receivingTransferId === transfer.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {receivingTransferId === transfer.id
                          ? "Confirming..."
                          : "Confirm selected receipt"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 p-5">
          <Package className="h-5 w-5 text-slate-500" />
          <div>
            <h2 className="font-semibold text-slate-900">Transfer history</h2>
            <p className="text-xs text-slate-500">
              Devices dispatched from or received by this store.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading transfer history...
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No transfers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Transfer</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Devices</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((transfer) => {
                  const deviceCount = (transfer.items || []).reduce(
                    (total, item) =>
                      total + (item.transferUnits?.length || 0),
                    0,
                  );

                  return (
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
                        {deviceCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                            transfer.status,
                          )}`}
                        >
                          {transfer.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(transfer.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
