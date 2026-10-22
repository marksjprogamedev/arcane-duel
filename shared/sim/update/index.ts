import { flushDamageNumbers } from '../effects';
import { SimState } from '../../simState';
import { TRAP } from '../../constants';
import { dist } from '../../math';
import { springTrap } from '../combat/traps';
import { humanControlled, soloOpponent, targetsOf } from '../teams';
import { tick } from '../wizard';
import { duelAi, moveDummy } from './ai';
import { stepBombs } from './bombs';
import { respawnDummy, tickRespawns } from './deaths';
import { endFlurries, retractBeams, updateCharges, walkAndSpray } from './players';
import { stepShots } from './shots';
import { stepZones } from './zones';

/**
 * Advances the world by `dt` ticks. Returns false while the end-of-round animation is playing
 * (no gameplay happens then), true when a normal gameplay step ran.
 */
export function update(game: SimState, dt: number): boolean {
  game.t += dt;
  flushDamageNumbers(game, dt);
  if (game.ending) {
    if (game.death) game.death.age += dt;
    game.endClock += dt;
    if (game.endClock >= 115) game.events.push({ type: 'round_over' });
    return false;
  }
  tickRespawns(game, dt);
  const dummyWaiting = game.respawn > 0; // the training dummy is down: it does not tick
  for (const w of game.wizards) if (!(dummyWaiting && w === soloOpponent(game))) tick(game, w, dt);
  if (dummyWaiting) respawnDummy(game, dt);
  updateCharges(game, dt);
  retractBeams(game);
  endFlurries(game, dt);
  for (const w of game.wizards) if (humanControlled(game, w)) walkAndSpray(game, w, dt);
  moveDummy(game, dt);
  duelAi(game, dt);
  stepShots(game, dt);
  stepBombs(game, dt);
  stepZones(game, dt);
  const { width, height } = game.map;
  game.shots = game.shots.filter(
    (s) =>
      s.life > 0 &&
      (s.variant === 'pyro_disc' ||
        (s.x > -40 && s.x < width + 40 && s.y > -40 && s.y < height + 40)),
  );
  game.bombs = game.bombs.filter((b) => !b.dead);
  game.zones = game.zones.filter((z) => z.life > 0);
  for (const t of game.traps) {
    t.life -= dt;
    t.arm -= dt;
    if (t.arm > 0) continue;
    // whoever is on it first springs it, the owner included
    const victim = targetsOf(game, t.owner, true).find((w) => dist(t, w) < TRAP.TRIGGER_RADIUS);
    if (victim) {
      springTrap(game, t, victim);
      t.life = 0;
    }
  }
  game.traps = game.traps.filter((t) => t.life > 0);
  for (const b of game.bubbles) b.life -= dt;
  game.bubbles = game.bubbles.filter((b) => b.life > 0);
  return true;
}
