// Cosmetics: particles, floating text, lightning arcs and rings. The simulation never creates
// these; it only emits small fx events (see FxEvent) and every client turns them into cosmetics
// locally and animates them itself, so none of it is simulated on the server or sent over the
// network. Randomness here is deliberately Math.random: it must not touch the gameplay RNG.

import { COL } from '../constants';
import { rand, TAU } from '../math';
import { bubbleCrossing, ray } from '../sim/geometry';
import type { SimState } from '../simState';
import type { FxEvent, Particle, SpellName, Vec2, Wizard, Seat } from '../types';

/** Most damage numbers shown at once per wizard; older ones are removed. */
const MAX_DAMAGE_LABELS_PER_WIZARD = 3;

export function spawnBurst(
  game: SimState,
  x: number,
  y: number,
  c: string,
  n = 10,
  power = 4,
  castOwner: Seat | null = null,
) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const v = rand(0.5, power);
    game.particles.push({
      castOwner,
      ...(c === '#ice-prison-shatter' ? { shape: 'tongue' as const } : c === '#icebomb-blast' ? { shape: i % 3 === 0 ? 'tongue' as const : 'circle' as const } : c === '#plasmabomb-blast' ? { shape: (['oval', 'tongue', 'circle'] as const)[i % 3] } : c === COL.EARTH ? { shape: (['tongue', 'oval', 'circle'] as const)[i % 3] } : {}),
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      c:
        c === '#ice-prison-shatter'
          ? (['#b6f0ff', '#e8fbff', '#67c8eb', '#d0e7f4'] as const)[i % 4]
        : c === '#icebomb-blast'
          ? (i % 3 === 0 ? (i % 2 ? '#a7e5ff' : '#f2fdff') : (['#7dd3fc', '#d7f8ff', '#83c8e8'] as const)[i % 3])
        : c === '#plasmabomb-blast'
          ? (['#a94bd9', '#e9a6f7', '#64238d', '#f8d2ff', '#cb72ee', '#f2a2dc'] as const)[i % 6]
        : c === '#waterbomb-blast'
          ? (['#38bdf8', '#bae6fd'] as const)[i % 2]
        : c === '#firebomb-blast'
          ? (['#991b1b', '#c2410c', '#f97316', '#facc15'] as const)[i % 4]
        : c === COL.EARTH
          ? (['#525b63', '#89949c', '#414950', '#66747a', '#8bac94'] as const)[i % 5]
          : c === '#d85a24'
            // Deliberately distinct from stream colours: these stay as small circles.
            ? (['#d45d24', '#c38b23', '#98291b'] as const)[i % 3]
            : c,
      life: c === '#ice-prison-shatter' ? rand(18, 33) : rand(12, 28),
      r: c === '#ice-prison-shatter' ? rand(3, 8) : rand(2, 5),
    });
  }
}

/** The spray of a fire/water attack from wizard `w` towards (x, y). Also used by online cast prediction. */
export function makeSprayParticles(
  game: SimState,
  w: Vec2,
  x: number,
  y: number,
  k: SpellName,
  owner: Seat,
): Particle[] {
  const fire = k === 'FIRE';
  const a = Math.atan2(y - w.y, x - w.x);
  const range = fire ? 300 : 350;
  const spread = fire ? 0.29 : 0.1;
  const out: Particle[] = [];
  for (let i = 0; i < (fire ? 7 : 15); i++) {
    const q = a + rand(-spread, spread);
    const r = fire ? 22 + (i + 0.5) * (range - 22) / 7 + rand(-9, 9) : rand(25, range);
    let tx = w.x + Math.cos(q) * r;
    let ty = w.y + Math.sin(q) * r;
    let b: Vec2 | null = ray(w.x, w.y, tx, ty, 2, game.map.obstacles);
    const edge = bubbleCrossing(game.bubbles, w.x, w.y, b ? b.x : tx, b ? b.y : ty);
    if (edge) {
      const ex = b ? b.x : tx,
        ey = b ? b.y : ty;
      b = { x: w.x + (ex - w.x) * edge.u, y: w.y + (ey - w.y) * edge.u };
    }
    if (b) {
      tx = b.x;
      ty = b.y;
      if (Math.random() < (fire ? 0.12 : 0.35)) spawnBurst(game, tx, ty, fire ? '#fb923c' : '#7dd3fc', 2, 2, owner);
    }
    out.push({
      castOwner: owner,
      ...(fire ? { shape: (['tongue', 'oval', 'circle'] as const)[(i + Math.floor(game.t)) % 3] } : {}),
      x: tx,
      y: ty - 12,
      vx: b ? 0 : Math.cos(q) * rand(fire ? 2 : 11, fire ? 4 : 16),
      vy: b ? 0 : Math.sin(q) * rand(fire ? 2 : 11, fire ? 4 : 16),
      c: fire
        ? (() => {
            const tone = Math.random();
            return tone < 0.29 ? '#e9ad13' : tone < 0.71 ? '#ff6829' : '#9f2316';
          })()
        : Math.random() < 0.5
          ? '#38bdf8'
          : '#bae6fd',
      life: rand(9, 21),
      r: rand(fire ? 5 : 2, fire ? 8 : 5),
    });
  }
  return out;
}

