"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Receipt } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.login(
        email,
        password,
        rememberMe,
      );

      const businesses = response.data?.businesses ?? [];

      if (businesses.length > 1) {
        router.replace("/select-business");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to connect to BillMint server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-700 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            BillMint
          </span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Billing &
            <br />
            Business Management
          </h1>

          <p className="text-brand-100 text-lg max-w-md">
            GST invoices, inventory, payments, and reports —
            everything your Indian business needs in one place.
          </p>
        </div>

        <p className="text-brand-200 text-sm">
          Built for retail, wholesale & traders
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>

            <span className="text-xl font-bold text-slate-900">
              BillMint
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back
          </h2>

          <p className="text-slate-500 mb-8">
            Sign in using your registered email address.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
              >
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>

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

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />

                Remember me
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-brand-600 font-medium hover:text-brand-700"
            >
              Register your business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}