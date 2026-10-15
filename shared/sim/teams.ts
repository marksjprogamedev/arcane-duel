// Who can target and hurt whom. Everything in the sim that used to say "the other wizard" asks here,
// so a match can have more than two wizards.
import type { SimState } from '../simState';
import type { Wizard } from '../types';

/** A wizard that can't be hit right now: the training dummy waiting to respawn. */
export const untouchable = (game: SimState, w: Wizard) => w === game.e && game.respawn > 0;

/** Enemies are always fair game; teammates only with friendly fire. */
export const canHurt = (game: SimState, from: Wizard, to: Wizard) =>
  from.team !== to.team || game.rules.friendlyFire;

/**
 * Wizards `owner`'s attacks can hurt, in seat order: enemies (and teammates with friendly fire), and
 * the owner too when their own shot or blast can turn on them. Wizards that can't be hit are left out.
 */
export function targetsOf(game: SimState, owner: Wizard, includeOwner = false): Wizard[] {
  const targets = game.wizards.filter(
    (w) => w !== owner && !untouchable(game, w) && canHurt(game, owner, w),
  );
  if (includeOwner && !untouchable(game, owner)) targets.push(owner);
  return targets;
}

/** The closest wizard on another team (what melee and aimed spells turn toward), or undefined. */
export function nearestFoe(game: SimState, w: Wizard): Wizard | undefined {
  let best: Wizard | undefined;
  let bestD = Infinity;
  for (const other of game.wizards) {
    if (other.team === w.team) continue;
    const d = (other.x - w.x) ** 2 + (other.y - w.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = other;
    }
  }
  return best;
}

/** Wizards a person plays: the local player (seat 0) and, in an online match, everyone. */
export const humanControlled = (game: SimState, w: Wizard) =>
  w.seat === 0 || game.mode === 'online';
