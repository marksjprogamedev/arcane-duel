import { SPELL_COLOR } from '../../constants';
import { SimState } from '../../simState';
import type { Wizard } from '../../types';
import { burst, addFloatingText } from '../effects';
import { extinguish } from './damage';

export function crater(game: SimState, x: number, y: number, owner: Wizard) {
  game.zones = game.zones.filter(
    (zone) => zone.spell !== 'MAGMA' || Math.hypot(zone.x - x, zone.y - y) > zone.r + 65,
  );
  game.zones.push({ x, y, spell: 'MAGMA', r: 65, owner, life: 230, tick: 0 });
  burst(game, x, y, SPELL_COLOR.MAGMA, 55, 9);
  burst(game, x, y, '#fde047', 18, 7);
  addFloatingText(game, x, y - 65, 'MAGMA CRATER!', SPELL_COLOR.MAGMA);
}

/** Water Surge: a ring of water that spreads from the caster, soaking and shoving every wizard it reaches. */
export const SURGE = {
  START_R: 20,
  MAX_R: 345,
  /** Ticks the ring lasts; it reaches its full size just before it fades. */
  LIFE: 45,
  /** How hard it shoves (a wizard's knockback speed, which fades fast: about 330 px in all). */
  KNOCKBACK: 60,
  WET: 75,
  /** A bomb the ring sweeps over (in flight or landed) is shoved with this speed, which fades like a wizard's: it slides about as far. */
  BOMB_KNOCKBACK: 60,
  COOLDOWN: 300,
  /** Most rings one cast keeps alive at once (bubbles start new ones); it only matters with many overlapping bubbles. */
  MAX_RINGS: 6,
} as const;

export function waterSurge(game: SimState, w: Wizard) {
  if (w.waterCD > 0) return false;
  w.waterCD = SURGE.COOLDOWN;
  extinguish(game, w); // the water that rushes out also puts out the caster's own fire
  game.zones.push({
    x: w.x,
    y: w.y,
    spell: 'WATER',
    r: SURGE.START_R,
    owner: w,
    life: SURGE.LIFE,
    tick: 0,
    hit: [],
    chain: game.nextId++,
  });
  burst(game, w.x, w.y - 18, SPELL_COLOR.WATER, 30, 6);
  return true;
}
/** Thundercloud: a storm cloud that drifts after the enemy nearest to the cloud and strikes whoever is under it. */
export const THUNDERCLOUD = {
  R: 70,
  LIFE: 330,
  /** Ticks between strikes. */
  STRIKE_TICKS: 30,
  STRIKE_DAMAGE: 6,
  /** A cloud flies at this fraction of a wizard's walking speed. */
  SPEED_FACTOR: 0.5,
  /** How far from the caster it can be summoned. */
  REACH: 300,
  COOLDOWN: 480,
} as const;

export function summonThundercloud(game: SimState, w: Wizard, x: number, y: number) {
  if (w.stormCD > 0) return false;
  w.stormCD = THUNDERCLOUD.COOLDOWN;
  const d = Math.hypot(x - w.x, y - w.y) || 1;
  const reach = Math.min(d, THUNDERCLOUD.REACH);
  const at = { x: w.x + ((x - w.x) / d) * reach, y: w.y + ((y - w.y) / d) * reach };
  // one cloud per caster: a new one replaces the old
  game.zones = game.zones.filter((zone) => !(zone.follow && zone.owner === w));
  game.zones.push({
    ...at,
    spell: 'STORM',
    r: THUNDERCLOUD.R,
    owner: w,
    life: THUNDERCLOUD.LIFE,
    tick: 0,
    follow: true,
  });
  burst(game, at.x, at.y, SPELL_COLOR.STORM, 35, 6);
  return true;
}
