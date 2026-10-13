// Cosmetic particles. The simulation never creates these; it only emits small fx events
// (see FxEvent) and every client turns them into particles locally and animates them itself.
// Randomness here is deliberately Math.random: it must not touch the gameplay RNG.

import { COL } from '../constants';
import { rand, TAU } from '../math';
import { ray } from '../sim/geometry';
import type { SimState } from '../simState';
import type { FxEvent, Particle, SpellName, Wizard, WizardId } from '../types';

export function spawnBurst(
  game: SimState,
  x: number,
  y: number,
  c: string,
  n = 10,
  power = 4,
  castOwner: WizardId | null = null,
) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const v = rand(0.5, power);
    game.particles.push({
      castOwner,
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      c,
      life: rand(12, 28),
      r: rand(2, 5),
    });
  }
}

/** The spray of a fire/water attack from wizard `w` towards (x, y). Also used by online cast prediction. */
export function makeSprayParticles(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  owner: WizardId,
): Particle[] {
  const fire = k === 'FIRE';
  const a = Math.atan2(y - w.y, x - w.x);
  const range = fire ? 300 : 350;
  const spread = fire ? 0.27 : 0.1;
  const out: Particle[] = [];
  for (let i = 0; i < (fire ? 19 : 15); i++) {
    const q = a + rand(-spread, spread);
    const r = rand(25, range);
    let tx = w.x + Math.cos(q) * r;
    let ty = w.y + Math.sin(q) * r;
    const b = ray(w.x, w.y, tx, ty, 2);
    if (b) {
      tx = b.x;
      ty = b.y;
      if (Math.random() < 0.35) spawnBurst(game, tx, ty, fire ? '#fb923c' : '#7dd3fc', 2, 2, owner);
    }
    out.push({
      castOwner: owner,
      x: tx,
      y: ty - 12,
      vx: b ? 0 : Math.cos(q) * rand(fire ? 3 : 11, fire ? 6 : 16),
      vy: b ? 0 : Math.sin(q) * rand(fire ? 3 : 11, fire ? 6 : 16),
      c: fire
        ? Math.random() < 0.5
          ? '#facc15'
          : '#ef4444'
        : Math.random() < 0.5
          ? '#38bdf8'
          : '#bae6fd',
      life: rand(9, 21),
      r: rand(fire ? 5 : 2, fire ? 13 : 5),
    });
  }
  return out;
}

/** Turns one fx event from the simulation into particles. */
export function spawnFx(game: SimState, ev: FxEvent) {
  switch (ev.type) {
    case 'burst':
      spawnBurst(game, ev.x, ev.y, ev.c, ev.n, ev.power, ev.castOwner);
      return;
    case 'spray': {
      const w = game[ev.wizard];
      if (w)
        game.particles.push(...makeSprayParticles(game, w, ev.x, ev.y, ev.spell, ev.castOwner));
      return;
    }
    case 'magma_trail':
      for (let j = 0; j < 4; j++)
        game.particles.push({
          x: ev.x + rand(-13, 13),
          y: ev.y - 18 + rand(-12, 12),
          vx: rand(-2.5, 2.5) - ev.vx * 0.25,
          vy: rand(-3, 1) - ev.vy * 0.25,
          c: Math.random() < 0.4 ? '#fde047' : Math.random() < 0.6 ? '#fb923c' : '#3f3f46',
          life: rand(14, 32),
          r: rand(3, 9),
        });
      return;
    case 'bolt_trail':
      game.particles.push({
        x: ev.x + rand(-8, 8),
        y: ev.y - 18 + rand(-8, 8),
        vx: rand(-1.5, 1.5),
        vy: rand(-1.5, 1.5),
        c: COL[ev.spell],
        life: rand(8, 19),
        r: rand(2, 6),
      });
      return;
  }
}

/** Moves particles and drops the dead ones. `dt` is in game ticks (1 = 1/60 s). */
export function advanceParticles(game: SimState, dt: number) {
  for (const q of game.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
  }
  game.particles = game.particles.filter((q) => q.life > 0);
}
