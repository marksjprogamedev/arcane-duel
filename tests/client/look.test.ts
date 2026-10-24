import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, parseLook } from '../../client/src/workshop/look';
import { AVAILABLE, ROBE_COLORS, SKIN_COLORS } from '../../client/src/workshop/parts';

describe('parseLook', () => {
  it('falls back to the default look for anything that is not a look', () => {
    for (const value of [undefined, null, 'head', 42, [], {}])
      expect(parseLook(value)).toEqual(DEFAULT_LOOK);
  });

  it('keeps every part and colour that is on offer', () => {
    const look = {
      head: AVAILABLE.head[1],
      hat: AVAILABLE.hat[2],
      body: AVAILABLE.body[1],
      staff: AVAILABLE.staff[0],
      off: AVAILABLE.off[1],
      feet: AVAILABLE.feet[4],
      skin: SKIN_COLORS[2],
      robeColor: ROBE_COLORS[1],
      hatColor: ROBE_COLORS[2],
    };
    expect(parseLook(look)).toEqual(look);
  });

  it('replaces a retired part, a wrong type or an odd colour slot by slot, leaving the rest', () => {
    const parsed = parseLook({
      head: 9999, // retired
      hat: '3', // wrong type
      body: AVAILABLE.body[1],
      skin: 'hotpink',
      robeColor: 7,
      hatColor: ROBE_COLORS[1],
    });
    expect(parsed).toEqual({
      ...DEFAULT_LOOK,
      body: AVAILABLE.body[1],
      hatColor: ROBE_COLORS[1],
    });
  });

  it('ignores keys it does not know and never shares the default object', () => {
    const parsed = parseLook({ sneaky: 1, __proto__: { head: 3 } });
    expect(parsed).toEqual(DEFAULT_LOOK);
    expect(parsed).not.toBe(DEFAULT_LOOK);
  });
});
