// Subscription state with a 3-day grace period after the end date.
export const GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

export type SubState = 'active' | 'grace' | 'expired';

export interface SubscriptionStatus {
  state: SubState;
  daysLeft: number | null; // null = unlimited
  endsAt: string | null;
}

export function subscriptionStatus(endsAt: Date | null): SubscriptionStatus {
  if (!endsAt) {
    return { state: 'active', daysLeft: null, endsAt: null };
  }
  const now = Date.now();
  const end = endsAt.getTime();
  const daysLeft = Math.ceil((end - now) / DAY_MS);
  let state: SubState;
  if (now <= end) state = 'active';
  else if (now <= end + GRACE_DAYS * DAY_MS) state = 'grace';
  else state = 'expired';
  return { state, daysLeft, endsAt: endsAt.toISOString() };
}

/** Selling is allowed unless the subscription is fully expired (past grace). */
export function canSell(endsAt: Date | null): boolean {
  return subscriptionStatus(endsAt).state !== 'expired';
}
