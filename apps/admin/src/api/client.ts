import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token + tenant branch header.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, branchId } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (branchId) {
    config.headers.set('x-branch-id', branchId);
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

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
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 401 && code === 'E1003' && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccess();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error as AxiosError<ApiErrorBody>).response?.data?.error?.message ?? error.message;
  }
  return 'Noma‘lum xato';
}
