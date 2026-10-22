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
  spell: SpellName,
  loadout: SpellLoadout = {},
) {
  if (w.swing > 0 || w.silence > 0 || w.freeze > 0) return false;
  const variant = spellVariant(spell, loadout);
  let fired: boolean;
  if (continuousVariant(spell, loadout) && variant !== 'default')
    fired = variantSpray(game, w, x, y, spell, variant);
  else if (projectileVariant(spell, loadout))
    fired = variantProjectile(game, w, x, y, spell, variant, power);
  else if (variant === 'lava_pool') fired = variantArea(game, w, x, y, spell, variant);
  else if (variant === 'water_surge') fired = waterSurge(game, w);
  else if (variant === 'thundercloud') fired = summonThundercloud(game, w, x, y);
  else
    fired = isContinuousSpell(spell)
      ? spray(game, w, x, y, spell)
      : launch(game, w, x, y, spell, power);
  // Face the direction of the actual successful cast, never merely the cursor.
  if (fired) w.face = Math.atan2(y - w.y, x - w.x);
  return fired;
}
