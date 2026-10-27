const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  errors?: {
    field: string;
    message: string;
  }[];

  constructor(
    message: string,
    status: number,
    errors?: {
      field: string;
      message: string;
    }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Unable to connect to BillMint server.", 0);
  }

  let payload: any = null;

  try {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();

      payload = text ? { message: text } : null;
    }
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Request failed",
      response.status,
      Array.isArray(payload?.errors) ? payload.errors : undefined,
    );
  }

  return payload as T;
}

/* =========================================================
   COMMON RESPONSE TYPES
========================================================= */

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationResponse;
}

/* =========================================================
   API
========================================================= */

export const api = {
  /* =======================================================
     AUTH
  ======================================================= */

  login: (
    storeCode: string,
    userId: string,
    password: string,
    rememberMe = false,
  ) =>
    request<ApiSuccess<any>>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        storeCode,
        userId,
        password,
        rememberMe,
      }),
    }),
  storeByCode: (storeCode: string) =>
    request<
      ApiSuccess<{
        storeCode: string;
        name: string;
        address: string | null;
        city: string | null;
        state: string | null;
        pinCode: string | null;
        phone: string | null;
        email: string | null;
        gstin: string | null;
      }>
    >(`/stores/${encodeURIComponent(storeCode.trim().toUpperCase())}`),
  stores: () =>
    request<
      ApiSuccess<
        {
          storeCode: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          pinCode: string | null;
          phone: string | null;
          email: string | null;
          gstin: string | null;
        }[]
      >
    >("/stores"),
  register: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  me: () => request<ApiSuccess<any>>("/auth/me"),

  /* =======================================================
     BUSINESS SETTINGS
  ======================================================= */

  businessSettings: () =>
    request<
      ApiSuccess<{
        business: {
          id: string;
          name: string;
          ownerName: string;
          email: string | null;
          phone: string | null;
          gstin: string | null;
          pan: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pinCode: string | null;
          country: string;
          financialYearStart: number;
          logoUrl: string | null;
          signatureUrl: string | null;
          updatedAt: string;
          storeCode: string;
        };
        settings: {
          invoicePrefix: string;
          invoiceNextNumber: number;
          quotationPrefix: string;
          quotationNextNumber: number;
          challanPrefix: string;
          challanNextNumber: number;
          purchasePrefix: string;
          purchaseNextNumber: number;
          defaultTaxRate: number | string;
          currency: string;
          currencySymbol: string;
          decimalPlaces: number;
          termsAndConditions: string | null;
          bankName: string | null;
          bankAccountNumber: string | null;
          bankIfsc: string | null;
          bankBranch: string | null;
          upiId: string | null;
          invoiceTemplate: string;
        };
      }>
    >("/business-settings"),

  updateBusinessSettings: (data: {
    business?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }) =>
    request<
      ApiSuccess<{
        business: Record<string, unknown>;
        settings: Record<string, unknown> | null;
      }>
    >("/business-settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /* =======================================================
     DASHBOARD
  ======================================================= */

  dashboard: () => request<ApiSuccess<any>>("/dashboard"),

  /* =======================================================
     CUSTOMERS
  ======================================================= */

  customers: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/customers${buildQuery(params)}`),

  customer: (id: string) => request<ApiSuccess<any>>(`/customers/${id}`),

  createCustomer: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCustomer: (id: string, data: Record<string, any>) =>
    request<ApiSuccess<any>>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCustomer: (id: string) =>
    request(`/customers/${id}`, {
      method: "DELETE",
    }),

  /* =======================================================
     SUPPLIERS
  ======================================================= */

  suppliers: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/suppliers${buildQuery(params)}`),

  supplier: (id: string) =>
    request<ApiSuccess<any>>(`/suppliers/${encodeURIComponent(id)}`),

  createSupplier: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSupplier: (id: string, data: Record<string, any>) =>
    request<ApiSuccess<any>>(`/suppliers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteSupplier: (id: string) =>
    request<ApiSuccess<any>>(`/suppliers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  /* =======================================================
     ITEMS
  ======================================================= */

  items: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/items${buildQuery(params)}`),

  item: (id: string) => request<ApiSuccess<any>>(`/items/${id}`),

  createItem: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateItem: (id: string, data: Record<string, any>) =>
    request<ApiSuccess<any>>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    request(`/items/${id}`, {
      method: "DELETE",
    }),

  itemByBarcode: (barcode: string) =>
    request<ApiSuccess<any>>(
      `/items/barcode/${encodeURIComponent(barcode.trim())}`,
    ),

  itemByCode: (sku: string) =>
    request<ApiSuccess<any>>(`/items/code/${encodeURIComponent(sku.trim())}`),
  itemByImei: (imei: string) =>
    request<ApiSuccess<any>>(`/items/imei/${encodeURIComponent(imei.trim())}`),
  /* =======================================================
     STOCK
  ======================================================= */

  adjustStock: (
    itemId: string,
    data: {
      quantity: number;
      reason: string;
      notes?: string;
    },
  ) =>
    request<ApiSuccess<any>>(`/items/${itemId}/adjust-stock`, {
      method: "POST",
      body: JSON.stringify({
        quantity: Number(data.quantity),
        reason: data.reason.trim(),
        notes: data.notes?.trim() || undefined,
      }),
    }),

  /* =======================================================
     CASH & BANK
  ======================================================= */

  cashBankAccounts: (params?: Record<string, QueryValue>) =>
    request<
      PaginatedResponse<any> & {
        summary?: {
          totalActiveBalance: number;
        };
      }
    >(`/cash-bank${buildQuery(params)}`),

  cashBankStatement: (id: string, params?: Record<string, QueryValue>) =>
    request<
      ApiSuccess<{
        account: any;
        statement: {
          from: string | null;
          to: string | null;
          openingBalance: number | string;
          closingBalance: number | string;
          transactions: Array<{
            id: string;
            date: string;
            type: string;
            amount: number | string;
            balance: number | string;
            description: string | null;
            referenceType: string | null;
            referenceId: string | null;
          }>;
        };
        pagination: PaginationResponse;
      }>
    >(`/cash-bank/${encodeURIComponent(id)}/statement${buildQuery(params)}`),

  createBankAccount: (data: {
    name: string;
    accountNumber?: string | null;
    ifsc?: string | null;
    bankName?: string | null;
    branch?: string | null;
    openingBalance: number;
    isCash: boolean;
  }) =>
    request<ApiSuccess<any>>("/cash-bank", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  paymentsIn: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/payments${buildQuery(params)}`),

  paymentsOut: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/payments/out${buildQuery(params)}`),

  createPaymentIn: (data: {
    customerId?: string | null;
    amount: number;
    date: string;
    paymentMethod: string;
    bankAccountId: string;
    reference?: string | null;
    notes?: string | null;
  }) =>
    request<ApiSuccess<any>>("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createPaymentOut: (data: {
    supplierId?: string | null;
    amount: number;
    date: string;
    paymentMethod: string;
    bankAccountId?: string | null;
    reference?: string | null;
    notes?: string | null;
  }) =>
    request<ApiSuccess<any>>("/payments/out", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /* =======================================================
     EXPENSES
  ======================================================= */

  expenses: (params?: Record<string, QueryValue>) =>
    request<
      PaginatedResponse<any> & {
        summary?: {
          totalAmount: number;
          count: number;
        };
      }
    >(`/expenses${buildQuery(params)}`),

  expenseCategories: () => request<ApiSuccess<any[]>>("/expenses/categories"),

  expense: (id: string) =>
    request<ApiSuccess<any>>(`/expenses/${encodeURIComponent(id)}`),

  createExpense: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateExpense: (id: string, data: Record<string, any>) =>
    request<ApiSuccess<any>>(`/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteExpense: (id: string) =>
    request<ApiSuccess<any>>(`/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /* =======================================================
     SALES
  ======================================================= */

  sales: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/sales${buildQuery(params)}`),

  allStoreSales: (params?: {
    page?: number;
    limit?: number;
    storeCode?: string;
    from?: string;
    to?: string;
  }) =>
    request<{
      success: boolean;
      data: Array<{
        storeCode: string;
        storeName: string;
        invoiceCount: number;
        totalSales: number | string;
        totalReceived: number | string;
        totalOutstanding: number | string;
      }>;
      summary: {
        invoiceCount: number;
        totalSales: number | string;
        totalReceived: number | string;
        totalOutstanding: number | string;
      };
      pagination: PaginationResponse;
    }>(`/sales/all-stores${buildQuery(params)}`),

  sale: (id: string) =>
    request<ApiSuccess<any>>(`/sales/${encodeURIComponent(id)}`),

  createSale: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSale: (id: string, data: Record<string, any>) =>
    request<ApiSuccess<any>>(`/sales/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  cancelSale: (id: string) =>
    request<ApiSuccess<any>>(`/sales/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),

  deleteSale: (id: string) =>
    request<ApiSuccess<any>>(`/sales/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /* =======================================================
     QUOTATIONS
  ======================================================= */

  quotations: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/quotations${buildQuery(params)}`),

  quotation: (id: string) =>
    request<ApiSuccess<any>>(`/quotations/${encodeURIComponent(id)}`),

  createQuotation: (data: {
    customerId?: string | null;
    date?: string;
    expiryDate?: string | null;
    items: Array<{
      itemId?: string | null;
      itemName?: string;
      hsnSac?: string | null;
      quantity: number;
      unit?: string | null;
      rate: number;
      discountPercent?: number;
      gstRate?: number;
    }>;
    notes?: string | null;
    terms?: string | null;
  }) =>
    request<ApiSuccess<any>>("/quotations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateQuotationStatus: (
    id: string,
    status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED",
  ) =>
    request<ApiSuccess<any>>(`/quotations/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /* =======================================================
     DELIVERY CHALLANS
  ======================================================= */

  deliveryChallans: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/delivery-challans${buildQuery(params)}`),

  deliveryChallan: (id: string) =>
    request<ApiSuccess<any>>(`/delivery-challans/${encodeURIComponent(id)}`),

  createDeliveryChallan: (data: {
    customerId?: string | null;
    date?: string;
    reason?: string | null;
    transportInfo?: string | null;
    notes?: string | null;
    items: Array<{
      itemId?: string | null;
      itemName?: string;
      quantity: number;
      unit?: string | null;
      notes?: string | null;
    }>;
  }) =>
    request<ApiSuccess<any>>("/delivery-challans", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /* =======================================================
     SALE RETURNS
  ======================================================= */

  saleReturns: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/sale-returns${buildQuery(params)}`),

  saleReturn: (id: string) =>
    request<ApiSuccess<any>>(`/sale-returns/${encodeURIComponent(id)}`),

  createSaleReturn: (data: {
    saleId?: string | null;
    customerId?: string | null;
    date?: string;
    notes?: string | null;
    items: Array<{
      itemId?: string | null;
      itemName: string;
      quantity: number;
      rate: number;
      taxAmount?: number;
    }>;
  }) =>
    request<ApiSuccess<any>>("/sale-returns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /* =======================================================
     PURCHASES
  ======================================================= */

  purchases: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/purchases${buildQuery(params)}`),

  purchase: (id: string) =>
    request<ApiSuccess<any>>(`/purchases/${encodeURIComponent(id)}`),

  createPurchase: (data: Record<string, any>) =>
    request<ApiSuccess<any>>("/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  itemModels: () => request<ApiSuccess<any[]>>("/items/models"),
  cancelPurchase: (id: string) =>
    request<ApiSuccess<any>>(`/purchases/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),

  /* =======================================================
     REPORTS
  ======================================================= */

  reportSaleSummary: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/sale-summary${buildQuery(params)}`),

  reportPartyWiseSales: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/party-wise-sales${buildQuery(params)}`),

  reportItemWiseSales: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/item-wise-sales${buildQuery(params)}`),

  reportPurchaseSummary: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/purchase-summary${buildQuery(params)}`),

  reportStockSummary: () => request<ApiSuccess<any>>("/reports/stock-summary"),

  reportLowStock: () => request<ApiSuccess<any>>("/reports/low-stock"),

  reportReceivable: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/receivable${buildQuery(params)}`),

  reportPayable: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/payable${buildQuery(params)}`),

  reportExpense: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(`/reports/expense${buildQuery(params)}`),
  reportPaymentCollection: (params?: Record<string, QueryValue>) =>
    request<ApiSuccess<any>>(
      `/reports/payment-collection${buildQuery(params)}`,
    ),
  /* =======================================================
     OTHER INCOME
  ======================================================= */

  otherIncomes: (params?: Record<string, QueryValue>) =>
    request<
      PaginatedResponse<any> & {
        summary?: {
          totalAmount: number;
          count: number;
        };
      }
    >(`/other-income${buildQuery(params)}`),

  otherIncome: (id: string) =>
    request<ApiSuccess<any>>(`/other-income/${encodeURIComponent(id)}`),

  createOtherIncome: (data: {
    amount: number;
    date?: string;
    category?: string | null;
    paymentMethod: string;
    description?: string | null;
    notes?: string | null;
    reference?: string | null;
    bankAccountId?: string | null;
  }) =>
    request<ApiSuccess<any>>("/other-income", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateOtherIncome: (
    id: string,
    data: Partial<{
      amount: number;
      date: string;
      category: string | null;
      paymentMethod: string;
      description: string | null;
      notes: string | null;
      reference: string | null;
      bankAccountId: string | null;
    }>,
  ) =>
    request<ApiSuccess<any>>(`/other-income/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteOtherIncome: (id: string) =>
    request<ApiSuccess<any>>(`/other-income/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  /* =======================================================
     PURCHASE RETURNS
  ======================================================= */

  purchaseReturns: (params?: Record<string, QueryValue>) =>
    request<PaginatedResponse<any>>(`/purchase-returns${buildQuery(params)}`),

  purchaseReturn: (id: string) =>
    request<ApiSuccess<any>>(`/purchase-returns/${encodeURIComponent(id)}`),

  createPurchaseReturn: (data: {
    purchaseId?: string | null;
    supplierId?: string | null;
    date?: string;
    notes?: string | null;
    items: Array<{
      itemId?: string | null;
      itemName: string;
      quantity: number;
      rate: number;
      taxAmount?: number;
    }>;
  }) =>
    request<ApiSuccess<any>>("/purchase-returns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /* =======================================================
     SHELF MANAGEMENT
  ======================================================= */

  shelves: () => request<ApiSuccess<any[]>>("/shelves"),

  shelfStock: (shelfId: string) =>
    request<ApiSuccess<any>>(`/shelves/${encodeURIComponent(shelfId)}/stock`),

  placeShelfStock: (
    shelfId: string,
    data: {
      itemId: string;
      quantity: number;
    },
  ) =>
    request<ApiSuccess<any>>(`/shelves/${encodeURIComponent(shelfId)}/stock`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  transferShelfStock: (data: {
    itemId: string;
    fromShelfId: string;
    toShelfId: string;
    quantity: number;
    reason?: string;
  }) =>
    request<ApiSuccess<any>>("/shelves/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

/* =========================================================
   FORMATTING
========================================================= */

export function formatINR(value: number | string | null | undefined): string {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
