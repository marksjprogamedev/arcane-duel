import { describe, expect, it } from 'vitest';
import { createDelayLine } from '../../server/latency';

describe('createDelayLine', () => {
  it('runs immediately when there is no delay', () => {
    const ran: number[] = [];
    createDelayLine(0, 0)(() => ran.push(1));
    expect(ran).toEqual([1]);
  });

  it('never reorders messages, even with jitter and many arriving at once', async () => {
    const line = createDelayLine(5, 5);
    const ran: number[] = [];
    // real timers on purpose: the old version reordered because of how Node schedules them
    for (let i = 0; i < 200; i++) line(() => ran.push(i));
    await new Promise((r) => setTimeout(r, 15));
    for (let i = 200; i < 400; i++) line(() => ran.push(i));
    await new Promise((r) => setTimeout(r, 40));
    expect(ran).toEqual([...Array(400).keys()]);
  });

  it('waits at least the base delay', async () => {
    const line = createDelayLine(20, 0);
    const start = Date.now();
    let ranAt = 0;
    line(() => (ranAt = Date.now()));
    await new Promise((r) => setTimeout(r, 40));
    expect(ranAt - start).toBeGreaterThanOrEqual(19);
  });
});
