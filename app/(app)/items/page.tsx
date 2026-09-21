'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatINR } from '@/lib/api';
import { Plus, Search } from 'lucide-react';

export default function ItemsPage() {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  function load(page = 1, q = search) {
    setLoading(true);
    api
      .items({ page, limit: 20, search: q })
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
          <h1 className="text-xl font-bold text-slate-900">Items</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} total</p>
        </div>
        <Link href="/items/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Item
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, SKU, barcode..."
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
              <th>SKU</th>
              <th>Category</th>
              <th className="text-right">Sale Price</th>
              <th className="text-right">Stock</th>
              <th>GST %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">No items found</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-900">{item.name}</td>
                  <td className="font-mono text-xs">{item.sku || '—'}</td>
                  <td>{item.category?.name || '—'}</td>
                  <td className="text-right">{formatINR(item.salePrice)}</td>
                  <td className="text-right">
                    <span className={Number(item.currentStock) <= Number(item.minimumStock) && Number(item.minimumStock) > 0 ? 'text-amber-600 font-medium' : ''}>
                      {Number(item.currentStock)} {item.unit?.shortName || ''}
                    </span>
                  </td>
                  <td>{Number(item.gstRate)}%</td>
                  <td>
                    <Link href={`/items/${item.id}`} className="text-brand-600 text-sm hover:underline">View</Link>
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
