import { describe, expect, it } from 'vitest';
import { BATTLEGROUND_VISION, MAPS } from '../../shared/maps';
import { canSee } from '../../shared/sim/vision';

describe('vision', () => {
  it('arenas show everything; battlegrounds have one radius', () => {
    for (const map of Object.values(MAPS))
      expect(map.vision).toBe(map.kind === 'arena' ? null : BATTLEGROUND_VISION);
  });

  it('on an arena a wizard sees the whole map', () => {
    expect(canSee(MAPS.enchanted, { x: 0, y: 0 }, { x: 800, y: 600 })).toBe(true);
  });

  it('on a battleground a wizard sees up to the radius and not beyond', () => {
    const map = MAPS.ruins;
    const me = { x: 1000, y: 900 };
    expect(canSee(map, me, { x: 1000 + BATTLEGROUND_VISION, y: 900 })).toBe(true);
    expect(canSee(map, me, { x: 1000 + BATTLEGROUND_VISION + 1, y: 900 })).toBe(false);
    expect(canSee(map, me, { x: 1000, y: 900 - BATTLEGROUND_VISION })).toBe(true);
    expect(canSee(map, me, { x: 1500, y: 1400 })).toBe(false); // the diagonal is farther
  });

  it('a margin widens it', () => {
    const me = { x: 0, y: 0 };
    const at = { x: BATTLEGROUND_VISION + 50, y: 0 };
    expect(canSee(MAPS.ruins, me, at)).toBe(false);
    expect(canSee(MAPS.ruins, me, at, 80)).toBe(true);
  });

  it('the spawns of a battleground cannot see each other', () => {
    for (const map of Object.values(MAPS).filter((m) => m.kind === 'battleground'))
      expect(canSee(map, map.spawns.p, map.spawns.e)).toBe(false);
  });
});
