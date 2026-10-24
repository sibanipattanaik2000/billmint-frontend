"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, api } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
}

interface ItemLookupResult {
  id: string;
  name: string;
  itemCode?: string | null;
  sku?: string | null;
  deviceCode?: string | null;
  barcode?: string | null;
  imei?: string | null;
  purchasePrice?: number | string | null;
  salePrice?: number | string | null;
  mrp?: number | string | null;
  currentStock?: number | string | null;
  minimumStock?: number | string | null;
  gstRate?: number | string | null;
  hsnSac?: string | null;
  discountPercent?: number | string | null;
  trackBatch?: boolean;
  trackSerial?: boolean;
  trackExpiry?: boolean;
  modelName?: string | null;
  inventoryUnit?: {
    id: string;
    itemCode?: string | null;
    imei?: string | null;
    serialNumber?: string | null;
    status?: string;
  } | null;
  unit?: {
    id?: string;
    name?: string;
    shortName?: string;
  } | null;
  category?: {
    id?: string;
    name?: string;
  } | null;
  brand?: {
    id?: string;
    name?: string;
  } | null;
  supplier?: {
    id?: string;
    name?: string;
  } | null;
}

interface SaleRow {
  rowId: string;
  inventoryUnitId: string | null;
  itemId: string | null;
  itemCode: string;
  barcode: string;
  name: string;
  imei: string;

  quantity: number;
  unit: string;

  rate: number;

  discountPercent: number;
  discountAmount: number;

  gstRate: number;
  hsnSac: string;

  currentStock: number;

  trackBatch: boolean;
  trackSerial: boolean;
  trackExpiry: boolean;

  lookupStatus: "idle" | "loading" | "success" | "error";
  lookupMessage: string;
}

