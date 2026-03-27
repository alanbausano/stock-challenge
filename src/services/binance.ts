// ─── Binance Market Data Service ──────────────────────────────────────────────
// No API key required for public market data endpoints.

const BASE_REST = 'https://api.binance.com/api/v3';
const BASE_WS   = 'wss://stream.binance.com:9443';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BinanceCandle {
  time:   number; // open-time unix ms
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface BinanceAggTrade {
  s: string; // symbol
  p: string; // price (string)
  T: number; // trade time ms
}

export interface BinanceKlineMsg {
  s: string; // symbol
  k: {
    t: number;  // kline start time ms
    o: string;
    h: string;
    l: string;
    c: string;  // close price
    v: string;
    x: boolean; // is the kline closed?
    i: string;  // interval
  };
}

export type BinanceInterval = '5m' | '15m';

// ─── REST: Historical candles ─────────────────────────────────────────────────

export async function fetchKlines(
  symbol: string,
  interval: BinanceInterval,
  limit = 100,
): Promise<BinanceCandle[]> {
  const url = `${BASE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);

  const raw: Array<[number, string, string, string, string, string]> = await res.json();
  return raw.map(([t, o, h, l, c, v]) => ({
    time:   t,
    open:   parseFloat(o),
    high:   parseFloat(h),
    low:    parseFloat(l),
    close:  parseFloat(c),
    volume: parseFloat(v),
  }));
}

// ─── REST: Symbol search (USDT pairs) ────────────────────────────────────────

let symbolCachePromise: Promise<string[]> | null = null;

export async function searchBinanceSymbols(query: string): Promise<string[]> {
  // If no cache exists, initialize a single shared Promise
  if (!symbolCachePromise) {
    symbolCachePromise = fetch(`${BASE_REST}/exchangeInfo`)
      .then((res) => {
        if (!res.ok) throw new Error(`Binance info error: ${res.status}`);
        return res.json();
      })
      .then((data: { symbols: Array<{ symbol: string; quoteAsset: string; status: string }> }) => 
        data.symbols
          .filter((s) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s) => s.symbol)
      )
      .catch((err) => {
        // Clear cache so it can successfully retry on failure
        symbolCachePromise = null;
        throw err;
      });
  }
  
  // All overlapping calls will seamlessly wait for this exact SAME promise!
  const symbols = await symbolCachePromise;
  const q = query.toUpperCase();
  return symbols.filter((s) => s.includes(q)).slice(0, 10);
}

export async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  
  const query = symbols.length === 1 
    ? `symbol=${symbols[0]}` 
    : `symbols=${JSON.stringify(symbols)}`;

  try {
    const res = await fetch(`${BASE_REST}/ticker/price?${query}`);
    if (!res.ok) return {};
    const data = await res.json();
    
    const map: Record<string, number> = {};
    if (Array.isArray(data)) {
      data.forEach((item) => { map[item.symbol] = parseFloat(item.price); });
    } else {
      map[data.symbol] = parseFloat(data.price);
    }
    return map;
  } catch {
    return {};
  }
}

// ─── WebSocket helpers ────────────────────────────────────────────────────────

/**
 * Build a Binance combined-stream WebSocket URL.
 * e.g. buildStreamUrl(['BTCUSDT','ETHUSDT'], '@aggTrade')
 *   → wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade/ethusdt@aggTrade
 */
export function buildStreamUrl(symbols: string[], suffix: string): string {
  if (symbols.length === 0) return '';
  const streams = symbols.map((s) => `${s.toLowerCase()}${suffix}`).join('/');
  return symbols.length === 1
    ? `${BASE_WS}/ws/${streams}`            // single-stream endpoint
    : `${BASE_WS}/stream?streams=${streams}`; // combined endpoint
}

/**
 * Extract the payload from a Binance message, handling both
 * single-stream and combined-stream formats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPayload(raw: string): any {
  const msg = JSON.parse(raw) as Record<string, unknown>;
  // combined stream wraps data: { stream, data }
  return 'data' in msg ? msg.data : msg;
}
