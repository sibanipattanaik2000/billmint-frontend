"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Save,
  X,
  Package,
  Barcode,
  IndianRupee,
  Percent,
  Boxes,
} from "lucide-react";
import { api } from "@/lib/api";

type FormState = {
  name: string;
  itemType: "PRODUCT" | "SERVICE";
  sku: string;
  barcode: string;

  categoryId: string;
  unitId: string;

  hsnSac: string;

  salePrice: string;
  purchasePrice: string;
  mrp: string;

  salePriceIncludesTax: boolean;
  purchasePriceIncludesTax: boolean;

  gstRate: string;
  discountPercent: string;

  openingStock: string;
  openingStockRate: string;
  minimumStock: string;

  description: string;

  trackBatch: boolean;
  trackSerial: boolean;
  trackExpiry: boolean;
};

const initialForm: FormState = {
  name: "",
  itemType: "PRODUCT",
  sku: "",
  barcode: "",

  categoryId: "",
  unitId: "",

  hsnSac: "",

  salePrice: "",
  purchasePrice: "",
  mrp: "",

  salePriceIncludesTax: true,
  purchasePriceIncludesTax: false,

  gstRate: "18",
  discountPercent: "0",

  openingStock: "0",
  openingStockRate: "",
  minimumStock: "0",

  description: "",

  trackBatch: false,
  trackSerial: false,
  trackExpiry: false,
};

