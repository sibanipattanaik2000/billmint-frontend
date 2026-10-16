
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  openingBalance?: number | string | null;
  currentBalance?: number | string | null;
  creditLimit?: number | string | null;
  paymentTerms?: number | null;
  notes?: string | null;
  status?: string;
}

interface CustomerForm {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  creditLimit: string;
  paymentTerms: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  creditLimit: "0",
  paymentTerms: "",
  notes: "",
};

function toFormValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function customerToForm(customer: Customer): CustomerForm {
  return {
    name: customer.name ?? "",
    businessName: customer.businessName ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    gstin: customer.gstin ?? "",
    pan: customer.pan ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    pinCode: customer.pinCode ?? "",
    creditLimit: toFormValue(customer.creditLimit ?? 0),
    paymentTerms: toFormValue(customer.paymentTerms),
    notes: customer.notes ?? "",
  };
}

function validateForm(form: CustomerForm): string | null {
  if (!form.name.trim()) {
    return "Customer name is required.";
  }

  if (form.name.trim().length > 200) {
    return "Customer name cannot exceed 200 characters.";
  }

  if (form.businessName.length > 200) {
    return "Business name cannot exceed 200 characters.";
  }

  if (form.phone.trim() && form.phone.trim().length > 50) {
    return "Phone number cannot exceed 50 characters.";
  }

  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    return "Enter a valid email address.";
  }

  const gstin = form.gstin.trim().toUpperCase();

  if (
    gstin &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)
  ) {
    return "Enter a valid 15-character GSTIN.";
  }

  const pan = form.pan.trim().toUpperCase();

  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return "Enter a valid 10-character PAN.";
  }

  if (form.pinCode.trim() && !/^\d{6}$/.test(form.pinCode.trim())) {
    return "PIN code must contain exactly 6 digits.";
  }

  if (form.address.length > 500) {
    return "Address cannot exceed 500 characters.";
  }

  if (form.city.length > 100 || form.state.length > 100) {
    return "City and state cannot exceed 100 characters each.";
  }

  const creditLimit = Number(form.creditLimit);

  if (
    form.creditLimit.trim() === "" ||
    !Number.isFinite(creditLimit) ||
    creditLimit < 0
  ) {
    return "Credit limit must be a valid non-negative amount.";
  }

  if (Math.round(creditLimit * 100) !== creditLimit * 100) {
    return "Credit limit cannot have more than two decimal places.";
  }

  if (form.paymentTerms.trim()) {
    const days = Number(form.paymentTerms);

    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      return "Payment terms must be a whole number between 0 and 3650 days.";
    }
  }

  if (form.notes.length > 1000) {
    return "Notes cannot exceed 1000 characters.";
  }

  return null;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

const labelClass = "block text-sm font-medium text-gray-700";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!id) {
      setError("Customer ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await api.customer(id);
      const record = response.data as Customer;

      if (!record?.id) {
        throw new Error("The server returned an invalid customer record.");
      }

      setCustomer(record);
      setForm(customerToForm(record));
    } catch (err) {
      setCustomer(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this customer.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  function updateField<K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer || saving || deleting) return;

    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      setNotice("");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.updateCustomer(id, {
        name: form.name.trim(),
        businessName: form.businessName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        gstin: form.gstin.trim().toUpperCase() || null,
        pan: form.pan.trim().toUpperCase() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pinCode: form.pinCode.trim() || null,
        creditLimit: Number(form.creditLimit),
        paymentTerms:
          form.paymentTerms.trim() === ""
            ? null
            : Number(form.paymentTerms),
        notes: form.notes.trim() || null,
      });

      setNotice("Customer updated successfully.");
      router.push("/customers");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to update the customer. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!customer || saving || deleting) return;

    const confirmed = window.confirm(
      `Archive "${customer.name}"?\n\nThis removes the customer from active lists but preserves accounting history.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await api.deleteCustomer(id);
      router.push("/customers");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive this customer. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading customer details…</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-64 flex-1 items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-gray-900">
            Customer unavailable
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "This customer could not be found."}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void loadCustomer()}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => router.push("/customers")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Back to customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const busy = saving || deleting;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4 md:px-8">
        <div>
          <button
            type="button"
            onClick={() => router.push("/customers")}
            className="mb-2 text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to customers
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            Edit customer
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Update the customer profile stored in BillMint.
          </p>
        </div>

        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          {customer.status || "ACTIVE"}
        </span>
      </header>

      <form
        onSubmit={handleUpdate}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="font-semibold"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {notice}
            </div>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">
              Basic details
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Customer name *">
                <input
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="Business name">
                <input
                  maxLength={200}
                  value={form.businessName}
                  onChange={(e) =>
                    updateField("businessName", e.target.value)
                  }
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="Phone number">
                <input
                  type="tel"
                  maxLength={50}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="GSTIN">
                <input
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) =>
                    updateField("gstin", e.target.value.toUpperCase())
                  }
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="PAN">
                <input
                  maxLength={10}
                  value={form.pan}
                  onChange={(e) =>
                    updateField("pan", e.target.value.toUpperCase())
                  }
                  className={inputClass}
                  disabled={busy}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">
              Address
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Street address">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={inputClass}
                    disabled={busy}
                  />
                </Field>
              </div>

              <Field label="City">
                <input
                  maxLength={100}
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="State">
                <input
                  maxLength={100}
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="PIN code">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pinCode}
                  onChange={(e) =>
                    updateField("pinCode", e.target.value.replace(/\D/g, ""))
                  }
                  className={inputClass}
                  disabled={busy}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
            <h2 className="mb-2 text-base font-semibold text-gray-900">
              Credit and payment terms
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Opening balances are read-only here to protect accounting
              history. Use a dedicated accounting adjustment workflow to
              correct an opening balance.
            </p>

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Opening balance</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  ₹
                  {" "}
                  {Number(customer.openingBalance ?? 0).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Current balance</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  ₹
                  {" "}
                  {Number(customer.currentBalance ?? 0).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Credit limit (₹)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(e) =>
                    updateField("creditLimit", e.target.value)
                  }
                  className={inputClass}
                  disabled={busy}
                />
              </Field>

              <Field label="Payment terms (days)">
                <input
                  type="number"
                  min="0"
                  max="3650"
                  step="1"
                  value={form.paymentTerms}
                  onChange={(e) =>
                    updateField("paymentTerms", e.target.value)
                  }
                  placeholder="e.g. 30"
                  className={inputClass}
                  disabled={busy}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">
              Additional notes
            </h2>
            <Field label="Notes">
              <textarea
                rows={4}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Internal notes about this customer"
                className={inputClass}
                disabled={busy}
              />
            </Field>
            <p className="mt-1 text-right text-xs text-gray-400">
              {form.notes.length}/1000 characters
            </p>
          </section>

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-200 py-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Archiving…" : "Archive customer"}
            </button>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/customers")}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving changes…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
