
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, formatINR } from "@/lib/api";

type PurchaseItem = {
  id: string;
  itemId?: string | null;
  itemName: string;
  hsnSac?: string | null;
  quantity: number | string;
  unit?: string | null;
  rate: number | string;
  discountPercent?: number | string;
  discountAmount?: number | string;
  taxableAmount: number | string;
  gstRate?: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  amount: number | string;
};

type PurchasePaymentAllocation = {
  id: string;
  amount: number | string;
  paymentOut?: {
    id: string;
    amount: number | string;
    date: string;
    paymentMethod: string;
    reference?: string | null;
    notes?: string | null;
  } | null;
};

type Purchase = {
  id: string;
  billNumber: string;
  date: string;
  dueDate?: string | null;
  status: string;
  placeOfSupply?: string | null;
  isInterState?: boolean;
  subtotal: number | string;
  discountAmount: number | string;
  taxableAmount: number | string;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  cessAmount?: number | string;
  roundOff?: number | string;
  grandTotal: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  paymentMethod?: string | null;
  notes?: string | null;
  supplier?: {
    id: string;
    name?: string | null;
    businessName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    gstin?: string | null;
  } | null;
  items: PurchaseItem[];
  payments?: PurchasePaymentAllocation[];
};

const amount = (value: unknown) => Number(value ?? 0) || 0;

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) =>
    c.toUpperCase(),
  );
}

function statusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700";
    case "PARTIALLY_PAID":
      return "bg-amber-50 text-amber-700";
    case "DRAFT":
      return "bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600";
    case "OVERDUE":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-red-50 text-red-700";
  }
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const purchaseId = params?.id;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPurchase = useCallback(async () => {
    if (!purchaseId) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.purchase(purchaseId);
      setPurchase(response.data as Purchase);
    } catch (err) {
      setPurchase(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this purchase invoice.",
      );
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void loadPurchase();
  }, [loadPurchase]);

  if (loading) {
    return (
      <main className="flex-1 bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-32 rounded-xl bg-white" />
          <div className="h-64 rounded-xl bg-white" />
        </div>
      </main>
    );
  }

  if (error || !purchase) {
    return (
      <main className="flex-1 bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-slate-900">
            Unable to open purchase invoice
          </h1>
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error || "Purchase invoice not found."}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void loadPurchase()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry
            </button>
            <Link
              href="/purchases"
              className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to purchases
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const supplierName =
    purchase.supplier?.businessName ||
    purchase.supplier?.name ||
    "Supplier not specified";

  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const allocations = Array.isArray(purchase.payments)
    ? purchase.payments
    : [];

  return (
    <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/purchases"
              className="text-sm font-medium text-blue-600 hover:underline print:hidden"
            >
              ← Back to purchases
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Purchase Invoice
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Invoice details, items, taxes and payment information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Print invoice
            </button>
            <button
              type="button"
              onClick={() => void loadPurchase()}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row">
            <div>
              <p className="text-sm text-slate-500">Bill number</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {purchase.billNumber}
              </h2>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                  purchase.status,
                )}`}
              >
                {statusLabel(purchase.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:min-w-64">
              <Detail label="Purchase date" value={formatDate(purchase.date)} />
              <Detail label="Due date" value={formatDate(purchase.dueDate)} />
              <Detail
                label="Payment method"
                value={purchase.paymentMethod || "—"}
              />
              <Detail
                label="Place of supply"
                value={purchase.placeOfSupply || "—"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-5 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier
              </h3>
              <p className="font-semibold text-slate-900">{supplierName}</p>
              {purchase.supplier?.phone && (
                <p className="mt-1 text-sm text-slate-600">
                  Phone: {purchase.supplier.phone}
                </p>
              )}
              {purchase.supplier?.email && (
                <p className="mt-1 text-sm text-slate-600">
                  Email: {purchase.supplier.email}
                </p>
              )}
              {purchase.supplier?.address && (
                <p className="mt-1 text-sm text-slate-600">
                  {purchase.supplier.address}
                </p>
              )}
              {[purchase.supplier?.city, purchase.supplier?.state]
                .filter(Boolean)
                .length > 0 && (
                <p className="mt-1 text-sm text-slate-600">
                  {[purchase.supplier?.city, purchase.supplier?.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {purchase.supplier?.gstin && (
                <p className="mt-2 text-sm text-slate-600">
                  GSTIN: {purchase.supplier.gstin}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Invoice total</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatINR(purchase.grandTotal)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Paid amount</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">
                  {formatINR(purchase.paidAmount)}
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-rose-50 p-4">
                <p className="text-xs text-rose-700">Outstanding balance</p>
                <p className="mt-2 text-xl font-bold text-rose-800">
                  {formatINR(purchase.balanceAmount)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Purchased items</h2>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} line item{items.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">HSN/SAC</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.hsnSac || "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {amount(item.quantity).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.unit || "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatINR(item.rate)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatINR(item.discountAmount)}
                      <div className="text-xs text-slate-400">
                        {amount(item.discountPercent)}%
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {amount(item.gstRate)}%
                      <div className="text-xs text-slate-400">
                        {formatINR(
                          amount(item.cgstAmount) +
                            amount(item.sgstAmount) +
                            amount(item.igstAmount),
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No items were returned for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
              {purchase.notes || "No notes were added to this purchase."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">
              Invoice summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatINR(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Discount</span>
                <span>{formatINR(purchase.discountAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Taxable amount</span>
                <span>{formatINR(purchase.taxableAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">CGST</span>
                <span>{formatINR(purchase.cgstAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">SGST</span>
                <span>{formatINR(purchase.sgstAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">IGST</span>
                <span>{formatINR(purchase.igstAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Cess</span>
                <span>{formatINR(purchase.cessAmount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Round off</span>
                <span>{formatINR(purchase.roundOff)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold">
                <span>Total</span>
                <span>{formatINR(purchase.grandTotal)}</span>
              </div>
            </div>
          </div>
        </section>

        {allocations.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Payment allocations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Payments linked to this purchase by the backend.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Payment date</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3 text-right">Allocated amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((allocation) => (
                    <tr key={allocation.id} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        {formatDate(allocation.paymentOut?.date)}
                      </td>
                      <td className="px-5 py-3">
                        {allocation.paymentOut?.paymentMethod || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {allocation.paymentOut?.reference || "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatINR(allocation.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="flex justify-end print:hidden">
          <Link
            href="/purchases"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to purchase invoices
          </Link>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          main {
            overflow: visible !important;
            background: #fff !important;
            padding: 0 !important;
          }
          section {
            break-inside: avoid;
            box-shadow: none !important;
          }
          a {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>
    </main>
  );
}
