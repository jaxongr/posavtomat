import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { kitchenApi, type Kot } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';
import { useOrganization } from './useRestaurant';

type KotStatus = Kot['status'];

// A louder, repeated alert (3 buzzes) via Web Audio. Best-effort: browsers may
// block audio until the user interacts with the page (cook taps once → unlocked).
function playAlert(times = 3): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let t = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square'; // buzzy → more attention-grabbing
      osc.frequency.value = 988; // B5
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
      t += 0.32;
    }
    setTimeout(() => void ctx.close(), times * 340 + 250);
  } catch {
    // audio unavailable — silent fallback
  }
}

// Which kitchen events each role is alerted about.
const WATCH: Record<string, { status: KotStatus; title: string }[]> = {
  COOK: [{ status: 'NEW', title: '🍳 Yangi buyurtma!' }],
  MANAGER: [
    { status: 'NEW', title: '🍳 Yangi buyurtma' },
    { status: 'READY', title: '🔔 Taom tayyor' },
  ],
  OWNER: [
    { status: 'NEW', title: '🍳 Yangi buyurtma' },
    { status: 'READY', title: '🔔 Taom tayyor' },
  ],
  WAITER: [{ status: 'READY', title: '🔔 Taom tayyor!' }],
};

/**
 * Role-aware kitchen sound + popup. Cook hears a buzz on new tickets; waiters
 * hear it when their food is ready (kots are server-filtered to their orders).
 * Mounted once in the layout, polls every 4s. Restaurants only.
 */
export function useKotNotifier(): void {
  const { notification } = App.useApp();
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const org = useOrganization();
  const watch = WATCH[role] ?? [];
  const enabled = org.data?.businessType === 'RESTORAN' && watch.length > 0;

  const kots = useQuery({
    queryKey: ['kots'],
    queryFn: kitchenApi.kots,
    refetchInterval: enabled ? 4000 : false,
    enabled,
  });

  // Keys we've already alerted on: `${status}:${kotId}`.
  const seen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!enabled || !kots.data) return;

    // First load: remember current state without alerting (no startup burst).
    if (!seeded.current) {
      for (const k of kots.data) {
        for (const w of watch) {
          if (k.status === w.status) seen.current.add(`${w.status}:${k.id}`);
        }
      }
      seeded.current = true;
      return;
    }

    for (const w of watch) {
      for (const k of kots.data) {
        if (k.status !== w.status) continue;
        const key = `${w.status}:${k.id}`;
        if (seen.current.has(key)) continue;
        seen.current.add(key);
        notification.open({
          type: w.status === 'READY' ? 'success' : 'info',
          message: w.title,
          description: `${k.sale.table?.name ?? 'Olib ketish'} — ${k.items.map((i) => `${i.name}×${i.qty}`).join(', ')}`,
          duration: 12,
          placement: 'topRight',
        });
        playAlert();
      }
    }
  }, [kots.data, enabled, notification, watch]);
}
