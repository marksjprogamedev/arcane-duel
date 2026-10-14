// Live numbers for GET /stats: how busy the server is and whether it keeps up with its ticks.
// The per-second figures are for the last full second.

import { performance } from 'node:perf_hooks';

const startedAt = Date.now();
let current = { bytesOut: 0, messagesIn: 0, ticks: 0, tickMsTotal: 0, tickMsMax: 0 };
let lastSecond = current;

setInterval(() => {
  lastSecond = current;
  current = { bytesOut: 0, messagesIn: 0, ticks: 0, tickMsTotal: 0, tickMsMax: 0 };
}, 1000).unref();

export function recordBytesOut(bytes: number) {
  current.bytesOut += bytes;
}

export function recordMessageIn() {
  current.messagesIn++;
}

/** Times one match tick (simulation step plus any snapshots it sent). */
export function timeTick(run: () => void) {
  const t0 = performance.now();
  run();
  const ms = performance.now() - t0;
  current.ticks++;
  current.tickMsTotal += ms;
  current.tickMsMax = Math.max(current.tickMsMax, ms);
}

export function statsReport(extra: Record<string, unknown>) {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    ...extra,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    lastSecond: {
      bytesOut: lastSecond.bytesOut,
      messagesIn: lastSecond.messagesIn,
      ticks: lastSecond.ticks,
      tickMsAvg: round(lastSecond.ticks ? lastSecond.tickMsTotal / lastSecond.ticks : 0),
      tickMsMax: round(lastSecond.tickMsMax),
    },
  };
}
