import React, { useEffect, useMemo } from 'react';
import { signal, batch } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { createDeterministicRng, generateInitialItems } from '../telemetry/profilerStore';

const TickerCard = React.memo(function TickerCard({ itemSignal, isSelected, onSelect }) {
  useSignals();
  const item = itemSignal.value;
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

export function SignalsBenchmark({ count, freq, mutationRatio, filter, selectedId, onSelect }) {
  const signalList = useMemo(() => {
    const initial = generateInitialItems(count);
    return initial.map((item) => signal(item));
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
      batch(() => {
        for (let b = 0; b < batchSize; b++) {
          const index = Math.floor(rng() * count);
          const delta = (rng() - 0.5) * 4;
          const price = Math.max(1, 100 + rng() * 400);
          const prev = signalList[index].peek();
          signalList[index].value = { ...prev, price, delta };
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [count, freq, mutationRatio, signalList]);

  return (
    <div className="grid">
      {visibleIds.map((idx) => (
        <TickerCard
          key={idx}
          itemSignal={signalList[idx]}
          isSelected={selectedId === idx}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
