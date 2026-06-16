import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

// Map a server "topic" to the React Query keys that should refetch.
const TOPIC_KEYS: Record<string, string[]> = {
  kitchen: ['kots'],
  orders: ['active-orders', 'order'],
  tables: ['tables'],
};

/**
 * Realtime updates over Socket.IO. Connects to the same origin (nginx proxies
 * /socket.io/ to the backend), authenticates with the access token, and on a
 * `changed` event invalidates the affected queries so the UI updates instantly.
 * Polling stays on as a fallback if the socket can't connect.
 */
export function useRealtime(): void {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const branchId = useAuthStore((s) => s.branchId);
  const userBranch = useAuthStore((s) => s.user?.branchId);

  useEffect(() => {
    if (!accessToken) return;
    const socket: Socket = io({
      auth: { token: accessToken, branchId: branchId ?? userBranch ?? undefined },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 5000,
    });

    socket.on('changed', (msg: { topics?: string[] }) => {
      const keys = new Set<string>();
      for (const t of msg?.topics ?? []) {
        for (const k of TOPIC_KEYS[t] ?? []) keys.add(k);
      }
      for (const k of keys) void qc.invalidateQueries({ queryKey: [k] });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, branchId, userBranch, qc]);
}
