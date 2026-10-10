const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

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

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

function buildQuery(
  params?: Record<string, QueryValue>,
): string {
  if (!params) {
    return "";
  }

  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      searchParams.set(
        key,
        String(value),
      );
    },
  );

  const query =
    searchParams.toString();

  return query ? `?${query}` : "";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(
    options.headers,
  );

  if (!headers.has("Content-Type")) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        credentials: "include",
        headers,
        cache: "no-store",
      },
    );
  } catch {
    throw new ApiError(
      "Unable to connect to BillMint server.",
      0,
    );
  }

  let payload: any = null;

  try {
    const contentType =
      response.headers.get(
        "content-type",
      );

    if (
      contentType?.includes(
        "application/json",
      )
    ) {
      payload = await response.json();
    } else {
      const text =
        await response.text();

      payload = text
        ? { message: text }
        : null;
    }
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message ||
        "Request failed",
      response.status,
      Array.isArray(
        payload?.errors,
      )
        ? payload.errors
        : undefined,
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
    userId: string,
    password: string,
    rememberMe = false,
  ) =>
    request<
      ApiSuccess<any>
    >("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        userId,
        password,
        rememberMe,
      }),
    }),

  register: (
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request(
      "/auth/logout",
      {
        method: "POST",
      },
    ),

  me: () =>
    request<
      ApiSuccess<any>
    >("/auth/me"),

  /* =======================================================
     DASHBOARD
  ======================================================= */

  dashboard: () =>
    request<
      ApiSuccess<any>
    >("/dashboard"),

  /* =======================================================
     CUSTOMERS
  ======================================================= */

  customers: (
    params?: Record<
      string,
      QueryValue
    >,
  ) =>
    request<
      PaginatedResponse<any>
    >(
      `/customers${buildQuery(
        params,
      )}`,
    ),

  customer: (id: string) =>
    request<
      ApiSuccess<any>
    >(`/customers/${id}`),

  createCustomer: (
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCustomer: (
    id: string,
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCustomer: (
    id: string,
  ) =>
    request(
      `/customers/${id}`,
      {
        method: "DELETE",
      },
    ),

  /* =======================================================
     ITEMS
  ======================================================= */

  items: (
    params?: Record<
      string,
      QueryValue
    >,
  ) =>
    request<
      PaginatedResponse<any>
    >(
      `/items${buildQuery(
        params,
      )}`,
    ),

  item: (id: string) =>
    request<
      ApiSuccess<any>
    >(`/items/${id}`),

  createItem: (
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >("/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateItem: (
    id: string,
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteItem: (
    id: string,
  ) =>
    request(
      `/items/${id}`,
      {
        method: "DELETE",
      },
    ),

  itemByBarcode: (
    barcode: string,
  ) =>
    request<
      ApiSuccess<any>
    >(
      `/items/barcode/${encodeURIComponent(
        barcode.trim(),
      )}`,
    ),

  itemByCode: (
    sku: string,
  ) =>
    request<
      ApiSuccess<any>
    >(
      `/items/code/${encodeURIComponent(
        sku.trim(),
      )}`,
    ),

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
    request<
      ApiSuccess<any>
    >(
      `/items/${itemId}/adjust-stock`,
      {
        method: "POST",
        body: JSON.stringify({
          quantity:
            Number(data.quantity),
          reason:
            data.reason.trim(),
          notes:
            data.notes?.trim() ||
            undefined,
        }),
      },
    ),

  /* =======================================================
     SALES
  ======================================================= */

  sales: (
    params?: Record<
      string,
      QueryValue
    >,
  ) =>
    request<
      PaginatedResponse<any>
    >(
      `/sales${buildQuery(
        params,
      )}`,
    ),

  sale: (id: string) =>
    request<
      ApiSuccess<any>
    >(`/sales/${id}`),

  createSale: (
    data: Record<string, any>,
  ) =>
    request<
      ApiSuccess<any>
    >("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelSale: (
    id: string,
  ) =>
    request<
      any
    >(
      `/sales/${id}/cancel`,
      {
        method: "POST",
      },
    ),
};

/* =========================================================
   FORMATTING
========================================================= */

export function formatINR(
  value:
    | number
    | string
    | null
    | undefined,
): string {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0,
  );
}