'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { Search, Bell, Plus } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.data))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-6 sticky top-0 z-10">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 bg-slate-50 border-slate-200"
              placeholder="Search customers, items, invoices... (Ctrl+K)"
              readOnly
            />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sales/new" className="btn-primary text-sm py-1.5">
              <Plus className="w-4 h-4" />
              New Sale
            </Link>
            <button className="btn-ghost p-2 relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                {user.user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-sm">
                <div className="font-medium text-slate-900 leading-tight">{user.user?.name}</div>
                <div className="text-xs text-slate-500">{user.business?.name}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
