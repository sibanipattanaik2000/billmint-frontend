"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
} from "lucide-react";

type CompanyForm = {
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  gstin: string;
  pan: string;
};

const initialForm: CompanyForm = {
  businessName: "",
  businessType: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  country: "India",
  gstin: "",
  pan: "",
};

const inputClass =
  "input w-full";

const labelClass =
  "label block mb-1";

export default function NewCompanyPage() {
  const router = useRouter();

  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [copied, setCopied] = useState(false);

  function updateField(field: keyof CompanyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!form.businessName.trim()) {
      setError("Please enter the company name.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.createBusiness({
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pinCode: form.pinCode.trim() || undefined,
        country: form.country.trim() || "India",
        gstin: form.gstin.trim() || undefined,
        pan: form.pan.trim() || undefined,
      });

      if (!response.success || !response.data?.business) {
        throw new Error("The company could not be created.");
      }

      setCompanyName(response.data.business.name);
      setStoreCode(response.data.business.storeCode);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Unable to create the company. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyStoreCode() {
    if (!storeCode) return;

    try {
      await navigator.clipboard.writeText(storeCode);
      setCopied(true);
    } catch {
      setError("Unable to copy the Store Code. Please copy it manually.");
    }
  }

  function continueToDashboard() {
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Add Another Company
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create another business under your existing BillMint account.
          </p>
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        {storeCode ? (
          <div className="max-w-lg mx-auto text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Company created successfully!
            </h2>

            <p className="text-sm text-slate-500 mb-6">
              <strong>{companyName}</strong> has been added to your existing
              account. It is now your active company.
            </p>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 mb-6">
              <p className="text-sm text-slate-600 mb-2">
                New Company Store Code
              </p>

              <p className="text-2xl font-bold tracking-widest text-brand-700 break-all">
                {storeCode}
              </p>

              <button
                type="button"
                onClick={copyStoreCode}
                className="btn-primary mt-4 inline-flex items-center justify-center gap-2 px-5 py-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied" : "Copy Store Code"}
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Save this Store Code. You may need it when logging in directly
              to this company.
            </p>

            <button
              type="button"
              onClick={continueToDashboard}
              className="btn-primary w-full py-3"
            >
              Continue to New Company
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Company Information
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the details of the business you want to add.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Basic Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={inputClass}
                      value={form.businessName}
                      onChange={(e) =>
                        updateField("businessName", e.target.value)
                      }
                      placeholder="Enter company name"
                      required
                      maxLength={150}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Business Type</label>
                    <input
                      className={inputClass}
                      value={form.businessType}
                      onChange={(e) =>
                        updateField("businessType", e.target.value)
                      }
                      placeholder="e.g. Retail, Wholesale"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      className={inputClass}
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Email Address</label>
                    <input
                      className={inputClass}
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="company@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Address Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Address</label>
                    <input
                      className={inputClass}
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Street, building, area"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      className={inputClass}
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      className={inputClass}
                      value={form.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PIN Code</label>
                    <input
                      className={inputClass}
                      value={form.pinCode}
                      onChange={(e) => updateField("pinCode", e.target.value)}
                      placeholder="PIN Code"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Country</label>
                    <input
                      className={inputClass}
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Tax Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input
                      className={inputClass}
                      value={form.gstin}
                      onChange={(e) =>
                        updateField("gstin", e.target.value.toUpperCase())
                      }
                      placeholder="GST Identification Number"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PAN</label>
                    <input
                      className={inputClass}
                      value={form.pan}
                      onChange={(e) =>
                        updateField("pan", e.target.value.toUpperCase())
                      }
                      placeholder="PAN Number"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium text-center hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-6 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Company...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      Create Company
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}