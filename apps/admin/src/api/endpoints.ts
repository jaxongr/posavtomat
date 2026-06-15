import { api } from './client';
import type {
  AuthTokens,
  Branch,
  Category,
  DashboardData,
  Page,
  Product,
  Sale,
  SaleListRow,
  Shift,
  Staff,
  StockRow,
} from '../types';

export const authApi = {
  login: (login: string, password: string) =>
    api.post<{ data: AuthTokens }>('/auth/login', { login, password }).then((r) => r.data.data),
};

export interface ReceiptConfig {
  shopName?: string;
  address?: string;
  phone?: string;
  footer?: string;
  width?: '58' | '80';
  showCashier?: boolean;
}

export interface Subscription {
  state: 'active' | 'grace' | 'expired';
  daysLeft: number | null;
  endsAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  businessType: 'DOKON' | 'RESTORAN';
  settings: { receipt?: ReceiptConfig } & Record<string, unknown>;
  plan?: string;
  subscriptionPrice?: string;
  subscriptionEndsAt?: string | null;
  subscription?: Subscription;
}

export const orgApi = {
  branches: () => api.get<{ data: Branch[] }>('/branches').then((r) => r.data.data),
  organization: () => api.get<{ data: Organization }>('/organization').then((r) => r.data.data),
  update: (body: { name?: string; receipt?: ReceiptConfig }) =>
    api.patch<{ data: Organization }>('/organization', body).then((r) => r.data.data),
  createBranch: (body: { name: string; address?: string }) =>
    api.post<{ data: Branch }>('/branches', body).then((r) => r.data.data),
};

export interface AdminOrg {
  id: string;
  name: string;
  businessType: 'DOKON' | 'RESTORAN';
  active: boolean;
  plan: string;
  subscriptionPrice: string;
  subscriptionEndsAt: string | null;
  subscription: Subscription;
  _count: { branches: number; staff: number; sales: number };
  revenueTotal: string;
  todaySales: string;
  todayCount: number;
  lastActivity: string | null;
}

export interface AdminOrgDetail {
  org: AdminOrg & { settings: Record<string, unknown> };
  branches: { id: string; name: string; address: string | null; active: boolean }[];
  staff: { id: string; fish: string; role: string; phone: string | null; branchId: string | null; active: boolean }[];
  stats: { productCount: number; revenueTotal: string; salesCount: number; todaySales: string; todayCount: number };
}

export const adminApi = {
  organizations: () => api.get<{ data: AdminOrg[] }>('/admin/organizations').then((r) => r.data.data),
  detail: (id: string) => api.get<{ data: AdminOrgDetail }>(`/admin/organizations/${id}`).then((r) => r.data.data),
  createBusiness: (body: {
    name: string;
    businessType: string;
    ownerFish: string;
    ownerPhone: string;
    ownerPassword: string;
    plan?: string;
    price?: number;
    days?: number;
  }) => api.post('/admin/organizations', body).then((r) => r.data.data),
  setSubscription: (id: string, body: { plan?: string; price?: number; addDays?: number }) =>
    api.patch(`/admin/organizations/${id}/subscription`, body).then((r) => r.data.data),
  toggle: (id: string) => api.patch(`/admin/organizations/${id}/toggle`).then((r) => r.data.data),
  impersonate: (id: string) =>
    api.post<{ data: AuthTokens }>(`/admin/organizations/${id}/impersonate`).then((r) => r.data.data),
};

export interface DiningTable {
  id: string;
  name: string;
  zone: string | null;
  seats: number;
  status: 'FREE' | 'OCCUPIED' | 'BILL';
}

export const tablesApi = {
  list: () => api.get<{ data: DiningTable[] }>('/tables').then((r) => r.data.data),
  create: (body: { name: string; zone?: string; seats?: number }) =>
    api.post<{ data: DiningTable }>('/tables', body).then((r) => r.data.data),
  setStatus: (id: string, status: string) =>
    api.patch<{ data: DiningTable }>(`/tables/${id}/status`, { status }).then((r) => r.data.data),
};

export interface Kot {
  id: string;
  status: 'NEW' | 'COOKING' | 'READY' | 'SERVED';
  items: { productId: string; name: string; qty: number }[];
  sentAt: string;
  sale: { id: string; table: { name: string } | null; staff: { fish: string } | null };
}

export const kitchenApi = {
  kots: () => api.get<{ data: Kot[] }>('/kitchen/kots').then((r) => r.data.data),
  setStatus: (id: string, status: string) =>
    api.patch<{ data: Kot }>(`/kitchen/kots/${id}/status`, { status }).then((r) => r.data.data),
};

export interface Order {
  id: string;
  status: string;
  paidStatus: string;
  subtotal: string;
  discount: string;
  total: string;
  tableId: string | null;
  items: { id: string; productId: string; qty: string; price: string; product: { name: string } }[];
  kots?: { id: string; status: string }[];
}

export const ordersApi = {
  byTable: (tableId: string) =>
    api.get<{ data: Order | null }>(`/orders/by-table/${tableId}`).then((r) => r.data.data),
  open: (body: { tableId: string; items: { productId: string; qty: number }[]; customerId?: string; promoCode?: string }) =>
    api.post<{ data: Order }>('/orders', body).then((r) => r.data.data),
  addItems: (id: string, items: { productId: string; qty: number }[]) =>
    api.post<{ data: Order }>(`/orders/${id}/items`, { items }).then((r) => r.data.data),
  pay: (id: string, payments: { provider: 'CASH' | 'CARD'; amount: number }[]) =>
    api.post<{ data: Order }>(`/orders/${id}/pay`, { payments }).then((r) => r.data.data),
  cancel: (id: string) => api.post(`/orders/${id}/cancel`).then((r) => r.data),
};

