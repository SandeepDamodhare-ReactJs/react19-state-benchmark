import React, { Profiler, useState } from 'react';
import { onRenderCallback } from './telemetry/profilerStore';
import { ReduxBenchmark } from './stores/reduxStore';
import { ZustandBenchmark } from './stores/zustandStore';
import { JotaiBenchmark } from './stores/jotaiStore';
import { SignalsBenchmark } from './stores/signalsStore';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const arch = params.get('arch') || 'redux';
  const count = Number(params.get('count') || 500);
  const freq = Number(params.get('freq') || 30);
  const mutationRatio = Number(params.get('ratio') || 0.25);

  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div>
      <div className="controls">
        <strong>Architecture: {arch.toUpperCase()}</strong>
        <span>Nodes: {count} | Freq: {freq}Hz | Mutated: {Math.round(mutationRatio * 100)}%</span>
        <input
          data-testid="filter-input"
          placeholder="Filter ticker (e.g., 004)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button data-testid="clear-btn" onClick={() => { setFilter(''); setSelectedId(null); }}>
          Reset View
        </button>
      </div>

      <Profiler id={`bench-${arch}`} onRender={onRenderCallback}>
        {arch === 'redux' && (
          <ReduxBenchmark
            count={count}
            freq={freq}
            mutationRatio={mutationRatio}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {arch === 'zustand' && (
          <ZustandBenchmark
            count={count}
            freq={freq}
            mutationRatio={mutationRatio}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {arch === 'jotai' && (
          <JotaiBenchmark
            count={count}
            freq={freq}
            mutationRatio={mutationRatio}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {arch === 'signals' && (
          <SignalsBenchmark
            count={count}
            freq={freq}
            mutationRatio={mutationRatio}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </Profiler>
    </div>
  );
}
