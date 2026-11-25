window.__BENCH_METRICS__ = {
  commits: 0,
  totalActualDuration: 0,
  totalBaseDuration: 0,
  reset() {
    this.commits = 0;
    this.totalActualDuration = 0;
    this.totalBaseDuration = 0;
  }
};

export function onRenderCallback(id, phase, actualDuration, baseDuration) {
  window.__BENCH_METRICS__.commits += 1;
  window.__BENCH_METRICS__.totalActualDuration += actualDuration;
  window.__BENCH_METRICS__.totalBaseDuration += baseDuration;
}

export function createDeterministicRng(seed = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateInitialItems(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    symbol: `TKR-${String(i).padStart(4, '0')}`,
    price: 100 + (i % 500) * 0.25,
    delta: 0
  }));
}
