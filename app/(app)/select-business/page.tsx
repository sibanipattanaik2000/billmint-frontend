"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  LogOut,
  RefreshCw,
  Store,
} from "lucide-react";

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
  const [switchingId, setSwitchingId] = useState("");
  const [error, setError] = useState("");

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.myBusinesses();
      const records = response.data ?? [];

      if (records.length === 0) {
        setError("No active business access was found for this account.");
        return;
      }

      if (records.length === 1) {
        router.replace("/dashboard");
        return;
      }

      setBusinesses(records);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load your businesses. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  async function handleSelect(business: Business) {
    if (switchingId) return;

    setError("");
    setSwitchingId(business.businessId);

    try {
      await api.switchBusiness(business.businessId);

      router.replace(
        business.setupCompleted ? "/dashboard" : "/settings",
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to switch business. Please try again.",
      );
      setSwitchingId("");
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading your businesses...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              BillMint
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Building2 className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Select your business
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Your account has access to multiple businesses. Select which
              business you want to work with.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
              <button
                type="button"
                onClick={() => void loadBusinesses()}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="space-y-3">
            {businesses.map((business) => {
              const isSwitching =
                switchingId === business.businessId;

              return (
                <button
                  key={business.businessId}
                  type="button"
                  disabled={Boolean(switchingId)}
                  onClick={() => void handleSelect(business)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                    business.isActive
                      ? "border-brand-300 bg-brand-50/60"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-semibold text-slate-900">
                        {business.name}
                      </span>

                      {business.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {business.storeCode}
                      {" · "}
                      {business.city || "Location not set"}
                      {business.state ? `, ${business.state}` : ""}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {business.role}
                      {business.isOwner ? " · Owner" : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isSwitching ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            Your selected business determines the active inventory,
            transactions, reports and permissions.
          </p>
        </section>
      </div>
    </main>
  );
}