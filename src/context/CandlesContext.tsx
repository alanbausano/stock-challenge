import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useWatchlist } from './WatchlistContext';
import { fetchKlines, buildStreamUrl, extractPayload } from '../services/binance';
import type { BinanceCandle, BinanceKlineMsg, BinanceInterval } from '../services/binance';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChartRow {
  time: string;
  [symbol: string]: number | string;
}

// candlesMap[symbol][interval] = sorted candle array
type CandlesMap = Record<string, Record<BinanceInterval, BinanceCandle[]>>;

// ─── Why is this a Context? ──────────────────────────────────────────────────
// We use React Context here (rather than a plain hook) for two key reasons:
//
// 1. SINGLE WebSocket INSTANCES: If we used a plain hook, every component that
//    called useCandles() would create its OWN WebSocket connections and REST fetches.
//    With Context, the Provider is mounted ONCE in the component tree (in main.tsx),
//    and all consumers share the exact same data and connections.
//
// 2. FUTURE EXTENSIBILITY: If we later add a second chart component (e.g., a
//    candlestick chart, a volume chart, or a detail panel), they can all consume
//    the same shared candle data via useCandles() without duplicating any logic,
//    WebSocket connections, or API calls.

interface CandlesContextValue {
  getChartData: (interval: BinanceInterval) => ChartRow[];
  hasData: boolean;
  isLoading: boolean;
}

