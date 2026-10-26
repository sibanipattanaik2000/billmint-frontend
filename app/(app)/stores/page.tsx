
"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Building2, MapPin, Phone, Mail, RefreshCw, Search } from "lucide-react";

type Store = {
  storeCode: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStores() {
    setLoading(true);
    setError("");

    try {
      const response = await api.stores();
      setStores(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load the Store Directory.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStores();
  }, []);

  const query = search.trim().toLowerCase();
  const filteredStores = stores.filter((store) =>
    [
      store.storeCode,
      store.name,
      store.city,
      store.state,
      store.phone,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse public store profiles. Private business records remain separate.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadStores()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by store code, name, city or phone"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading stores…
        </div>
      ) : !error && filteredStores.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No stores found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStores.map((store) => (
            <article
              key={store.storeCode}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-slate-900">
                    {store.name}
                  </h2>
                  <p className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                    {store.storeCode}
                  </p>
                </div>
              </div>

              {(store.address || store.city || store.state || store.pinCode) && (
                <p className="mt-4 flex gap-2 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {[store.address, store.city, store.state, store.pinCode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </p>
              )}

              {store.phone && (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  <a href={`tel:${store.phone}`} className="hover:text-blue-700">
                    {store.phone}
                  </a>
                </p>
              )}

              {store.email && (
                <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <a href={`mailto:${store.email}`} className="hover:text-blue-700">
                    {store.email}
                  </a>
                </p>
              )}

              {store.gstin && (
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  GSTIN: <span className="font-medium text-slate-700">{store.gstin}</span>
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
