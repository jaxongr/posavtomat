import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

/** Decode a JWT's exp (seconds). Returns 0 if unparseable. */
function tokenExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    return payload.exp ?? 0;
  } catch {
    return 0;
  }
}

function isExpiring(token: string): boolean {
  const exp = tokenExp(token);
  // Refresh ~10s before actual expiry to avoid a 401 round-trip.
  return exp > 0 && Date.now() / 1000 >= exp - 10;
}

let refreshing: Promise<string | null> | null = null;

// Attach access token (refresh proactively if it is about to expire) + branch.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { accessToken, refreshToken, branchId } = useAuthStore.getState();
  let token = accessToken;
  const isAuthCall = config.url?.includes('/auth/');
  if (token && refreshToken && !isAuthCall && isExpiring(token)) {
    refreshing = refreshing ?? refreshAccess();
    token = await refreshing;
    refreshing = null;
  }
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  if (branchId) {
    config.headers.set('x-branch-id', branchId);
  }
  return config;
});

async function refreshAccess(): Promise<string | null> {
  const { refreshToken, setAuth, clear } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    return null;
  }
  try {
    const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
    const tokens = res.data.data;
    setAuth(tokens);
    return tokens.accessToken as string;
  } catch {
    clear();
    return null;
  }
}

// Auto-refresh on 401 (token expired), retry once.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.includes('/auth/');
    // Any 401 (expired/invalid access token) → try a single refresh, then retry.
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccess();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return api(original);
      }
      // Refresh failed → session over, back to login.
      useAuthStore.getState().clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error as AxiosError<ApiErrorBody>).response?.data?.error?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Noma‘lum xato';
}
