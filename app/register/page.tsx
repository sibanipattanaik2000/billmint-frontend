'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Receipt } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    userId: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    pinCode: '',
    gstin: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await api.register(form);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          const fe: Record<string, string> = {};
          err.errors.forEach((e) => { fe[e.field] = e.message; });
          setFieldErrors(fe);
        }
      } else {
        setError('Unable to connect to server');
      }
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; type?: string; required?: boolean }[] = [
    { key: 'businessName', label: 'Business Name', required: true },
    { key: 'ownerName', label: 'Owner Name', required: true },
    { key: 'userId', label: 'User ID (for login)', required: true },
    { key: 'password', label: 'Password', type: 'password', required: true },
    { key: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pinCode', label: 'PIN Code' },
    { key: 'gstin', label: 'GSTIN (optional)' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">BillMint</span>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Register your business</h1>
          <p className="text-sm text-slate-500 mb-6">Create an owner account and start managing your business</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className={f.key === 'businessName' || f.key === 'gstin' ? 'sm:col-span-2' : ''}>
                  <label className="label">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    className="input"
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    required={f.required}
                  />
                  {fieldErrors[f.key] && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
