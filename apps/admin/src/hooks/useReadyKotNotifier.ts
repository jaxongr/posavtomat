import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { kitchenApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';
import { useOrganization } from './useRestaurant';

// Short beep via Web Audio (no asset needed). Best-effort: ignored if blocked.
function playBeep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    // sound unavailable — silent fallback
  }
}

const NOTIFY_ROLES = ['WAITER', 'MANAGER', 'OWNER'];

/**
 * Waiter signal: polls active KOTs and, when a ticket flips to READY, shows a
 * popup notification + plays a beep. Mounted once in the layout. Restaurants
 * only, and only for roles that serve tables.
 */
export function useReadyKotNotifier(): void {
  const { notification } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const org = useOrganization();
  const enabled = org.data?.businessType === 'RESTORAN' && NOTIFY_ROLES.includes(role ?? '');

  const kots = useQuery({
    queryKey: ['kots'],
    queryFn: kitchenApi.kots,
    refetchInterval: enabled ? 4000 : false,
    enabled,
  });

  const seen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!enabled || !kots.data) return;
    const ready = kots.data.filter((k) => k.status === 'READY');

    // First load: remember what's already ready without alerting (avoid a burst
    // of popups for tickets that were ready before the screen opened).
    if (!seeded.current) {
      ready.forEach((k) => seen.current.add(k.id));
      seeded.current = true;
      return;
    }

    for (const k of ready) {
      if (seen.current.has(k.id)) continue;
      seen.current.add(k.id);
      notification.success({
        message: '🔔 Taom tayyor!',
        description: `${k.sale.table?.name ?? 'Olib ketish'} — ${k.items.map((i) => i.name).join(', ')}`,
        duration: 10,
        placement: 'topRight',
      });
      playBeep();
    }
  }, [kots.data, enabled, notification]);
}
