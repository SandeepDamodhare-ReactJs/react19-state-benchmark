import React, { useEffect, useMemo } from 'react';
import { createStore, useStore } from 'zustand';
import { createDeterministicRng, generateInitialItems } from '../telemetry/profilerStore';

const TickerCard = React.memo(function TickerCard({ store, index, isSelected, onSelect }) {
  const item = useStore(store, (s) => s.items[index]);
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

export function ZustandBenchmark({ count, freq, mutationRatio, filter, selectedId, onSelect }) {
  const store = useMemo(
    () =>
      createStore((set) => ({
        items: generateInitialItems(count),
        mutateBatch: (updates) =>
          set((state) => {
            const next = state.items.slice();
            for (const { index, price, delta } of updates) {
              next[index] = { ...next[index], price, delta };
            }
            return { items: next };
          })
      })),
    [count]
  );

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
      store.getState().mutateBatch(updates);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [count, freq, mutationRatio, store]);

  return (
    <div className="grid">
      {visibleIds.map((idx) => (
        <TickerCard
          key={idx}
          store={store}
          index={idx}
          isSelected={selectedId === idx}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
