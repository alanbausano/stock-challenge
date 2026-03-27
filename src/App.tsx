import React, { useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Tooltip,
} from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import WatchlistSidebar from "./components/Watchlist/WatchlistSidebar";
import StockCardGrid from "./components/StockCards/StockCardGrid";
import MultiStockChart from "./components/StockChart/MultiStockChart";
import { useWatchlist } from "./context/WatchlistContext";
import { usePrices } from "./context/PricesContext";
import { useAlerts } from "./hooks/useAlerts";
import { requestNotificationPermission } from "./services/firebase";

export const DRAWER_WIDTH = 300;
export const COLLAPSED_WIDTH = 64;

const Dashboard: React.FC = () => {
  const { items } = useWatchlist();
  const { prices } = usePrices();
  const { user, logout } = useAuth0();

  useAlerts(items, prices);

  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(10px)",
          ml: `${COLLAPSED_WIDTH}px`,
          width: `calc(100% - ${COLLAPSED_WIDTH}px)`,
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              flexGrow: 1,
              letterSpacing: 1,
              display: "flex",
              justifyContent: "center",
            }}
          >
            📊 StockDash
          </Typography>
          {user && (
            <Box display="flex" alignItems="center" gap={1.5}>
              <Tooltip title={user.email ?? ""}>
                <Avatar
                  src={user.picture}
                  alt={user.name}
                  sx={{ width: 32, height: 32 }}
                />
              </Tooltip>
              <Typography variant="body2" color="text.secondary">
                {user.name}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar now manages its own open/close state */}
      <WatchlistSidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${COLLAPSED_WIDTH}px`, // Fixed margin: drawer expansion floats over top!
          mt: "64px",
          p: 3,
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box sx={{ width: "100%" }}>
          <StockCardGrid />
          <MultiStockChart />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
