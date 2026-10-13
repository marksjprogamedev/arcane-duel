import { names, pairs } from '../../../shared/constants';
import { rand } from '../../../shared/math';
import type { Wizard, WizardStyle } from '../../../shared/types';
import { game } from '../state';
import { burst } from './combat';
import { float, queueDamageNumber } from './effects';
import { walk } from './geometry';

export function make(x: number, y: number, hp: number, style: WizardStyle): Wizard {
  return {
    x,
    y,
    hp,
    max: hp,
    style,
    shield: null,
    cast: 0,
    swing: 0,
    swordCD: 0,
    forceCD: 0,
    bombCD: 0,
    magmaCD: 0,
    earthCD: 0,
    fireCD: 0,
    waterCD: 0,
    lightCD: 0,
    healCD: 0,
    freeze: 0,
    burn: 0,
    burnTime: 0,
    burnTick: 0,
    wet: 0,
    chill: 0,
    scald: 0,
    mag: 0,
    over: 0,
    stat: 0,
    rest: {},
    healTick: 0,
    silence: 0,
    kx: 0,
    ky: 0,
    face: 0,
    spell: 'FIRE',
  };
}

export const dummy = (w) => w === game.e && game.mode !== 'duel' && game.mode !== 'online';

export const immortal = (w) => dummy(w) && game.mode !== 'mortal';

export const comb = (a) =>
  a.length === 1
    ? names[a[0]]
    : a.length === 2
      ? pairs[
          a
            .slice()
            .sort((x, y) => x - y)
            .join(',')
        ]
      : null;

export function tick(w: Wizard, dt: number) {
  for (let k of [
    'cast',
    'swing',
    'swordCD',
    'forceCD',
    'bombCD',
    'magmaCD',
    'earthCD',
    'fireCD',
    'waterCD',
    'lightCD',
    'healCD',
    'silence',
    'freeze',
  ])
    w[k] = Math.max(0, w[k] - dt);
  if (Math.abs(w.kx) + Math.abs(w.ky) > 0.15) {
    walk(w, w.kx * dt, w.ky * dt);
    w.kx *= Math.pow(0.82, dt);
    w.ky *= Math.pow(0.82, dt);
  }
  if (w.shield) {
    w.shield.life -= dt;
    if (w.shield.type === 4) {
      w.healTick += dt;
      if (w.healTick >= 30) {
        w.healTick = 0;
        w.hp = Math.min(w.max, w.hp + 3 * (1 - (0.6 * w.scald) / 100));
      }
    }
    if (w.shield.life <= 0) w.shield = null;
  }
  if (w.burnTime > 0) {
    w.burnTime = Math.max(0, w.burnTime - dt);
    w.burnTick += dt;
    while (w.burnTick >= 30 && w.burnTime > 0) {
      w.burnTick -= 30;
      if (w.burn >= 25) {
        let n = Math.max(1, Math.round(w.burn / 25));
        if (!immortal(w)) w.hp -= n;
        queueDamageNumber(w, n, '#fb923c', 'burn');
        burst(w.x + rand(-10, 10), w.y - 28, '#fb923c', 6, 3);
      }
    }
    if (w.burnTime <= 0) {
      w.burn = 0;
      w.burnTick = 0;
    }
  } else w.burn = 0;
  for (let k of ['wet', 'scald', 'mag', 'over', 'stat', 'chill']) {
    w.rest[k] = Math.max(0, (w.rest[k] || 0) - dt);
    if (w.rest[k] === 0 && w.freeze <= 0) w[k] = Math.max(0, w[k] - 0.3 * dt);
  }
}

export function startDeath(w: Wizard, mortal: boolean) {
  game.death = { w, x: w.x, y: w.y, age: 0, mortal };
  burst(w.x, w.y - 20, mortal ? '#fbbf24' : w === game.p ? '#a78bfa' : '#fb7185', 65, 9);
  float(w.x, w.y - 110, mortal ? 'DEFEATED!' : w === game.e ? 'VICTORY!' : 'DEFEAT!', '#fde68a');
  if (mortal) {
    game.kills++;
    game.respawn = 120;
    game.events.push({ type: 'hint', text: 'Dummy defeated — respawning in 2 seconds' });
  } else {
    game.ending = true;
    game.endClock = 0;
    game.winner = w === game.e;
    game.input.p.holding = false;
    game.events.push({ type: 'death', loser: w === game.p ? 'p' : 'e', winner: game.winner });
  }
}
