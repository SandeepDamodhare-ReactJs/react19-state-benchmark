import React, { useEffect, useMemo } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { createDeterministicRng, generateInitialItems } from '../telemetry/profilerStore';

const tickerSlice = createSlice({
  name: 'tickers',
  initialState: { items: [] },
  reducers: {
    initTickers(state, action) {
      state.items = action.payload;
    },
    applyBatchMutation(state, action) {
      for (const { index, price, delta } of action.payload) {
        if (state.items[index]) {
          state.items[index].price = price;
          state.items[index].delta = delta;
        }
      }
    }
  }
});

const TickerCard = React.memo(function TickerCard({ index, isSelected, onSelect }) {
  const item = useSelector((state) => state.tickers.items[index]);
  if (!item) return null;
  return (
    <div
      className={`card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item.id)}
      data-testid={`card-${item.id}`}
    >
      <div>{item.symbol}</div>
      <div className={`price ${item.delta >= 0 ? 'up' : 'down'}`}>
        ${item.price.toFixed(2)} ({item.delta >= 0 ? '+' : ''}{item.delta.toFixed(2)}%)
      </div>
    </div>
  );
});

function ReduxRunner({ count, freq, mutationRatio, filter, selectedId, onSelect }) {
  const dispatch = useDispatch();
  const visibleIds = useMemo(() => {
    const q = filter.toLowerCase();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const sym = `tkr-${String(i).padStart(4, '0')}`;
      if (!q || sym.includes(q)) ids.push(i);
    }
    return ids;
  }, [count, filter]);

  useEffect(() => {
    dispatch(tickerSlice.actions.initTickers(generateInitialItems(count)));
    const rng = createDeterministicRng(101);
    const batchSize = Math.max(1, Math.floor(count * mutationRatio));
    const intervalMs = Math.max(16, Math.floor(1000 / freq));

    const timer = setInterval(() => {
      const updates = [];
      for (let b = 0; b < batchSize; b++) {
        const index = Math.floor(rng() * count);
        const delta = (rng() - 0.5) * 4;
        const price = Math.max(1, 100 + rng() * 400);
        updates.push({ index, price, delta });
      }
      dispatch(tickerSlice.actions.applyBatchMutation(updates));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [count, freq, mutationRatio, dispatch]);

  return (
    <div className="grid">
      {visibleIds.map((idx) => (
        <TickerCard
          key={idx}
          index={idx}
          isSelected={selectedId === idx}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function ReduxBenchmark(props) {
  const store = useMemo(
    () => configureStore({ reducer: { tickers: tickerSlice.reducer } }),
    []
  );
  return (
    <Provider store={store}>
      <ReduxRunner {...props} />
    </Provider>
  );
}
