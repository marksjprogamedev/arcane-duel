import { COL } from '../../../shared/constants';
import { dist, rand, TAU } from '../../../shared/math';
import type { SpellName } from '../../../shared/types';
import { game } from '../state';
import {
  blocked,
  bomb,
  burst,
  cast,
  crater,
  damage,
  heal,
  hit,
  shield,
  status,
  sword,
} from './combat';
import { float, flushDamageNumbers } from './effects';
import { ray, walk } from './geometry';
import { make, startDeath, tick } from './wizard';

/**
 * Advances the world by `dt` ticks. Returns false while the end-of-round animation is playing
 * (no gameplay happens then), true when a normal gameplay step ran.
 */
export function update(dt: number): boolean {
  game.t += dt;
  flushDamageNumbers(dt);
  if (game.ending) {
    if (game.death) game.death.age += dt;
    game.endClock += dt;
    for (let q of game.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
    }
    game.particles = game.particles.filter((q) => q.life > 0);
    for (let q of game.labels) {
      q.y -= 0.6 * dt;
      q.life -= dt;
    }
    game.labels = game.labels.filter((q) => q.life > 0);
    if (game.endClock >= 115) game.events.push({ type: 'round_over' });
    return false;
  }
  tick(game.p, dt);
  if (game.respawn > 0) {
    game.respawn -= dt;
    if (game.death) game.death.age += dt;
    if (game.respawn <= 0) {
      game.e = make(645, 300, game.dummyHP, game.e.style);
      game.death = null;
      game.dummyClock = 60;
      burst(game.e.x, game.e.y - 20, '#4ade80', 35, 7);
      float(game.e.x, game.e.y - 80, 'RESPAWNED', '#4ade80');
    }
  } else tick(game.e, dt);
  let mx = Number(!!game.input.p.keys.KeyD) - Number(!!game.input.p.keys.KeyA),
    my = Number(!!game.input.p.keys.KeyS) - Number(!!game.input.p.keys.KeyW),
    ml = Math.hypot(mx, my) || 1;
  if (game.p.freeze <= 0)
    walk(
      game.p,
      (mx / ml) * 3.5 * (1 - (0.75 * game.p.chill) / 100) * dt,
      (my / ml) * 3.5 * (1 - (0.75 * game.p.chill) / 100) * dt,
    );
  if (game.input.p.holding) {
    if (['FIRE', 'WATER', 'LIGHTNING'].includes(game.input.p.attack)) {
      if (game.p.cast <= 0) cast(game.p, game.input.p.mouse.x, game.input.p.mouse.y);
    } else game.input.p.charge = Math.min(90, game.input.p.charge + dt);
  }
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    game.e.freeze <= 0
  ) {
    game.dummyClock -= dt;
    if (game.dummyClock <= 0) {
      game.dummyAngle = rand(0, TAU);
      game.dummyClock = rand(50, 110);
    }
    let sp = 1.7 * (1 - (0.75 * game.e.chill) / 100),
      ox = game.e.x,
      oy = game.e.y;
    walk(game.e, Math.cos(game.dummyAngle) * sp * dt, Math.sin(game.dummyAngle) * sp * dt);
    if (dist(game.e, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += rand(1.7, 3.5);
      game.dummyClock = rand(30, 60);
    }
  }
  if (game.mode === 'online') {
    let mx = Number(!!game.input.e.keys.KeyD) - Number(!!game.input.e.keys.KeyA),
      my = Number(!!game.input.e.keys.KeyS) - Number(!!game.input.e.keys.KeyW),
      l = Math.hypot(mx, my) || 1;
    if (game.e.freeze <= 0)
      walk(
        game.e,
        (mx / l) * 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (my / l) * 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt,
      );
    if (game.input.e.holding) {
      if (['FIRE', 'WATER', 'LIGHTNING'].includes(game.input.e.attack)) {
        if (game.e.cast <= 0)
          cast(game.e, game.input.e.mouse.x, game.input.e.mouse.y, 1, game.input.e.attack);
      } else game.input.e.charge = Math.min(90, game.input.e.charge + dt);
    }
  }
  if (game.mode === 'duel') {
    game.aiClock -= dt;
    if (game.aiClock <= 0) {
      game.aiClock = rand(45, 80);
      game.aiSide = Math.random() < 0.5 ? -1 : 1;
      game.e.spell = Object.keys(COL)[Math.floor(rand(0, 10))] as SpellName;
      if (Math.random() < 0.25 && game.e.bombCD <= 0)
        bomb(game.e, game.p.x, game.p.y, game.e.spell);
      if (Math.random() < 0.2) shield(game.e, Math.floor(rand(0, 4)));
    }
    let d = dist(game.p, game.e) || 1,
      dx = (game.p.x - game.e.x) / d,
      dy = (game.p.y - game.e.y) / d;
    if (game.e.freeze <= 0) {
      let f = d > 235 ? 1 : d < 130 ? -1 : 0,
        sx = dx * f - dy * game.aiSide * 0.8,
        sy = dy * f + dx * game.aiSide * 0.8,
        l = Math.hypot(sx, sy) || 1;
      walk(
        game.e,
        (sx / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (sy / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
      );
    }
    if (game.e.hp < game.e.max * 0.48 && game.e.healCD <= 0 && Math.random() < 0.025) heal(game.e);
    if (d < 80 && game.e.swordCD <= 0 && game.e.cast <= 0) sword(game.e, game.p);
    if (game.e.cast <= 0 && game.e.swing <= 0) {
      if (cast(game.e, game.p.x, game.p.y, 1, game.e.spell))
        game.e.cast = ['FIRE', 'WATER', 'LIGHTNING'].includes(game.e.spell) ? 10 : rand(33, 52);
    }
  }
  for (let s of game.shots) {
    let target = s.owner === game.p ? game.e : game.p;
    if (s.magma) {
      let dx = s.tx - s.x,
        dy = s.ty - s.y,
        d = Math.hypot(dx, dy),
        step = 4 * dt,
        ox = s.x,
        oy = s.y;
      if (d <= step + 1) {
        s.x = s.tx;
        s.y = s.ty;
        s.life = 0;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        s.life -= dt;
      }
      let b = ray(ox, oy, s.x, s.y, 8);
      if (b) {
        s.x = b.x;
        s.y = b.y;
        s.life = 0;
      }
      s.trail += dt;
      if (s.trail >= 2) {
        s.trail = 0;
        for (let j = 0; j < 4; j++)
          game.particles.push({
            x: s.x + rand(-13, 13),
            y: s.y - 18 + rand(-12, 12),
            vx: rand(-2.5, 2.5) - s.vx * 0.25,
            vy: rand(-3, 1) - s.vy * 0.25,
            c: Math.random() < 0.4 ? '#fde047' : Math.random() < 0.6 ? '#fb923c' : '#3f3f46',
            life: rand(14, 32),
            r: rand(3, 9),
          });
      }
      if (
        (target !== game.e || game.respawn <= 0) &&
        dist(s, target) < s.r + 17 &&
        !s.hitTargets.has(target)
      ) {
        s.hitTargets.add(target);
        hit(target, 'MAGMA', s.damage);
        s.life = 0;
      }
      if (s.life <= 0) crater(s.x, s.y, s.owner);
      continue;
    }
    if (target.mag > 0) {
      let d = dist(s, target) || 1,
        sp = Math.hypot(s.vx, s.vy),
        turn = ((0.013 * target.mag) / 100) * dt,
        ux = (s.vx / sp) * (1 - turn) + ((target.x - s.x) / d) * turn,
        uy = (s.vy / sp) * (1 - turn) + ((target.y - s.y) / d) * turn,
        l = Math.hypot(ux, uy) || 1;
      s.vx = (ux / l) * sp;
      s.vy = (uy / l) * sp;
    }
    let ox = s.x,
      oy = s.y,
      step = Math.hypot(s.vx, s.vy) * dt,
      remaining = s.maxTravel - s.travel,
      mult = remaining < step ? Math.max(0, remaining / Math.max(step, 0.001)) : 1;
    s.x += s.vx * dt * mult;
    s.y += s.vy * dt * mult;
    s.travel += step * mult;
    s.life -= dt;
    s.trail += dt;
    if (s.trail > 3 && ['STEAM', 'PLASMA', 'STORM', 'ICE', 'MAGNETIC'].includes(s.k)) {
      s.trail = 0;
      game.particles.push({
        x: s.x + rand(-8, 8),
        y: s.y - 18 + rand(-8, 8),
        vx: rand(-1.5, 1.5),
        vy: rand(-1.5, 1.5),
        c: COL[s.k],
        life: rand(8, 19),
        r: rand(2, 6),
      });
    }
    let b = ray(ox, oy, s.x, s.y, s.r * 0.6);
    if (b) {
      s.x = b.x;
      s.y = b.y;
      s.life = 0;
      burst(s.x, s.y, COL[s.k], 12, 4);
    }
    if (s.life > 0 && (target !== game.e || game.respawn <= 0) && dist(s, target) < s.r + 17) {
      s.life = 0;
      hit(target, s.k, s.damage, s.charged);
      if (['ICE', 'PLASMA', 'MAGNETIC'].includes(s.k)) burst(s.x, s.y, COL[s.k], 22, 7);
    }
    if (s.travel >= s.maxTravel - 0.01) {
      s.life = 0;
      burst(s.x, s.y, COL[s.k], 10, 3);
    }
  }
  for (let b of game.bombs) {
    if (!b.landed) {
      b.u += dt / b.flight;
      let u = Math.min(1, b.u);
      b.x = b.sx + (b.tx - b.sx) * u;
      b.y = b.sy + (b.ty - b.sy) * u;
      if (u >= 1) b.landed = true;
    } else {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        burst(b.x, b.y, COL[b.k], 45, 8);
        let target = b.owner === game.p ? game.e : game.p;
        if ((target !== game.e || game.respawn <= 0) && dist(b, target) < 100)
          hit(
            target,
            b.k,
            ({ STEAM: 14, PLASMA: 12, STORM: 13, ICE: 12, MAGNETIC: 12 }[b.k] || 18) * 2.5,
            false,
            true,
          );
        if (b.k === 'STORM')
          game.zones.push({
            x: b.x,
            y: b.y,
            k: 'STORM',
            r: 75,
            owner: b.owner,
            life: 175,
            tick: 0,
          });
        b.dead = true;
      }
    }
  }
  for (let z of game.zones) {
    z.life -= dt;
    z.tick += dt;
    if (z.tick >= 24) {
      z.tick = 0;
      let target = z.owner === game.p ? game.e : game.p;
      if ((target !== game.e || game.respawn <= 0) && dist(z, target) < z.r + 17) {
        if (z.k === 'MAGMA') {
          if (!target.shield || ![0, 3].includes(target.shield.type)) damage(target, 4, COL.MAGMA);
        } else if (!blocked(target, 'STORM')) {
          status(target, 'stat', 13, 165, COL.STORM);
          if (target.stat >= 100) {
            target.stat = 0;
            damage(target, 18, COL.STORM);
          }
        }
      }
    }
  }
  for (let q of game.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
  }
  for (let q of game.labels) {
    q.y -= 0.6 * dt;
    q.life -= dt;
  }
  for (let q of game.arcs) q.life -= dt;
  for (let q of game.waves) {
    q.r += 8 * dt;
    q.life -= dt;
  }
  game.shots = game.shots.filter(
    (s) => s.life > 0 && s.x > -40 && s.x < 840 && s.y > -40 && s.y < 640,
  );
  game.bombs = game.bombs.filter((b) => !b.dead);
  game.zones = game.zones.filter((z) => z.life > 0);
  game.particles = game.particles.filter((q) => q.life > 0);
  game.labels = game.labels.filter((q) => q.life > 0);
  game.arcs = game.arcs.filter((q) => q.life > 0);
  game.waves = game.waves.filter((q) => q.life > 0);
  return true;
}

/** Starts the death sequence for any wizard whose HP ran out. Call after `update` returned true. */
export function resolveDeaths() {
  if (game.p.hp <= 0) startDeath(game.p, false);
  else if ((game.mode === 'duel' || game.mode === 'online') && game.e.hp <= 0)
    startDeath(game.e, false);
  else if (game.mode === 'mortal' && game.respawn <= 0 && game.e.hp <= 0) startDeath(game.e, true);
}
