
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Receipt, Copy, CheckCircle2 } from 'lucide-react';

type RegisterForm = {
  businessName: string;
  ownerName: string;
  password: string;
  confirmPassword: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pinCode: string;
  gstin: string;
};

type RegisterResponse = {
  success?: boolean;
  data?: {
    token?: string;
    user?: unknown;
    business?: {
      id?: string;
      name?: string;
      storeCode?: string;
    };
  };
  token?: string;
  user?: unknown;
  business?: {
    id?: string;
    name?: string;
    storeCode?: string;
  };
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterForm>({
    businessName: '',
    ownerName: '',
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

  function update(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    setFieldErrors((current) => {
      const updated = { ...current };
      delete updated[field];
      return updated;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFieldErrors({ email: 'Email address is required.' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const response = await api.register({
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        email: normalizedEmail,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
        gstin: form.gstin.trim().toUpperCase(),
      }) as RegisterResponse;

      const result = response?.data ?? response;
      const generatedCode = result?.business?.storeCode ?? '';

      if (generatedCode) {
        setStoreCode(generatedCode);
        return;
      }

      // Registration sets the authentication cookie on success.
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);

        if (err.errors?.length) {
          const errors: Record<string, string> = {};

          err.errors.forEach((item) => {
            errors[item.field] = item.message;
          });

          setFieldErrors(errors);
        }
      } else {
        setError('Unable to connect to the BillMint server.');
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
    key: keyof RegisterForm;
    label: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
  }[] = [
    {
      key: 'businessName',
      label: 'Business Name',
      required: true,
    },
    {
      key: 'ownerName',
      label: 'Owner Name',
      required: true,
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      autoComplete: 'email',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      autoComplete: 'new-password',
    },
    {
      key: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      required: true,
      autoComplete: 'new-password',
    },
    {
      key: 'phone',
      label: 'Phone Number',
      type: 'tel',
      autoComplete: 'tel',
    },
    {
      key: 'city',
      label: 'City',
    },
    {
      key: 'state',
      label: 'State',
    },
    {
      key: 'pinCode',
      label: 'PIN Code',
    },
    {
      key: 'gstin',
      label: 'GSTIN (optional)',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">BillMint</span>
        </div>

        <div className="card p-4 sm:p-6">
          {storeCode ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />

              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Business registered successfully!
              </h1>

              <p className="text-sm text-slate-500 mb-5">
                Your account is registered. You can log in using your email
                address and password. This Store Code is only an internal
                business reference.
              </p>

              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 mb-5">
                <p className="text-xs text-slate-500 mb-2">
                  Internal Store Reference
                </p>

                <p className="text-2xl font-bold tracking-widest text-brand-700 break-all">
                  {storeCode}
                </p>

                <button
                  type="button"
                  onClick={copyStoreCode}
                  className="btn-primary mt-3 inline-flex items-center justify-center gap-2 px-4 py-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy Reference'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.replace('/dashboard')}
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
                Create your owner account using your email address and password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
                  >
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className={
                        field.key === 'businessName' ||
                        field.key === 'email' ||
                        field.key === 'gstin'
                          ? 'sm:col-span-2 min-w-0'
                          : 'min-w-0'
                      }
                    >
                      <label className="label" htmlFor={field.key}>
                        {field.label}
                        {field.required && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>

                      <input
                        id={field.key}
                        name={field.key}
                        className="input w-full min-w-0"
                        type={field.type || 'text'}
                        value={form[field.key]}
                        onChange={(e) =>
                          update(field.key, e.target.value)
                        }
                        required={field.required}
                        autoComplete={field.autoComplete || 'off'}
                        maxLength={
                          field.key === 'businessName'
                            ? 200
                            : field.key === 'ownerName'
                              ? 100
                              : field.key === 'email'
                                ? 254
                                : undefined
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
                  className="btn-primary w-full py-2.5 disabled:opacity-60"
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
