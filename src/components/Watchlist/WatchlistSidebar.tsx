import React, { useState } from 'react';
import { Box, Divider, Drawer, List, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import StockSearch from './StockSearch';
import SortableItem from './SortableItem';
import { useWatchlist } from '../../context/WatchlistContext';
import { DRAWER_WIDTH, COLLAPSED_WIDTH } from '../../App';

const WatchlistSidebar: React.FC = () => {
  const { items, reorder } = useWatchlist();
  const [open, setOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.symbol === active.id);
    const newIdx = items.findIndex((i) => i.symbol === over.id);
    reorder(arrayMove(items, oldIdx, newIdx));
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          overflowX: 'hidden',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
          bgcolor: 'background.default',
          borderRight: '1px solid',
          borderColor: 'divider',
          top: 0,
          height: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 2,
        },
      }}
    >
      {/* Drawer Header with toggle button */}
      <Box 
        sx={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: open ? 'space-between' : 'center',
          px: open ? 2 : 0,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        {open && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ opacity: open ? 1 : 0 }}>
            📈 Watchlist
          </Typography>
        )}
        <IconButton onClick={() => setOpen(!open)} aria-label="Toggle drawer">
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      {/* Drawer Content */}
      <Box 
        p={open ? 2 : 1} 
        sx={{ 
          opacity: open ? 1 : 0, 
          transition: 'opacity 0.2s', 
          pointerEvents: open ? 'auto' : 'none' 
        }}
      >
        <StockSearch />
        <Divider sx={{ mb: 1.5 }} />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.symbol)} strategy={verticalListSortingStrategy}>
            <List disablePadding>
              {items.map((item) => (
                <SortableItem key={item.symbol} item={item} />
              ))}
            </List>
          </SortableContext>
        </DndContext>
        {items.length === 0 && open && (
          <Typography variant="body2" color="text.disabled" textAlign="center" mt={4}>
            Add a crypto pair to get started
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default WatchlistSidebar;
