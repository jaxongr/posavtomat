// Shared contract between backend & admin (single source of truth).
// Enums mirror prisma/schema.prisma — keep in sync.

// ─────────────────────────── API ENVELOPE ───────────────────────────
export interface ApiMeta {
  total: number;
  cursor?: string;
  hasNext: boolean;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────── ERROR CODES ───────────────────────────
export const ERROR_CODES = {
  // Auth
  E1001: 'Unauthorized',
  E1002: 'Forbidden (RBAC)',
  E1003: 'Token expired',
  E1004: 'Subscription expired',
  // Generic
  E2001: 'Resource not found',
  E2002: 'Already exists',
  E2003: 'Business logic violation',
  E3001: 'Validation error',
  E5001: 'Internal server error',
  // Payments
  E4001: 'Payment failed',
  E4002: 'Payment pending',
  E4010: 'Order already paid',
  E4011: 'Refund exceeds paid amount',
  // Inventory / catalog
  E4101: 'Insufficient stock',
  E4102: 'Product not in catalog / inactive',
  // Tables / kitchen
  E4201: 'Table occupied',
  E4202: 'Order not sent to kitchen',
  // Shift
  E4301: 'Shift not open',
  E4302: 'Shift already closed',
  // Discount / fiscal
  E4401: 'Discount not applicable',
  E4501: 'Receipt/fiscal print failed',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ─────────────────────────── DOMAIN ENUMS ───────────────────────────
export type BusinessType = 'DOKON' | 'RESTORAN';
export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'SELLER' | 'WAITER' | 'COOK' | 'STOCKKEEPER';

/** Uzbek display labels for roles. */
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Egasi',
  MANAGER: 'Menejer',
  CASHIER: 'Kassir',
  SELLER: 'Sotuvchi',
  WAITER: 'Ofitsiant',
  COOK: 'Oshpaz',
  STOCKKEEPER: 'Omborchi',
};
export type Unit = 'DONA' | 'KG' | 'PORSIYA' | 'LITR';
export type ProductType = 'GOODS' | 'DISH' | 'INGREDIENT';
export type SaleType = 'POS' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type SaleStatus = 'DRAFT' | 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaidStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentProvider = 'CASH' | 'CARD' | 'PAYME' | 'CLICK' | 'UZUM';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type KotStatus = 'NEW' | 'COOKING' | 'READY' | 'SERVED';
export type TableStatus = 'FREE' | 'OCCUPIED' | 'BILL';
export type DiscountType = 'PERCENT' | 'FIXED';
export type ShiftStatus = 'OPEN' | 'CLOSED';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'SALE' | 'WASTE' | 'RETURN';

// ─────────────────────────── PAGINATION ───────────────────────────
export interface CursorPagination {
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
}
