 'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Receipt, Copy, CheckCircle2 } from 'lucide-react';

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
  const [storeCode, setStoreCode] = useState('');
  const [copied, setCopied] = useState(false);

  function update(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const result = await api.register(form) as {
        storeCode?: string;
        business?: { storeCode?: string };
        data?: { storeCode?: string; business?: { storeCode?: string } };
      };

      const generatedCode =
        result?.storeCode ??
        result?.business?.storeCode ??
        result?.data?.storeCode ??
        result?.data?.business?.storeCode ??
        '';

      if (generatedCode) {
        setStoreCode(generatedCode);
      } else {
        // Registration may succeed even if the API does not return the code.
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);

        if (err.errors) {
          const errors: Record<string, string> = {};
          err.errors.forEach((item) => {
            errors[item.field] = item.message;
          });
          setFieldErrors(errors);
        }
      } else {
        setError('Unable to connect to server.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyStoreCode() {
    if (!storeCode) return;

    try {
      await navigator.clipboard.writeText(storeCode);
      setCopied(true);
    } catch {
      setError('Unable to copy the Store Code. Please copy it manually.');
    }
  }

  const fields: {
    key: keyof typeof form;
    label: string;
    type?: string;
    required?: boolean;
  }[] = [
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
          {storeCode ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Business registered successfully!
              </h1>
              <p className="text-sm text-slate-500 mb-5">
                Save this Store Code. You will need it whenever you log in to this store.
              </p>

              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 mb-5">
                <p className="text-xs text-slate-500 mb-2">Your Store Code</p>
                <p className="text-2xl font-bold tracking-widest text-brand-700 break-all">
                  {storeCode}
                </p>
                <button
                  type="button"
                  onClick={copyStoreCode}
                  className="btn-primary mt-3 inline-flex items-center justify-center gap-2 px-4 py-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy Store Code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-primary w-full py-2.5"
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                Register your business
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                Create an owner account and start managing your business.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className={
                        field.key === 'businessName' || field.key === 'gstin'
                          ? 'sm:col-span-2'
                          : ''
                      }
                    >
                      <label className="label">
                        {field.label}
                        {field.required && <span className="text-red-500"> *</span>}
                      </label>

                      <input
                        className="input"
                        type={field.type || 'text'}
                        value={form[field.key]}
                        onChange={(e) => update(field.key, e.target.value)}
                        required={field.required}
                        autoComplete={
                          field.key === 'password'
                            ? 'new-password'
                            : field.key === 'confirmPassword'
                              ? 'new-password'
                              : field.key === 'email'
                                ? 'email'
                                : 'off'
                        }
                      />

                      {fieldErrors[field.key] && (
                        <p className="text-xs text-red-600 mt-1">
                          {fieldErrors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-2.5"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-brand-600 font-medium hover:text-brand-700"
                >
                  Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}