import { ELEMENT_NAMES, COMBO_OF } from '../constants';
import { SimState } from '../simState';
import type { SpellName, StatusKey, Team, TimerKey, Wizard, WizardStyle } from '../types';
import { burst, addFloatingText, queueDamageNumber } from './effects';
import { applyKnockback } from './movement';
import { simRand } from './random';
import { soloOpponent, untouchable } from './teams';

export function createWizard(
  x: number,
  y: number,
  hp: number,
  style: WizardStyle,
  seat = 0,
  team: Team = 0,
): Wizard {
  return {
    seat,
    team,
    fallen: false,
    absent: false,
    away: false,
    returnIn: 0,
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
    steamCD: 0,
    plasmaCD: 0,
    iceCD: 0,
    magneticCD: 0,
    earthCD: 0,
    fireCD: 0,
    waterCD: 0,
    stormCD: 0,
    lightCD: 0,
    healCD: 0,
    bubbleCD: 0,
    trapCD: 0,
    flurryTime: 0,
    flurryCD: 0,
    prison: 0,
    airborne: 0,
    slow: 0,
    pulled: 0,
    glide: 0,
    freeze: 0,
    freezeMax: 0,
    burn: 0,
    burnTime: 0,
    burnTick: 0,
    wet: 0,
    chill: 0,
    scald: 0,
    magnetized: 0,
    overload: 0,
    static: 0,
    statusDelay: {},
    healTick: 0,
    silence: 0,
    kx: 0,
    ky: 0,
    face: 0,
    spell: 'FIRE',
    beamAim: null,
    beamTimer: null,
    chargeSpell: null,
    chargeTicks: 0,
  };
}

export const dummy = (game: SimState, w: Wizard) =>
  w === soloOpponent(game) && game.mode !== 'duel' && game.mode !== 'online';

export const immortal = (game: SimState, w: Wizard) => dummy(game, w) && game.mode !== 'mortal';

export const combineElements = (elements: number[]): SpellName | null =>
  elements.length === 1
    ? ELEMENT_NAMES[elements[0]]
    : elements.length === 2
      ? COMBO_OF[
          elements
            .slice()
            .sort((x, y) => x - y)
            .join(',')
        ]
      : null;

export function tick(game: SimState, w: Wizard, dt: number) {
  const timers: TimerKey[] = [
    'cast',
    'swing',
    'swordCD',
    'forceCD',
    'bombCD',
    'magmaCD',
    'steamCD',
    'plasmaCD',
    'iceCD',
    'magneticCD',
    'earthCD',
    'fireCD',
    'waterCD',
    'stormCD',
    'lightCD',
    'healCD',
    'bubbleCD',
    'trapCD',
    'flurryCD',
    'prison',
    'airborne',
    'slow',
    'pulled',
    'glide',
    'silence',
    'freeze',
  ];
  for (const timer of timers) w[timer] = Math.max(0, w[timer] - dt);
  applyKnockback(w, dt, game.map);
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
      // a wizard who has fallen or is dying takes no more burn damage (and shows no numbers)
      if (w.burn >= 25 && w.hp > 0 && !untouchable(game, w)) {
        let n = Math.max(1, Math.round(w.burn / 25));
        if (!immortal(game, w)) w.hp -= n;
        queueDamageNumber(game, w, n, '#fb923c', 'burn');
        burst(game, w.x + simRand(game, -10, 10), w.y - 28, '#fb923c', 6, 3);
      }
    }
    if (w.burnTime <= 0) {
      w.burn = 0;
      w.burnTick = 0;
    }
  } else w.burn = 0;
  // A completed freeze consumes the entire Chill buildup immediately when
  // the immobilisation ends; other elemental statuses keep their usual decay.
  if (w.freeze <= 0 && w.chill >= 100) {
    w.chill = 0;
    w.statusDelay.chill = 0;
  }
  const decaying: StatusKey[] = ['wet', 'scald', 'magnetized', 'overload', 'static', 'chill'];
  for (const statusKey of decaying) {
    w.statusDelay[statusKey] = Math.max(0, (w.statusDelay[statusKey] || 0) - dt);
    if (w.statusDelay[statusKey] === 0 && w.freeze <= 0)
      w[statusKey] = Math.max(0, w[statusKey] - 0.3 * dt);
  }
}

/** A wizard falls but their team fights on: out of the round, no round-ending death yet. */
export function fall(game: SimState, w: Wizard) {
  w.fallen = true;
  w.chargeSpell = null;
  w.chargeTicks = 0;
  game.input[w.seat].holding = false;
  burst(game, w.x, w.y - 20, '#94a3b8', 45, 7);
  addFloatingText(game, w.x, w.y - 110, 'FALLEN!', '#fde68a');
  game.events.push({ type: 'fall', seat: w.seat });
}

export function startDeath(game: SimState, w: Wizard, mortal: boolean) {
  game.death = { wizard: w, x: w.x, y: w.y, age: 0, mortal };
  burst(game, w.x, w.y - 20, mortal ? '#fbbf24' : w.team === 0 ? '#a78bfa' : '#fb7185', 65, 9);
  addFloatingText(
    game,
    w.x,
    w.y - 110,
    mortal ? 'DEFEATED!' : w.team === 1 ? 'VICTORY!' : 'DEFEAT!',
    '#fde68a',
  );
  if (mortal) {
    game.kills++;
    game.respawn = 120;
    game.events.push({ type: 'hint', text: 'Dummy defeated — respawning in 2 seconds' });
  } else {
    game.ending = true;
    game.endClock = 0;
    game.team0Won = w.team === 1; // true: team 0 won
    for (const input of game.input) input.holding = false;
    game.events.push({ type: 'death', loser: w.seat, winner: game.team0Won });
  }
}
