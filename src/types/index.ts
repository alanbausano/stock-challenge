// Shared TypeScript types for the entire app

export interface WatchlistItem {
  symbol: string;
  alertPrice: number | null;
}

export interface LivePrice {
  price: number;
  prevClose: number;
  timestamp: number;
}

export interface Candle {
  time: number; // unix timestamp seconds
  close: number;
}