export interface Recipe {
  id: string;
  dishProductId: string;
  items: {
    ingredientId: string;
    qty: string;
    ingredient: { id: string; name: string; unit: string; cost: string };
  }[];
}

export const recipesApi = {
  get: (dishProductId: string) =>
    api.get<{ data: Recipe | null }>(`/recipes/${dishProductId}`).then((r) => r.data.data),
  set: (dishProductId: string, items: { ingredientId: string; qty: number }[]) =>
    api.put<{ data: Recipe }>(`/recipes/${dishProductId}`, { items }).then((r) => r.data.data),
};

export const catalogApi = {
  getProducts: (params: { cursor?: string; limit?: number; search?: string; categoryId?: string }) =>
    api.get<Page<Product>>('/products', { params }).then((r) => r.data),
  createProduct: (body: Partial<Product> & { name: string; price: number }) =>
    api.post<{ data: Product }>('/products', body).then((r) => r.data.data),
  updateProduct: (id: string, body: Partial<Product>) =>
    api.patch<{ data: Product }>(`/products/${id}`, body).then((r) => r.data.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
  getCategories: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data.data),
  createCategory: (body: { name: string; parentId?: string }) =>
    api.post<{ data: Category }>('/categories', body).then((r) => r.data.data),
};

export const inventoryApi = {
  getStock: (params: { cursor?: string; limit?: number; lowOnly?: string }) =>
    api.get<Page<StockRow>>('/inventory/stock', { params }).then((r) => r.data),
  adjust: (body: { productId: string; countedQty: number; note?: string }) =>
    api.post('/inventory/adjust', body).then((r) => r.data),
  receive: (body: { supplierId?: string; items: { productId: string; qty: number; cost: number }[] }) =>
    api.post('/purchases', body).then((r) => r.data),
};

export interface CreateSaleBody {
  idempotencyKey: string;
  type: 'POS' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: string;
  customerId?: string;
  promoCode?: string;
  items: { productId: string; qty: number }[];
  payments: { provider: 'CASH' | 'CARD' | 'DEBT'; amount: number }[];
}

export const salesApi = {
  getOne: (id: string) => api.get<{ data: Sale }>(`/sales/${id}`).then((r) => r.data.data),
  create: (body: CreateSaleBody) => api.post<{ data: Sale }>('/sales', body).then((r) => r.data.data),
  refund: (id: string) => api.post<{ data: Sale }>(`/sales/${id}/refund`).then((r) => r.data.data),
};

export const shiftsApi = {
  current: () => api.get<{ data: Shift | null }>('/shifts/current').then((r) => r.data.data),
  open: (openCash: number) => api.post<{ data: Shift }>('/shifts/open', { openCash }).then((r) => r.data.data),
  close: (closeCash: number) => api.post<{ data: Shift }>('/shifts/close', { closeCash }).then((r) => r.data.data),
};

export interface ProfitReport {
  from: string;
  to: string;
  revenue: string;
  cost: string;
  profit: string;
  topByProfit: { productId: string; name: string; qty: number; revenue: string; profit: string }[];
}

export const reportsApi = {
  dashboard: () => api.get<{ data: DashboardData }>('/reports/dashboard').then((r) => r.data.data),
  sales: (params: { cursor?: string; limit?: number }) =>
    api.get<Page<SaleListRow>>('/reports/sales', { params }).then((r) => r.data),
  profit: (from?: string, to?: string) =>
    api.get<{ data: ProfitReport }>('/reports/profit', { params: { from, to } }).then((r) => r.data.data),
  staff: (from?: string, to?: string) =>
    api
      .get<{ data: { staffId: string; fish: string; role: string | null; salesCount: number; total: string }[] }>(
        '/reports/staff',
        { params: { from, to } },
      )
      .then((r) => r.data.data),
};

export interface Discount {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  promoCode: string | null;
  conditions: { minTotal?: number };
  active: boolean;
}

export const discountsApi = {
  list: () => api.get<{ data: Discount[] }>('/discounts').then((r) => r.data.data),
  create: (body: { name: string; type: string; value: number; promoCode?: string; minTotal?: number }) =>
    api.post<{ data: Discount }>('/discounts', body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/discounts/${id}`).then((r) => r.data),
};

export interface Customer {
  id: string;
  fish: string;
  phone: string | null;
  loyaltyPoints: number;
  debt: string;
}

export const customersApi = {
  list: (search?: string) =>
    api.get<{ data: Customer[] }>('/customers', { params: { search } }).then((r) => r.data.data),
  create: (body: { fish: string; phone?: string; note?: string }) =>
    api.post<{ data: Customer }>('/customers', body).then((r) => r.data.data),
  repay: (id: string, amount: number) =>
    api.patch<{ data: Customer }>(`/customers/${id}/repay`, { amount }).then((r) => r.data.data),
};

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
}

export const suppliersApi = {
  list: () => api.get<{ data: Supplier[] }>('/suppliers').then((r) => r.data.data),
  create: (body: { name: string; phone?: string }) =>
    api.post<{ data: Supplier }>('/suppliers', body).then((r) => r.data.data),
};

export const staffApi = {
  list: () => api.get<{ data: Staff[] }>('/staff').then((r) => r.data.data),
  create: (body: {
    fish: string;
    phone?: string;
    role: string;
    branchId?: string;
    password?: string;
    pin?: string;
  }) => api.post<{ data: Staff }>('/staff', body).then((r) => r.data.data),
  deactivate: (id: string) => api.delete(`/staff/${id}`).then((r) => r.data),
};
