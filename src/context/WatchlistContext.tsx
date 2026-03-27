import React, { createContext, useCallback, useContext, useReducer } from 'react';
import type { WatchlistItem } from '../types';

// ─── State Shape ──────────────────────────────────────────────────────────────
// The entire watchlist is one flat array of items, each with a symbol and an
// optional alert price. This is the single source of truth that both PricesContext
// and CandlesContext read from to know WHICH coins to fetch and stream.

interface WatchlistState {
  items: WatchlistItem[];
}

type Action =
  | { type: 'ADD'; symbol: string }
  | { type: 'REMOVE'; symbol: string }
  | { type: 'SET_ALERT'; symbol: string; price: number | null }
  | { type: 'REORDER'; items: WatchlistItem[] };
function reducer(state: WatchlistState, action: Action): WatchlistState {
  switch (action.type) {
    case 'ADD':
      if (state.items.some((i) => i.symbol === action.symbol)) return state;
      return { items: [...state.items, { symbol: action.symbol, alertPrice: null }] };
    case 'REMOVE':
      return { items: state.items.filter((i) => i.symbol !== action.symbol) };
    case 'SET_ALERT':
      return {
        items: state.items.map((i) =>
          i.symbol === action.symbol ? { ...i, alertPrice: action.price } : i,
        ),
      };
    case 'REORDER':
      return { items: action.items };
    default:
      return state;
  }
}

interface WatchlistContextValue {
  items: WatchlistItem[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  setAlertPrice: (symbol: string, price: number | null) => void;
  reorder: (items: WatchlistItem[]) => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

const INITIAL_SYMBOLS = ['XAUTUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    items: INITIAL_SYMBOLS.map((s) => ({ symbol: s, alertPrice: null })),
  });

  const addSymbol = useCallback((symbol: string) => dispatch({ type: 'ADD', symbol }), []);
  const removeSymbol = useCallback((symbol: string) => dispatch({ type: 'REMOVE', symbol }), []);
  const setAlertPrice = useCallback(
    (symbol: string, price: number | null) => dispatch({ type: 'SET_ALERT', symbol, price }),
    [],
  );
  const reorder = useCallback((items: WatchlistItem[]) => dispatch({ type: 'REORDER', items }), []);

  return (
    <WatchlistContext.Provider value={{ items: state.items, addSymbol, removeSymbol, setAlertPrice, reorder }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside WatchlistProvider');
  return ctx;
};
