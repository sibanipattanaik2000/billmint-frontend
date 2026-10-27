"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Boxes,
  ChevronDown,
  IndianRupee,
  Package,
  Percent,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { ApiError, api, formatINR } from "@/lib/api";

interface StoreOption {
  storeCode: string;
  name: string;
}

interface Item {
  id: string;

  name: string;

  sku?: string | null;
  barcode?: string | null;
  imei?: string | null;

  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  sourceStoreCode?: string | null;
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

  trackBatch?: boolean;
  trackSerial?: boolean;
  trackExpiry?: boolean;

  status?: string;

  createdAt?: string;
  updatedAt?: string;

  category?: {
    id?: string;
    name?: string;
  } | null;

  brand?: {
    id?: string;
    name?: string;
  } | null;

  unit?: {
    id?: string;
    name?: string;
    shortName?: string;
  } | null;

  supplier?: {
    id?: string;
    name?: string;
  } | null;

  stockMovements?: StockMovement[];
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

type TrackingType = "none" | "batch" | "serial" | "batch_serial";

interface FormState {
  name: string;
  sku: string;
  barcode: string;
  imei: string;
  hsnSac: string;
  sourceStoreCode: string;
  description: string;

  salePrice: string;
  purchasePrice: string;
  mrp: string;

  gstRate: string;
  discountPercent: string;

  minimumStock: string;