function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {prefix}
        </span>
      )}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "h-10 w-full rounded-md border border-slate-300 bg-white",
          "text-sm text-slate-800 outline-none transition",
          "placeholder:text-slate-400",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10",
          prefix ? "pl-9" : "px-3",
          suffix ? "pr-10" : "",
        ].join(" ")}
      />

      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
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
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      >
        {children}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function AddButton({
  onClick,
  title,
}: {
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
    >
      <Plus className="h-4 w-4" />
    </button>
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
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          {icon}
        </div>

        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

export default function NewItemPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (saveAndNew = false) => {
    setError("");

    if (!form.name.trim()) {
      setError("Please enter item name.");
      return;
    }

    if (form.itemType === "PRODUCT" && !form.unitId) {
      setError("Please select a unit.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,

        categoryId: form.categoryId || undefined,
        unitId: form.unitId || undefined,

        description: form.description.trim() || undefined,

        purchasePrice:
          form.purchasePrice === "" ? 0 : Number(form.purchasePrice),

        salePrice:
          form.salePrice === "" ? 0 : Number(form.salePrice),

        mrp: form.mrp === "" ? null : Number(form.mrp),

        openingStock:
          form.itemType === "SERVICE"
            ? 0
            : form.openingStock === ""
              ? 0
              : Number(form.openingStock),

        minimumStock:
          form.itemType === "SERVICE"
            ? 0
            : form.minimumStock === ""
              ? 0
              : Number(form.minimumStock),

        gstRate:
          form.gstRate === "" ? 0 : Number(form.gstRate),

        hsnSac: form.hsnSac.trim() || undefined,

        discountPercent:
          form.discountPercent === ""
            ? 0
            : Number(form.discountPercent),

        trackBatch:
          form.itemType === "PRODUCT" && form.trackBatch,

        trackSerial:
          form.itemType === "PRODUCT" && form.trackSerial,

        trackExpiry:
          form.itemType === "PRODUCT" && form.trackExpiry,
      };

      await api.createItem(payload);

      if (saveAndNew) {
        setForm(initialForm);
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else {
        router.push("/items");
        router.refresh();
      }
    } catch (err) {
      console.error("Create item failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create item. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/items");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Add Item
              </h1>

              <p className="text-xs text-slate-500">
                Create a new product or service
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="flex h-9 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />

              {saving ? "Saving..." : "Save Item"}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="mx-auto max-w-5xl px-6 py-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* BASIC DETAILS */}
          <Section
            icon={<Package className="h-4 w-4" />}
            title="Item Details"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Item Name"
                required
                className="md:col-span-2"
              >
                <Input
                  value={form.name}
                  onChange={(value) => update("name", value)}
                  placeholder="Enter item name"
                />
              </Field>

              {/* PRODUCT / SERVICE */}
              <Field label="Item Type">
                <div className="flex h-10 rounded-md border border-slate-300 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => update("itemType", "PRODUCT")}
                    className={[
                      "flex-1 rounded text-sm font-medium transition",
                      form.itemType === "PRODUCT"
                        ? "bg-white text-brand-600 shadow-sm"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    Product
                  </button>

                  <button
                    type="button"
                    onClick={() => update("itemType", "SERVICE")}
                    className={[
                      "flex-1 rounded text-sm font-medium transition",
                      form.itemType === "SERVICE"
                        ? "bg-white text-brand-600 shadow-sm"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    Service
                  </button>
                </div>
              </Field>

              <Field label="Item Code / SKU">
                <Input
                  value={form.sku}
                  onChange={(value) => update("sku", value)}
                  placeholder="Enter item code"
                />
              </Field>

              <Field label="Barcode">
                <Input
                  value={form.barcode}
                  onChange={(value) => update("barcode", value)}
                  placeholder="Scan or enter barcode"
                  prefix={<Barcode className="h-4 w-4" />}
                />
              </Field>

              <Field label="HSN / SAC Code">
                <Input
                  value={form.hsnSac}
                  onChange={(value) => update("hsnSac", value)}
                  placeholder="Enter HSN / SAC code"
                />
              </Field>

              {/* UNIT */}
              {form.itemType === "PRODUCT" && (
                <Field label="Unit" required>
                  <div className="flex gap-2">
                    <Select
                      value={form.unitId}
                      onChange={(value) => update("unitId", value)}
                    >
                      <option value="">Select unit</option>
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KG">KG</option>
                      <option value="GRAM">GRAM</option>
                      <option value="LTR">LTR</option>
                      <option value="MTR">MTR</option>
                    </Select>

                    <AddButton
                      title="Add Unit"
                      onClick={() => {
                        window.alert(
                          "Unit creation can be connected to your Unit master."
                        );
                      }}
                    />
                  </div>
                </Field>
              )}

              {/* CATEGORY */}
              <Field label="Category">
                <div className="flex gap-2">
                  <Select
                    value={form.categoryId}
                    onChange={(value) =>
                      update("categoryId", value)
                    }
                  >
                    <option value="">Select category</option>
                    <option value="GENERAL">General</option>
                    <option value="ELECTRONICS">Electronics</option>
                    <option value="GROCERY">Grocery</option>
                    <option value="CLOTHING">Clothing</option>
                    <option value="OTHER">Other</option>
                  </Select>

                  <AddButton
                    title="Add Category"
                    onClick={() => {
                      window.alert(
                        "Category creation can be connected to your Category master."
                      );
                    }}
                  />
                </div>
              </Field>

              <Field
                label="Description"
                className="md:col-span-2"
              >
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    update("description", e.target.value)
                  }
                  rows={3}
                  placeholder="Enter item description"
                  className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                />
              </Field>
            </div>
          </Section>

          {/* PRICE */}
          <Section
            icon={<IndianRupee className="h-4 w-4" />}
            title="Price Details"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Field label="Sale Price" required>
                <Input
                  type="number"
                  value={form.salePrice}
                  onChange={(value) =>
                    update("salePrice", value)
                  }
                  placeholder="0.00"
                  prefix={
                    <IndianRupee className="h-4 w-4" />
                  }
                />
              </Field>

              <Field label="Purchase Price">
                <Input
                  type="number"
                  value={form.purchasePrice}
                  onChange={(value) =>
                    update("purchasePrice", value)
                  }
                  placeholder="0.00"
                  prefix={
                    <IndianRupee className="h-4 w-4" />
                  }
                />
              </Field>

              <Field label="MRP">
                <Input
                  type="number"
                  value={form.mrp}
                  onChange={(value) => update("mrp", value)}
                  placeholder="0.00"
                  prefix={
                    <IndianRupee className="h-4 w-4" />
                  }
                />
              </Field>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.salePriceIncludesTax}
                  onChange={(e) =>
                    update(
                      "salePriceIncludesTax",
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 accent-brand-600"
                />

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Sale price includes tax
                  </p>

                  <p className="text-xs text-slate-500">
                    Price already includes GST
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.purchasePriceIncludesTax}
                  onChange={(e) =>
                    update(
                      "purchasePriceIncludesTax",
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 accent-brand-600"
                />

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Purchase price includes tax
                  </p>

                  <p className="text-xs text-slate-500">
                    Purchase price already includes GST
                  </p>
                </div>
              </label>
            </div>
          </Section>

          {/* TAX */}
          <Section
            icon={<Percent className="h-4 w-4" />}
            title="Tax & Discount"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="GST Rate">
                <div className="relative">
                  <Select
                    value={form.gstRate}
                    onChange={(value) =>
                      update("gstRate", value)
                    }
                  >
                    <option value="0">GST 0%</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </Select>
                </div>
              </Field>

              <Field label="Discount">
                <Input
                  type="number"
                  value={form.discountPercent}
                  onChange={(value) =>
                    update("discountPercent", value)
                  }
                  placeholder="0"
                  suffix="%"
                />
              </Field>
            </div>
          </Section>

          {/* STOCK */}
          {form.itemType === "PRODUCT" && (
            <Section
              icon={<Boxes className="h-4 w-4" />}
              title="Opening Stock"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Opening Quantity">
                  <Input
                    type="number"
                    value={form.openingStock}
                    onChange={(value) =>
                      update("openingStock", value)
                    }
                    placeholder="0"
                  />
                </Field>

                <Field label="Opening Stock Rate">
                  <Input
                    type="number"
                    value={form.openingStockRate}
                    onChange={(value) =>
                      update("openingStockRate", value)
                    }
                    placeholder="0.00"
                    prefix={
                      <IndianRupee className="h-4 w-4" />
                    }
                  />
                </Field>

                <Field label="Minimum Stock">
                  <Input
                    type="number"
                    value={form.minimumStock}
                    onChange={(value) =>
                      update("minimumStock", value)
                    }
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Opening stock is the quantity currently available
                  when this item is first created.
                </p>
              </div>
            </Section>
          )}

          {/* TRACKING */}
          {form.itemType === "PRODUCT" && (
            <Section
              icon={<Barcode className="h-4 w-4" />}
              title="Inventory Tracking"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.trackBatch}
                    onChange={(e) =>
                      update("trackBatch", e.target.checked)
                    }
                    className="h-4 w-4 accent-brand-600"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Track batches
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.trackSerial}
                    onChange={(e) =>
                      update("trackSerial", e.target.checked)
                    }
                    className="h-4 w-4 accent-brand-600"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Track serial numbers
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.trackExpiry}
                    onChange={(e) =>
                      update("trackExpiry", e.target.checked)
                    }
                    className="h-4 w-4 accent-brand-600"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Track expiry
                  </span>
                </label>
              </div>
            </Section>
          )}
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={handleCancel}
            className="h-10 rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="h-10 rounded-md border border-brand-600 bg-white px-5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
          >
            Save & New
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="flex h-10 items-center gap-2 rounded-md bg-brand-600 px-6 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Item"}
          </button>
        </div>
      </main>
    </div>
  );
}