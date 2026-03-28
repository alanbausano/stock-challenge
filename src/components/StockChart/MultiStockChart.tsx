import React, { useState } from "react";
import {
  Box,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useWatchlist } from "../../context/WatchlistContext";
import { useCandles } from "../../context/CandlesContext";
import type { BinanceInterval } from "../../services/binance";

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

const MultiStockChart: React.FC = () => {
  const { items } = useWatchlist();
  const { getChartData, hasData, isLoading } = useCandles();
  const [interval, setInterval] = useState<BinanceInterval>("5m");

  const chartData = getChartData(interval);

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6" fontWeight={700}>
          Price Chart
        </Typography>
        <ToggleButtonGroup
          value={interval}
          exclusive
          onChange={(_, v) => v && setInterval(v as BinanceInterval)}
          size="small"
          aria-label="Chart interval"
        >
          <ToggleButton value="5m" aria-label="5 minute interval">
            5m
          </ToggleButton>
          <ToggleButton value="15m" aria-label="15 minute interval">
            15m
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {items.length === 0 ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height={300}
        >
          <Typography color="text.disabled">
            Add crypto pairs to see the chart
          </Typography>
        </Box>
      ) : isLoading ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height={300}
          gap={2}
        >
          <CircularProgress size={32} />
          <Typography variant="caption" color="text.disabled">
            Loading historical candles from Binance…
          </Typography>
        </Box>
      ) : !hasData ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height={300}
        >
          <Typography color="text.disabled">Waiting for data…</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.07)"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#9e9e9e" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={100}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9e9e9e" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1e2e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => {
                const num = typeof value === "number" ? value : Number(value);
                return [`$${isNaN(num) ? "—" : num.toFixed(2)}`];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {items.map((item, idx) => (
              <Line
                key={item.symbol}
                type="monotone"
                dataKey={item.symbol}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default MultiStockChart;
