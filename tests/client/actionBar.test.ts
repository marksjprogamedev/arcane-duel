import { describe, expect, it } from 'vitest';
import {
  BASE_SPELLS,
  barSpells,
  LEGACY_SPELLS,
  partnerOf,
  type BarState,
} from '../../client/src/ui/actionBarMath';

const bar = (over: Partial<BarState> = {}): BarState => ({
  legacy: false,
  loaded: [],
  healArmed: false,
  showBase: false,
  ...over,
});

describe('action bar tiles', () => {
  it('shows only the four elements until one is loaded', () => {
    expect(barSpells(bar())).toEqual(['FIRE', 'WATER', 'LIGHTNING', 'EARTH']);
    expect(partnerOf(bar())).toBeNull();
  });

  it('turns the other tiles into combinations with the loaded element', () => {
    expect(barSpells(bar({ loaded: [0] }))).toEqual(['FIRE', 'STEAM', 'PLASMA', 'MAGMA']);
    expect(barSpells(bar({ loaded: [1] }))).toEqual(['STEAM', 'WATER', 'STORM', 'ICE']);
    expect(barSpells(bar({ loaded: [2] }))).toEqual(['PLASMA', 'STORM', 'LIGHTNING', 'MAGNETIC']);
    expect(barSpells(bar({ loaded: [3] }))).toEqual(['MAGMA', 'ICE', 'MAGNETIC', 'EARTH']);
  });

  it('keeps the first element in view after the second is picked', () => {
    expect(barSpells(bar({ loaded: [3, 0] }))).toEqual(['MAGMA', 'ICE', 'MAGNETIC', 'EARTH']);
    expect(partnerOf(bar({ loaded: [3, 0] }))).toBe(3);
  });

  it('every combination can be reached from the elements it is made of', () => {
    const reached = new Set<string>();
    for (let first = 0; first < 4; first++)
      for (const s of barSpells(bar({ loaded: [first] }))) reached.add(s);
    expect([...reached].sort()).toEqual([...LEGACY_SPELLS].sort());
  });

  it('goes back to the four elements when stepped back, or when Heal is armed', () => {
    expect(barSpells(bar({ loaded: [0], showBase: true }))).toEqual(BASE_SPELLS);
    expect(barSpells(bar({ loaded: [0], healArmed: true }))).toEqual(BASE_SPELLS);
  });

  it('shows all ten spells on the legacy bar, whatever is loaded', () => {
    expect(barSpells(bar({ legacy: true }))).toEqual(LEGACY_SPELLS);
    expect(barSpells(bar({ legacy: true, loaded: [2] }))).toHaveLength(10);
  });
});