/** Turns one fx event from the simulation into particles. */
export function spawnFx(game: SimState, ev: FxEvent) {
  switch (ev.type) {
    case 'magnetic_implosion': {
      // Begin on the perimeter and collapse into the bomb's centre.
      // Short particle lifetimes prevent overshooting into an outward burst.
      for (let i = 0; i < 72; i++) {
        const angle = rand(0, TAU);
        const radius = rand(55, 165);
        const life = rand(12, 21);
        const speed = radius / life;
        game.particles.push({
          x: ev.x + Math.cos(angle) * radius,
          y: ev.y + Math.sin(angle) * radius,
          vx: -Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          c: i % 3 === 0 ? '#fde047' : i % 2 ? '#a3e635' : '#d9f99d',
          life,
          r: rand(1.8, 4.2),
          castOwner: ev.castOwner,
        });
      }
      return;
    }
    case 'burst':
      spawnBurst(game, ev.x, ev.y, ev.c, ev.n, ev.power, ev.castOwner);
      return;
    case 'spray': {
      const w = game.wizards.find((x) => x.seat === ev.wizard);
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
    case 'text':
      if (ev.damageOwner) {
        // keep each wizard to a few damage numbers without discarding status messages
        const own = game.labels.filter((q) => q.damageOwner === ev.damageOwner);
        while (own.length >= MAX_DAMAGE_LABELS_PER_WIZARD) {
          const i = game.labels.indexOf(own.shift()!);
          if (i >= 0) game.labels.splice(i, 1);
        }
      }
      game.labels.push({
        x: ev.x,
        y: ev.y,
        s: ev.text,
        c: ev.c,
        life: ev.damageOwner ? 52 : 60,
        damageOwner: ev.damageOwner,
      });
      return;
    case 'lightning': {
      if (ev.variant === 'plasma_beam' || ev.variant === 'magnetic_pull') {
        const existing = game.arcs.find(
          (a) =>
            a.variant === ev.variant &&
            a.castOwner === ev.castOwner &&
            !!a.reflected === !!ev.reflected,
        );
        const points = [
          { x: ev.x, y: ev.y - 20 },
          { x: ev.tx, y: ev.ty - 20 },
        ];
        if (existing) {
          existing.points = points;
          existing.hit = ev.hit;
          existing.life = 11;
        } else {
          game.arcs.push({
            points,
            variant: ev.variant,
            hit: ev.hit,
            reach: 0,
            life: 11,
            castOwner: ev.castOwner,
            reflected: ev.reflected,
          });
        }
      } else {
        game.arcs.push({
          points: lightningPoints(ev.x, ev.y, ev.tx, ev.ty),
          variant: ev.variant,
          life: 11,
          castOwner: ev.castOwner,
          reflected: ev.reflected,
        });
      }
      return;
    }
    case 'wave':
      game.waves.push({ x: ev.x, y: ev.y, r: ev.r, life: ev.life, c: ev.c });
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

/** The jagged points of a lightning arc from a wizard at (x, y) to (tx, ty). */
export function lightningPoints(x: number, y: number, tx: number, ty: number): Vec2[] {
  const pts = [{ x, y: y - 20 }];
  for (let i = 1; i < 12; i++) {
    const u = i / 12;
    pts.push({ x: x + (tx - x) * u + rand(-11, 11), y: y - 20 + (ty - y) * u + rand(-11, 11) });
  }
  pts.push({ x: tx, y: ty - 20 });
  return pts;
}

/** Animates all cosmetics and drops the finished ones. `dt` is in game ticks (1 = 1/60 s). */
export function advanceCosmetics(game: SimState, dt: number) {
  for (const q of game.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
  }
  for (const q of game.labels) {
    q.y -= 0.6 * dt;
    q.life -= dt;
  }
  for (const q of game.arcs) {
    q.life -= dt;
    if (q.variant === 'plasma_beam' || q.variant === 'magnetic_pull') {
      const end = q.points[q.points.length - 1],
        start = q.points[0];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      q.reach = Math.min(length, (q.reach ?? 0) + 19 * dt);
    }
  }
  for (const q of game.waves) {
    q.r += 8 * dt;
    q.life -= dt;
  }
  game.particles = game.particles.filter((q) => q.life > 0);
  game.labels = game.labels.filter((q) => q.life > 0);
  game.arcs = game.arcs.filter((q) => q.life > 0);
  game.waves = game.waves.filter((q) => q.life > 0);
}
