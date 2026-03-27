# Architecture & Challenge Walkthrough

This document outlines the architectural decisions and data-flow patterns implemented to solve the core requirements of the frontend technical challenge.

## 1. The Real-Time Data Flow (Binance API)

The core requirement was to display a constantly updating multi-asset chart alongside live price cards. Initially, Finnhub was used, but due to strict API rate-limits and non-existent after-hours data for traditional stocks, the data-layer was cleanly swapped to **Binance's 24/7 public WebSocket & REST APIs**.

### How Data Moves:
1. **Search & Addition:** The `<StockSearch />` component uses TanStack Query to fetch and cache `/api/v3/exchangeInfo`. The user searches for a ticker (e.g., `BTC`) and adds it. `WatchlistContext` stores the symbol.
2. **PricesContext (Live Ticker):** Reacts to the new watchlist state. It calculates a combined WebSocket URL (`wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade`) and maintains exactly one persistent socket. As trades flow in, it updates a shared React state dictionary mapping `Symbol -> LivePrice`.
3. **CandlesContext (Historical + Live Charting):**
   - **Phase 1 (REST Backfill):** Instantly bulk-fetches the last 100 historical candles (`5m` and `15m` intervals) from the REST `/klines` endpoint. This guarantees the chart renders fully on page load without waiting.
   - **Phase 2 (WebSocket Tail-Update):** Connects to the `@kline_5m` and `@kline_15m` WebSocket streams. Instead of writing our own complex client-side bucketing math, Binance's server sends us the mathematically accurate open/high/low/close ticks for the currently "open" candle. The context intercepts these, merges them into the tail of the historical array, and triggers a re-render.

## 2. State Management

Instead of creating a massive monolithic Redux store, state was tightly scoped using **React Context** to prevent unnecessary cross-component re-renders:
- `WatchlistContext`: Manages user actions (Add, Remove, Reorder via DnD, Set Alert Price).
- `PricesContext`: Subscribes strictly to live trades. Triggers re-renders on the `<StockCardGrid />` 10+ times a second.
- `CandlesContext`: Highly optimized. It stores the massive array of chart candles inside a `useRef` to completely bypass React's render cycles when data arrives. It only triggers a UI render (`setTick`) when a candle meaningfully changes or the interval is toggled.

## 3. Sortable Watchlist & UX

- **Mini-Variant Drawer:** The layout uses a fixed, permanent drawer (`WatchlistSidebar`). When collapsed, it occupies a 64px vertical strip ensuring the main `1200px` dashboard layout stays 100% fluid and perfectly centered regardless of monitor size. When expanded, it elevates its `z-index` to float over the dashboard without aggressively causing layout shift.
- **Drag and Drop Engine:** Powered by `@dnd-kit`. When the `DragEndEvent` fires, the array is cleanly sliced, mutated, and `reorder()` fires the synchronized new array into the context.

## 4. Notifications & Push Alerts

The technical challenge requested push notification functionality (mapped out initially for Firebase Cloud Messaging). 

**The Challenge:** FCM (`getToken()`) is designed strictly for *sever-sent* push notifications. A frontend application cannot push payloads to itself via FCM without routing through a Node.js backend.
**The Solution:** The `useAlerts` hook was engineered to bypass Firebase entirely and invoke the browser's native `Notification` API directly. 
- It tracks the live price dictionary against the user's `alertPrice`.
- If a price drops below the threshold, it triggers a native OS notification.
- **Throttling:** A `useRef` dictionary tracks the `lastNotifiedAt` timestamp for each symbol, mathematically blocking the OS from spamming the user more than once every 60 seconds.

## 5. Security & Auth0

The application shell is fully structurally wrapped in `<Auth0Provider>` with environment variable injection. The `<ProtectedRoute>` wrapper guarantees that `WatchlistContextMenu`, `PricesContext`, and the main `App` are absolutely inaccessible without a valid JWT session. 
*(Note: During development, the internal return inside `ProtectedRoute` was temporarily bypassed to dramatically accelerate iteration speed without needing constant browser re-authentication).*
