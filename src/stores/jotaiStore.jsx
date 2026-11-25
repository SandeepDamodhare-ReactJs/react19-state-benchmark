import React, { useEffect, useMemo } from 'react';
import { atom, createStore, Provider, useAtomValue } from 'jotai';
import { createDeterministicRng, generateInitialItems } from '../telemetry/profilerStore';

const TickerCard = React.memo(function TickerCard({ itemAtom, isSelected, onSelect }) {
  const item = useAtomValue(itemAtom);
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

export function JotaiBenchmark({ count, freq, mutationRatio, filter, selectedId, onSelect }) {
  const { store, atoms } = useMemo(() => {
    const s = createStore();
    const initial = generateInitialItems(count);
    const atomList = initial.map((item) => atom(item));
    return { store: s, atoms: atomList };
  }, [count]);

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
      for (let b = 0; b < batchSize; b++) {
        const index = Math.floor(rng() * count);
        const delta = (rng() - 0.5) * 4;
        const price = Math.max(1, 100 + rng() * 400);
        const targetAtom = atoms[index];
        const prev = store.get(targetAtom);
        store.set(targetAtom, { ...prev, price, delta });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [count, freq, mutationRatio, store, atoms]);

  return (
    <Provider store={store}>
      <div className="grid">
        {visibleIds.map((idx) => (
          <TickerCard
            key={idx}
            itemAtom={atoms[idx]}
            isSelected={selectedId === idx}
            onSelect={onSelect}
          />
        ))}
      </div>
    </Provider>
  );
}
