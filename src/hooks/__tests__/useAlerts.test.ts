import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlerts } from '../useAlerts';
import type { WatchlistItem, LivePrice } from '../../types';

// Mock the Notification API
const mockNotification = vi.fn();

beforeEach(() => {
  vi.stubGlobal('Notification', Object.assign(mockNotification, { permission: 'granted' }));
  mockNotification.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const makeItems = (): WatchlistItem[] => [
  { symbol: 'AAPL', alertPrice: 150 },
];

const makePrices = (price: number): Record<string, LivePrice> => ({
  AAPL: { price, prevClose: 160, timestamp: Date.now() },
});

describe('useAlerts', () => {
  it('fires a notification when price drops below alert', () => {
    const items = makeItems();
    const prices = makePrices(140); // below 150 alert

    renderHook(() => useAlerts(items, prices));

    expect(mockNotification).toHaveBeenCalledTimes(1);
    expect(mockNotification).toHaveBeenCalledWith(
      '📉 AAPL alert',
      expect.objectContaining({ body: expect.stringContaining('140.00') }),
    );
  });

  it('does NOT fire when price is above alert', () => {
    const items = makeItems();
    const prices = makePrices(160); // above 150 alert

    renderHook(() => useAlerts(items, prices));

    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('throttles to one notification per 60 seconds', () => {
    const items = makeItems();
    const prices = makePrices(140);

    // First render: should send
    const { rerender } = renderHook(() => useAlerts(items, prices));
    expect(mockNotification).toHaveBeenCalledTimes(1);

    // Re-render within 60s: should NOT send again
    rerender();
    expect(mockNotification).toHaveBeenCalledTimes(1);
  });

  it('fires again after 60 seconds have passed', () => {
    const items = makeItems();
    let prices = makePrices(140);

    // Use a wrapper that reads current prices from a closure
    let currentPrices = prices;
    const { rerender } = renderHook(() => useAlerts(items, currentPrices));
    expect(mockNotification).toHaveBeenCalledTimes(1);

    // Advance time by 60s + re-render with same args to trigger useEffect again
    vi.advanceTimersByTime(60_001);
    currentPrices = makePrices(140); // new object reference forces useEffect
    rerender();

    // Second notification should fire now that 60s have elapsed
    expect(mockNotification).toHaveBeenCalledTimes(2);
  });

  it('does not fire when alertPrice is null', () => {
    const items: WatchlistItem[] = [{ symbol: 'AAPL', alertPrice: null }];
    const prices = makePrices(100);

    renderHook(() => useAlerts(items, prices));

    expect(mockNotification).not.toHaveBeenCalled();
  });
});
