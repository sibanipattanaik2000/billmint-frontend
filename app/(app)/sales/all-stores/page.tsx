"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface StoreSummary {
  storeCode: string;
  storeName: string;
  invoiceCount: number;
  totalSales: number | string;
  totalReceived: number | string;
  totalOutstanding: number | string;
}

interface SalesSummary {
  invoiceCount: number;
  totalSales: number | string;
  totalReceived: number | string;
  totalOutstanding: number | string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const EMPTY_SUMMARY: SalesSummary = {
  invoiceCount: 0,
  totalSales: 0,
  totalReceived: 0,
  totalOutstanding: 0,
};

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number | string): string {
  return `₹${toAmount(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AllStoreSalesPage() {
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [summary, setSummary] = useState<SalesSummary>(EMPTY_SUMMARY);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [storeCodeInput, setStoreCodeInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const [storeCode, setStoreCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSales = useCallback(
    async (showRefresh = false) => {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await api.allStoreSales({
          page,
          limit: 20,
          storeCode: storeCode || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        });

        setStores(Array.isArray(response.data) ? response.data : []);
        setSummary(response.summary ?? EMPTY_SUMMARY);

        setPagination(
          response.pagination ?? {
            page,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (err) {
        setStores([]);
        setSummary(EMPTY_SUMMARY);
        setPagination({
          page,
          limit: 20,
          total: 0,
          totalPages: 0,
        });

        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load all-store sales. Please try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, storeCode, fromDate, toDate],
  );

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fromInput && toInput && fromInput > toInput) {
      setError("The start date cannot be later than the end date.");
      return;
    }

    setPage(1);
    setStoreCode(storeCodeInput.trim().toUpperCase());
    setFromDate(fromInput);
    setToDate(toInput);
  }

  function clearFilters() {
    setStoreCodeInput("");
    setFromInput("");
    setToInput("");
    setStoreCode("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setError("");
  }

  const firstRecord =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const lastRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Store className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              All-Store Sales
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View aggregated sales performance across stores without
              exposing individual invoices or customer records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSales(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Search className="h-4 w-4 text-slate-500" />
          Filter sales
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label
              htmlFor="storeCode"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Store Code
            </label>
            <input
              id="storeCode"
              value={storeCodeInput}
              onChange={(event) => setStoreCodeInput(event.target.value)}
              placeholder="Enter store code"
              maxLength={40}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label
              htmlFor="fromDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              From Date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="fromDate"
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="toDate"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              To Date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="toDate"
                type="date"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Search className="h-4 w-4" />
              Apply
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSales(true)}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Invoices"
          value={summary.invoiceCount.toLocaleString("en-IN")}
          subtitle="Across matching stores"
          icon={<ReceiptText className="h-5 w-5" />}
          iconClass="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          title="Total Sales"
          value={formatCurrency(summary.totalSales)}
          subtitle="Combined invoice value"
          icon={<TrendingUp className="h-5 w-5" />}
          iconClass="bg-violet-50 text-violet-700"
        />

        <SummaryCard
          title="Total Received"
          value={formatCurrency(summary.totalReceived)}
          subtitle="Payments recorded"
          icon={<Wallet className="h-5 w-5" />}
          iconClass="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          subtitle="Remaining balance"
          icon={<ReceiptText className="h-5 w-5" />}
          iconClass="bg-amber-50 text-amber-700"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Store-wise sales summary
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Each row contains totals for one store. Individual invoices
              and customer details are not shown.
            </p>
          </div>

          <span className="text-sm text-slate-500">
            {pagination.total.toLocaleString("en-IN")} stores
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading store summaries...
            </div>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ReceiptText className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-800">
              No store summaries found
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              No matching stores have recorded sales for the selected
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Store</th>
                    <th className="px-5 py-3 font-semibold">Store Code</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Invoices
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Total Sales
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Received
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Outstanding
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {stores.map((store) => (
                    <tr
                      key={store.storeCode}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {store.storeName || "Unnamed Store"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Aggregated store totals
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                          {store.storeCode || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-slate-800">
                        {store.invoiceCount.toLocaleString("en-IN")}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                        {formatCurrency(store.totalSales)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-emerald-700">
                        {formatCurrency(store.totalReceived)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                        {formatCurrency(store.totalOutstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {firstRecord}–{lastRecord}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {pagination.total}
                </span>{" "}
                stores
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="min-w-20 text-center text-sm text-slate-600">
                  Page {pagination.page} of{" "}
                  {Math.max(1, pagination.totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        Math.max(1, pagination.totalPages),
                        current + 1,
                      ),
                    )
                  }
                  disabled={
                    loading ||
                    pagination.totalPages === 0 ||
                    page >= pagination.totalPages
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
