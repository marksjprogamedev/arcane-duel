import { describe, expect, it } from 'vitest';
import {
  SPELL_VARIANTS,
  chargeableVariant,
  continuousVariant,
  variantName,
} from '../../shared/sim/variants';
import { createSimState } from '../../shared/simState';
import { resetMatch } from '../../shared/sim/match';
import { styles } from '../../shared/constants';

describe('three spell choices per attack', () => {
  it('has exactly ten attack styles with two alternatives each', () => {
    expect(Object.keys(SPELL_VARIANTS)).toHaveLength(10);
    for (const choices of Object.values(SPELL_VARIANTS)) {
      expect(choices).toHaveLength(5);
      expect(choices[1]).not.toBe(choices[3]);
    }
  });
  it('charges projectile alternatives but not continuous spells', () => {
    for (const [spell, variant] of [
      ['FIRE', 'fireball'],
      ['EARTH', 'stone_lance'],
      ['ICE', 'shards'],
      ['MAGMA', 'molten_shrapnel'],
      ['STORM', 'thundercloud'],
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
