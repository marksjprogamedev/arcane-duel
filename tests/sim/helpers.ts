import { styles } from '../../shared/constants';
import { make } from '../../client/src/sim/wizard';
import { game, newPlayerInput, net } from '../../client/src/state';

/** Puts the shared game state into a fresh 1v1 duel, like flow.start() does (minus the DOM). */
export function resetDuel(mode: 'duel' | 'online' | 'still' = 'online') {
  game.mode = mode;
  game.p = make(155, 300, 200, styles[0]);
  game.e = make(645, 300, 200, styles[3]);
  game.input = { p: newPlayerInput({ x: 430, y: 300 }), e: newPlayerInput({ x: 150, y: 300 }) };
  game.shots = [];
  game.bombs = [];
  game.zones = [];
  game.particles = [];
  game.labels = [];
  game.arcs = [];
  game.waves = [];
  game.events = [];
  game.death = null;
  game.ending = false;
  game.endClock = 0;
  game.winner = false;
  game.t = 0;
  game.respawn = 0;
  game.kills = 0;
  net.mpRole = null;
}

export const press = (code: string) => ({ kind: 'key' as const, code, down: true });
export const release = (code: string) => ({ kind: 'key' as const, code, down: false });
