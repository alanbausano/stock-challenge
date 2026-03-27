import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { searchBinanceSymbols } from '../../services/binance';
import { useWatchlist } from '../../context/WatchlistContext';

const StockSearch: React.FC = () => {
  const { addSymbol, items } = useWatchlist();
  const [inputValue, setInputValue]       = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 400);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const { data: options = [], isFetching } = useQuery({
    queryKey: ['binance-search', debouncedValue],
    queryFn:  () => searchBinanceSymbols(debouncedValue),
    enabled:  debouncedValue.length >= 1,
    staleTime: 60_000,
  });

  const handleAdd = () => {
    if (!selectedSymbol) return;
    addSymbol(selectedSymbol);
    setSelectedSymbol(null);
    setInputValue('');
  };

  const isAlreadyAdded = selectedSymbol
    ? items.some((i) => i.symbol === selectedSymbol)
    : false;

  return (
    <Box display="flex" gap={1} mb={2}>
      <Autocomplete
        fullWidth
        size="small"
        options={options}
        loading={isFetching}
        inputValue={inputValue}
        value={selectedSymbol}
        onInputChange={(_, v) => setInputValue(v.toUpperCase())}
        onChange={(_, v) => setSelectedSymbol(v)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search crypto (e.g. BTC)"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isFetching && <CircularProgress size={14} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Button
        variant="contained"
        size="small"
        disabled={!selectedSymbol || isAlreadyAdded}
        onClick={handleAdd}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {isAlreadyAdded ? 'Added' : 'Add'}
      </Button>
    </Box>
  );
};

export default StockSearch;
