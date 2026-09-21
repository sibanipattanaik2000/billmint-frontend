'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  Receipt,
  FileText,
  ArrowDownUp,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { href: '/sales', label: 'Invoices' },
      { href: '/sales/new', label: 'New Sale' },
      { href: '/sales/quotations', label: 'Quotations' },
      { href: '/sales/returns', label: 'Returns' },
    ],
  },
  {
    label: 'Purchases',
    icon: Truck,
    children: [
      { href: '/purchases', label: 'Bills' },
      { href: '/purchases/new', label: 'New Purchase' },
    ],
  },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Users },
  {
    label: 'Items',
    icon: Package,
    children: [
      { href: '/items', label: 'All Items' },
      { href: '/items/stock', label: 'Stock Summary' },
    ],
  },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/cash-bank', label: 'Cash & Bank', icon: ArrowDownUp },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/import-export', label: 'Import / Export', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.push('/login');
    }
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
          <Receipt className="w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-white tracking-tight">BillMint</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {nav.map((item) => {
          if (item.children) {
            const isOpen = open[item.label] ?? item.children.some((c) => pathname.startsWith(c.href));
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpen((s) => ({ ...s, [item.label]: !isOpen }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'block px-3 py-1.5 rounded-md text-sm transition-colors',
                          pathname === child.href
                            ? 'bg-brand-600/20 text-brand-300'
                            : 'hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
