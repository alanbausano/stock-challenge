import { useEffect, useRef } from 'react';
import type { WatchlistItem } from '../types';
import type { LivePrice } from '../types';

const THROTTLE_MS = 60_000;

/**
 * Fires a browser notification when a stock price drops below its alert threshold.
 * Throttled to one notification per symbol per 60 seconds.
 */
export function useAlerts(
  items: WatchlistItem[],
  prices: Record<string, LivePrice>,
): void {
  // Map of symbol -> last notification timestamp
  const lastNotifiedAt = useRef<Record<string, number>>({});

  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    items.forEach((item) => {
      if (item.alertPrice === null) return;

      const live = prices[item.symbol];
      if (!live) return;

      if (live.price < item.alertPrice) {
        const now = Date.now();
        const lastAt = lastNotifiedAt.current[item.symbol] ?? 0;

        if (now - lastAt >= THROTTLE_MS) {
          lastNotifiedAt.current[item.symbol] = now;
          new Notification(`📉 ${item.symbol} alert`, {
            body: `Price $${live.price.toFixed(2)} is below your alert of $${item.alertPrice.toFixed(2)}`,
          });
        }
      }
    });
  }, [items, prices]);
}
