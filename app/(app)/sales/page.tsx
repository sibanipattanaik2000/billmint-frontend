'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatINR } from '@/lib/api';
import { Plus, Search } from 'lucide-react';

export default function SalesPage() {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .sales({ page: 1, limit: 20 })
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Invoices</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} total</p>
        </div>
        <Link href="/sales/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Sale
        </Link>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">No invoices yet. Create your first sale.</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium font-mono text-sm">{s.invoiceNumber}</td>
                  <td>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                  <td>{s.customer?.name || 'Walk-in'}</td>
                  <td className="text-right font-medium">{formatINR(s.grandTotal)}</td>
                  <td className="text-right">{formatINR(s.paidAmount)}</td>
                  <td className="text-right">{formatINR(s.balanceAmount)}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                      s.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700' :
                      s.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{s.status}</span>
                  </td>
                  <td>
                    <Link href={`/sales/${s.id}`} className="text-brand-600 text-sm hover:underline">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
