import { describe, expect, it } from 'vitest';
import { continuousVariant, chargeableVariant, spellVariant, variantName } from '../../shared/sim/variants';
import { createSimState } from '../../shared/simState';
import { resetMatch } from '../../shared/sim/match';
import { styles } from '../../shared/constants';
import { applyInput } from '../../shared/sim/input';
import { step } from '../../shared/sim/update';

describe('solo spell loadouts', () => {
  it('preserves classic spells by default', () => {
    expect(continuousVariant('FIRE')).toBe(true);
    expect(chargeableVariant('EARTH')).toBe(true);
    expect(spellVariant('ICE')).toBe('default');
  });
  it('changes attack behaviour without changing its element', () => {
    const loadout = { EARTH: 'pebbles', FIRE: 'fireball', WATER: 'jet', ICE: 'shards' } as const;
    expect(continuousVariant('EARTH', loadout)).toBe(true);
    expect(continuousVariant('WATER', loadout)).toBe(true);
    expect(continuousVariant('FIRE', loadout)).toBe(false);
    expect(chargeableVariant('ICE', loadout)).toBe(false);
    expect(variantName('EARTH', loadout)).toBe('PEBBLE SPRAY');
  });
  it('locks chosen variants into a solo match', () => {
    const game = createSimState(1);
    resetMatch(game, { mode: 'still', seed: 1, styles: [styles[0], styles[1]],
      dummyHP: 160, dummyMoving: false, loadout: { EARTH: 'pebbles' } });
    expect(game.input.p.loadout.EARTH).toBe('pebbles');
    expect(game.input.e.loadout.EARTH).toBeUndefined();
  });
});
