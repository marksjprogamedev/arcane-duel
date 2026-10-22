import { isContinuousSpell } from '../../charge';
import { SimState } from '../../simState';
import type { SpellLoadout, SpellName, Wizard } from '../../types';
import { continuousVariant, projectileVariant, spellVariant } from '../variants';
import { spray } from './beams';
import { summonThundercloud, waterSurge } from './areas';
import { launch } from './projectiles';
import { variantArea, variantProjectile, variantSpray } from './variantCasts';

export function cast(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  power: number = 1,
  k: SpellName = w.seat === 0 ? game.input[0].attack : w.spell,
  loadout: SpellLoadout = {},
) {
  if (w.swing > 0 || w.silence > 0 || w.freeze > 0) return false;
  const variant = spellVariant(k, loadout);
  if (continuousVariant(k, loadout) && variant !== 'default')
    return variantSpray(game, w, x, y, k, variant);
  if (projectileVariant(k, loadout)) return variantProjectile(game, w, x, y, k, variant, power);
  if (variant === 'lava_pool') return variantArea(game, w, x, y, k, variant);
  if (variant === 'water_surge') return waterSurge(game, w);
  if (variant === 'thundercloud') return summonThundercloud(game, w, x, y);
  return isContinuousSpell(k) ? spray(game, w, x, y, k) : launch(game, w, x, y, k, power);
}
