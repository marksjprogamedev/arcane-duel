import { describe, expect, it } from 'vitest';
import { ServerClock, TICK_MS } from '../../client/src/net/clock';

describe('ServerClock', () => {
  it('has no estimate before the first snapshot', () => {
    expect(new ServerClock().serverNow(1000)).toBeNull();
  });

  it('maps the server timeline onto the local clock using the least-delayed packet', () => {
    const c = new ServerClock();
    // snapshots every 50 ms of server time; arrival = server time + 100 ms base delay + jitter
    const jitter = [0, 30, 5, 80, 0, 12, 40, 3];
    jitter.forEach((j, i) => c.observe(i * 50, 1000 + i * 50 + 100 + j));
    // best case delay is 100 ms (+1000 origin): local 1500 -> server 400
    expect(c.serverNow(1500)).toBe(400);
  });

  it('reports jitter as the typical lateness over the best packets', () => {
    const c = new ServerClock();
    for (let i = 0; i < 40; i++)
      c.observe(i * 50, i * 50 + 100 + (i % 10 === 0 ? 60 : i % 2 ? 10 : 0));
    expect(c.jitterMs()).toBeGreaterThanOrEqual(0);
    expect(c.jitterMs()).toBeLessThanOrEqual(60);
  });

  it('shows no jitter for perfectly regular delivery', () => {
    const c = new ServerClock();
    for (let i = 0; i < 20; i++) c.observe(i * 50, i * 50 + 80);
    expect(c.jitterMs()).toBe(0);
  });

  it('adapts when the base delay changes (window slides)', () => {
    const c = new ServerClock();
    for (let i = 0; i < 70; i++) c.observe(i * 50, i * 50 + 50);
    expect(c.serverNow(1000)).toBe(950);
    for (let i = 70; i < 200; i++) c.observe(i * 50, i * 50 + 150);
    expect(c.serverNow(1000)).toBe(850);
  });

  it('reset forgets everything (new match, server clock restarts)', () => {
    const c = new ServerClock();
    c.observe(0, 500);
    c.reset();
    expect(c.serverNow(1000)).toBeNull();
  });

  it('tick length is 1/60 s', () => {
    expect(TICK_MS).toBeCloseTo(16.667, 2);
  });
});
