import React from "react";
import {
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Skeleton,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useWatchlist } from "../../context/WatchlistContext";
import { usePrices } from "../../context/PricesContext";

const COLORS = [
  "#6C63FF",
  "#FF6584",
  "#43D9AD",
  "#FFB84C",
  "#4FC3F7",
  "#EF5350",
  "#66BB6A",
  "#AB47BC",
];

const StockCard: React.FC<{
  symbol: string;
  alertPrice: number | null;
  colorIndex: number;
}> = ({ symbol, alertPrice, colorIndex }) => {
  const { prices } = usePrices();
  const live = prices[symbol];

  const isBelow = live && alertPrice !== null && live.price < alertPrice;
  const changePercent = live
    ? ((live.price - live.prevClose) / live.prevClose) * 100
    : null;
  const isPositive = changePercent !== null && changePercent >= 0;
  const alertColor = isBelow
    ? "error.main"
    : alertPrice !== null
      ? "success.main"
      : undefined;
  const accentColor = COLORS[colorIndex % COLORS.length];

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: isBelow ? "error.main" : "divider",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        "&:hover": { boxShadow: 4 },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: isBelow ? "error.main" : accentColor,
        },
      }}
    >
      {/* Alert badge — absolutely positioned top-right, never affects card height */}
      {alertPrice !== null && (
        <Chip
          label={`⚡ $${alertPrice.toFixed(2)}`}
          size="small"
          color={isBelow ? "error" : "default"}
          variant="outlined"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            fontSize: 10,
            height: 20,
            zIndex: 1,
          }}
        />
      )}

      <CardContent sx={{ pt: 2.5 }}>
        <Typography variant="overline" color="text.secondary" lineHeight={1}>
          {symbol}
        </Typography>

        {live ? (
          <>
            <Typography
              variant="h5"
              fontWeight={700}
              color={alertColor}
              sx={{ my: 0.5, transition: "color 0.3s" }}
            >
              ${live.price.toFixed(2)}
            </Typography>
            <Chip
              size="small"
              icon={
                isPositive ? (
                  <TrendingUpIcon fontSize="small" />
                ) : (
                  <TrendingDownIcon fontSize="small" />
                )
              }
              label={`${isPositive ? "+" : ""}${changePercent!.toFixed(2)}%`}
              color={isPositive ? "success" : "error"}
              variant="outlined"
            />
          </>
        ) : (
          <>
            <Skeleton variant="text" width={100} height={40} />
            <Skeleton variant="text" width={70} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const StockCardGrid: React.FC = () => {
  const { items } = useWatchlist();

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
        No crypto pairs in watchlist yet.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {items.map((item, idx) => (
        <Grid key={item.symbol} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StockCard
            symbol={item.symbol}
            alertPrice={item.alertPrice}
            colorIndex={idx}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default StockCardGrid;
