import { Role } from '@prisma/client';

/** Authenticated principal attached to request by JwtStrategy. */
export interface AuthUser {
  id: string;
  fish: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
}

/** Tenant scope resolved per request — applied to every query. */
export interface TenantContext {
  orgId: string;
  branchId: string;
}

/** JWT access token payload. */
export interface JwtPayload {
  sub: string;
  role: Role;
  organizationId: string;
  branchId: string | null;
  type: 'access' | 'refresh';
}
