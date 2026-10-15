
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Supplier = {
  id: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
  status?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string | null;
  purchasePrice?: number | string | null;
  gstRate?: number | string | null;
  hsnSac?: string | null;
  status?: string;
  unit?: string | { shortName?: string | null } | null;
};

type PurchaseRow = {
  id: string;
  itemId: string;
  name: string;
  itemCode: string;
  imei: string;
  qty: number;
  unit: string;
  price: number;
  discountPercent: number;
  discountAmount: number;
  tax: string;
};

const PAYMENT_METHODS: Record<string, string> = {
  CASH: "cash",
  BANK: "bank",
  UPI: "upi",
  CARD: "card",
  OTHERS: "other",
};

const TAX_OPTIONS = [0, 5, 12, 18, 28];

const money = (value: number) =>
  `₹ ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const newRow = (): PurchaseRow => ({
  id: crypto.randomUUID(),
  itemId: "",
  name: "",
  itemCode: "",
  imei: "",
  qty: 1,
  unit: "PCS",
  price: 0,
  discountPercent: 0,
  discountAmount: 0,
  tax: "0",
});

function rowTotals(row: PurchaseRow) {
  const quantity = Math.max(0, Number(row.qty) || 0);
  const rate = Math.max(0, Number(row.price) || 0);
  const gross = quantity * rate;
  const discountPercent = Math.min(
    100,
    Math.max(0, Number(row.discountPercent) || 0),
  );
  const discount = Math.min(
    gross,
    gross * (discountPercent / 100),
  );
  const taxable = Math.max(0, gross - discount);
  const gstRate = Math.max(0, Number(row.tax) || 0);
  const gst = taxable * (gstRate / 100);

  return {
    gross,
    discount,
    taxable,
    gst,
    total: taxable + gst,
  };
}

export default function NewPurchasePage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [billingName, setBillingName] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [paid, setPaid] = useState(true);
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });
  const [rows, setRows] = useState<PurchaseRow[]>([newRow()]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      setLoadError("");

      try {
        const [supplierResponse, itemResponse] = await Promise.all([
          api.suppliers({ page: 1, limit: 100 }),
          api.items({ page: 1, limit: 100 }),
        ]);

        if (!active) return;

        setSuppliers(
          (supplierResponse.data ?? []).filter(
            (supplier: Supplier) =>
              !supplier.status || supplier.status === "ACTIVE",
          ),
        );

        setInventory(
          (itemResponse.data ?? []).filter(
            (item: InventoryItem) =>
              !item.status || item.status === "ACTIVE",
          ),
        );
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load suppliers and inventory.",
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        const line = rowTotals(row);
        result.quantity += Math.max(0, Number(row.qty) || 0);
        result.subtotal += line.gross;
        result.discount += line.discount;
        result.taxable += line.taxable;
        result.gst += line.gst;
        result.total += line.total;
        return result;
      },
      {
        quantity: 0,
        subtotal: 0,
        discount: 0,
        taxable: 0,
        gst: 0,
        total: 0,
      },
    );
  }, [rows]);

  const selectedSupplier = suppliers.find(
    (supplier) => supplier.id === supplierId,
  );

  const updateRow = useCallback(
    (rowId: string, field: keyof PurchaseRow, value: string | number) => {
      setRows((current) =>
        current.map((row) => {
          if (row.id !== rowId) return row;

          const updated = { ...row, [field]: value };

          if (field === "name") {
            const selected = inventory.find(
              (item) =>
                item.name.toLowerCase() === String(value).trim().toLowerCase(),
            );

            updated.itemId = selected?.id ?? "";
            updated.itemCode = selected?.sku ?? "";
            updated.price = Number(selected?.purchasePrice ?? 0);
            updated.tax = String(Number(selected?.gstRate ?? 0));

            const unit = selected?.unit;
            updated.unit =
              typeof unit === "string"
                ? unit || "PCS"
                : unit?.shortName || "PCS";
          }

          if (field === "itemCode") {
            const selected = inventory.find(
              (item) =>
                item.sku?.toLowerCase() ===
                String(value).trim().toLowerCase(),
            );

            if (selected) {
              updated.itemId = selected.id;
              updated.name = selected.name;
              updated.price = Number(selected.purchasePrice ?? 0);
              updated.tax = String(Number(selected.gstRate ?? 0));
            }
          }

          if (field === "discountPercent") {
            updated.discountAmount = Number(
              (
                (Math.max(0, Number(updated.qty) || 0) *
                  Math.max(0, Number(updated.price) || 0) *
                  Math.min(100, Math.max(0, Number(value) || 0))) /
                100
              ).toFixed(2),
            );
          }

          return updated;
        }),
      );
    },
    [inventory],
  );

  const addRow = () => setRows((current) => [...current, newRow()]);

  const removeRow = (rowId: string) => {
    setRows((current) =>
      current.length > 1
        ? current.filter((row) => row.id !== rowId)
        : current,
    );
  };

  async function handleSave() {
    if (saving) return;

    setSaveError("");

    if (!supplierId) {
      setSaveError("Select an existing supplier before saving.");
      return;
    }

    if (!purchaseDate || Number.isNaN(new Date(`${purchaseDate}T12:00:00`).getTime())) {
      setSaveError("Enter a valid purchase date.");
      return;
    }

    const validRows = rows.filter((row) => row.name.trim());

    if (validRows.length === 0) {
      setSaveError("Add at least one purchase item.");
      return;
    }

    for (const row of validRows) {
      if (!Number.isFinite(row.qty) || row.qty <= 0) {
        setSaveError(`Quantity for "${row.name}" must be greater than zero.`);
        return;
      }

      if (!Number.isFinite(row.price) || row.price < 0) {
        setSaveError(`Price for "${row.name}" cannot be negative.`);
        return;
      }

      if (
        !Number.isFinite(row.discountPercent) ||
        row.discountPercent < 0 ||
        row.discountPercent > 100
      ) {
        setSaveError(`Discount for "${row.name}" must be between 0% and 100%.`);
        return;
      }
    }

    const invoiceTotal = Number(totals.total.toFixed(2));

    const notes = [
      billingName.trim() ? `Billing name: ${billingName.trim()}` : "",
      phone.trim() ? `Phone: ${phone.trim()}` : "",
      billingAddress.trim()
        ? `Billing address: ${billingAddress.trim()}`
        : "",
      shippingAddress.trim()
        ? `Shipping address: ${shippingAddress.trim()}`
        : "",
      referenceNo.trim() ? `Reference: ${referenceNo.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      supplierId,
      date: new Date(`${purchaseDate}T12:00:00`).toISOString(),
      paymentMethod: PAYMENT_METHODS[paymentType] ?? "cash",
      paidAmount: paid ? invoiceTotal : 0,
      notes,
      items: validRows.map((row) => ({
        ...(row.itemId ? { itemId: row.itemId } : {}),
        itemName: row.name.trim(),
        hsnSac:
          inventory.find((item) => item.id === row.itemId)?.hsnSac ?? "",
        quantity: Number(row.qty),
        unit: row.unit === "NONE" ? "" : row.unit,
        rate: Number(row.price),
        discountPercent: Number(row.discountPercent),
        gstRate: Number(row.tax) || 0,
      })),
    };

    setSaving(true);

    try {
      await api.createPurchase(payload);
      router.push("/purchases");
      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save purchase. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            New Purchase
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Record supplier purchases and update inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/purchases")}
          className="border rounded-md px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {loadError && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {saveError && (
        <div
          className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {saveError}
        </div>
      )}

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-5 border-b">
        <div>
          <label className="text-xs font-medium text-gray-500">
            Supplier *
          </label>
          <select
            value={supplierId}
            disabled={loadingOptions || saving}
            onChange={(event) => {
              const selected = suppliers.find(
                (supplier) => supplier.id === event.target.value,
              );
              setSupplierId(selected?.id ?? "");
              setBillingName(
                selected?.businessName || selected?.name || "",
              );
              setPhone(selected?.phone ?? "");
            }}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          >
            <option value="">
              {loadingOptions ? "Loading suppliers..." : "Select supplier"}
            </option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.businessName || supplier.name}
              </option>
            ))}
          </select>
          {!loadingOptions && suppliers.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              No active suppliers found. Add a supplier first.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">
            Billing Name
          </label>
          <input
            value={billingName}
            onChange={(event) => setBillingName(event.target.value)}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">
            Phone Number
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">
            Invoice Number
          </label>
          <div className="border rounded-md px-3 py-2 mt-1 text-sm text-gray-500 bg-gray-50">
            Generated by server
          </div>
          <label className="block text-xs font-medium text-gray-500 mt-3">
            Invoice Date *
          </label>
          <input
            type="date"
            value={purchaseDate}
            max={new Date().toLocaleDateString("en-CA")}
            onChange={(event) => setPurchaseDate(event.target.value)}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          />
        </div>
      </div>

      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-5 border-b">
        <div>
          <label className="text-xs font-medium text-gray-500">
            Billing Address
          </label>
          <textarea
            value={billingAddress}
            onChange={(event) => setBillingAddress(event.target.value)}
            rows={2}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">
            Shipping Address
          </label>
          <textarea
            value={shippingAddress}
            onChange={(event) => setShippingAddress(event.target.value)}
            rows={2}
            className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
          />
        </div>
      </div>

      <div className="px-6 py-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Purchase Items</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            + Add item
          </button>
        </div>

        <table className="w-full text-sm min-w-[1050px]">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-3 pr-2">Item</th>
              <th className="py-3 px-2">Item Code</th>
              <th className="py-3 px-2">IMEI / Serial</th>
              <th className="py-3 px-2">Qty</th>
              <th className="py-3 px-2">Unit</th>
              <th className="py-3 px-2 text-right">Price</th>
              <th className="py-3 px-2">Discount %</th>
              <th className="py-3 px-2">GST</th>
              <th className="py-3 pl-2 text-right">Amount</th>
              <th className="py-3 pl-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const line = rowTotals(row);

              return (
                <tr key={row.id} className="border-b align-top">
                  <td className="py-3 pr-2">
                    <input
                      list="purchase-inventory"
                      value={row.name}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "name", event.target.value)
                      }
                      placeholder="Type or select item"
                      className="w-48 border rounded-md px-2 py-2"
                    />
                    {row.itemId && (
                      <p className="text-xs text-green-700 mt-1">
                        Existing inventory item
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <input
                      list="purchase-skus"
                      value={row.itemCode}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "itemCode", event.target.value)
                      }
                      placeholder="SKU"
                      className="w-28 border rounded-md px-2 py-2"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      value={row.imei}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "imei", event.target.value)
                      }
                      placeholder="Optional"
                      className="w-32 border rounded-md px-2 py-2"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={row.qty}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "qty", Number(event.target.value))
                      }
                      className="w-20 border rounded-md px-2 py-2"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      value={row.unit}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "unit", event.target.value)
                      }
                      className="w-20 border rounded-md px-2 py-2"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "price", Number(event.target.value))
                      }
                      className="w-28 border rounded-md px-2 py-2 text-right"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={row.discountPercent}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          "discountPercent",
                          Number(event.target.value),
                        )
                      }
                      className="w-24 border rounded-md px-2 py-2"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={row.tax}
                      disabled={saving}
                      onChange={(event) =>
                        updateRow(row.id, "tax", event.target.value)
                      }
                      className="border rounded-md px-2 py-2"
                    >
                      {TAX_OPTIONS.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate === 0 ? "None" : `GST ${rate}%`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pl-2 text-right font-medium whitespace-nowrap">
                    {money(line.total)}
                  </td>
                  <td className="py-3 pl-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={saving || rows.length === 1}
                      aria-label={`Remove ${row.name || "item row"}`}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 text-xl"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <datalist id="purchase-inventory">
          {inventory.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
        <datalist id="purchase-skus">
          {inventory
            .filter((item) => item.sku)
            .map((item) => (
              <option key={item.id} value={item.sku ?? ""}>
                {item.name}
              </option>
            ))}
        </datalist>

        <div className="flex justify-end mt-6">
          <div className="w-full max-w-sm rounded-lg border bg-gray-50 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total quantity</span>
              <span>{totals.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount</span>
              <span>- {money(totals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GST</span>
              <span>{money(totals.gst)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Invoice total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="text-xs font-medium text-gray-500">
            Reference Number
          </label>
          <input
            value={referenceNo}
            onChange={(event) => setReferenceNo(event.target.value)}
            disabled={saving}
            className="w-full max-w-md border rounded-md px-3 py-2 mt-1 text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            Reference details are saved in the purchase notes.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs font-medium text-gray-500">
                Payment Method
              </label>
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value)}
                disabled={saving}
                className="block border rounded-md px-3 py-2 mt-1 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="OTHERS">Other</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 text-sm">
            <input
              type="checkbox"
              checked={paid}
              onChange={(event) => setPaid(event.target.checked)}
              disabled={saving}
            />
            Mark invoice as fully paid
          </label>

          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-600">Paid now</span>
            <span>{money(paid ? totals.total : 0)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Outstanding balance</span>
            <span className="font-semibold">
              {money(paid ? 0 : totals.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
        <button
          type="button"
          onClick={() => router.push("/purchases")}
          disabled={saving}
          className="border rounded-md px-4 py-2 text-sm hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loadingOptions || suppliers.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving purchase..." : "Save purchase"}
        </button>
      </div>
    </div>
  );
}
