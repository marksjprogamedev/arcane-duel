import { COL, COMBO_DAMAGE, WIZARD_HIT_RADIUS } from '../constants';
import { canChargeSpell, CHARGE_TICKS, isContinuousSpell } from '../charge';
import { dist, TAU } from '../math';
import { SimState } from '../simState';
import type { Bomb, Bubble, Shot, SpellName, Wizard } from '../types';
import {
  blocked,
  bomb,
  burst,
  cast,
  crater,
  damage,
  heal,
  hit,
  reflect,
  shield,
  status,
  sword,
} from './combat';
import { float, flushDamageNumbers } from './effects';
import { bubbleCrossing, ray, segmentCircleHit, walk } from './geometry';
import { simRand } from './random';
import { walkWithKeys, WALK_SPEED } from './movement';
import { make, startDeath, tick } from './wizard';

/**
 * Advances the world by `dt` ticks. Returns false while the end-of-round animation is playing
 * (no gameplay happens then), true when a normal gameplay step ran.
 */

/**
 * The first thing a projectile met on its way from (ox, oy) to where it is now: one of the
 * `targets`, a pillar, or nothing. Checks the whole travelled segment, not just the end point, so a
 * pillar in front of a wizard intercepts it. On contact the projectile stops at the contact point.
 */
function firstContact(
  game: SimState,
  s: Shot,
  ox: number,
  oy: number,
  targets: Wizard[],
  wallMargin: number,
  canHitWizard: boolean,
): Wizard | 'wall' | null {
  const wall = ray(ox, oy, s.x, s.y, wallMargin, game.obstacles);
  let struck: Wizard | null = null;
  let wizardAt: number | null = null;
  if (canHitWizard)
    for (const target of targets) {
      if (target === game.e && game.respawn > 0) continue;
      const at = segmentCircleHit(ox, oy, s.x, s.y, target.x, target.y, s.r + WIZARD_HIT_RADIUS);
      if (at !== null && (wizardAt === null || at < wizardAt)) {
        wizardAt = at;
        struck = target;
      }
    }
  if (struck && wizardAt !== null && (!wall || wizardAt < wall.u)) {
    s.x = ox + (s.x - ox) * wizardAt;
    s.y = oy + (s.y - oy) * wizardAt;
    s.life = 0;
    return struck;
  }
  if (wall) {
    s.x = wall.x;
    s.y = wall.y;
    s.life = 0;
    return 'wall';
  }
  return null;
}

/** Who a projectile can hurt: its owner's opponent, and the owner too once it has left them. */
function victims(game: SimState, s: Shot): Wizard[] {
  const foe = s.owner === game.p ? game.e : game.p;
  return s.ownerClear ? [foe, s.owner] : [foe];
}

/**
 * If the step (ox, oy) -> (s.x, s.y) crossed a bubble edge, cuts the step short at the edge and
 * returns the bubble. The caller still checks what lies before that point, then bounces.
 */
function stopAtBubble(game: SimState, s: Shot, ox: number, oy: number) {
  const crossing = bubbleCrossing(game.bubbles, ox, oy, s.x, s.y);
  if (!crossing) return null;
  s.x = ox + (s.x - ox) * crossing.u;
  s.y = oy + (s.y - oy) * crossing.u;
  return crossing.bubble;
}

function bounce(game: SimState, s: Shot, bubble: Bubble) {
  reflect(s, bubble);
  burst(game, s.x, s.y, '#c4b5fd', 10, 4);
}

/** A bomb going off. Wizards inside the bubble it burst on (if any) are shielded from the blast. */
function explode(game: SimState, b: Bomb, shelter: Bubble | null) {
  burst(game, b.x, b.y, COL[b.k], 45, 8);
  for (const target of [b.owner === game.p ? game.e : game.p, b.owner]) {
    if (target === game.e && game.respawn > 0) continue;
    if (shelter && dist(target, shelter) < shelter.r) continue;
    if (dist(b, target) < 100) hit(game, target, b.k, (COMBO_DAMAGE[b.k] || 18) * 2.5, false, true);
  }
  if (b.k === 'STORM')
    game.zones.push({ x: b.x, y: b.y, k: 'STORM', r: 75, owner: b.owner, life: 175, tick: 0 });
  b.dead = true;
}

