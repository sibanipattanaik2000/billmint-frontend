"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatINR } from "@/lib/api";

interface PurchaseInvoice {
  id: string;
  billNumber: string;
  date: string;
  status: string;
  grandTotal: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  paymentMethod?: string | null;
  supplier?: {
    id: string;
    name?: string | null;
    businessName?: string | null;
    phone?: string | null;
  } | null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function displayStatus(status: string) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PARTIALLY_PAID":
      return "Partial";
    case "UNPAID":
      return "Unpaid";
    case "DRAFT":
      return "Draft";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function PurchasesPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.purchases({
        page,
        limit: 100,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        from: fromDate
          ? new Date(`${fromDate}T00:00:00`).toISOString()
          : undefined,
        to: toDate
          ? new Date(`${toDate}T23:59:59.999`).toISOString()
          : undefined,
      });

      setPurchases(response.data ?? []);
      setTotalPages(Math.max(1, response.pagination?.totalPages ?? 1));
      setTotalRecords(response.pagination?.total ?? 0);
    } catch (err) {
      setPurchases([]);
      setTotalPages(1);
      setTotalRecords(0);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase invoices.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, fromDate, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPurchases();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadPurchases]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, fromDate, toDate]);

  const totalPurchase = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.grandTotal || 0),
    0,
  );

  const totalPaid = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.paidAmount || 0),
    0,
  );

  const totalBalance = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.balanceAmount || 0),
    0,
  );

  const getSupplierName = (purchase: PurchaseInvoice) =>
    purchase.supplier?.businessName ||
    purchase.supplier?.name ||
    "Walk-in supplier";

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Bill Number",
      "Supplier",
      "Payment Method",
      "Total Amount",
      "Paid Amount",
      "Balance",
      "Status",
    ];

    const rows = purchases.map((purchase) => [
      formatDate(purchase.date),
      purchase.billNumber,
      getSupplierName(purchase),
      purchase.paymentMethod || "",
      Number(purchase.grandTotal || 0).toFixed(2),
      Number(purchase.paidAmount || 0).toFixed(2),
      Number(purchase.balanceAmount || 0).toFixed(2),
      displayStatus(purchase.status),
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `BillMint_Purchases_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async (purchase: PurchaseInvoice) => {
    const text = [
      `Purchase Bill: ${purchase.billNumber}`,
      `Supplier: ${getSupplierName(purchase)}`,
      `Date: ${formatDate(purchase.date)}`,
      `Total: ${formatINR(purchase.grandTotal)}`,
      `Paid: ${formatINR(purchase.paidAmount)}`,
      `Balance: ${formatINR(purchase.balanceAmount)}`,
      `Status: ${displayStatus(purchase.status)}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Purchase ${purchase.billNumber}`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        window.alert("Purchase details copied to clipboard.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setError("Unable to share the purchase details.");
    }
  };

  const handlePrintSingle = (purchase: PurchaseInvoice) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Allow pop-ups in your browser to print this purchase.");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      });

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Purchase ${escapeHtml(purchase.billNumber)}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 36px; color: #222; }
            h1 { margin-bottom: 4px; }
            .muted { color: #666; }
            .details { margin: 24px 0; line-height: 1.9; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #f5f5f5; }
            .amount { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Purchase Invoice</h1>
          <p class="muted">BillMint</p>
          <div class="details">
            <strong>Bill Number:</strong> ${escapeHtml(purchase.billNumber)}<br />
            <strong>Date:</strong> ${escapeHtml(formatDate(purchase.date))}<br />
            <strong>Supplier:</strong> ${escapeHtml(getSupplierName(purchase))}<br />
            <strong>Payment Method:</strong> ${escapeHtml(purchase.paymentMethod || "—")}<br />
            <strong>Status:</strong> ${escapeHtml(displayStatus(purchase.status))}
          </div>
          <table>
            <thead>
              <tr><th>Description</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Purchase total</td><td class="amount">${escapeHtml(formatINR(purchase.grandTotal))}</td></tr>
              <tr><td>Amount paid</td><td class="amount">${escapeHtml(formatINR(purchase.paidAmount))}</td></tr>
              <tr><td>Outstanding balance</td><td class="amount">${escapeHtml(formatINR(purchase.balanceAmount))}</td></tr>
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Purchase Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage supplier purchases and outstanding balances.
          </p>
        </div>

        <button
          onClick={() => router.push("/purchases/new")}
          className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          + Add Purchase
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 border-b bg-gray-50 px-6 py-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-gray-500">Purchase Total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatINR(totalPurchase)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Paid</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {formatINR(totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Outstanding Balance</p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatINR(totalBalance)}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-b px-6 py-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Search
          </label>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Bill number or supplier..."
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm lg:w-40"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            From
          </label>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            To
          </label>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={exportToCSV}
          disabled={purchases.length === 0}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV
        </button>
      </section>

      <main className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              onClick={() => void loadPurchases()}
              className="shrink-0 font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-medium text-gray-700">Transactions</h2>
          <span className="text-xs text-gray-500">
            {totalRecords} record{totalRecords === 1 ? "" : "s"} found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-3 pr-3">Date</th>
                <th className="py-3 pr-3">Bill Number</th>
                <th className="py-3 pr-3">Supplier</th>
                <th className="py-3 pr-3">Payment Method</th>
                <th className="py-3 pr-3 text-right">Total</th>
                <th className="py-3 pr-3 text-right">Balance</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {purchases.map((purchase) => {
                const status = displayStatus(purchase.status);

                const statusClass =
                  purchase.status === "PAID"
                    ? "bg-green-50 text-green-700"
                    : purchase.status === "PARTIALLY_PAID"
                      ? "bg-orange-50 text-orange-700"
                      : purchase.status === "CANCELLED"
                        ? "bg-gray-100 text-gray-600"
                        : purchase.status === "DRAFT"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700";

                return (
                  <tr
                    key={purchase.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="py-3 pr-3">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        onClick={() => router.push(`/purchases/${purchase.id}`)}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {purchase.billNumber}
                      </button>
                    </td>
                    <td className="py-3 pr-3">
                      {getSupplierName(purchase)}
                    </td>
                    <td className="py-3 pr-3">
                      {purchase.paymentMethod || "—"}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium">
                      {formatINR(purchase.grandTotal)}
                    </td>
                    <td
                      className={`py-3 pr-3 text-right ${
                        Number(purchase.balanceAmount) > 0
                          ? "font-medium text-red-600"
                          : ""
                      }`}
                    >
                      {formatINR(purchase.balanceAmount)}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void handleShare(purchase)}
                          className="text-blue-600 hover:underline"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => handlePrintSingle(purchase)}
                          className="text-gray-600 hover:underline"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <p className="py-12 text-center text-sm text-gray-500">
            Loading purchase invoices...
          </p>
        )}

        {!loading && !error && purchases.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-medium text-gray-700">
              No purchase invoices found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a purchase or change your search filters.
            </p>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {!loading && purchases.length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            Summary totals reflect the records on the current page. Export CSV
            exports the records on the current page.
          </p>
        )}
      </main>
    </div>
  );
}
