# StockDash 📈

A real-time cryptocurrency dashboard built as a technical challenge to demonstrate modern React frontend architecture, live WebSocket streaming, and state management.

## Features

- **Real-Time Data Streams**: Integrates directly with Binance's `@aggTrade` and `@kline` WebSockets for zero-latency live prices and candlestick chart updates.
- **Historical Data**: Uses Binance's REST `/klines` API seamlessly in conjunction with WebSockets to draw historical price charts instantly on page load.
- **Customizable Watchlist**: A drag-and-drop sortable watchlist (`@dnd-kit`) that persists in an elegant mini-variant collapsible drawer.
- **Interactive Chart** (`recharts`): A consolidated line chart displaying all active watchlist assets simultaneously across different timeframes (5m, 15m).
- **In-App Price Alerts**: Users can configure custom price alerts that trigger native OS push notifications (using the browser's `Notification` API) when assets drop below a defined threshold.
- **Authentication Ready**: Configured with Auth0 for secure route protection (currently bypassed in `ProtectedRoute.tsx` to facilitate faster local development).

## Tech Stack

- **Framework:** React 18 / Vite
- **Language:** TypeScript
- **Styling & UI:** Material-UI (MUI) v5
- **Icons**: MUI Icons
- **State Management & Caching:** React Context + TanStack Query
- **Charting:** Recharts
- **Drag & Drop:** `@dnd-kit/core` & `@dnd-kit/sortable`

## How to Run Locally

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your Auth0/Firebase credentials (note: Binance APIs are completely public and require no keys).

```env
# Auth0
VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_auth0_client_id

# Firebase (for future FCM remote-push integrations)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start the Development Server
```bash
npm run dev
```
Open your browser to `http://localhost:5173`. Wait roughly 60 seconds if you encounter rate-limiting errors from successive Vite hot-reloads during active development.

### 4. Run Tests
The repository includes unit tests to verify the integrity of the real-time candle aggregation and alert throttling logic.
```bash
npm test
```
