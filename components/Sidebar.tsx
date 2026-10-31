"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Store,
  Building2,
  Check,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import clsx from "clsx";

type Business = {
  membershipId: string;
  businessId: string;
  name: string;
  storeCode: string;
  city: string | null;
  state: string | null;
  gstin: string | null;
  setupCompleted: boolean;
  role: string;
  isOwner: boolean;
  isActive: boolean;
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies/new", label: "Add Company", icon: Building2 },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { href: "/sales", label: "Invoices" },
      { href: "/sales/new", label: "New Sale" },
      { href: "/sales/all-stores", label: "All-Store Sales" },
      { href: "/sales/quotations", label: "Quotations" },
      { href: "/sales/returns", label: "Returns" },
      { href: "/payments/in", label: "Payments-In" },
      { href: "/payments/payment-out", label: "Payments-Out" },
      { href: "/delivery-challan", label: "Delivery Challan" },
    ],
  },
  {
    label: "Purchases",
    icon: Truck,
    children: [
      { href: "/purchases", label: "Bills" },
      { href: "/purchases/new", label: "New Purchase" },
    ],
  },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  {
    label: "Items",
    icon: Package,
    children: [
      { href: "/items", label: "All Items" },
      { href: "/items/stock", label: "Stock Summary" },
      { href: "/items/shelves", label: "Shelves" },
      { href: "/stock-transfers", label: "Stock Transfers" },
    ],
  },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/cash-bank", label: "Cash & Bank", icon: ArrowDownUp },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/import-export", label: "Import / Export", icon: FileText },
  { href: "/stores", label: "Store Directory", icon: Store },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [switchingBusinessId, setSwitchingBusinessId] = useState<string | null>(
    null,
  );
  const [businessError, setBusinessError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBusinesses() {
      try {
        setLoadingBusinesses(true);
        setBusinessError("");

        const response = await api.myBusinesses();

        console.log("My businesses API response:", response);

        const businessList = response?.data;

        setBusinesses(Array.isArray(businessList) ? businessList : []);
        if (!cancelled && response.success) {
          setBusinesses(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setBusinessError(
            error instanceof Error ? error.message : "Unable to load companies",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBusinesses(false);
        }
      }
    }

    loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, [pathname]);
  const activeBusiness = Array.isArray(businesses)
    ? businesses.find((business) => business.isActive)
    : undefined;
  async function handleBusinessSwitch(business: Business) {
    if (business.isActive || switchingBusinessId) return;

    try {
      setSwitchingBusinessId(business.businessId);
      setBusinessError("");

      await api.switchBusiness(business.businessId);

      setBusinessMenuOpen(false);

      // Reload the app with the newly issued authentication cookie.
      window.location.reload();
    } catch (error) {
      setBusinessError(
        error instanceof Error ? error.message : "Unable to switch company",
      );
      setSwitchingBusinessId(null);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
          <Receipt className="w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-white tracking-tight">BillMint</span>
      </div>

      {/* COMPANY SWITCHER */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800">
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Active Company
        </p>

        <div className="relative">
          <button
            type="button"
            onClick={() => setBusinessMenuOpen((value) => !value)}
            disabled={loadingBusinesses || businesses.length === 0}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors text-left disabled:opacity-60"
          >
            <div className="w-8 h-8 rounded-md bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              {loadingBusinesses ? (
                <span className="text-xs text-slate-400">
                  Loading companies...
                </span>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white truncate">
                    {activeBusiness?.name || "No company selected"}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {activeBusiness?.storeCode || "Company account"}
                  </p>
                </>
              )}
            </div>

            {loadingBusinesses ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <ChevronDown
                className={clsx(
                  "w-4 h-4 shrink-0 text-slate-400 transition-transform",
                  businessMenuOpen && "rotate-180",
                )}
              />
            )}
          </button>

          {businessMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Your Companies
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5">
                {(Array.isArray(businesses) ? businesses : []).map(
                  (business) => {
                    const isSwitching =
                      switchingBusinessId === business.businessId;

                    return (
                      <button
                        key={business.businessId}
                        type="button"
                        disabled={business.isActive || !!switchingBusinessId}
                        onClick={() => handleBusinessSwitch(business)}
                        className={clsx(
                          "w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-colors",
                          business.isActive
                            ? "bg-brand-600/20 text-brand-200"
                            : "text-slate-300 hover:bg-slate-700",
                        )}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {business.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {business.storeCode}
                            {business.city ? ` • ${business.city}` : ""}
                          </p>
                        </div>

                        {isSwitching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : business.isActive ? (
                          <Check className="w-4 h-4 text-brand-300" />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>

              <div className="border-t border-slate-700 px-3 py-2">
                <p className="text-[10px] text-slate-400">
                  {businesses.length}{" "}
                  {businesses.length === 1 ? "company" : "companies"} linked to
                  this account
                </p>
              </div>
            </div>
          )}
        </div>

        {businessError && (
          <p className="mt-2 px-1 text-[10px] text-red-400">{businessError}</p>
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {nav.map((item) => {
          if (item.children) {
            const isOpen =
              open[item.label] ??
              item.children.some((child) => pathname.startsWith(child.href));

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((state) => ({
                      ...state,
                      [item.label]: !isOpen,
                    }))
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          "block px-3 py-1.5 rounded-md text-sm transition-colors",
                          pathname === child.href
                            ? "bg-brand-600/20 text-brand-300"
                            : "hover:bg-slate-800 hover:text-white",
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

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "hover:bg-slate-800 hover:text-white",
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
          type="button"
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
