const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(message: string, status: number, errors?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      json.message || 'Request failed',
      res.status,
      json.errors
    );
  }

  return json;
}

export const api = {
  // Auth
  login: (userId: string, password: string, rememberMe?: boolean) =>
    request<{ success: boolean; data: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, rememberMe }),
    }),

  register: (data: Record<string, any>) =>
    request<{ success: boolean; data: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ success: boolean; data: any }>('/auth/me'),

  // Dashboard
  dashboard: () =>
    request<{ success: boolean; data: any }>('/dashboard'),

  // Customers
  customers: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ success: boolean; data: any[]; pagination: any }>(`/customers${qs}`);
  },

  customer: (id: string) =>
    request<{ success: boolean; data: any }>(`/customers/${id}`),

  createCustomer: (data: Record<string, any>) =>
    request<{ success: boolean; data: any }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomer: (id: string, data: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCustomer: (id: string) =>
    request(`/customers/${id}`, { method: 'DELETE' }),

  // Items
  items: (params?: Record<string, string | number | boolean>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ success: boolean; data: any[]; pagination: any }>(`/items${qs}`);
  },

  item: (id: string) =>
    request<{ success: boolean; data: any }>(`/items/${id}`),

  createItem: (data: Record<string, any>) =>
    request<{ success: boolean; data: any }>('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (id: string, data: Record<string, any>) =>
    request<{ success: boolean; data: any }>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    request(`/items/${id}`, { method: 'DELETE' }),

  itemByBarcode: (barcode: string) =>
    request<{ success: boolean; data: any }>(`/items/barcode/${barcode}`),

  // Sales
  sales: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ success: boolean; data: any[]; pagination: any }>(`/sales${qs}`);
  },

  sale: (id: string) =>
    request<{ success: boolean; data: any }>(`/sales/${id}`),

  createSale: (data: Record<string, any>) =>
    request<{ success: boolean; data: any }>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelSale: (id: string) =>
    request(`/sales/${id}/cancel`, { method: 'POST' }),
};

export function formatINR(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}
