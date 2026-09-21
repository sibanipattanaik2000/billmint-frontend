'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Receipt } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(userId, password, rememberMe);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to connect to server');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-700 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">BillMint</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Billing &<br />Business Management
          </h1>
          <p className="text-brand-100 text-lg max-w-md">
            GST invoices, inventory, payments, and reports — everything your Indian business needs in one place.
          </p>
        </div>
        <p className="text-brand-200 text-sm">Built for retail, wholesale & traders</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">BillMint</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in with your User ID and password</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="userId">User ID</label>
              <input
                id="userId"
                className="input"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID"
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
              Register your business
            </Link>
          </p>

          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <strong>Demo:</strong> User ID <code className="font-mono">admin</code> · Password{' '}
            <code className="font-mono">Admin@12345</code>
          </div>
        </div>
      </div>
    </div>
  );
}
