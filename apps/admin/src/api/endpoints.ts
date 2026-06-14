import { api } from './client';
import type {
  AuthTokens,
  Category,
  Page,
  Product,
  Sale,
  Shift,
  StockRow,
} from '../types';

export const authApi = {
  login: (login: string, password: string) =>
    api.post<{ data: AuthTokens }>('/auth/login', { login, password }).then((r) => r.data.data),
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

export const salesApi = {
  getOne: (id: string) => api.get<{ data: Sale }>(`/sales/${id}`).then((r) => r.data.data),
  refund: (id: string) => api.post<{ data: Sale }>(`/sales/${id}/refund`).then((r) => r.data.data),
};

export const shiftsApi = {
  current: () => api.get<{ data: Shift | null }>('/shifts/current').then((r) => r.data.data),
  report: (id: string) =>
    api.get<{ data: { shift: Shift; salesCount: number; expectedCash: string } }>(
      `/shifts/${id}/report`,
    ).then((r) => r.data.data),
};
