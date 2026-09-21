'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatINR } from '@/lib/api';
import { Plus, Search } from 'lucide-react';

export default function CustomersPage() {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  function load(page = 1, q = search) {
    setLoading(true);
    api
      .customers({ page, limit: 20, search: q })
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} total</p>
        </div>
        <Link href="/customers/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Customer
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, phone, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1, search)}
          />
        </div>
        <button className="btn-secondary" onClick={() => load(1, search)}>Search</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>GSTIN</th>
              <th className="text-right">Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No customers found</td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-slate-900">{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.city || '—'}</td>
                  <td className="font-mono text-xs">{c.gstin || '—'}</td>
                  <td className="text-right font-medium">{formatINR(c.currentBalance)}</td>
                  <td>
                    <Link href={`/customers/${c.id}`} className="text-brand-600 text-sm hover:underline">View</Link>
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
