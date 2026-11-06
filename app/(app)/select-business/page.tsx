"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Building2, Loader2, LogOut } from "lucide-react";

type Business = {
  membershipId: string;
  businessId: string;
  name: string;
  storeCode: string;
  city: string | null;
  state: string | null;
  gstin: string | null;
  setupCompleted: boolean;
  role: string;
  isOwner: boolean;
  isActive: boolean;
};

export default function SelectBusinessPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBusinesses() {
      try {
        const response = await api.myBusinesses();

        if (!active) return;

        const list = response.data ?? [];

        setBusinesses(list);

        if (list.length === 0) {
          router.replace("/login");
        } else if (list.length === 1) {
          router.replace("/dashboard");
        }
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your businesses.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBusinesses();

    return () => {
      active = false;
    };
  }, [router]);

  async function selectBusiness(businessId: string) {
    setError("");
    setSwitching(businessId);

    try {
      await api.switchBusiness(businessId);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to switch business.",
      );
      setSwitching("");
    }
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Select a business
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Choose which business you want to work in.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {businesses.map((business) => (
            <button
              key={business.businessId}
              type="button"
              disabled={Boolean(switching)}
              onClick={() => selectBusiness(business.businessId)}
              className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-400 hover:shadow-md transition disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>

                {switching === business.businessId && (
                  <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                )}
              </div>

              <h2 className="font-semibold text-slate-900 mt-4 break-words">
                {business.name}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {[business.city, business.state]
                  .filter(Boolean)
                  .join(", ") || "Business location not set"}
              </p>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {business.role}
                </span>

                <span className="text-sm font-medium text-brand-700">
                  {switching === business.businessId
                    ? "Opening..."
                    : "Continue"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}