
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type SettingsData = {
  business: {
    id: string;
    name: string;
    ownerName: string;
    email: string | null;
    phone: string | null;
    gstin: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    financialYearStart: number;
  };
  settings: {
    invoicePrefix: string;
    invoiceNextNumber: number;
    quotationPrefix: string;
    quotationNextNumber: number;
    challanPrefix: string;
    challanNextNumber: number;
    purchasePrefix: string;
    purchaseNextNumber: number;
    defaultTaxRate: number | string;
    currency: string;
    currencySymbol: string;
    decimalPlaces: number;
    termsAndConditions: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    bankBranch: string | null;
    upiId: string | null;
    invoiceTemplate: string;
  };
};

type Tab =
  | "company"
  | "invoice"
  | "tax"
  | "users"
  | "backup"
  | "general";

const tabs: { id: Tab; label: string }[] = [
  { id: "company", label: "Company Profile" },
  { id: "invoice", label: "Invoice Settings" },
  { id: "tax", label: "Tax & GST" },
  { id: "users", label: "Users & Permissions" },
  { id: "backup", label: "Backup & Restore" },
  { id: "general", label: "General" },
];

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const labelClass = "block text-sm font-medium text-gray-600";

const emptyToNull = (value: string) => value.trim() || null;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.businessSettings();

      if (!response.success || !response.data?.business || !response.data?.settings) {
        throw new Error("The server returned an invalid settings response.");
      }

      setData({
        business: response.data.business,
        settings: response.data.settings,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your business settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateBusiness = (
    field: keyof SettingsData["business"],
    value: string | number | null,
  ) => {
    setData((current) =>
      current
        ? {
            ...current,
            business: { ...current.business, [field]: value },
          }
        : current,
    );
  };

  const updateSetting = (
    field: keyof SettingsData["settings"],
    value: string | number | null,
  ) => {
    setData((current) =>
      current
        ? {
            ...current,
            settings: { ...current.settings, [field]: value },
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!data || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { business, settings } = data;

    try {
      const response = await api.updateBusinessSettings({
        business: {
          name: business.name.trim(),
          ownerName: business.ownerName.trim(),
          email: emptyToNull(business.email ?? ""),
          phone: emptyToNull(business.phone ?? ""),
          gstin: emptyToNull(business.gstin ?? ""),
          address: emptyToNull(business.address ?? ""),
          city: emptyToNull(business.city ?? ""),
          state: emptyToNull(business.state ?? ""),
          financialYearStart: Number(business.financialYearStart),
        },
        settings: {
          invoicePrefix: settings.invoicePrefix.trim(),
          invoiceNextNumber: Number(settings.invoiceNextNumber),
          quotationPrefix: settings.quotationPrefix.trim(),
          quotationNextNumber: Number(settings.quotationNextNumber),
          challanPrefix: settings.challanPrefix.trim(),
          challanNextNumber: Number(settings.challanNextNumber),
          purchasePrefix: settings.purchasePrefix.trim(),
          purchaseNextNumber: Number(settings.purchaseNextNumber),
          defaultTaxRate: Number(settings.defaultTaxRate),
          currency: settings.currency.trim().toUpperCase(),
          currencySymbol: settings.currencySymbol.trim(),
          decimalPlaces: Number(settings.decimalPlaces),
          termsAndConditions: settings.termsAndConditions?.trim() || null,
          bankName: emptyToNull(settings.bankName ?? ""),
          bankAccountNumber: emptyToNull(settings.bankAccountNumber ?? ""),
          bankIfsc: emptyToNull(settings.bankIfsc ?? ""),
          bankBranch: emptyToNull(settings.bankBranch ?? ""),
          upiId: emptyToNull(settings.upiId ?? ""),
          invoiceTemplate: settings.invoiceTemplate,
        },
      });

      if (!response.success) {
        throw new Error("The server did not confirm the settings update.");
      }

      setMessage("Settings saved successfully.");
      await loadSettings();
    } catch (err) {
      const detail =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Unable to save settings.";

      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 text-sm text-gray-500">
        Loading saved business settings…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error || "Business settings could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { business, settings } = data;

  const field = (
    label: string,
    value: string | number,
    onChange: (value: string) => void,
    options?: {
      type?: string;
      placeholder?: string;
      min?: number;
      max?: number;
    },
  ) => (
    <label className={labelClass}>
      {label}
      <input
        className={inputClass}
        type={options?.type ?? "text"}
        value={value ?? ""}
        placeholder={options?.placeholder}
        min={options?.min}
        max={options?.max}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your saved business and invoice preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </header>

      <div className="border-b px-6 pt-3">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mb-3 text-sm text-green-700">
            {message}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto border-b bg-gray-50 p-3 md:w-56 md:shrink-0 md:flex-col md:border-b-0 md:border-r"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
                setMessage("");
              }}
              className={`shrink-0 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-5 md:p-6">
          {activeTab === "company" && (
            <section className="max-w-3xl space-y-5">
              <h2 className="text-lg font-semibold">Company Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("Company Name", business.name, (v) =>
                  updateBusiness("name", v),
                )}
                {field("Owner Name", business.ownerName, (v) =>
                  updateBusiness("ownerName", v),
                )}
                {field("Phone", business.phone ?? "", (v) =>
                  updateBusiness("phone", v),
                )}
                {field("Email", business.email ?? "", (v) =>
                  updateBusiness("email", v),
                )}
                {field("GSTIN", business.gstin ?? "", (v) =>
                  updateBusiness("gstin", v.toUpperCase()),
                )}
                {field("City", business.city ?? "", (v) =>
                  updateBusiness("city", v),
                )}
                {field("State", business.state ?? "", (v) =>
                  updateBusiness("state", v),
                )}
              </div>
              <label className={labelClass}>
                Business Address
                <textarea
                  className={inputClass}
                  rows={3}
                  value={business.address ?? ""}
                  onChange={(e) => updateBusiness("address", e.target.value)}
                />
              </label>
            </section>
          )}

          {activeTab === "invoice" && (
            <section className="max-w-3xl space-y-5">
              <h2 className="text-lg font-semibold">Invoice Settings</h2>
              <p className="text-sm text-gray-500">
                These are numbering defaults. Existing invoices are not
                renumbered by changing them.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {field("Invoice Prefix", settings.invoicePrefix, (v) =>
                  updateSetting("invoicePrefix", v),
                )}
                {field(
                  "Next Invoice Number",
                  settings.invoiceNextNumber,
                  (v) => updateSetting("invoiceNextNumber", v),
                  { type: "number", min: 1 },
                )}
                {field("Quotation Prefix", settings.quotationPrefix, (v) =>
                  updateSetting("quotationPrefix", v),
                )}
                {field(
                  "Next Quotation Number",
                  settings.quotationNextNumber,
                  (v) => updateSetting("quotationNextNumber", v),
                  { type: "number", min: 1 },
                )}
                {field("Delivery Challan Prefix", settings.challanPrefix, (v) =>
                  updateSetting("challanPrefix", v),
                )}
                {field(
                  "Next Challan Number",
                  settings.challanNextNumber,
                  (v) => updateSetting("challanNextNumber", v),
                  { type: "number", min: 1 },
                )}
                {field("Purchase Prefix", settings.purchasePrefix, (v) =>
                  updateSetting("purchasePrefix", v),
                )}
                {field(
                  "Next Purchase Number",
                  settings.purchaseNextNumber,
                  (v) => updateSetting("purchaseNextNumber", v),
                  { type: "number", min: 1 },
                )}
              </div>

              <label className={labelClass}>
                Default Terms & Conditions
                <textarea
                  className={inputClass}
                  rows={4}
                  value={settings.termsAndConditions ?? ""}
                  onChange={(e) =>
                    updateSetting("termsAndConditions", e.target.value)
                  }
                />
              </label>

              <div className="border-t pt-5">
                <h3 className="mb-4 font-semibold">Invoice Bank Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("Bank Name", settings.bankName ?? "", (v) =>
                    updateSetting("bankName", v),
                  )}
                  {field(
                    "Bank Account Number",
                    settings.bankAccountNumber ?? "",
                    (v) => updateSetting("bankAccountNumber", v),
                  )}
                  {field("IFSC", settings.bankIfsc ?? "", (v) =>
                    updateSetting("bankIfsc", v.toUpperCase()),
                  )}
                  {field("Bank Branch", settings.bankBranch ?? "", (v) =>
                    updateSetting("bankBranch", v),
                  )}
                  {field("UPI ID", settings.upiId ?? "", (v) =>
                    updateSetting("upiId", v),
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "tax" && (
            <section className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold">Tax & GST Settings</h2>
              <p className="text-sm text-gray-500">
                This updates the saved default tax rate. It does not recalculate
                taxes on previously saved transactions.
              </p>
              <label className={labelClass}>
                Default Tax Rate (%)
                <select
                  className={inputClass}
                  value={String(settings.defaultTaxRate)}
                  onChange={(e) =>
                    updateSetting("defaultTaxRate", Number(e.target.value))
                  }
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </label>
            </section>
          )}

          {activeTab === "general" && (
            <section className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold">General Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Currency
                  <select
                    className={inputClass}
                    value={settings.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      updateSetting("currency", currency);
                      updateSetting(
                        "currencySymbol",
                        currency === "INR" ? "₹" : "$",
                      );
                    }}
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </label>

                {field(
                  "Decimal Places",
                  settings.decimalPlaces,
                  (v) => updateSetting("decimalPlaces", Number(v)),
                  { type: "number", min: 0, max: 4 },
                )}

                <label className={labelClass}>
                  Financial Year Starts
                  <select
                    className={inputClass}
                    value={String(business.financialYearStart)}
                    onChange={(e) =>
                      updateBusiness(
                        "financialYearStart",
                        Number(e.target.value),
                      )
                    }
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {new Date(2000, month - 1, 1).toLocaleString(
                            "en-IN",
                            { month: "long" },
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            </section>
          )}

          {activeTab === "users" && (
            <section className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-gray-800">
                Users & Permissions
              </h2>
              <p className="mt-2 text-sm text-gray-700">
                User listing, invitations, and permission editing are not
                connected to this settings screen yet. No sample users or
                pretend actions are shown here.
              </p>
            </section>
          )}

          {activeTab === "backup" && (
            <section className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-gray-800">Backup & Restore</h2>
              <p className="mt-2 text-sm text-gray-700">
                A complete business-data export and a validated restore process
                have not been implemented yet. Backup and restore controls are
                intentionally unavailable to avoid implying that data has been
                backed up or restored.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
