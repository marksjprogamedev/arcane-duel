// Cosmetics: particles, floating text, lightning arcs and rings. The simulation never creates
// these; it only emits small fx events (see FxEvent) and every client turns them into cosmetics
// locally and animates them itself, so none of it is simulated on the server or sent over the
// network. Randomness here is deliberately Math.random: it must not touch the gameplay RNG.

import { SPELL_COLOR } from '../../../shared/constants';
import { spellSolids } from '../../../shared/maps';
import { rand, TAU } from '../../../shared/math';
import { bubbleCrossing, firstObstacleHit } from '../../../shared/sim/geometry';
import type { SimState } from '../../../shared/simState';
import type { FxEvent, Particle, SpellName, Vec2, Seat } from '../../../shared/types';

/** Most damage numbers shown at once per wizard; older ones are removed. */
const MAX_DAMAGE_LABELS_PER_WIZARD = 3;

export function spawnBurst(
  game: SimState,
  x: number,
  y: number,
  color: string,
  count = 10,
  power = 4,
  castOwner: Seat | null = null,
) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, TAU);
    const speed = rand(0.5, power);
    game.particles.push({
      castOwner,
      ...(color === '#ice-prison-shatter'
        ? { shape: 'tongue' as const }
        : color === '#icebomb-blast'
          ? { shape: i % 3 === 0 ? ('tongue' as const) : ('circle' as const) }
          : color === '#plasmabomb-blast'
            ? { shape: (['oval', 'tongue', 'circle'] as const)[i % 3] }
            : color === SPELL_COLOR.EARTH
              ? { shape: (['tongue', 'oval', 'circle'] as const)[i % 3] }
              : {}),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color:
        color === '#ice-prison-shatter'
          ? (['#b6f0ff', '#e8fbff', '#67c8eb', '#d0e7f4'] as const)[i % 4]
          : color === '#icebomb-blast'
            ? i % 3 === 0
              ? i % 2
                ? '#a7e5ff'
                : '#f2fdff'
              : (['#7dd3fc', '#d7f8ff', '#83c8e8'] as const)[i % 3]
            : color === '#plasmabomb-blast'
              ? (['#a94bd9', '#e9a6f7', '#64238d', '#f8d2ff', '#cb72ee', '#f2a2dc'] as const)[i % 6]
              : color === '#waterbomb-blast'
                ? (['#38bdf8', '#bae6fd'] as const)[i % 2]
                : color === '#firebomb-blast'
                  ? (['#991b1b', '#c2410c', '#f97316', '#facc15'] as const)[i % 4]
                  : color === SPELL_COLOR.EARTH
                    ? (['#525b63', '#89949c', '#414950', '#66747a', '#8bac94'] as const)[i % 5]
                    : color === '#d85a24'
                      ? // Deliberately distinct from stream colours: these stay as small circles.
                        (['#d45d24', '#c38b23', '#98291b'] as const)[i % 3]
                      : color,
      life: color === '#ice-prison-shatter' ? rand(18, 33) : rand(12, 28),
      r: color === '#ice-prison-shatter' ? rand(3, 8) : rand(2, 5),
    });
  }
}