function createEmptyRow(): SaleRow {
  return {
    rowId: crypto.randomUUID(),
    inventoryUnitId: null,
    itemId: null,
    itemCode: "",
    barcode: "",
    name: "",
    imei: "",

    quantity: 1,
    unit: "",

    rate: 0,

    discountPercent: 0,
    discountAmount: 0,

    gstRate: 0,
    hsnSac: "",

    currentStock: 0,

    trackBatch: false,
    trackSerial: false,
    trackExpiry: false,

    lookupStatus: "idle",
    lookupMessage: "",
  };
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSaleId = searchParams.get("edit");
  const isEditMode = Boolean(editSaleId);

  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [loadingExistingSale, setLoadingExistingSale] = useState(false);
  /* =========================================================
     CUSTOMER
  ========================================================= */

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const customerRequestRef = useRef(0);

  /* =========================================================
     INVOICE
  ========================================================= */

  const [invoiceDate, setInvoiceDate] = useState(
    formatDateForInput(new Date()),
  );

  /* =========================================================
     PAYMENT
  ========================================================= */

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);

  /* =========================================================
     TERMS
  ========================================================= */

  const [terms, setTerms] = useState("");

  /* =========================================================
     ITEMS
  ========================================================= */

  const [items, setItems] = useState<SaleRow[]>([createEmptyRow()]);

  /* =========================================================
     UI STATE
  ========================================================= */

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  /* =========================================================
     LOAD BUSINESS SETTINGS
  ========================================================= */

  useEffect(() => {
    let active = true;

    api
      .me()
      .then((response) => {
        if (!active) return;

        setTerms(response.data?.settings?.termsAndConditions || "");
      })
      .catch(() => {
        // Settings are optional for creating a sale.
      });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!editSaleId) return;

    let active = true;

    async function loadSaleForEditing() {
      setLoadingExistingSale(true);
      setPageError("");

      try {
        const response = await api.sale(editSaleId!);
        const sale = response?.data;

        if (!sale) {
          throw new Error("Invoice not found.");
        }

        if (String(sale.status).toUpperCase() !== "DRAFT") {
          throw new Error(
            "Only draft invoices can currently be edited. Cancelled or finalized invoices must not be overwritten because that could corrupt stock and payment records.",
          );
        }

        if (!active) return;

        setOriginalInvoiceNumber(sale.invoiceNumber || "");

        const saleDate = sale.date ? new Date(sale.date) : new Date();

        setInvoiceDate(
          formatDateForInput(
            Number.isNaN(saleDate.getTime()) ? new Date() : saleDate,
          ),
        );

        const customer = sale.customer || null;

        setCustomerId(customer?.id || null);
        setSelectedCustomer(customer);
        setCustomerSearch(customer?.name || "");

        setPaymentMethod(sale.paymentMethod || "cash");
        setPaidAmount(numberValue(sale.paidAmount));
        setTerms(sale.terms || "");

        const paymentReference = String(sale.notes || "").match(
          /Payment Reference:\s*(.*)/i,
        );

        setReferenceNo(paymentReference?.[1]?.trim() || "");

        const savedItems = Array.isArray(sale.items) ? sale.items : [];

        if (savedItems.length === 0) {
          setItems([createEmptyRow()]);
        } else {
          setItems(
            savedItems.map((saved: any): SaleRow => {
              const item = saved.item || {};
              const quantity = numberValue(saved.quantity);
              const rate = numberValue(saved.rate);
              const discountPercent = numberValue(saved.discountPercent);

              return {
                ...createEmptyRow(),

                itemId: saved.itemId || item.id || null,
                itemCode:
                  item.itemCode ||
                  item.deviceCode ||
                  item.sku ||
                  item.barcode ||
                  "",
                barcode: item.barcode || "",
                name: saved.itemName || item.name || "",
                imei: saved.inventoryUnits?.[0]?.imei || "",
                inventoryUnitId: saved.inventoryUnits?.[0]?.id || null,

                quantity,
                unit: saved.unit || item.unit?.shortName || "",
                rate,

                discountPercent,
                discountAmount: numberValue(saved.discountAmount),

                gstRate: numberValue(saved.gstRate),
                hsnSac: saved.hsnSac || item.hsnSac || "",

                currentStock: numberValue(item.currentStock),
                trackBatch: Boolean(item.trackBatch),
                trackSerial: Boolean(item.trackSerial),
                trackExpiry: Boolean(item.trackExpiry),

                lookupStatus: "success",
                lookupMessage: "Loaded from saved invoice",
              };
            }),
          );
        }
      } catch (error) {
        if (active) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to load this invoice.",
          );
        }
      } finally {
        if (active) {
          setLoadingExistingSale(false);
        }
      }
    }

    void loadSaleForEditing();

    return () => {
      active = false;
    };
  }, [editSaleId]);
  /* =========================================================
     CUSTOMER SEARCH
  ========================================================= */

  useEffect(() => {
    const search = customerSearch.trim();

    if (!search || search.length < 2 || selectedCustomer) {
      setCustomerResults([]);
      setCustomerLoading(false);
      return;
    }

    const requestId = ++customerRequestRef.current;

    const timer = window.setTimeout(async () => {
      try {
        setCustomerLoading(true);

        const response = await api.customers({
          search,
          page: 1,
          limit: 10,
        });

        if (requestId !== customerRequestRef.current) {
          return;
        }

        setCustomerResults(response.data || []);
      } catch {
        if (requestId === customerRequestRef.current) {
          setCustomerResults([]);
        }
      } finally {
        if (requestId === customerRequestRef.current) {
          setCustomerLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [customerSearch, selectedCustomer]);

  /* =========================================================
     CUSTOMER SELECT
  ========================================================= */

  function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerResults([]);
    setShowCustomerResults(false);
  }

  function clearCustomer() {
    setCustomerId(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setShowCustomerResults(false);
  }

  /* =========================================================
     ITEM HELPERS
  ========================================================= */

  function resetItemFields(row: SaleRow): SaleRow {
    return {
      ...row,
      itemId: null,
      inventoryUnitId: null,
      barcode: "",
      name: "",
      imei: "",
      unit: "",
      rate: 0,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 0,
      hsnSac: "",
      currentStock: 0,
      trackBatch: false,
      trackSerial: false,
      trackExpiry: false,
      lookupStatus: "idle",
      lookupMessage: "",
    };
  }

  function updateRow(rowId: string, patch: Partial<SaleRow>) {
    setItems((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  }

  function handleItemCodeChange(rowId: string, value: string) {
    setItems((current) =>
      current.map((row) => {
        if (row.rowId !== rowId) {
          return row;
        }

        const nextCode = value;

        if (
          row.itemId &&
          row.itemCode.trim().toLowerCase() !== nextCode.trim().toLowerCase()
        ) {
          return resetItemFields({
            ...row,
            itemCode: nextCode,
          });
        }

        return {
          ...row,
          itemCode: nextCode,
          lookupStatus: nextCode.trim() ? "idle" : "idle",
          lookupMessage: "",
        };
      }),
    );
  }

  /* =========================================================
     ITEM CODE LOOKUP
  ========================================================= */

  async function lookupItem(rowId: string) {
    const row = items.find((item) => item.rowId === rowId);

    if (!row) {
      return;
    }

    const code = row.itemCode.trim();

    if (!code) {
      return;
    }

    updateRow(rowId, {
      lookupStatus: "loading",
      lookupMessage: "Searching item...",
    });

    try {
      const isImei = /^\d{15}$/.test(code);
      const response = isImei
        ? await api.itemByImei(code)
        : await api.itemByCode(code);
      const item = response.data as ItemLookupResult;

      const currentStock = numberValue(item.currentStock);
      const salePrice = numberValue(item.salePrice);
      const gstRate = numberValue(item.gstRate);
      const discountPercent = numberValue(item.discountPercent);

      const trackSerial = Boolean(item.trackSerial);

      updateRow(rowId, {
        itemId: item.id,
        inventoryUnitId: item.inventoryUnit?.id ?? null,

        itemCode:
          item.inventoryUnit?.itemCode ||
          item.itemCode ||
          item.deviceCode ||
          item.sku ||
          code,
        barcode: item.barcode || "",
        name: item.modelName || item.name || "",
        imei: item.inventoryUnit?.imei || item.imei || "",
        quantity: trackSerial ? 1 : Math.max(row.quantity || 1, 1),

        unit: item.unit?.shortName || item.unit?.name || "",

        rate: salePrice,

        discountPercent,
        discountAmount: 0,

        gstRate,
        hsnSac: item.hsnSac || "",

        currentStock,

        trackBatch: Boolean(item.trackBatch),
        trackSerial,
        trackExpiry: Boolean(item.trackExpiry),

        lookupStatus: "success",
        lookupMessage:
          isImei && item.inventoryUnit?.id
            ? `IMEI matched · ${item.inventoryUnit.imei || code}`
            : currentStock > 0
              ? `Item found · Stock: ${currentStock}`
              : "Item found · Out of stock",
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to find item";

      updateRow(rowId, {
        ...resetItemFields({
          ...row,
          itemCode: code,
        }),
        lookupStatus: "error",
        lookupMessage: message,
      });
    }
  }

  /* =========================================================
     QUANTITY
  ========================================================= */

  function updateQuantity(rowId: string, value: number) {
    const row = items.find((item) => item.rowId === rowId);

    if (!row) {
      return;
    }

    if (row.trackSerial || row.inventoryUnitId) {
      updateRow(rowId, {
        quantity: 1,
      });

      return;
    }

    const quantity = Math.max(0, numberValue(value));

    updateRow(rowId, {
      quantity,
    });
  }

  /* =========================================================
     RATE
  ========================================================= */

  function updateRate(rowId: string, value: number) {
    const row = items.find((item) => item.rowId === rowId);

    if (!row) {
      return;
    }

    const rate = Math.max(0, numberValue(value));

    const gross = rate * row.quantity;
    const discountAmount = roundMoney((gross * row.discountPercent) / 100);

    updateRow(rowId, {
      rate,
      discountAmount,
    });
  }

  /* =========================================================
     DISCOUNT %
  ========================================================= */

  function updateDiscountPercent(rowId: string, value: number) {
    const row = items.find((item) => item.rowId === rowId);

    if (!row) {
      return;
    }

    const discountPercent = Math.min(100, Math.max(0, numberValue(value)));

    const gross = row.rate * row.quantity;

    const discountAmount = roundMoney((gross * discountPercent) / 100);

    updateRow(rowId, {
      discountPercent,
      discountAmount,
    });
  }

  /* =========================================================
     DISCOUNT AMOUNT
  ========================================================= */

  function updateDiscountAmount(rowId: string, value: number) {
    const row = items.find((item) => item.rowId === rowId);

    if (!row) {
      return;
    }

    const gross = row.rate * row.quantity;

    const discountAmount = Math.min(Math.max(0, numberValue(value)), gross);

    const discountPercent =
      gross > 0 ? roundMoney((discountAmount / gross) * 100) : 0;

    updateRow(rowId, {
      discountAmount,
      discountPercent,
    });
  }

  /* =========================================================
     ADD / REMOVE ROW
  ========================================================= */

  function addRow() {
    setItems((current) => [...current, createEmptyRow()]);
  }

  function removeRow(rowId: string) {
    setItems((current) => {
      if (current.length === 1) {
        return [createEmptyRow()];
      }

      return current.filter((row) => row.rowId !== rowId);
    });
  }

  /* =========================================================
     LINE CALCULATION
  ========================================================= */

  function calculateRow(row: SaleRow) {
    const gross = row.rate * row.quantity;

    const discountAmount = Math.min(Math.max(0, row.discountAmount), gross);

    const taxableAmount = Math.max(0, gross - discountAmount);

    const taxAmount = (taxableAmount * row.gstRate) / 100;

    const amount = taxableAmount + taxAmount;

    return {
      gross: roundMoney(gross),
      discountAmount: roundMoney(discountAmount),
      taxableAmount: roundMoney(taxableAmount),
      taxAmount: roundMoney(taxAmount),
      amount: roundMoney(amount),
    };
  }

  /* =========================================================
     TOTALS
  ========================================================= */

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let taxable = 0;
    let tax = 0;
    let total = 0;
    let quantity = 0;

    for (const row of items) {
      if (!row.itemId) {
        continue;
      }

      const calculated = calculateRow(row);

      subtotal += calculated.gross;
      discount += calculated.discountAmount;
      taxable += calculated.taxableAmount;
      tax += calculated.taxAmount;
      total += calculated.amount;
      quantity += row.quantity;
    }

    subtotal = roundMoney(subtotal);
    discount = roundMoney(discount);
    taxable = roundMoney(taxable);
    tax = roundMoney(tax);

    /*
     * Backend rounds the final invoice to the nearest rupee.
     * Keep the UI consistent with the actual saved invoice.
     */
    const roundedGrandTotal = Math.round(total + Number.EPSILON);

    const roundOff = roundMoney(roundedGrandTotal - total);

    const grandTotal = roundedGrandTotal;

    const safePaidAmount = Math.min(Math.max(0, paidAmount), grandTotal);

    const balanceAmount = roundMoney(grandTotal - safePaidAmount);

    return {
      subtotal,
      discount,
      taxable,
      tax,
      roundOff,
      grandTotal,
      quantity,
      paidAmount: safePaidAmount,
      balanceAmount,
    };
  }, [items, paidAmount]);

  /* =========================================================
     SAVE SALE
  ========================================================= */

async function handleSave() {
  setPageError("");

  const validRows = items.filter((row) => row.itemId);

  if (validRows.length === 0) {
    setPageError("Add at least one valid item using the Item Code.");
    return;
  }

  for (const row of validRows) {
    if (row.quantity <= 0) {
      setPageError(`Quantity must be greater than zero for "${row.name}".`);
      return;
    }

    if (row.inventoryUnitId && row.quantity !== 1) {
      setPageError(
        `The selected IMEI device "${row.name}" must have quantity 1.`,
      );
      return;
    }

    if (row.trackSerial && row.quantity !== 1) {
      setPageError(
        `"${row.name}" is serial/IMEI tracked and must have quantity 1.`,
      );
      return;
    }

    if (row.currentStock >= 0 && row.quantity > row.currentStock) {
      setPageError(
        `Insufficient stock for "${row.name}". Available stock: ${row.currentStock}.`,
      );
      return;
    }

    if (row.rate < 0) {
      setPageError(`Invalid selling rate for "${row.name}".`);
      return;
    }

    if (row.discountPercent < 0 || row.discountPercent > 100) {
      setPageError(`Invalid discount for "${row.name}".`);
      return;
    }

    if (row.gstRate < 0 || row.gstRate > 100) {
      setPageError(`Invalid GST rate for "${row.name}".`);
      return;
    }
  }

  const enteredPaidAmount = numberValue(paidAmount);

  if (enteredPaidAmount < 0) {
    setPageError("Received amount cannot be negative.");
    return;
  }

  if (enteredPaidAmount > totals.grandTotal) {
    setPageError("Received amount cannot be greater than the invoice total.");
    return;
  }

  if (enteredPaidAmount > 0 && !paymentMethod) {
    setPageError("Select a payment method for the received amount.");
    return;
  }

  const saleDate = new Date(`${invoiceDate}T12:00:00`);

  if (Number.isNaN(saleDate.getTime())) {
    setPageError("Please select a valid invoice date.");
    return;
  }

  setLoading(true);

  try {
    const payload = {
      customerId,
      date: saleDate.toISOString(),

      items: validRows.map((row) => ({
        itemId: row.itemId,
        itemName: row.name,
        hsnSac: row.hsnSac || undefined,
        quantity: row.quantity,
        unit: row.unit || undefined,
        rate: row.rate,
        discountPercent: row.discountPercent,
        gstRate: row.gstRate,
        inventoryUnitIds: row.inventoryUnitId
          ? [row.inventoryUnitId]
          : undefined,
      })),

      paymentMethod: enteredPaidAmount > 0 ? paymentMethod : undefined,
      paidAmount: enteredPaidAmount,
      terms: terms.trim() || undefined,

      notes: referenceNo.trim()
        ? `Payment Reference: ${referenceNo.trim()}`
        : undefined,
    };

    const response = isEditMode
      ? await api.updateSale(editSaleId!, payload)
      : await api.createSale(payload);

    const savedSale = response?.data;

    router.push(
      savedSale?.id
        ? `/sales?${isEditMode ? "updated" : "created"}=${encodeURIComponent(
            savedSale.invoiceNumber || savedSale.id,
          )}`
        : "/sales",
    );
  } catch (error) {
    if (error instanceof ApiError) {
      setPageError(error.message);
    } else {
      setPageError(
        isEditMode
          ? "Unable to update the invoice. Please try again."
          : "Unable to create the sale. Please try again.",
      );
    }
  } finally {
    setLoading(false);
  }
}

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">New Sale</h1>

            <p className="text-sm text-slate-500 mt-1">
              Add items by Item Code and create the invoice.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500">Invoice Number</div>

              <div className="text-sm font-medium text-slate-800">
                Auto generated
              </div>
            </div>

            <div>
              <label
                htmlFor="invoiceDate"
                className="block text-xs text-slate-500 mb-1"
              >
                Invoice Date
              </label>

              <input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {pageError && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* =====================================================
          CUSTOMER
      ===================================================== */}

      <div className="border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 relative">
            <label
              htmlFor="customerSearch"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Customer
            </label>

            <div className="relative">
              <input
                id="customerSearch"
                type="text"
                value={customerSearch}
                onFocus={() =>
                  setShowCustomerResults(
                    !selectedCustomer && customerSearch.trim().length >= 2,
                  )
                }
                onChange={(event) => {
                  const value = event.target.value;

                  setCustomerSearch(value);

                  if (selectedCustomer) {
                    setSelectedCustomer(null);
                    setCustomerId(null);
                  }

                  setShowCustomerResults(value.trim().length >= 2);
                }}
                placeholder="Search customer by name, phone or other details"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />

              {selectedCustomer && (
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-red-600"
                >
                  Clear
                </button>
              )}
            </div>

            {showCustomerResults &&
              !selectedCustomer &&
              (customerLoading || customerResults.length > 0) && (
                <div className="absolute left-6 right-6 mt-1 z-20 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
                  {customerLoading && (
                    <div className="px-3 py-3 text-sm text-slate-500">
                      Searching customers...
                    </div>
                  )}

                  {!customerLoading &&
                    customerResults.map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50"
                      >
                        <div className="font-medium text-sm text-slate-900">
                          {customer.name}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {customer.phone || "No phone"}
                          {customer.businessName
                            ? ` · ${customer.businessName}`
                            : ""}
                        </div>
                      </button>
                    ))}
                </div>
              )}

            {selectedCustomer && (
              <div className="mt-2 text-xs text-slate-500">
                {selectedCustomer.phone || "No phone number"}
                {selectedCustomer.address
                  ? ` · ${selectedCustomer.address}`
                  : ""}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Customer Phone
            </label>

            <div className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-700 min-h-[38px]">
              {selectedCustomer?.phone || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ITEMS
      ===================================================== */}

      <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-3 py-3 w-10"></th>
                  <th className="px-3 py-3 font-medium text-slate-600">
                    ITEM CODE
                  </th>
                  <th className="px-3 py-3 font-medium text-slate-600">ITEM</th>
                  <th className="px-3 py-3 font-medium text-slate-600">IMEI</th>
                  <th className="px-3 py-3 font-medium text-slate-600">QTY</th>
                  <th className="px-3 py-3 font-medium text-slate-600">UNIT</th>
                  <th className="px-3 py-3 font-medium text-slate-600 text-right">
                    RATE
                  </th>
                  <th className="px-3 py-3 font-medium text-slate-600 text-right">
                    DISCOUNT
                  </th>
                  <th className="px-3 py-3 font-medium text-slate-600 text-right">
                    GST %
                  </th>
                  <th className="px-3 py-3 font-medium text-slate-600 text-right">
                    AMOUNT
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((row) => {
                  const calculated = calculateRow(row);

                  return (
                    <tr
                      key={row.rowId}
                      className="border-b border-slate-100 align-top"
                    >
                      {/* DELETE */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(row.rowId)}
                          className="text-slate-400 hover:text-red-600 text-lg leading-none"
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>

                      {/* ITEM CODE */}
                      <td className="px-3 py-3 min-w-[190px]">
                        <input
                          type="text"
                          value={row.itemCode}
                          onChange={(event) =>
                            handleItemCodeChange(row.rowId, event.target.value)
                          }
                          onBlur={() => lookupItem(row.rowId)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              lookupItem(row.rowId);
                            }
                          }}
                          placeholder="Enter item code or 15-digit IMEI"
                          className={`w-full border rounded-md px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                            row.lookupStatus === "error"
                              ? "border-red-400"
                              : row.lookupStatus === "success"
                                ? "border-emerald-400"
                                : "border-slate-300"
                          }`}
                          autoComplete="off"
                        />

                        {row.lookupStatus === "loading" && (
                          <div className="mt-1 text-xs text-blue-600">
                            Finding item...
                          </div>
                        )}

                        {row.lookupMessage && (
                          <div
                            className={`mt-1 text-xs ${
                              row.lookupStatus === "error"
                                ? "text-red-600"
                                : row.currentStock <= 0
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {row.lookupMessage}
                          </div>
                        )}
                      </td>

                      {/* ITEM */}
                      <td className="px-3 py-3 min-w-[220px]">
                        <div className="border border-slate-200 rounded-md bg-slate-50 px-3 py-2 min-h-[38px]">
                          <div className="font-medium text-slate-800">
                            {row.name || "—"}
                          </div>
                          {row.hsnSac && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              HSN/SAC: {row.hsnSac}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* IMEI */}
                      <td className="px-3 py-3 min-w-[180px]">
                        <input
                          type="text"
                          value={row.imei}
                          readOnly={row.trackSerial}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              imei: event.target.value,
                            })
                          }
                          placeholder={
                            row.trackSerial ? "IMEI from item" : "Optional"
                          }
                          className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                        />
                      </td>

                      {/* QTY */}
                      <td className="px-3 py-3 min-w-[90px]">
                        <input
                          type="number"
                          min="1"
                          step="0.001"
                          value={row.quantity}
                          disabled={
                            row.trackSerial || Boolean(row.inventoryUnitId)
                          }
                          onChange={(event) =>
                            updateQuantity(
                              row.rowId,
                              Number(event.target.value),
                            )
                          }
                          className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                        />

                        {row.itemId && (
                          <div className="mt-1 text-xs text-slate-500">
                            Stock: {row.currentStock}
                          </div>
                        )}
                      </td>

                      {/* UNIT */}
                      <td className="px-3 py-3 min-w-[100px]">
                        <div className="border border-slate-200 rounded-md bg-slate-50 px-3 py-2 min-h-[38px] text-sm text-slate-700">
                          {row.unit || "—"}
                        </div>
                      </td>

                      {/* RATE */}
                      <td className="px-3 py-3 min-w-[130px]">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(event) =>
                            updateRate(row.rowId, Number(event.target.value))
                          }
                          className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* DISCOUNT */}
                      <td className="px-3 py-3 min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.discountPercent}
                              onChange={(event) =>
                                updateDiscountPercent(
                                  row.rowId,
                                  Number(event.target.value),
                                )
                              }
                              className="w-full border border-slate-300 rounded-md px-2.5 py-2 pr-7 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              %
                            </span>
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.discountAmount}
                            onChange={(event) =>
                              updateDiscountAmount(
                                row.rowId,
                                Number(event.target.value),
                              )
                            }
                            className="w-[100px] border border-slate-300 rounded-md px-2.5 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                            title="Discount amount"
                          />
                        </div>
                      </td>

                      {/* GST */}
                      <td className="px-3 py-3 min-w-[100px]">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={row.gstRate}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              gstRate: Math.min(
                                100,
                                Math.max(0, Number(event.target.value) || 0),
                              ),
                            })
                          }
                          className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* AMOUNT */}
                      <td className="px-3 py-3 min-w-[140px] text-right">
                        <div className="font-semibold text-slate-900">
                          {formatMoney(calculated.amount)}
                        </div>

                        {row.itemId && (
                          <div className="text-xs text-slate-500 mt-1">
                            Tax {formatMoney(calculated.taxAmount)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ADD ROW */}
          <div className="px-4 py-3 bg-slate-50">
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* ===================================================
            SUMMARY
        =================================================== */}

        <div className="flex justify-end mt-6">
          <div className="w-full max-w-sm border border-slate-200 rounded-lg">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="font-semibold text-slate-900">
                Invoice Summary
              </div>
            </div>

            <div className="px-4 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Quantity</span>
                <span className="font-medium">{totals.quantity}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span>{formatMoney(totals.discount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Amount</span>
                <span>{formatMoney(totals.taxable)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">GST</span>
                <span>{formatMoney(totals.tax)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Round Off</span>
                <span>{formatMoney(totals.roundOff)}</span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatMoney(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FOOTER / PAYMENT
      ===================================================== */}

      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* TERMS */}
          <div>
            <label
              htmlFor="terms"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Terms & Conditions
            </label>

            <textarea
              id="terms"
              rows={4}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              placeholder="Terms configured in business settings will appear here."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* PAYMENT */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="paymentMethod"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Payment Method
                </label>

                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="paidAmount"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Received
                </label>

                <input
                  id="paidAmount"
                  type="number"
                  min="0"
                  max={totals.grandTotal}
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) =>
                    setPaidAmount(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="referenceNo"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Reference No.
                </label>

                <input
                  id="referenceNo"
                  type="text"
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  placeholder="Optional"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Received</span>
                <span className="font-medium">
                  {formatMoney(totals.paidAmount)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Balance</span>
                <span className="font-medium">
                  {formatMoney(totals.balanceAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push("/sales")}
            disabled={loading}
            className="px-5 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
