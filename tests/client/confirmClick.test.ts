import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfirm } from '../../client/src/ui/menus/confirmClick';

function make() {
  const log: string[] = [];
  const c = createConfirm({
    onArm: () => log.push('arm'),
    onDisarm: () => log.push('disarm'),
    onConfirm: () => log.push('confirm'),
  });
  return { c, log };
}

describe('createConfirm', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('first click only arms', () => {
    const { c, log } = make();
    c.click();
    expect(log).toEqual(['arm']);
    expect(c.armed()).toBe(true);
  });

  it('second click within the window confirms', () => {
    const { c, log } = make();
    c.click();
    vi.advanceTimersByTime(2900);
    c.click();
    expect(log).toEqual(['arm', 'disarm', 'confirm']);
    expect(c.armed()).toBe(false);
  });

  it('disarms after the window, so the next click arms again', () => {
    const { c, log } = make();
    c.click();
    vi.advanceTimersByTime(3000);
    expect(log).toEqual(['arm', 'disarm']);
    c.click();
    expect(log).toEqual(['arm', 'disarm', 'arm']);
  });

  it('reset disarms and does nothing when not armed', () => {
    const { c, log } = make();
    c.reset();
    expect(log).toEqual([]);
    c.click();
    c.reset();
    expect(log).toEqual(['arm', 'disarm']);
    vi.advanceTimersByTime(5000);
    expect(log).toEqual(['arm', 'disarm']);
  });
});
