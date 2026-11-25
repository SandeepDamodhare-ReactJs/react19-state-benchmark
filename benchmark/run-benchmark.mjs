import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const ARCHITECTURES = ['redux', 'zustand', 'jotai', 'signals'];
const NODE_COUNTS = [100, 500, 2000];
const FREQUENCIES = [10, 30, 60];
const MUTATION_RATIO = 0.25;
const WINDOW_MS = 10000;

function startPreviewServer() {
  return new Promise((resolve) => {
    const srv = spawn('npx', ['vite', 'preview', '--port', '4173', '--host'], {
      stdio: 'pipe',
      shell: true
    });
    setTimeout(() => resolve(srv), 2000);
  });
}

async function runSingleTier(browser, arch, count, freq) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  await page.addInitScript(() => {
    window.__TBT_MS__ = 0;
    window.__INTERACTIONS__ = [];

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          window.__TBT_MS__ += entry.duration - 50;
        }
      }
    }).observe({ type: 'longtask', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) {
          window.__INTERACTIONS__.push(entry.duration);
        }
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  });

  const url = `http://localhost:4173/?arch=${arch}&count=${count}&freq=${freq}&ratio=${MUTATION_RATIO}`;
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    window.__BENCH_METRICS__.reset();
    window.__TBT_MS__ = 0;
    window.__INTERACTIONS__ = [];
  });

  const startTime = Date.now();
  let step = 0;
  while (Date.now() - startTime < WINDOW_MS) {
    if (step % 3 === 0) {
      await page.click('[data-testid="card-0"]', { force: true });
    } else if (step % 3 === 1) {
      await page.fill('[data-testid="filter-input"]', '00');
    } else {
      await page.click('[data-testid="clear-btn"]', { force: true });
    }
    step++;
    await page.waitForTimeout(350);
  }

  await cdp.send('HeapProfiler.collectGarbage');
  const heapInfo = await cdp.send('Runtime.getHeapUsage');

  const telemetry = await page.evaluate(() => {
    const sortedInp = [...window.__INTERACTIONS__].sort((a, b) => a - b);
    const p95Idx = Math.min(sortedInp.length - 1, Math.floor(sortedInp.length * 0.95));
    const p95Inp = sortedInp.length > 0 ? sortedInp[p95Idx] : 0;
    return {
      commits: window.__BENCH_METRICS__.commits,
      actualRenderMs: window.__BENCH_METRICS__.totalActualDuration,
      tbtMs: window.__TBT_MS__,
      p95InpMs: p95Inp
    };
  });

  await context.close();

  return {
    arch,
    count,
    freq,
    p95InpMs: telemetry.p95InpMs.toFixed(2),
    tbtMs: telemetry.tbtMs.toFixed(2),
    commits: telemetry.commits,
    actualRenderMs: telemetry.actualRenderMs.toFixed(2),
    heapUsedMB: (heapInfo.usedSize / (1024 * 1024)).toFixed(2)
  };
}

async function main() {
  const srv = await startPreviewServer();
  const browser = await chromium.launch({ headless: true });

  const header = 'Architecture,NodeCount,FrequencyHz,P95_INP_ms,TBT_ms,ReactCommits,ActualRender_ms,JSHeap_MB\n';
  fs.writeFileSync('results_react19_state.csv', header);

  console.log('Starting React 19 State Management Benchmark...\n');

  for (const count of NODE_COUNTS) {
    for (const freq of FREQUENCIES) {
      for (const arch of ARCHITECTURES) {
        const res = await runSingleTier(browser, arch, count, freq);
        const line = `${res.arch},${res.count},${res.freq},${res.p95InpMs},${res.tbtMs},${res.commits},${res.actualRenderMs},${res.heapUsedMB}\n`;
        fs.appendFileSync('results_react19_state.csv', line);
        console.log(
          `[${res.arch.toUpperCase().padEnd(7)} | N=${String(res.count).padEnd(4)} | ${res.freq}Hz] ` +
          `INP(P95)=${res.p95InpMs}ms | TBT=${res.tbtMs}ms | Commits=${res.commits} | Heap=${res.heapUsedMB}MB`
        );
      }
    }
  }

  await browser.close();
  srv.kill();
  console.log('\nBenchmark complete! Results saved to results_react19_state.csv');
}

main();
