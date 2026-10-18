import {
  BEAM,
  BOMB,
  COL,
  COMBO_DAMAGE,
  MAGMA_OWNER_GRACE_TICKS,
  MAGMA_SHOT_LIFE,
  TEAM_RESPAWN_TICKS,
  TRAP,
  WIZARD_HIT_RADIUS,
} from '../constants';
import { canChargeSpell, CHARGE_TICKS, isContinuousSpell, MAX_HOLD_TICKS } from '../charge';
import { beamAngle, beamPoint } from './aim';
import { beamTimer, continuousVariant, chargeableVariant, spellVariant } from './variants';
import { dist, TAU } from '../math';
import { SimState } from '../simState';
import type { Bomb, BoltShot, Bubble, Shot, SpellName, Wizard, Zone } from '../types';
import {
  blocked,
  shieldStops,
  bomb,
  burst,
  cast,
  crater,
  damage,
  extinguish,
  FLURRY_COOLDOWN_TICKS,
  heal,
  PYRO_DISC_REACH,
  hit,
  pull,
  reflect,
  reflectBomb,
  shield,
  shove,
  springTrap,
  status,
  SURGE,
  sword,
  THUNDERCLOUD,
} from './combat';
import { float, flushDamageNumbers } from './effects';
import {
  bubbleBetween,
  bubbleCrossing,
  clampToMap,
  clear,
  ray,
  segmentCircleHit,
  walk,
} from './geometry';
import { applyInput } from './input';
import { solidAt } from './obstacles';
import { simRand } from './random';
import { pinned, walkWithKeys, WALK_SPEED } from './movement';
import { humanControlled, nearestFoe, nearestFoeTo, targetsOf, untouchable } from './teams';
import { fall, make, startDeath, tick } from './wizard';

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
  const wall = ray(ox, oy, s.x, s.y, wallMargin, game.map.obstacles);
  let struck: Wizard | null = null;
  let wizardAt: number | null = null;
  if (canHitWizard)
    for (const target of targets) {
      if (untouchable(game, target)) continue;
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

/**
 * Whether a projectile is far enough from its owner to hurt them. Beyond the hit circle by two
 * walking steps: the owner has already moved this tick, so with less room a wizard running the way
 * they fired is back inside the circle when the next tick sweeps the projectile.
 */
function hasLeftOwner(s: Shot): boolean {
  return dist(s, s.owner) > s.r + WIZARD_HIT_RADIUS + 2 * WALK_SPEED;
}

/** Who a projectile can hurt: its owner's foes, and the owner too once it has left them. */
function victims(game: SimState, s: Shot): Wizard[] {
  return targetsOf(game, s.owner, !!s.ownerClear);
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

/**
 * A Water Surge's ring grows and shoves each wizard it reaches, once, away from where it was cast.
 * Bubbles treat it like any other spell (docs/BUBBLES.md): the ring cannot cross a bubble edge, and
 * where it first touches one a new ring starts there (`surgeBounce`).
 */
function surgeStep(game: SimState, z: Zone, dt: number) {
  z.r = Math.min(SURGE.MAX_R, z.r + ((SURGE.MAX_R - SURGE.START_R) / (SURGE.LIFE - 3)) * dt);
  const reached = (z.hit ??= []);
  for (const target of targetsOf(game, z.owner, !!z.reflected)) {
    if (reached.includes(target.seat)) continue;
    const d = dist(z, target);
    if (d > z.r + WIZARD_HIT_RADIUS) continue;
    // a pillar or a bubble in the way stops the water from reaching them (for good)
    if (!clear(z, target, 8, game.map.obstacles) || bubbleBetween(game.bubbles, z, target))
      continue;
    reached.push(target.seat);
    if (blocked(game, target, 'WATER')) continue;
    extinguish(game, target);
    status(game, target, 'wet', SURGE.WET, 130, COL.WATER);
    shove(target, z, SURGE.KNOCKBACK);
    burst(game, target.x, target.y - 20, COL.WATER, 18, 5);
  }
  surgePushBombs(game, z);
  surgeBounce(game, z);
}

/** The ring shoves every bomb it sweeps over (once each) outward, unless a wall or bubble is in the way. */
function surgePushBombs(game: SimState, z: Zone) {
  const pushed = (z.pushed ??= []);
  for (const b of game.bombs) {
    if (b.dead || pushed.includes(b.id) || dist(z, b) > z.r) continue;
    if (!clear(z, b, 8, game.map.obstacles) || bubbleBetween(game.bubbles, z, b)) continue;
    pushed.push(b.id);
    const d = dist(z, b);
    const at = clampToMap(
      game.map,
      b.x + (d > 1 ? (b.x - z.x) / d : 1) * SURGE.BOMB_PUSH,
      b.y + (d > 1 ? (b.y - z.y) / d : 0) * SURGE.BOMB_PUSH,
    );
    if (solidAt(game.map.obstacles, at.x, at.y, 12)) continue;
    // a bomb in flight keeps its arc: the whole throw moves with it
    const dx = at.x - b.x,
      dy = at.y - b.y;
    b.x += dx;
    b.y += dy;
    b.sx += dx;
    b.sy += dy;
    b.tx += dx;
    b.ty += dy;
    burst(game, b.x, b.y, COL.WATER, 10, 4);
  }
}

/**
 * Where a growing ring first meets a bubble, a new ring starts. The ring that met it carries on
 * growing (it just cannot cross the edge), and the new one starts from the point of contact on the
 * side it came from, with the bubble's owner as its owner: it can shove the wizard who cast the
 * surge, and bounces off the other bubbles it meets in turn, so facing bubbles keep rings going
 * for as long as they stand.
 *
 * Each ring turns off each bubble once (its own `bounced` list, which starts with the bubble it was
 * born at), and one surge keeps at most `SURGE.MAX_RINGS` rings alive at a time, so overlapping
 * bubbles can never pile up rings without end.
 */
function surgeBounce(game: SimState, z: Zone) {
  const bounced = (z.bounced ??= []);
  for (const bubble of [...game.bubbles]) {
    if (bounced.includes(bubble)) continue;
    const d = dist(z, bubble);
    const inside = d < bubble.r;
    // the ring first touches the edge here: the gap (cast outside) or what is left to the wall (inside)
    if (z.r < (inside ? bubble.r - d : d - bubble.r)) continue;
    bounced.push(bubble);
    if (game.zones.filter((o) => o.chain === z.chain).length >= SURGE.MAX_RINGS) continue;
    // the point of contact is on the line through the bubble's centre and the ring's centre; a ring
    // centred exactly on a bubble meets the whole wall at once, so the new one starts toward where
    // its caster faces
    const ux = d > 0.001 ? (z.x - bubble.x) / d : Math.cos(z.owner.face),
      uy = d > 0.001 ? (z.y - bubble.y) / d : Math.sin(z.owner.face);
    // start half a pixel on the side it came from, so it is not across the edge it bounced off
    const at = bubble.r + (inside ? -0.5 : 0.5);
    const x = bubble.x + ux * at,
      y = bubble.y + uy * at;
    game.zones.push({
      x,
      y,
      k: 'WATER',
      r: SURGE.START_R,
      owner: bubble.owner,
      life: SURGE.LIFE,
      tick: 0,
      hit: [],
      chain: z.chain,
      bounced: [bubble],
      reflected: true,
    });
    burst(game, x, y, '#c4b5fd', 10, 4);
  }
}

/**
 * A Thundercloud drifts after the enemy closest to the cloud itself (not to its caster), but strikes
 * whoever is beneath it: teammates and the caster too, friendly fire or not. It never seeks them out.
 */
function cloudStep(game: SimState, z: Zone, dt: number) {
  const foe = nearestFoeTo(game, z.owner.team, z);
  if (foe) {
    const d = dist(z, foe);
    if (d > 6) {
      const step = Math.min(d, WALK_SPEED * THUNDERCLOUD.SPEED_FACTOR * dt);
      z.x += ((foe.x - z.x) / d) * step;
      z.y += ((foe.y - z.y) / d) * step;
    }
  }
  z.tick += dt;
  if (z.tick < THUNDERCLOUD.STRIKE_TICKS) return;
  z.tick = 0;
  for (const target of game.wizards) {
    if (untouchable(game, target) || dist(z, target) >= z.r + WIZARD_HIT_RADIUS) continue;
    game.events.push({
      type: 'lightning',
      x: z.x,
      y: z.y - 90,
      tx: target.x,
      ty: target.y,
      castOwner: z.owner.seat,
    });
    hit(game, target, 'STORM', THUNDERCLOUD.STRIKE_DAMAGE, false, false, 'thundercloud');
  }
}

/** Sends a Pyrodisk back to its caster, with extra travel and life for the trip home. */
function startDiscReturn(s: BoltShot) {
  s.returning = true;
  s.maxTravel += 1200;
  s.life = Math.max(s.life, 120);
  s.ownerClear = true;
}

function bounce(game: SimState, s: Shot, bubble: Bubble) {
  reflect(s, bubble, game.map);
  burst(game, s.x, s.y, '#c4b5fd', 10, 4);
}

/** A bomb going off. */
function explode(game: SimState, b: Bomb) {
  if (b.k === 'MAGNETIC') {
    game.events.push({
      type: 'magnetic_implosion',
      x: b.x,
      y: b.y,
      castOwner: b.owner.seat,
    });
  } else {
    // Dedicated visual palette marker for Firebomb; same burst count and strength.
    burst(
      game,
      b.x,
      b.y,
      b.k === 'FIRE'
        ? '#firebomb-blast'
        : b.k === 'WATER'
          ? '#waterbomb-blast'
          : b.k === 'PLASMA'
            ? '#plasmabomb-blast'
            : b.k === 'ICE'
              ? '#icebomb-blast'
              : COL[b.k],
      45,
      8,
    );
  }
  for (const target of targetsOf(game, b.owner, true)) {
    const radius = b.k === 'MAGNETIC' ? BOMB.MAGNETIC_RADIUS : 100;
    const distance = dist(b, target);
    if (distance < radius) {
      // Only the magnetic bomb trades damage for a larger gravity-like pull.
      const damageAmount = (COMBO_DAMAGE[b.k] || 18) * 2.5 * (b.k === 'MAGNETIC' ? 0.65 : 1);
      hit(game, target, b.k, damageAmount, false, true);
      if (shieldStops(target, b.k)) continue;
      if (b.k === 'MAGNETIC') pull(target, b);
      if (b.k === 'WATER') shove(target, b, BOMB.WATER_KNOCKBACK);
    }
  }
  if (b.k === 'STORM')
    game.zones.push({ x: b.x, y: b.y, k: 'STORM', r: 75, owner: b.owner, life: 175, tick: 0 });
  b.dead = true;
}

/** A player's wizard walks with their held keys and keeps firing a held continuous spell. */
function walkAndSpray(game: SimState, w: Wizard, dt: number) {
  if (w.fallen) return;
  const input = game.input[w.seat];
  walkWithKeys(w, input.keys, dt, WALK_SPEED, game.map);
  const firing = input.holding && continuousVariant(input.attack, input.loadout);
  const timer = firing ? beamTimer(input.attack, input.loadout) : null;
  // letting go (or switching to another beam) starts the wait before it can fire again
  if (w.beamTimer && w.beamTimer !== timer) {
    w[w.beamTimer] = Math.max(w[w.beamTimer], BEAM.COOLDOWN_TICKS);
    w.beamTimer = null;
  }
  if (!firing) {
    w.beamAim = null;
    return;
  }
  // the beam follows the cursor, but only turns so fast
  w.beamAim = beamAngle(w.beamAim, w, input.mouse, dt);
  if (w.cast > 0) return;
  const at = beamPoint(w, w.beamAim, input.mouse);
  if (cast(game, w, at.x, at.y, 1, input.attack, input.loadout) && timer) w.beamTimer = timer;
}

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
  for (const w of game.wizards) if (!(dummyWaiting && w === game.e)) tick(game, w, dt);
  if (dummyWaiting) {
    game.respawn -= dt;
    if (game.death) game.death.age += dt;
    if (game.respawn <= 0) {
      game.e = make(
        game.map.spawns.e.x,
        game.map.spawns.e.y,
        game.dummyHP,
        game.e.style,
        game.e.seat,
        game.e.team,
      );
      game.death = null;
      game.dummyClock = 60;
      burst(game, game.e.x, game.e.y - 20, '#4ade80', 35, 7);
      float(game, game.e.x, game.e.y - 80, 'RESPAWNED', '#4ade80');
    }
  }
  // Charge state, the one place it is decided; snapshots show it to every player.
  for (const wizard of game.wizards) {
    const input = game.input[wizard.seat];
    const charging =
      input.holding &&
      chargeableVariant(input.attack, input.loadout) &&
      (input.attack !== 'MAGMA' || wizard.magmaCD <= 0) &&
      !wizard.fallen &&
      humanControlled(game, wizard);
    wizard.chargeSpell = charging ? input.attack : null;
    input.charge = charging ? Math.min(MAX_HOLD_TICKS, input.charge + dt) : 0;
    wizard.chargeTicks = Math.min(CHARGE_TICKS, input.charge);
    // a charge held 3 s past full is let go, as if the button were released
    if (input.charge >= MAX_HOLD_TICKS)
      applyInput(game, wizard.seat, { kind: 'pointerup', x: input.mouse.x, y: input.mouse.y });
  }
  // Releasing the mouse (or switching spells) retracts a held beam completely.
  for (const w of game.wizards) {
    const input = game.input[w.seat];
    if (!input.holding || input.attack !== 'PLASMA' || input.loadout.PLASMA !== 'plasma_beam')
      w.plasmaReach = 0;
    if (!input.holding || input.attack !== 'MAGNETIC' || input.loadout.MAGNETIC !== 'magnetic_pull')
      w.magneticReach = 0;
  }
  // A Pebble Flurry ends after 1.5 s of firing or when the button is let go; then it must recharge.
  for (const w of game.wizards) {
    if (w.flurryTime <= 0) continue;
    const input = game.input[w.seat];
    const firing =
      input.holding &&
      input.attack === 'EARTH' &&
      spellVariant('EARTH', input.loadout) === 'pebbles';
    w.flurryTime -= dt;
    if (w.flurryTime <= 0 || !firing) {
      w.flurryTime = 0;
      w.flurryCD = FLURRY_COOLDOWN_TICKS;
    }
  }
  for (const w of game.wizards) if (humanControlled(game, w)) walkAndSpray(game, w, dt);
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    !pinned(game.e)
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
      game.map,
    );
    if (dist(game.e, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += simRand(game, 1.7, 3.5);
      game.dummyClock = simRand(game, 30, 60);
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
    if (!pinned(game.e)) {
      let f = d > 235 ? 1 : d < 130 ? -1 : 0,
        sx = dx * f - dy * game.aiSide * 0.8,
        sy = dy * f + dx * game.aiSide * 0.8,
        l = Math.hypot(sx, sy) || 1;
      walk(
        game.e,
        (sx / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (sy / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        game.map,
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
      // Magma is slower than a walking caster, so it can't always get clear of them: after a short
      // grace it can hurt them anyway.
      if (!s.ownerClear && (hasLeftOwner(s) || s.life <= MAGMA_SHOT_LIFE - MAGMA_OWNER_GRACE_TICKS))
        s.ownerClear = true;
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
      if (s.life <= 0) {
        // Exploding for any reason ends the caster's immunity: a point-blank hit catches them too.
        if (!s.hitTargets.has(s.owner) && dist(s, s.owner) < s.r + WIZARD_HIT_RADIUS) {
          s.hitTargets.add(s.owner);
          hit(game, s.owner, 'MAGMA', s.damage);
        }
        crater(game, s.x, s.y, s.owner);
      }
      continue;
    }
    const target = nearestFoe(game, s.owner);
    if (target && target.mag > 0) {
      let d = dist(s, target) || 1,
        sp = Math.hypot(s.vx, s.vy),
        turn = ((0.013 * target.mag) / 100) * dt,
        ux = (s.vx / sp) * (1 - turn) + ((target.x - s.x) / d) * turn,
        uy = (s.vy / sp) * (1 - turn) + ((target.y - s.y) / d) * turn,
        l = Math.hypot(ux, uy) || 1;
      s.vx = (ux / l) * sp;
      s.vy = (uy / l) * sp;
    }
    if (s.variant === 'pyro_disc' && s.returning) {
      const dx = s.owner.x - s.x,
        dy = s.owner.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      s.vx = (dx / d) * 11;
      s.vy = (dy / d) * 11;
      if (d < 25) {
        s.life = 0;
        continue;
      }
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
    if (s.variant === 'pyro_disc') {
      // Any bubble (enemy, ally or its own caster's) stops the disc at its edge, before any wizard inside is checked.
      const bubbleStop = bubbleCrossing(game.bubbles, ox, oy, s.x, s.y);
      if (bubbleStop) {
        s.x = ox + (s.x - ox) * bubbleStop.u;
        s.y = oy + (s.y - oy) * bubbleStop.u;
      }
      // The disc passes through wizards rather than stopping on contact: up to two hits on each.
      // Count a hit only on entry; overlap across successive frames is not another hit.
      const radius = s.r + WIZARD_HIT_RADIUS;
      const wasInside = s.discInside ?? [];
      const nowInside: number[] = [];
      const hits = (s.discHits ??= {});
      // once a bubble has turned it round, its caster can be hurt too (like any reflected shot)
      for (const foe of targetsOf(game, s.owner, !!s.reflected)) {
        const dx = s.x - foe.x,
          dy = s.y - foe.y;
        const inside = dx * dx + dy * dy <= radius * radius;
        const crossing = segmentCircleHit(ox, oy, s.x, s.y, foe.x, foe.y, radius) !== null;
        if (inside) nowInside.push(foe.seat);
        if (!wasInside.includes(foe.seat) && (inside || crossing) && (hits[foe.seat] ?? 0) < 2) {
          hit(game, foe, s.k, s.damage, s.charged, false, s.variant);
          hits[foe.seat] = (hits[foe.seat] ?? 0) + 1;
        }
      }
      s.discInside = nowInside;
      const wall = ray(ox, oy, s.x, s.y, s.r * 0.6, game.map.obstacles);
      if (bubbleStop) {
        // Like any projectile it is reflected: it now belongs to the bubble's owner, flies out again
        // from the edge, and can hurt the one who threw it. It starts a new outward flight.
        bounce(game, s, bubbleStop.bubble);
        s.returning = false;
        s.maxTravel = PYRO_DISC_REACH;
        s.discHits = {};
        s.discInside = [];
      } else if (wall) {
        // Any obstacle (the map edge is not one) sends an outbound disc home; a returning disc is lost.
        s.x = ox;
        s.y = oy;
        burst(game, wall.x, wall.y, COL[s.k], 8, 3);
        if (s.returning || s.reflected) s.life = 0;
        else startDiscReturn(s);
      }
    } else {
      const bubble = stopAtBubble(game, s, ox, oy);
      const contact = firstContact(game, s, ox, oy, victims(game, s), s.r * 0.6, s.life > 0);
      if (contact === 'wall') {
        burst(game, s.x, s.y, COL[s.k], 12, 4);
      } else if (contact) {
        hit(game, contact, s.k, s.damage, s.charged, false, s.variant, s.power);
        if (['ICE', 'PLASMA', 'MAGNETIC'].includes(s.k)) burst(game, s.x, s.y, COL[s.k], 22, 7);
      } else if (bubble) bounce(game, s, bubble);
    }
    if (!s.ownerClear && hasLeftOwner(s)) s.ownerClear = true;
    // (a reflected disc is not coming back: it belongs to the bubble's owner now and just ends)
    if (s.variant === 'pyro_disc' && !s.returning && !s.reflected && s.travel >= s.maxTravel - 0.01)
      startDiscReturn(s);
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
      // A bomb meeting a bubble's edge is turned back like any projectile (docs/BUBBLES.md).
      const crossing = bubbleCrossing(game.bubbles, ox, oy, b.x, b.y);
      if (crossing) {
        b.x = ox + (b.x - ox) * crossing.u;
        b.y = oy + (b.y - oy) * crossing.u;
        reflectBomb(b, crossing.bubble, game.map);
        burst(game, b.x, b.y, '#c4b5fd', 10, 4);
      } else if (u >= 1) b.landed = true;
    } else {
      b.fuse -= dt;
      if (b.fuse <= 0) explode(game, b);
    }
  }
  for (let z of game.zones) {
    z.life -= dt;
    if (z.k === 'WATER') {
      surgeStep(game, z, dt);
      continue;
    }
    if (z.follow) {
      cloudStep(game, z, dt);
      continue;
    }
    z.tick += dt;
    if (z.tick >= 24) {
      z.tick = 0;
      for (const target of targetsOf(game, z.owner, true)) {
        if (dist(z, target) >= z.r + WIZARD_HIT_RADIUS) continue;
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

/** Starts the death sequence for any wizard whose HP ran out. Call after `update` returned true. */
export function resolveDeaths(game: SimState) {
  for (const w of game.wizards) {
    if (game.ending) return;
    if (w.fallen || w.hp > 0) continue;
    if (w === game.e && game.mode === 'mortal') {
      if (game.respawn <= 0) startDeath(game, w, true);
    } else if (w.seat === 0 || game.mode === 'duel' || game.mode === 'online') eliminate(game, w);
  }
}

/**
 * A wizard's health ran out. Elimination: they are out until the round ends, which happens when
 * their team has no one left. Respawn (team matches): the other team scores, the wizard comes back
 * after a delay, and the round ends when a team reaches the kill target. A duel is always one life.
 */
function eliminate(game: SimState, w: Wizard) {
  w.fallen = true;
  const { deathRule, teamSize, killTarget } = game.rules;
  if (deathRule === 'respawn' && teamSize > 1) {
    const scorer = w.team === 0 ? 1 : 0;
    if (++game.score[scorer] >= killTarget) startDeath(game, w, false);
    else {
      fall(game, w);
      w.returnIn = TEAM_RESPAWN_TICKS;
    }
  } else if (game.wizards.some((o) => o.team === w.team && !o.fallen)) fall(game, w);
  else startDeath(game, w, false);
}

/** A fallen wizard waiting to respawn counts down, then returns at their start with full health. */
function tickRespawns(game: SimState, dt: number) {
  for (const w of game.wizards) {
    if (!w.fallen || w.returnIn <= 0) continue;
    w.returnIn -= dt;
    if (w.returnIn > 0) continue;
    const at = game.starts[w.seat];
    Object.assign(w, make(at.x, at.y, w.max, w.style, w.seat, w.team));
    burst(game, w.x, w.y - 20, '#4ade80', 35, 7);
    float(game, w.x, w.y - 80, 'RESPAWNED', '#4ade80');
  }
}
