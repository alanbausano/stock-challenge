import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { LivePrice } from '../types';
import { useWatchlist } from './WatchlistContext';
import { buildStreamUrl, extractPayload, fetchLivePrices } from '../services/binance';
import type { BinanceAggTrade } from '../services/binance';

// ─── Context ─────────────────────────────────────────────────────────────────

interface PricesContextValue {
  prices: Record<string, LivePrice>;
}

const PricesContext = createContext<PricesContextValue>({ prices: {} });

// ─── Provider ────────────────────────────────────────────────────────────────

export const PricesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { items } = useWatchlist();
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolsRef = useRef<string[]>([]);
  // ─── connect(): Opens a single combined WebSocket to Binance ──────────────
  // It always reads symbolsRef.current for the latest symbols.
  const connect = useCallback((symbols: string[]) => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    // Close the old WebSocket if one exists (e.g. when watchlist changes)
    wsRef.current?.close();

    // If the watchlist is empty, don't open any connection
    if (symbols.length === 0) return;

    // buildStreamUrl() creates a combined stream URL like:
    // wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade/ethusdt@aggTrade
    // This allows us to stream ALL coins over a SINGLE WebSocket connection.
    const url = buildStreamUrl(symbols, '@aggTrade');
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    // ─── onmessage: Fires every time Binance pushes a new aggregated trade ──
    // For high-volume coins like BTC, this fires 30-50 times per second.
    ws.onmessage = (event: MessageEvent) => {
      // extractPayload() parses the raw JSON string from the WebSocket.
      const payload = extractPayload(event.data as string) as BinanceAggTrade;

      // Guard: if the payload is missing the symbol (s) or price (p), skip it
      if (!payload?.s || !payload?.p) return;

      const price  = parseFloat(payload.p);   // "p" is a string like "65100.50" → convert to number
      const symbol = payload.s;               // "s" is the symbol string like "BTCUSDT"

      // Functional setState: React gives us the LATEST state (prev), we merge in the new price.
      // This pattern is required because onmessage fires rapidly and we must always
      // read the freshest state, not a stale closure from when the effect first ran.
      setPrices((prev) => {
        const existing = prev[symbol];
        return {
          ...prev,                // spread all existing prices
          [symbol]: {
            price,                                   // the new live price
            prevClose: existing?.prevClose ?? price,  // keep the original "previous close" for % change calculation.
                                                      // If this is the very first tick, prevClose = current price (0% change).
            timestamp: payload.T,                     // trade timestamp in unix ms
          },
        };
      });
    };

    // ─── onclose: Auto-reconnect after 3 seconds ────────────────────────────
    // WebSockets can disconnect for many reasons (network hiccups, Binance server rotation).
    ws.onclose = () => {
      reconnectTimer.current = setTimeout(() => connect(symbolsRef.current), 3000);
    };

    // ─── onerror: Force close → which triggers onclose → which auto-reconnects
    ws.onerror = () => ws.close();
  }, []);

  // ─── Main Effect: Runs when the watchlist symbols change ───────────────────
  useEffect(() => {
    const symbols = items.map((i) => i.symbol);
    // Keep the mutable ref in sync so the reconnect callback always has fresh data
    symbolsRef.current = symbols;
    // Open (or re-open) the WebSocket with the current symbols
    connect(symbols);

    // Instantly backfill prices via REST so low-volume altcoins don't spin endlessly
    setPrices((currentPrices) => {
      // Find symbols that don't have a price yet in our state
      const missing = symbols.filter((s) => !currentPrices[s]);
      if (missing.length > 0) {
        // fetchLivePrices hits GET /api/v3/ticker/price — returns in ~50ms
        fetchLivePrices(missing).then((map) => {
          setPrices((prev) => {
            const next = { ...prev };
            let changed = false;
            missing.forEach((s) => {
              // Only write the REST price if the WebSocket hasn't already beaten us to it.
              // This prevents the REST response from overwriting a more recent WebSocket price.
              if (map[s] !== undefined && !next[s]) {
                next[s] = { price: map[s], prevClose: map[s], timestamp: Date.now() };
                changed = true;
              }
            });
            // If nothing changed, return the same reference to avoid an unnecessary re-render
            return changed ? next : prev;
          });
        });
      }
      return currentPrices;
    });

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.symbol).join(',')]);

  return <PricesContext.Provider value={{ prices }}>{children}</PricesContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePrices = () => useContext(PricesContext);