  trackBatch: boolean;
  trackSerial: boolean;
  trackExpiry: boolean;
}

function numberValue(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getTrackingType({
  trackBatch,
  trackSerial,
}: {
  trackBatch?: boolean;
  trackSerial?: boolean;
}): TrackingType {
  const batch = Boolean(trackBatch);
  const serial = Boolean(trackSerial);

  if (batch && serial) {
    return "batch_serial";
  }

  if (batch) {
    return "batch";
  }

  if (serial) {
    return "serial";
  }

  return "none";
}

function Field({
  label,
  required = false,
  children,
  description,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {description && (
        <p className="mt-1.5 text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  inputMode,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      >
        {children}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          {icon}
        </div>

        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();

  const id = typeof params.id === "string" ? params.id : "";

  const [item, setItem] = useState<Item | null>(null);

  const [form, setForm] = useState<FormState | null>(null);

  const [activeTab, setActiveTab] = useState<
    "details" | "pricing" | "tracking"
  >("details");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const [stores, setStores] = useState<StoreOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      try {
        const response = await api.stores();

        if (!cancelled) {
          setStores(response.data);
        }
      } catch (err) {
        console.error("Unable to load stores:", err);
      }
    }

    void loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     LOAD ITEM
  ========================================================= */

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    const loadItem = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.item(id);

        if (!active) {
          return;
        }

        const nextItem = response.data as Item;

        setItem(nextItem);

        setForm({
          name: nextItem.name || "",

          sku: nextItem.sku || "",

          barcode: nextItem.barcode || "",

          sourceStoreCode: nextItem.sourceStoreCode || "",

          imei: nextItem.imei || "",

          hsnSac: nextItem.hsnSac || "",

          description: nextItem.description || "",

          salePrice: String(numberValue(nextItem.salePrice)),

          purchasePrice: String(numberValue(nextItem.purchasePrice)),

          mrp: nextItem.mrp == null ? "" : String(numberValue(nextItem.mrp)),

          gstRate: String(numberValue(nextItem.gstRate)),

          discountPercent: String(numberValue(nextItem.discountPercent)),

          minimumStock: String(numberValue(nextItem.minimumStock)),

          trackBatch: Boolean(nextItem.trackBatch),

          trackSerial: Boolean(nextItem.trackSerial),

          trackExpiry: Boolean(nextItem.trackExpiry),
        });
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof ApiError ? err.message : "Unable to load item.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  /* =========================================================
     FORM UPDATE
  ========================================================= */

  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  /* =========================================================
     TRACKING
  ========================================================= */

  const trackingType = useMemo(() => {
    if (!form) {
      return "none" as TrackingType;
    }

    return getTrackingType({
      trackBatch: form.trackBatch,
      trackSerial: form.trackSerial,
    });
  }, [form]);

  /* =========================================================
     VALIDATION
  ========================================================= */

  function validateForm(): string | null {
    if (!form) {
      return "Item data is not loaded.";
    }

    if (!form.name.trim()) {
      return "Item name is required.";
    }

    const salePrice = numberValue(form.salePrice);

    const purchasePrice = numberValue(form.purchasePrice);

    const mrp = form.mrp.trim() === "" ? null : numberValue(form.mrp);

    const gstRate = numberValue(form.gstRate);

    const discount = numberValue(form.discountPercent);

    const minimumStock = numberValue(form.minimumStock);

    if (salePrice < 0) {
      return "Sale price cannot be negative.";
    }

    if (purchasePrice < 0) {
      return "Purchase price cannot be negative.";
    }

    if (mrp !== null && mrp < 0) {
      return "MRP cannot be negative.";
    }

    if (gstRate < 0 || gstRate > 100) {
      return "GST rate must be between 0% and 100%.";
    }

    if (discount < 0 || discount > 100) {
      return "Discount must be between 0% and 100%.";
    }

    if (minimumStock < 0) {
      return "Minimum stock cannot be negative.";
    }

    if (form.trackSerial) {
      const imei = form.imei.trim();

      if (!imei) {
        return "IMEI is required for a serial-tracked item.";
      }

      if (!/^\d{15}$/.test(imei)) {
        return "IMEI must contain exactly 15 digits.";
      }
    }

    return null;
  }

  /* =========================================================
     SAVE
  ========================================================= */

  async function handleSave() {
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!form || !id) {
      return;
    }

    setSaving(true);

    try {
      await api.updateItem(id, {
        name: form.name.trim(),
        sourceStoreCode: form.sourceStoreCode || null,
        sku: form.sku.trim() || null,

        barcode: form.barcode.trim() || null,

        imei: form.trackSerial ? form.imei.trim() : form.imei.trim() || null,
        hsnSac: form.hsnSac.trim() || null,
        description: form.description.trim() || null,

        salePrice: numberValue(form.salePrice),

        purchasePrice: numberValue(form.purchasePrice),

        mrp: form.mrp.trim() === "" ? null : numberValue(form.mrp),

        gstRate: numberValue(form.gstRate),

        discountPercent: numberValue(form.discountPercent),

        minimumStock: numberValue(form.minimumStock),

        trackBatch: form.trackBatch,

        trackSerial: form.trackSerial,

        trackExpiry: form.trackExpiry,
      });

      setSuccess("Item updated successfully.");

      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to update item.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     DELETE
  ========================================================= */

  async function handleDelete() {
    if (!item || !id) {
      return;
    }

    const confirmed = window.confirm(
      `Archive "${item.name}"? This will remove it from active inventory and sales item selection.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await api.deleteItem(id);

      router.replace("/items");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to archive item.",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading item...
        </div>
      </div>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!item || !form) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />

          <h1 className="mt-4 text-lg font-semibold text-slate-800">
            Item not found
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {error || "The requested item could not be found."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/items")}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Items
          </button>
        </div>
      </div>
    );
  }

  const currentStock = numberValue(item.currentStock);

  const purchasePrice = numberValue(item.purchasePrice);

  const stockValue = currentStock * purchasePrice;

  const movements = item.stockMovements || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/items")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"
              title="Back to Items"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-900">
                  Edit Item
                </h1>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    item.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.status || "UNKNOWN"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {item.name}
                {item.sku ? ` · ${item.sku}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/items/${item.id}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Item
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* ===================================================
            CURRENT STOCK SUMMARY
        =================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Current Stock
            </div>

            <div className="mt-2 text-xl font-semibold text-slate-900">
              {currentStock}
              {item.unit?.shortName ? ` ${item.unit.shortName}` : ""}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Sale Price
            </div>

            <div className="mt-2 text-xl font-semibold text-slate-900">
              {formatINR(numberValue(item.salePrice))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Purchase Price
            </div>

            <div className="mt-2 text-xl font-semibold text-slate-900">
              {formatINR(purchasePrice)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Stock Value
            </div>

            <div className="mt-2 text-xl font-semibold text-slate-900">
              {formatINR(stockValue)}
            </div>
          </div>
        </div>

        {/* ===================================================
            TABS
        =================================================== */}

        <div className="mb-5 flex gap-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === "details"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Item Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === "pricing"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Pricing & Tax
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === "tracking"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Inventory Tracking
          </button>
        </div>

        {/* ===================================================
            DETAILS TAB
        =================================================== */}

        {activeTab === "details" && (
          <div className="space-y-5">
            <Section
              icon={<Package className="h-4 w-4" />}
              title="Basic Information"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Item Name" required>
                  <Input
                    value={form.name}
                    onChange={(value) => updateForm("name", value)}
                    placeholder="Enter item name"
                  />
                </Field>
                <Field
                  label="Source Store"
                  description="The store where this item originally came from. This does not transfer stock ownership."
                >
                  <Select
                    value={form.sourceStoreCode}
                    onChange={(value) => updateForm("sourceStoreCode", value)}
                  >
                    <option value="">Not specified</option>

                    {stores.map((store) => (
                      <option key={store.storeCode} value={store.storeCode}>
                        {store.storeCode} — {store.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Item Code / SKU">
                  <Input
                    value={form.sku}
                    onChange={(value) => updateForm("sku", value)}
                    placeholder="Enter internal item code"
                  />
                </Field>

                <Field label="Barcode">
                  <Input
                    value={form.barcode}
                    onChange={(value) => updateForm("barcode", value)}
                    placeholder="Enter or scan barcode"
                  />
                </Field>

                <Field
                  label="IMEI"
                  description={
                    form.trackSerial
                      ? "Required because serial tracking is enabled."
                      : "Stored only when supplied."
                  }
                >
                  <Input
                    value={form.imei}
                    onChange={(value) =>
                      updateForm("imei", value.replace(/\D/g, "").slice(0, 15))
                    }
                    placeholder="15-digit IMEI"
                    inputMode="numeric"
                    maxLength={15}
                  />
                </Field>

                <Field label="Category">
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {item.category?.name || "Not assigned"}
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Category master integration will be connected separately.
                  </p>
                </Field>

                <Field label="Brand">
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {item.brand?.name || "Not assigned"}
                  </div>
                </Field>

                <Field label="Unit">
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {item.unit?.name || item.unit?.shortName || "Not assigned"}
                  </div>
                </Field>

                <Field label="Supplier">
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    {item.supplier?.name || "Not assigned"}
                  </div>
                </Field>

                <Field
                  label="HSN / SAC"
                  description="Used for GST invoice classification."
                >
                  <Input
                    value={item.hsnSac || ""}
                    onChange={(value) => {
                      setItem((current) =>
                        current
                          ? {
                              ...current,
                              hsnSac: value,
                            }
                          : current,
                      );
                    }}
                    placeholder="Enter HSN/SAC"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    rows={4}
                    placeholder="Enter item description"
                    className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </Field>
              </div>
            </Section>
          </div>
        )}

        {/* ===================================================
            PRICING TAB
        =================================================== */}

        {activeTab === "pricing" && (
          <div className="space-y-5">
            <Section
              icon={<IndianRupee className="h-4 w-4" />}
              title="Price Details"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Sale Price" required>
                  <Input
                    type="number"
                    value={form.salePrice}
                    onChange={(value) => updateForm("salePrice", value)}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Purchase Price">
                  <Input
                    type="number"
                    value={form.purchasePrice}
                    onChange={(value) => updateForm("purchasePrice", value)}
                    placeholder="0.00"
                  />
                </Field>

                <Field label="MRP">
                  <Input
                    type="number"
                    value={form.mrp}
                    onChange={(value) => updateForm("mrp", value)}
                    placeholder="0.00"
                  />
                </Field>
              </div>
            </Section>

            <Section
              icon={<Percent className="h-4 w-4" />}
              title="GST & Discount"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="GST Rate">
                  <Select
                    value={form.gstRate}
                    onChange={(value) => updateForm("gstRate", value)}
                  >
                    <option value="0">GST 0%</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </Select>
                </Field>

                <Field label="Default Discount">
                  <Input
                    type="number"
                    value={form.discountPercent}
                    onChange={(value) => updateForm("discountPercent", value)}
                    placeholder="0"
                  />
                </Field>
              </div>
            </Section>
          </div>
        )}

        {/* ===================================================
            TRACKING TAB
        =================================================== */}

        {activeTab === "tracking" && (
          <div className="space-y-5">
            <Section
              icon={<Boxes className="h-4 w-4" />}
              title="Inventory Tracking"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label
                  className={`cursor-pointer rounded-lg border p-4 ${
                    form.trackBatch
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.trackBatch}
                      onChange={(event) =>
                        updateForm("trackBatch", event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-blue-600"
                    />

                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        Batch Tracking
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Track stock by batch.
                      </div>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border p-4 ${
                    form.trackSerial
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.trackSerial}
                      onChange={(event) =>
                        updateForm("trackSerial", event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-blue-600"
                    />

                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        IMEI / Serial Tracking
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Use one physical identifier per device.
                      </div>
                    </div>
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border p-4 ${
                    form.trackExpiry
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.trackExpiry}
                      onChange={(event) =>
                        updateForm("trackExpiry", event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-blue-600"
                    />

                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        Expiry Tracking
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Track expiry-controlled inventory.
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tracking Mode
                </div>

                <div className="mt-1 text-sm font-medium text-slate-800">
                  {trackingType === "none" && "Standard Stock"}

                  {trackingType === "batch" && "Batch Tracked"}

                  {trackingType === "serial" && "IMEI / Serial Tracked"}

                  {trackingType === "batch_serial" &&
                    "Batch + IMEI / Serial Tracked"}
                </div>
              </div>
            </Section>

            <Section
              icon={<Package className="h-4 w-4" />}
              title="Stock Threshold"
            >
              <div className="max-w-sm">
                <Field
                  label="Minimum Stock"
                  description="Used by the dashboard and low-stock reporting."
                >
                  <Input
                    type="number"
                    value={form.minimumStock}
                    onChange={(value) => updateForm("minimumStock", value)}
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Opening Stock</div>

                  <div className="mt-1 text-lg font-semibold text-slate-800">
                    {numberValue(item.openingStock)}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Current Stock</div>

                  <div className="mt-1 text-lg font-semibold text-slate-800">
                    {currentStock}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Minimum Stock</div>

                  <div className="mt-1 text-lg font-semibold text-slate-800">
                    {numberValue(form.minimumStock)}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ===================================================
            STOCK MOVEMENTS
        =================================================== */}

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Stock Transactions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Read-only inventory ledger for this item.
              </p>
            </div>

            <Link
              href={`/items/${item.id}`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View full ledger
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                    Quantity In
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                    Quantity Out
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                    Balance
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reference
                  </th>
                </tr>
              </thead>

              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No stock movements recorded.
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 20).map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {movement.type.replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(movement.date)}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-600">
                        {numberValue(movement.quantityIn) || "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-red-600">
                        {numberValue(movement.quantityOut) || "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {numberValue(movement.balance)}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {movement.referenceType ||
                          movement.referenceId ||
                          movement.notes ||
                          "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================================================
            DANGER ZONE
        =================================================== */}

        <section className="mt-6 rounded-lg border border-red-200 bg-white">
          <div className="border-b border-red-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
          </div>

          <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">
                Archive this item
              </div>

              <p className="mt-1 max-w-2xl text-xs text-slate-500">
                Archiving keeps the historical records intact while removing the
                item from active inventory operations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />

              {deleting ? "Archiving..." : "Archive Item"}
            </button>
          </div>
        </section>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {item.createdAt && (
              <span>Created {formatDate(item.createdAt)}</span>
            )}

            {item.updatedAt && (
              <span className="ml-4">Updated {formatDate(item.updatedAt)}</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/items")}
              disabled={saving}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />

              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
