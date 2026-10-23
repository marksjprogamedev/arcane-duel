import { describe, expect, it } from 'vitest';
import { stepEnabled } from '../../client/src/ui/select';

const items = (...disabled: boolean[]) => disabled.map((d, index) => ({ index, disabled: d }));

describe('stepEnabled', () => {
  it('moves to the next enabled item', () => {
    expect(stepEnabled(items(false, false, false), 0, 1)).toBe(1);
    expect(stepEnabled(items(false, false, false), 2, -1)).toBe(1);
  });
  it('skips disabled items', () => {
    expect(stepEnabled(items(false, true, true, false), 0, 1)).toBe(3);
    expect(stepEnabled(items(false, true, true, false), 3, -1)).toBe(0);
  });
  it('stays put at either end or when nothing is enabled', () => {
    expect(stepEnabled(items(false, false), 1, 1)).toBe(1);
    expect(stepEnabled(items(false, false), 0, -1)).toBe(0);
    expect(stepEnabled(items(false, true), 0, 1)).toBe(0);
  });
});
