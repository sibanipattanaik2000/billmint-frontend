
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type PartyType = "Customer" | "Supplier";

export default function AddPartyPage() {
  const router = useRouter();

  const [type, setType] = useState<PartyType>("Customer");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [creditLimit, setCreditLimit] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type")?.toLowerCase();

    if (requestedType === "supplier") {
      setType("Supplier");
    } else {
      setType("Customer");
    }
  }, []);

  function validate(): string | null {
    if (!name.trim()) {
      return "Name is required.";
    }

    if (name.trim().length > 200) {
      return "Name cannot exceed 200 characters.";
    }

    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
      return "Enter a valid 10-digit Indian mobile number.";
    }

    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return "Enter a valid email address.";
    }

    const normalizedGstin = gstin.trim().toUpperCase();

    if (
      normalizedGstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        normalizedGstin,
      )
    ) {
      return "Enter a valid GSTIN.";
    }

    const normalizedPan = pan.trim().toUpperCase();

    if (
      normalizedPan &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)
    ) {
      return "Enter a valid PAN.";
    }

    if (pinCode.trim() && !/^\d{6}$/.test(pinCode.trim())) {
      return "PIN code must contain exactly 6 digits.";
    }

    const balance = Number(openingBalance);

    if (
      openingBalance.trim() === "" ||
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      return "Opening balance must be zero or greater.";
    }

    if (Math.round(balance * 100) !== balance * 100) {
      return "Opening balance cannot have more than two decimal places.";
    }

    if (type === "Customer") {
      const limit = Number(creditLimit);

      if (
        creditLimit.trim() === "" ||
        !Number.isFinite(limit) ||
        limit < 0
      ) {
        return "Credit limit must be zero or greater.";
      }

      if (Math.round(limit * 100) !== limit * 100) {
        return "Credit limit cannot have more than two decimal places.";
      }
    }

    if (paymentTerms.trim()) {
      const days = Number(paymentTerms);

      if (
        !Number.isInteger(days) ||
        days < 0 ||
        days > 3650
      ) {
        return "Payment terms must be a whole number between 0 and 3650 days.";
      }
    }

    if (notes.length > 1000) {
      return "Notes cannot exceed 1000 characters.";
    }

    if (address.length > 500) {
      return "Address cannot exceed 500 characters.";
    }

    return null;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    const commonPayload = {
      name: name.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      openingBalance: Number(openingBalance),
      paymentTerms:
        paymentTerms.trim() === "" ? null : Number(paymentTerms),
      notes: notes.trim(),
    };

    try {
      if (type === "Customer") {
        await api.createCustomer({
          ...commonPayload,
          creditLimit: Number(creditLimit),
        });
      } else {
        await api.createSupplier(commonPayload);
      }

      router.push("/customers");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to create ${type.toLowerCase()}. Please try again.`,
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Add {type}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create a {type.toLowerCase()} record for your business.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="max-w-5xl space-y-8 p-6">
          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="font-medium"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Basic Details
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Record Type *
                </label>
                <select
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as PartyType);
                    setError("");
                  }}
                  disabled={saving}
                  className={fieldClass}
                >
                  <option value="Customer">Customer</option>
                  <option value="Supplier">Supplier</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Customers and suppliers are saved as separate records.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  {type} Name *
                </label>
                <input
                  required
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={`Enter ${type.toLowerCase()} name`}
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>Business Name</label>
                <input
                  maxLength={200}
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Registered or trading name"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="10-digit mobile number"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>GSTIN</label>
                <input
                  maxLength={15}
                  value={gstin}
                  onChange={(event) =>
                    setGstin(event.target.value.toUpperCase())
                  }
                  placeholder="15-character GSTIN"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>PAN</label>
                <input
                  maxLength={10}
                  value={pan}
                  onChange={(event) =>
                    setPan(event.target.value.toUpperCase())
                  }
                  placeholder="10-character PAN"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Address
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Street Address</label>
                <textarea
                  maxLength={500}
                  rows={3}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Building, street, locality"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>City</label>
                <input
                  maxLength={100}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>State</label>
                <input
                  maxLength={100}
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className={fieldClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>PIN Code</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pinCode}
                  onChange={(event) =>
                    setPinCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6-digit PIN code"
                  className={fieldClass}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Opening Balance & Credit
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Opening Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(event.target.value)}
                  className={fieldClass}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {type === "Customer"
                    ? "Opening amount the customer owes your business."
                    : "Opening amount your business owes the supplier."}
                </p>
              </div>

              {type === "Customer" && (
                <div>
                  <label className={labelClass}>Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={creditLimit}
                    onChange={(event) => setCreditLimit(event.target.value)}
                    className={fieldClass}
                    disabled={saving}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Set to 0 if no credit limit is configured.
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>Payment Terms (Days)</label>
                <input
                  type="number"
                  min="0"
                  max="3650"
                  step="1"
                  value={paymentTerms}
                  onChange={(event) => setPaymentTerms(event.target.value)}
                  placeholder="e.g. 30"
                  className={fieldClass}
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional number of days allowed for payment.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Additional Notes
            </h2>

            <textarea
              maxLength={1000}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional information about this account"
              className={fieldClass}
              disabled={saving}
            />
            <div className="mt-1 text-right text-xs text-gray-400">
              {notes.length}/1000
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={() => router.push("/customers")}
              disabled={saving}
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : `Save ${type}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