const CandlesContext = createContext<CandlesContextValue>({
  getChartData: () => [],
  hasData: false,
  isLoading: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INTERVALS: BinanceInterval[] = ['5m', '15m'];

// Converts a unix timestamp in milliseconds to a human-readable time string
// like "14:30" for the chart's X-axis labels.
function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const CandlesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read the watchlist to know WHICH coins need chart data
  const { items } = useWatchlist();
  const symbols = items.map((i) => i.symbol);

  // ─── THE KEY OPTIMIZATION: useRef vs useState ─────────────────────────────
  // candlesRef stores ALL candle data for ALL symbols and ALL intervals.
  // We use useRef instead of useState because:
  //   - WebSocket kline events can arrive 10+ times per second per symbol.
  //   - If we stored candles in useState, EVERY incoming event would trigger a
  //     full React re-render and SVG chart redraw — crashing the browser.
  //   - With useRef, we can silently write data without triggering any re-render.
  //   - We only trigger a re-render when WE decide to, via the flush() function below.
  const candlesRef = useRef<CandlesMap>({});

  // `tick` is a dummy counter. Its only purpose is to force a re-render when incremented.
  // The chart component (MultiStockChart) depends on getChartData(), which is recreated
  // whenever `tick` changes, causing the chart to re-read from candlesRef and redraw.
  const [tick, setTick]         = useState(0);
  const [isLoading, setLoading] = useState(false);

  // WebSocket refs
  const wsRef5m  = useRef<WebSocket | null>(null);
  const wsRef15m = useRef<WebSocket | null>(null);

  // flush() increments the tick counter by 1 → React re-renders → MultiStockChart
  // calls getChartData() → reads fresh data from candlesRef → chart redraws.
  const flush = useCallback(() => setTick((n) => n + 1), []);

  // ─── Effect 1: Load historical candles for new symbols ────────────────────
  // Runs when the symbol list changes (user adds/removes a coin).
  useEffect(() => {
    if (symbols.length === 0) return;

    // Only fetch candles for symbols we haven't cached yet.
    // If a user already has BTCUSDT and adds ETHUSDT, we only fetch ETHUSDT.
    const newSymbols = symbols.filter(
      (s) => !candlesRef.current[s]?.['5m']?.length,
    );

    // If all symbols are already cached, just trigger a re-render so the chart
    // shows the existing data, and exit early.
    if (newSymbols.length === 0) {
      flush();
      return;
    }

    setLoading(true);
    const fetches = newSymbols.flatMap((symbol) =>
      INTERVALS.map((interval) =>
        // fetchKlines hits: GET /api/v3/klines?symbol=BTCUSDT&interval=5m&limit=100
        // Returns an array of 100 BinanceCandle objects with { time, open, high, low, close, volume }
        fetchKlines(symbol, interval, 100).then((candles) => {
          // Initialize the symbol's storage if it doesn't exist yet
          if (!candlesRef.current[symbol]) {
            candlesRef.current[symbol] = { '5m': [], '15m': [] };
          }
          // Write the 100 historical candles directly into the ref.
          // This does NOT trigger any React re-render.
          candlesRef.current[symbol][interval] = candles;
        }),
      ),
    );

    // Wait for ALL parallel fetches to complete, then:
    Promise.all(fetches)
      .then(() => { setLoading(false); flush(); })
      // ⬆️ Hide the loading spinner, then flush() triggers ONE single re-render
      // that causes the chart to read all the fresh data and draw the full historical lines.
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')]);

  // ─── Effect 2: Purge candle data for removed symbols ──────────────────────
  // When the user removes a coin from the watchlist, we clean up its data
  // from memory to prevent stale data from appearing if they re-add it later.
  useEffect(() => {
    const symSet = new Set(symbols);
    Object.keys(candlesRef.current).forEach((s) => {
      if (!symSet.has(s)) delete candlesRef.current[s];
    });
  }, [symbols.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── connectKlineWs: Opens a WebSocket for live kline (candlestick) data ──
  // This is a reusable function called twice: once for 5m and once for 15m.
  // Each WebSocket receives real-time candle updates from Binance.
  const connectKlineWs = useCallback(
    (wsRef: React.MutableRefObject<WebSocket | null>, suffix: string, interval: BinanceInterval) => {
      // Close any existing connection for this interval
      wsRef.current?.close();
      if (symbols.length === 0) return;

      // buildStreamUrl creates: wss://stream.binance.com:9443/stream?streams=btcusdt@kline_5m/ethusdt@kline_5m
      const url = buildStreamUrl(symbols, suffix);
      const ws  = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event: MessageEvent) => {
        // Parse the JSON payload from the WebSocket message.
        // Binance kline payload structure: { s: "BTCUSDT", k: { t, o, h, l, c, v, ... } }
        const payload = extractPayload(event.data as string) as BinanceKlineMsg;
        if (!payload?.k) return;

        const { s: symbol, k } = payload;
        const map = candlesRef.current[symbol];
        if (!map) return;  // Ignore data for symbols we're not tracking

        // Build a clean BinanceCandle object from the raw kline data.
        // Binance sends prices as strings (e.g. "65100.50"), so we parseFloat each one.
        const candle: BinanceCandle = {
          time:   k.t,                   // Kline open time in unix ms (e.g. the start of the 5-minute window)
          open:   parseFloat(k.o),       // Opening price of this candle
          high:   parseFloat(k.h),       // Highest price during this candle
          low:    parseFloat(k.l),       // Lowest price during this candle
          close:  parseFloat(k.c),       // Current/closing price (this is what we plot on the chart)
          volume: parseFloat(k.v),       // Total traded volume during this candle
        };

        // Determine whether this candle belongs to the current "open" bucket or a new one:
        const arr = map[interval];
        if (!arr.length) {
          // Very first candle ever received — just push it
          arr.push(candle);
        } else if (arr[arr.length - 1].time === candle.time) {
          // SAME time bucket as the last candle → OVERWRITE it.
          // This is how we animate the chart: Binance keeps sending updated OHLC
          // values for the currently "open" candle every few seconds. We replace
          // the last array element so the chart's rightmost point bounces in real-time.
          arr[arr.length - 1] = candle;
        } else {
          // DIFFERENT time bucket → the previous candle has finalized, push a new one.
          // This extends the chart line to the right.
          arr.push(candle);
        }

        // Signal React to re-render. The chart will call getChartData(), which reads
        // the updated candlesRef and produces fresh ChartRow[] data for Recharts.
        flush();
      };

      ws.onerror = () => ws.close();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbols.join(','), flush],
  );

  // ─── Effect 3: Open both kline WebSockets ─────────────────────────────────
  // We maintain TWO simultaneous WebSocket connections:
  //   1. @kline_5m  → updates the 5-minute candle array in real-time
  //   2. @kline_15m → updates the 15-minute candle array in real-time
  // This way, when the user toggles between 5m/15m in the UI, the data is
  // already there and the chart switches instantly without any loading delay.
  useEffect(() => {
    connectKlineWs(wsRef5m,  '@kline_5m',  '5m');
    connectKlineWs(wsRef15m, '@kline_15m', '15m');

    // Cleanup: close both WebSockets when symbols change or component unmounts
    return () => {
      wsRef5m.current?.close();
      wsRef15m.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')]);

  // ─── getChartData(): Transforms raw candle arrays into Recharts-compatible rows
  // This is the function that <MultiStockChart /> calls to get its data.
  // It merges all symbols' candles for the selected interval into a single sorted
  // array of ChartRow objects that Recharts can directly render as lines.
  const getChartData = useCallback(
    (interval: BinanceInterval): ChartRow[] => {
      // Step 1: Collect every unique timestamp across ALL symbols for this interval.
      // Different coins may not have candles at the exact same time if they were
      // added at different moments, so we union all timestamps.
      const allTimes = new Set<number>();
      symbols.forEach((s) => {
        candlesRef.current[s]?.[interval]?.forEach((c) => allTimes.add(c.time));
      });

      // Step 2: Sort timestamps chronologically and build one ChartRow per timestamp.
      return Array.from(allTimes)
        .sort((a, b) => a - b)
        .map((t) => {
          // Each row starts with a human-readable time string for the X-axis label
          const row: ChartRow = { time: formatTime(t) };

          // For each symbol, find the candle at this timestamp and add its closing price.
          // Result: { time: "14:30", BTCUSDT: 65100.5, ETHUSDT: 3200.1 }
          symbols.forEach((s) => {
            const match = candlesRef.current[s]?.[interval]?.find((c) => c.time === t);
            if (match !== undefined) row[s] = match.close;
          });
          return row;
        });
    },
    // ⬆️ This function is recreated whenever `tick` changes (via flush()).
    // When tick changes → getChartData gets a new reference → MultiStockChart re-renders
    // → calls getChartData() → reads the latest data from candlesRef → chart redraws.
    // This is the bridge between the silent useRef writes and the visible chart updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, symbols.join(',')],
  );

  // hasData is a simple boolean: true if at least one symbol has at least one candle.
  // Used by MultiStockChart to decide whether to show the chart or a "waiting" message.
  const hasData = symbols.some((s) =>
    (candlesRef.current[s]?.['5m']?.length ?? 0) > 0,
  );

  return (
    <CandlesContext.Provider value={{ getChartData, hasData, isLoading }}>
      {children}
    </CandlesContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCandles = () => useContext(CandlesContext);
