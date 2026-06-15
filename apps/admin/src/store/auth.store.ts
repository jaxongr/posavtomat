import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, AuthUser } from '../types';

interface Stash {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  branchId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  branchId: string | null; // selected branch for tenant scope (x-branch-id)
  stash: Stash | null; // super-admin's own session while impersonating a business
  setAuth: (tokens: AuthTokens) => void;
  setBranch: (branchId: string) => void;
  enterBusiness: (tokens: AuthTokens) => void;
  exitBusiness: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      branchId: null,
      stash: null,
      setAuth: (t) =>
        set({
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          user: t.user,
          branchId: t.user.branchId,
        }),
      setBranch: (branchId) => set({ branchId }),
      // Super-admin enters a business: stash own session, switch to the business owner.
      enterBusiness: (t) =>
        set((s) => ({
          stash: { accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, branchId: s.branchId },
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          user: t.user,
          branchId: t.user.branchId,
        })),
      exitBusiness: () =>
        set((s) => ({
          ...(s.stash ?? {}),
          stash: null,
        })),
      clear: () => set({ accessToken: null, refreshToken: null, user: null, branchId: null, stash: null }),
    }),
    { name: 'savdo-pos-auth' },
  ),
);
