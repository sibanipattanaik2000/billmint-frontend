'use client';

import { useEffect, useState } from 'react';
import { api, formatINR } from '@/lib/api';
import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
        {error}
      </div>
    );
  }

  const c = data?.cards || {};

  const cards = [
    { label: "Today's Sale", value: c.todaySale, sub: `${c.todaySaleCount || 0} invoices`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: "Today's Purchase", value: c.todayPurchase, sub: `${c.todayPurchaseCount || 0} bills`, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
    { label: 'Receivables', value: c.receivables, sub: 'Outstanding', icon: ArrowUpRight, color: 'text-amber-600 bg-amber-50' },
    { label: 'Payables', value: c.payables, sub: 'To pay', icon: ArrowDownRight, color: 'text-rose-600 bg-rose-50' },
    { label: 'Cash Balance', value: c.cashBalance, sub: 'In hand', icon: Wallet, color: 'text-violet-600 bg-violet-50' },
    { label: 'Bank Balance', value: c.bankBalance, sub: 'Accounts', icon: Wallet, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Stock Value', value: c.stockValue, sub: 'At cost', icon: Package, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Month Profit', value: c.monthProfit, sub: 'Approx.', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Business overview for today</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatINR(card.value)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Sales</h2>
            <Link href="/sales" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.recentSales || []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No sales yet</p>
            ) : (
              data.recentSales.map((s: any) => (
                <Link key={s.id} href={`/sales/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{s.customer?.name || 'Walk-in'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatINR(s.grandTotal)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      s.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                      s.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{s.status}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock
            </h2>
            <Link href="/items/stock" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.lowStock || []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">All stock levels healthy</p>
            ) : (
              data.lowStock.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Min: {Number(item.minimumStock)}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-600">
                    {Number(item.currentStock)} {item.unit?.shortName || ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outstanding */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Outstanding Payments</h2>
            <Link href="/reports/parties" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.outstandingPayments || []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No outstanding amounts</p>
            ) : (
              data.outstandingPayments.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{s.customer?.name}</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-600">{formatINR(s.balanceAmount)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Customers
            </h2>
            <Link href="/customers" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(data?.topCustomers || []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No customers yet</p>
            ) : (
              data.topCustomers.map((c: any) => (
                <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm font-semibold">{formatINR(c.currentBalance)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
