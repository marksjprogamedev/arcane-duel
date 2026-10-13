import { describe, expect, it } from 'vitest';
import { FixedStepper } from '../../client/src/loop/fixedStep';

const STEP = 1000 / 60;

describe('FixedStepper', () => {
  it('takes one step per 60 Hz frame', () => {
    const s = new FixedStepper(STEP);
    s.advance(0.001); // first frame
    for (let i = 0; i < 10; i++) expect(s.advance(STEP).steps).toBe(1);
  });

  it('takes a step on roughly every 2.4th frame at 144 Hz, never more than one', () => {
    const s = new FixedStepper(STEP);
    let total = 0;
    for (let i = 0; i < 144; i++) {
      const { steps } = s.advance(1000 / 144);
      expect(steps).toBeLessThanOrEqual(1);
      total += steps;
    }
    expect(total).toBeGreaterThanOrEqual(59);
    expect(total).toBeLessThanOrEqual(60);
  });

  it('takes two steps per frame at 30 Hz', () => {
    const s = new FixedStepper(STEP);
    s.advance(0.001);
    for (let i = 0; i < 10; i++) expect(s.advance(1000 / 30).steps).toBe(2);
  });

  it('total steps follow elapsed time, whatever the frame pattern', () => {
    const s = new FixedStepper(STEP);
    let total = 0;
    let t = 0;
    for (let i = 0; i < 1000; i++) {
      const ms = 4 + ((i * 7) % 29); // jittery frames of 4..32 ms
      t += ms;
      total += s.advance(ms).steps;
    }
    expect(total).toBe(Math.floor(t / STEP));
  });

  it('reports how far into the next step the frame is', () => {
    const s = new FixedStepper(STEP);
    const { steps, alpha } = s.advance(STEP * 1.25);
    expect(steps).toBe(1);
    expect(alpha).toBeCloseTo(0.25, 5);
  });

  it('drops the backlog after a long stall instead of catching up for seconds', () => {
    const s = new FixedStepper(STEP, 5);
    expect(s.advance(10_000).steps).toBe(5);
    expect(s.advance(STEP).steps).toBe(1); // back to normal immediately
  });

  it('ignores negative time and can be reset', () => {
    const s = new FixedStepper(STEP);
    expect(s.advance(-50).steps).toBe(0);
    s.advance(STEP * 0.9);
    s.reset();
    expect(s.advance(STEP * 0.2).steps).toBe(0);
  });
});
