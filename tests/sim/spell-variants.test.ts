import { describe, expect, it } from 'vitest';
import {
  SPELL_VARIANTS,
  VARIANT_SPELLS,
  chargeableVariant,
  continuousVariant,
  spellVariant,
  variantName,
} from '../../shared/sim/variants';
import { createSimState } from '../../shared/simState';
import { resetMatch } from '../../shared/sim/match';
import { styles } from '../../shared/constants';

describe('three spell choices per attack', () => {
  it('treats a variant the spell no longer offers as the original', () => {
    const stale = {
      WATER: 'tidal_surge',
      FIRE: 'flame_wave',
      STORM: 'gale_force',
      EARTH: 'stone_lance',
      LIGHTNING: 'chain_lightning',
      STEAM: 'steam_burst',
    } as never;
    for (const spell of ['WATER', 'FIRE', 'STORM', 'EARTH', 'LIGHTNING', 'STEAM'] as const)
      expect(spellVariant(spell, stale)).toBe('default');
    // a display name is not a variant id
    expect(spellVariant('WATER', { WATER: 'Water Surge' } as never)).toBe('default');
    expect(spellVariant('WATER', stale)).toBe('default');
    expect(spellVariant('FIRE', stale)).toBe('default');
    expect(spellVariant('STORM', stale)).toBe('default');
    expect(variantName('WATER', stale)).toBe('Water Spray');
    expect(spellVariant('FIRE', { FIRE: 'fireball' })).toBe('fireball');
  });
  it('has ten attack styles; all but Lightning and Steam offer alternatives, all distinct', () => {
    expect(Object.keys(SPELL_VARIANTS)).toHaveLength(10);
    expect(VARIANT_SPELLS).not.toContain('LIGHTNING');
    expect(VARIANT_SPELLS).not.toContain('STEAM');
    expect(VARIANT_SPELLS).toHaveLength(8);
    const all = VARIANT_SPELLS.flatMap((spell) =>
      SPELL_VARIANTS[spell].filter((_, i) => i % 2 === 1),
    );
    expect(new Set(all).size).toBe(all.length);
  });
  it('charges projectile alternatives but not continuous spells', () => {
    for (const [spell, variant] of [
      ['FIRE', 'fireball'],
      ['ICE', 'shards'],
    ] as const) {
      expect(chargeableVariant(spell, { [spell]: variant })).toBe(true);
      expect(continuousVariant(spell, { [spell]: variant })).toBe(false);
    }
    expect(continuousVariant('EARTH', { EARTH: 'pebbles' })).toBe(true);
    expect(chargeableVariant('EARTH', { EARTH: 'pebbles' })).toBe(false);
  });
  it('locks selected spells for the solo duel', () => {
    const game = createSimState(1);
    resetMatch(game, {
      mode: 'still',
      seed: 1,
      styles: [styles[0], styles[1]],
      dummyHP: 160,
      dummyMoving: false,
      loadout: { EARTH: 'pebbles', PLASMA: 'plasma_beam', MAGMA: 'lava_pool' },
    });
    expect(game.input[0].loadout.EARTH).toBe('pebbles');
    expect(game.input[0].loadout.MAGMA).toBe('lava_pool');
    expect(variantName('PLASMA', game.input[0].loadout)).toBe('Plasma Beam');
    expect(game.input[1].loadout.EARTH).toBeUndefined();
  });
});