/** The spray of a fire/water attack from wizard `w` towards (x, y). Also used by online cast prediction. */
export function makeSprayParticles(
  game: SimState,
  origin: Vec2,
  x: number,
  y: number,
  spell: SpellName,
  owner: Seat,
): Particle[] {
  const fire = spell === 'FIRE';
  const angle = Math.atan2(y - origin.y, x - origin.x);
  const range = 300;
  const out: Particle[] = [];
  if (fire) {
    // Spread flame tongues across the same ±0.34-radian cone that applies Fire damage.
    const count = 12;
    for (let i = 0; i < count; i++) {
      const sprayAngle = angle + rand(-0.34, 0.34);
      const dirX = Math.cos(sprayAngle);
      const dirY = Math.sin(sprayAngle);
      const distance = 8 + Math.sqrt((i + Math.random()) / count) * (range - 8);
      const endX = origin.x + dirX * range;
      const endY = origin.y + dirY * range;
      let stop: Vec2 | null = firstObstacleHit(
        origin.x,
        origin.y,
        endX,
        endY,
        2,
        spellSolids(game.map),
      );
      const edge = bubbleCrossing(
        game.bubbles,
        origin.x,
        origin.y,
        stop ? stop.x : endX,
        stop ? stop.y : endY,
      );
      if (edge) {
        const ex = stop ? stop.x : endX;
        const ey = stop ? stop.y : endY;
        stop = { x: origin.x + (ex - origin.x) * edge.u, y: origin.y + (ey - origin.y) * edge.u };
      }
      const rayLength = stop ? Math.hypot(stop.x - origin.x, stop.y - origin.y) : range;
      if (distance >= rayLength - 4) continue;
      const px = origin.x + dirX * distance;
      const py = origin.y + dirY * distance;
      const particleAngle = sprayAngle + rand(-0.035, 0.035);
      const particleRadius = rand(7, 12);
      let particleLength = Math.min(rand(38, 54), rayLength - distance - particleRadius);
      const particleEndX = px + Math.cos(particleAngle) * particleLength;
      const particleEndY = py + Math.sin(particleAngle) * particleLength;
      let particleStop = firstObstacleHit(
        px,
        py,
        particleEndX,
        particleEndY,
        particleRadius,
        spellSolids(game.map),
      );
      const particleEdge = bubbleCrossing(
        game.bubbles,
        px,
        py,
        particleStop ? particleStop.x : particleEndX,
        particleStop ? particleStop.y : particleEndY,
      );
      if (particleEdge) {
        const ex = particleStop ? particleStop.x : particleEndX;
        const ey = particleStop ? particleStop.y : particleEndY;
        particleStop = {
          u: particleEdge.u,
          x: px + (ex - px) * particleEdge.u,
          y: py + (ey - py) * particleEdge.u,
        };
      }
      if (particleStop) {
        particleLength = Math.min(
          particleLength,
          Math.hypot(particleStop.x - px, particleStop.y - py) - particleRadius,
        );
        if (i === 0 && Math.random() < 0.12)
          spawnBurst(game, particleStop.x, particleStop.y, '#fb923c', 2, 2, owner);
      }
      if (particleLength < 7) continue;
      out.push({
        castOwner: owner,
        obstacleStop: true,
        shape: 'flame-tongue',
        angle: particleAngle,
        x: px,
        y: py,
        vx: Math.cos(particleAngle) * rand(1.2, 2.8),
        vy: Math.sin(particleAngle) * rand(1.2, 2.8),
        color: (['#f97316', '#fb923c', '#fbbf24', '#fde047'] as const)[i % 4],
        life: rand(15, 22),
        r: particleRadius,
        length: particleLength,
      });
    }
    return out;
  }
  for (let i = 0; i < 15; i++) {
    const sprayAngle = angle + rand(-0.1, 0.1);
    const r = rand(25, 350);
    let tx = origin.x + Math.cos(sprayAngle) * r;
    let ty = origin.y + Math.sin(sprayAngle) * r;
    let stop: Vec2 | null = firstObstacleHit(origin.x, origin.y, tx, ty, 2, spellSolids(game.map));
    const edge = bubbleCrossing(
      game.bubbles,
      origin.x,
      origin.y,
      stop ? stop.x : tx,
      stop ? stop.y : ty,
    );
    if (edge) {
      const ex = stop ? stop.x : tx,
        ey = stop ? stop.y : ty;
      stop = { x: origin.x + (ex - origin.x) * edge.u, y: origin.y + (ey - origin.y) * edge.u };
    }
    if (stop) {
      tx = stop.x;
      ty = stop.y;
      if (Math.random() < 0.35) spawnBurst(game, tx, ty, '#7dd3fc', 2, 2, owner);
    }
    out.push({
      castOwner: owner,
      obstacleStop: true,
      x: tx,
      y: ty - 12,
      vx: stop ? 0 : Math.cos(sprayAngle) * rand(11, 16),
      vy: stop ? 0 : Math.sin(sprayAngle) * rand(11, 16),
      color: Math.random() < 0.5 ? '#38bdf8' : '#bae6fd',
      life: rand(9, 21),
      r: rand(2, 5),
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
          color: i % 3 === 0 ? '#fde047' : i % 2 ? '#a3e635' : '#d9f99d',
          life,
          r: rand(1.8, 4.2),
          castOwner: ev.castOwner,
        });
      }
      return;
    }
    case 'burst':
      spawnBurst(game, ev.x, ev.y, ev.color, ev.count, ev.power, ev.castOwner);
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
          color: Math.random() < 0.4 ? '#fde047' : Math.random() < 0.6 ? '#fb923c' : '#3f3f46',
          life: rand(14, 32),
          r: rand(3, 9),
        });
      return;
    case 'text':
      if (ev.damageOwner) {
        // keep each wizard to a few damage numbers without discarding status messages
        const own = game.labels.filter((label) => label.damageOwner === ev.damageOwner);
        while (own.length >= MAX_DAMAGE_LABELS_PER_WIZARD) {
          const i = game.labels.indexOf(own.shift()!);
          if (i >= 0) game.labels.splice(i, 1);
        }
      }
      game.labels.push({
        x: ev.x,
        y: ev.y,
        text: ev.text,
        color: ev.color,
        life: ev.damageOwner ? 52 : 60,
        damageOwner: ev.damageOwner,
      });
      return;
    case 'lightning': {
      if (ev.variant === 'plasma_beam' || ev.variant === 'magnetic_pull') {
        const existing = game.arcs.find(
          (arc) =>
            arc.variant === ev.variant &&
            arc.castOwner === ev.castOwner &&
            !!arc.reflected === !!ev.reflected,
        );
        const points = [
          { x: ev.x, y: ev.y },
          { x: ev.tx, y: ev.ty },
        ];
        if (existing) {
          existing.targetPoints = points;
          existing.hit = ev.hit;
          existing.life = 11;
        } else {
          game.arcs.push({
            points,
            targetPoints: points,
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
      game.waves.push({ x: ev.x, y: ev.y, r: ev.r, life: ev.life, color: ev.color });
      return;
    case 'bolt_trail':
      game.particles.push({
        x: ev.x + rand(-8, 8),
        y: ev.y - 18 + rand(-8, 8),
        vx: rand(-1.5, 1.5),
        vy: rand(-1.5, 1.5),
        color: SPELL_COLOR[ev.spell],
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
    const fraction = i / 12;
    pts.push({
      x: x + (tx - x) * fraction + rand(-11, 11),
      y: y - 20 + (ty - y) * fraction + rand(-11, 11),
    });
  }
  pts.push({ x: tx, y: ty - 20 });
  return pts;
}

/** Moves one particle for `dt` ticks; spray particles stop at pillars instead of passing through. */
export function stepParticle(game: SimState, particle: Particle, dt: number) {
  const nx = particle.x + particle.vx * dt;
  const ny = particle.y + particle.vy * dt;
  if (particle.obstacleStop && (particle.vx !== 0 || particle.vy !== 0)) {
    let stop: Vec2 | null = firstObstacleHit(
      particle.x,
      particle.y,
      nx,
      ny,
      particle.r + (particle.shape === 'flame-tongue' ? (particle.length ?? 0) : 0),
      spellSolids(game.map),
    );
    // a bubble stops a spray at its edge as well; a flame is stopped by its tip, not its root
    const tip = particle.shape === 'flame-tongue' ? (particle.length ?? 0) : 0;
    const tx = Math.cos(particle.angle ?? 0) * tip,
      ty = Math.sin(particle.angle ?? 0) * tip;
    const ex = (stop ? stop.x : nx) + tx,
      ey = (stop ? stop.y : ny) + ty;
    const edge = bubbleCrossing(game.bubbles, particle.x + tx, particle.y + ty, ex, ey);
    if (edge) {
      stop = {
        x: particle.x + (ex - particle.x - tx) * edge.u,
        y: particle.y + (ey - particle.y - ty) * edge.u,
      };
    }
    if (stop) {
      particle.x = stop.x;
      particle.y = stop.y;
      particle.vx = 0;
      particle.vy = 0;
    } else {
      particle.x = nx;
      particle.y = ny;
    }
  } else {
    particle.x = nx;
    particle.y = ny;
  }
  particle.life -= dt;
}

/** Animates all cosmetics and drops the finished ones. `dt` is in game ticks (1 = 1/60 s). */
export function advanceCosmetics(game: SimState, dt: number) {
  for (const particle of game.particles) stepParticle(game, particle, dt);
  for (const label of game.labels) {
    label.y -= 0.6 * dt;
    label.life -= dt;
  }
  for (const arc of game.arcs) {
    arc.life -= dt;
    if (arc.variant === 'plasma_beam' || arc.variant === 'magnetic_pull') {
      // Beam FX arrive with snapshots at 30 Hz. Ease the visual toward each new server endpoint
      // between snapshots so mouse movement does not look like a sequence of discrete jumps.
      if (arc.targetPoints?.length === arc.points.length) {
        const blend = 1 - Math.exp(-dt / 1.5);
        for (let i = 0; i < arc.points.length; i++) {
          arc.points[i].x += (arc.targetPoints[i].x - arc.points[i].x) * blend;
          arc.points[i].y += (arc.targetPoints[i].y - arc.points[i].y) * blend;
        }
      }
      const end = arc.points[arc.points.length - 1],
        start = arc.points[0];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      arc.reach = Math.min(length, (arc.reach ?? 0) + 19 * dt);
    }
  }
  for (const wave of game.waves) {
    wave.r += 8 * dt;
    wave.life -= dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
  game.labels = game.labels.filter((label) => label.life > 0);
  game.arcs = game.arcs.filter((arc) => arc.life > 0);
  game.waves = game.waves.filter((wave) => wave.life > 0);
}
