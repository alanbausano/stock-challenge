import React, { useState } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WatchlistItem } from "../../types";
import { useWatchlist } from "../../context/WatchlistContext";
import { usePrices } from "../../context/PricesContext";

interface Props {
  item: WatchlistItem;
}

const SortableItem: React.FC<Props> = ({ item }) => {
  const { removeSymbol, setAlertPrice } = useWatchlist();
  const { prices } = usePrices();
  const live = prices[item.symbol];

  const [alertInput, setAlertInput] = useState(
    item.alertPrice !== null ? String(item.alertPrice) : "",
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAlertBlur = () => {
    const val = parseFloat(alertInput);
    setAlertPrice(item.symbol, isNaN(val) ? null : val);
  };

  const isBelow =
    live && item.alertPrice !== null && live.price < item.alertPrice;

  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 1 }}>
      <ListItem
        disablePadding
        sx={{
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px solid",
          borderColor: isBelow ? "error.main" : "divider",
          px: 1,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            color: "text.disabled",
            flexShrink: 0,
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        {/* Symbol + price */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Typography
            variant="caption"
            fontWeight={700}
            display="block"
            noWrap
            title={item.symbol}
            sx={{ lineHeight: 1.2 }}
          >
            {item.symbol}
          </Typography>
          <Typography
            variant="caption"
            color={isBelow ? "error" : "success.main"}
            display="block"
            sx={{ lineHeight: 1.2 }}
          >
            {live ? `$${live.price.toFixed(2)}` : "—"}
          </Typography>
        </Box>

        {/* Alert input */}
        <TextField
          size="small"
          value={alertInput}
          onChange={(e) => setAlertInput(e.target.value)}
          onBlur={handleAlertBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Alert"
          inputProps={{
            "aria-label": `Alert price for ${item.symbol}`,
            style: { fontSize: 11, padding: "4px 6px" },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 0 }}>
                $
              </InputAdornment>
            ),
          }}
          sx={{ width: 80, flexShrink: 0 }}
        />

        {/* Delete */}
        <Tooltip title="Remove">
          <IconButton
            size="small"
            onClick={() => removeSymbol(item.symbol)}
            aria-label={`Remove ${item.symbol}`}
            sx={{ flexShrink: 0 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </ListItem>
    </Box>
  );
};

export default SortableItem;
