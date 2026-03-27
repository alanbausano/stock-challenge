import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './auth/ProtectedRoute';
import { WatchlistProvider } from './context/WatchlistContext';
import { PricesProvider } from './context/PricesContext';
import { CandlesProvider } from './context/CandlesContext';
import App from './App';
import theme from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN as string}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID as string}
      authorizationParams={{ redirect_uri: window.location.origin }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ProtectedRoute>
            <WatchlistProvider>
              <PricesProvider>
                <CandlesProvider>
                  <App />
                </CandlesProvider>
              </PricesProvider>
            </WatchlistProvider>
          </ProtectedRoute>
        </ThemeProvider>
      </QueryClientProvider>
    </Auth0Provider>
);

