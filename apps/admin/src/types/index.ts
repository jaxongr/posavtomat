export type Role = 'SUPERADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'SELLER' | 'WAITER' | 'COOK' | 'STOCKKEEPER';

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Super-admin',
  OWNER: 'Egasi',
  MANAGER: 'Menejer',
  CASHIER: 'Kassir',
  SELLER: 'Sotuvchi',
  WAITER: 'Ofitsiant',
  COOK: 'Oshpaz',
  STOCKKEEPER: 'Omborchi',
};

export interface AuthUser {
  id: string;
  fish: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  cost: string;
  barcode: string | null;
  sku: string | null;
  unit: 'DONA' | 'KG' | 'PORSIYA' | 'LITR';
  type: 'GOODS' | 'DISH' | 'INGREDIENT';
  active: boolean;
  imageUrl: string | null;
  categoryId: string | null;
  stocks?: { quantity: string; minQuantity: string }[];
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sort: number;
}

export interface StockRow {
  id: string;
  quantity: string;
  minQuantity: string;
  product: { id: string; name: string; unit: string; barcode: string | null };
}

export interface Sale {
  id: string;
  type: string;
  status: string;
  total: string;
  discount: string;
  subtotal: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openCash: string;
  closeCash: string | null;
  totalSales: string;
  cashSales: string;
  cardSales: string;
  cashDiff: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface Page<T> {
  data: T[];
  meta: { total: number; cursor?: string; hasNext: boolean };
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
}

export interface Staff {
  id: string;
  fish: string;
  phone: string | null;
  role: AuthUser['role'];
  branchId: string | null;
  active: boolean;
  createdAt: string;
}

export interface DashboardData {
  todaySalesTotal: string;
  todaySalesCount: number;
  lowStockCount: number;
  topProducts: { productId: string; name: string; revenue: string }[];
}

export interface SaleListRow {
  id: string;
  type: string;
  status: string;
  total: string;
  discount: string;
  subtotal: string;
  paidStatus: string;
  createdAt: string;
  staff: { fish: string } | null;
}
