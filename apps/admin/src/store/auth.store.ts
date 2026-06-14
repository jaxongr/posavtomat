import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, AuthUser } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  branchId: string | null; // selected branch for tenant scope (x-branch-id)
  setAuth: (tokens: AuthTokens) => void;
  setBranch: (branchId: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      branchId: null,
      setAuth: (t) =>
        set({
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          user: t.user,
          branchId: t.user.branchId,
        }),
      setBranch: (branchId) => set({ branchId }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null, branchId: null }),
    }),
    { name: 'savdo-pos-auth' },
  ),
);