const SIDES = ['p', 'e'] as const;
export function update(game: SimState, dt: number): boolean {
  game.t += dt;
  flushDamageNumbers(game, dt);
  if (game.ending) {
    if (game.death) game.death.age += dt;
    game.endClock += dt;
    if (game.endClock >= 115) game.events.push({ type: 'round_over' });
    return false;
  }
  tick(game, game.p, dt);
  if (game.respawn > 0) {
    game.respawn -= dt;
    if (game.death) game.death.age += dt;
    if (game.respawn <= 0) {
      game.e = make(645, 300, game.dummyHP, game.e.style);
      game.death = null;
      game.dummyClock = 60;
      burst(game, game.e.x, game.e.y - 20, '#4ade80', 35, 7);
      float(game, game.e.x, game.e.y - 80, 'RESPAWNED', '#4ade80');
    }
  } else tick(game, game.e, dt);
  // Charge state, the one place it is decided; snapshots show it to both players.
  for (const side of SIDES) {
    const input = game.input[side];
    const wizard = game[side];
    const charging =
      input.holding &&
      canChargeSpell(input.attack, wizard.magmaCD) &&
      (side === 'p' || game.mode === 'online');
    wizard.chargeSpell = charging ? input.attack : null;
    input.charge = charging ? Math.min(CHARGE_TICKS, input.charge + dt) : 0;
    wizard.chargeTicks = input.charge;
  }
  walkWithKeys(game.p, game.input.p.keys, dt, WALK_SPEED, game.obstacles);
  if (game.input.p.holding) {
    if (isContinuousSpell(game.input.p.attack)) {
      if (game.p.cast <= 0) cast(game, game.p, game.input.p.mouse.x, game.input.p.mouse.y);
    }
  }
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    game.e.freeze <= 0
  ) {
    game.dummyClock -= dt;
    if (game.dummyClock <= 0) {
      game.dummyAngle = simRand(game, 0, TAU);
      game.dummyClock = simRand(game, 50, 110);
    }
    let sp = 1.7 * (1 - (0.75 * game.e.chill) / 100),
      ox = game.e.x,
      oy = game.e.y;
    walk(
      game.e,
      Math.cos(game.dummyAngle) * sp * dt,
      Math.sin(game.dummyAngle) * sp * dt,
      game.obstacles,
    );
    if (dist(game.e, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += simRand(game, 1.7, 3.5);
      game.dummyClock = simRand(game, 30, 60);
    }
  }
  if (game.mode === 'online') {
    walkWithKeys(game.e, game.input.e.keys, dt, WALK_SPEED, game.obstacles);
    if (game.input.e.holding) {
      if (isContinuousSpell(game.input.e.attack)) {
        if (game.e.cast <= 0)
          cast(game, game.e, game.input.e.mouse.x, game.input.e.mouse.y, 1, game.input.e.attack);
      }
    }
  }
  if (game.mode === 'duel') {
    game.aiClock -= dt;
    if (game.aiClock <= 0) {
      game.aiClock = simRand(game, 45, 80);
      game.aiSide = game.rng() < 0.5 ? -1 : 1;
      game.e.spell = Object.keys(COL)[Math.floor(simRand(game, 0, 10))] as SpellName;
      if (game.rng() < 0.25 && game.e.bombCD <= 0)
        bomb(game, game.e, game.p.x, game.p.y, game.e.spell);
      if (game.rng() < 0.2) shield(game, game.e, Math.floor(simRand(game, 0, 4)));
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
        game.obstacles,
      );
    }
    if (game.e.hp < game.e.max * 0.48 && game.e.healCD <= 0 && game.rng() < 0.025)
      heal(game, game.e);
    if (d < 80 && game.e.swordCD <= 0 && game.e.cast <= 0) sword(game, game.e, game.p);
    if (game.e.cast <= 0 && game.e.swing <= 0) {
      if (cast(game, game.e, game.p.x, game.p.y, 1, game.e.spell))
        game.e.cast = isContinuousSpell(game.e.spell) ? 10 : simRand(game, 33, 52);
    }
  }
  for (let s of game.shots) {
    let target = s.owner === game.p ? game.e : game.p;
    if (s.magma === true) {
      let dx = s.tx - s.x,
        dy = s.ty - s.y,
        d = Math.hypot(dx, dy),
        step = 4 * dt,
        ox = s.x,
        oy = s.y,
        arrived = false;
      if (d <= step + 1) {
        s.x = s.tx;
        s.y = s.ty;
        arrived = true;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        s.life -= dt;
      }
      const bubble = stopAtBubble(game, s, ox, oy);
      const contact = firstContact(game, s, ox, oy, victims(game, s), 8, true);
      if (!contact && bubble) {
        bounce(game, s, bubble);
        arrived = false;
      }
      if (!s.ownerClear && dist(s, s.owner) > s.r + WIZARD_HIT_RADIUS) s.ownerClear = true;
      if (arrived) s.life = 0;
      s.trail += dt;
      if (s.trail >= 2) {
        s.trail = 0;
        game.events.push({ type: 'magma_trail', x: s.x, y: s.y, vx: s.vx, vy: s.vy });
      }
      if (contact && contact !== 'wall' && !s.hitTargets.has(contact)) {
        s.hitTargets.add(contact);
        hit(game, contact, 'MAGMA', s.damage);
        s.life = 0;
      }
      if (s.life <= 0) crater(game, s.x, s.y, s.owner);
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
      game.events.push({ type: 'bolt_trail', x: s.x, y: s.y, spell: s.k });
    }
    const bubble = stopAtBubble(game, s, ox, oy);
    const contact = firstContact(game, s, ox, oy, victims(game, s), s.r * 0.6, s.life > 0);
    if (contact === 'wall') {
      burst(game, s.x, s.y, COL[s.k], 12, 4);
    } else if (contact) {
      hit(game, contact, s.k, s.damage, s.charged);
      if (['ICE', 'PLASMA', 'MAGNETIC'].includes(s.k)) burst(game, s.x, s.y, COL[s.k], 22, 7);
    } else if (bubble) bounce(game, s, bubble);
    if (!s.ownerClear && dist(s, s.owner) > s.r + WIZARD_HIT_RADIUS) s.ownerClear = true;
    if (s.travel >= s.maxTravel - 0.01) {
      s.life = 0;
      burst(game, s.x, s.y, COL[s.k], 10, 3);
    }
  }
  for (let b of game.bombs) {
    if (!b.landed) {
      const ox = b.x,
        oy = b.y;
      b.u += dt / b.flight;
      let u = Math.min(1, b.u);
      b.x = b.sx + (b.tx - b.sx) * u;
      b.y = b.sy + (b.ty - b.sy) * u;
      // A bomb meeting a bubble's edge goes off right there, and the blast stays outside it.
      const crossing = bubbleCrossing(game.bubbles, ox, oy, b.x, b.y);
      if (crossing) {
        b.x = ox + (b.x - ox) * crossing.u;
        b.y = oy + (b.y - oy) * crossing.u;
        explode(game, b, crossing.bubble);
      } else if (u >= 1) b.landed = true;
    } else {
      b.fuse -= dt;
      if (b.fuse <= 0) explode(game, b, null);
    }
  }
  for (let z of game.zones) {
    z.life -= dt;
    z.tick += dt;
    if (z.tick >= 24) {
      z.tick = 0;
      for (const target of [z.owner === game.p ? game.e : game.p, z.owner]) {
        if ((target === game.e && game.respawn > 0) || dist(z, target) >= z.r + WIZARD_HIT_RADIUS)
          continue;
        if (z.k === 'MAGMA') {
          if (!target.shield || ![0, 3].includes(target.shield.type))
            damage(game, target, 4, COL.MAGMA);
        } else if (!blocked(game, target, 'STORM')) {
          status(game, target, 'stat', 13, 165, COL.STORM);
          if (target.stat >= 100) {
            target.stat = 0;
            damage(game, target, 18, COL.STORM);
          }
        }
      }
    }
  }
  game.shots = game.shots.filter(
    (s) => s.life > 0 && s.x > -40 && s.x < 840 && s.y > -40 && s.y < 640,
  );
  game.bombs = game.bombs.filter((b) => !b.dead);
  game.zones = game.zones.filter((z) => z.life > 0);
  for (const b of game.bubbles) b.life -= dt;
  game.bubbles = game.bubbles.filter((b) => b.life > 0);
  return true;
}

/** Starts the death sequence for any wizard whose HP ran out. Call after `update` returned true. */
export function resolveDeaths(game: SimState) {
  if (game.p.hp <= 0) startDeath(game, game.p, false);
  else if ((game.mode === 'duel' || game.mode === 'online') && game.e.hp <= 0)
    startDeath(game, game.e, false);
  else if (game.mode === 'mortal' && game.respawn <= 0 && game.e.hp <= 0)
    startDeath(game, game.e, true);
}
