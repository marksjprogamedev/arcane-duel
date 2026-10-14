import type { SpellName } from '../../../shared/types';
import { isContinuousSpell } from '../../../shared/charge';

// Instant visuals for your own online casts. The server remains authoritative for hits and HP.

import {
  BUBBLE,
  COL,
  COOLDOWN_TICKS,
  emoji,
  names,
  TRAP,
  WIZARD_HIT_RADIUS,
} from '../../../shared/constants';
import { makeSprayParticles } from '../../../shared/fx/cosmetics';
import { rand, TAU } from '../../../shared/math';
import { ray, segmentCircleHit, stopAtBubbleEdge } from '../../../shared/sim/geometry';
import { comb } from '../../../shared/sim/wizard';
import { $, g } from '../dom';
import {
  drawBubble,
  drawTrapRune,
  drawWave,
  renderLightningArc,
  renderParticle,
} from '../render/primitives';
import { projectile } from '../render/projectile';
import { game, localInput, net } from '../state';
import { usesAuthoritativeProjectile } from '../render/earthVisibility';

// Visual prediction is gated by the simulation's cooldowns and never applies damage locally.

export function guestFXAt(
  kind: SpellName | 'SHIELD' | 'SWORD' | 'FORCE' | 'HEAL' | 'BOMB' | 'BUBBLE' | 'TRAP',
  x: number = localInput().mouse.x,
  y: number = localInput().mouse.y,
) {
  if (!net.online || !game.active || !net.visualE || game.ending) return false;
  // Earth is drawn only from authoritative snapshots. Do not create the
  // competing local projectile or consume its cosmetic-only cooldown.
  if (usesAuthoritativeProjectile(kind)) return false;
  const cdKey = kind === 'SHIELD' ? null : kind === 'BOMB' ? 'BOMB' : kind;
  if (cdKey && (net.guestCooldowns[cdKey] || 0) > 0) return false;
  if (game.e && (game.e.freeze > 0 || game.e.silence > 0 || game.e.swing > 0) && kind !== 'SHIELD')
    return false;
  if (cdKey) net.guestCooldowns[cdKey] = COOLDOWN_TICKS[cdKey] || 20;
  const w = net.visualE,
    dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1;
  const continuous = isContinuousSpell(kind);
  const q: any = {
    castId: ++net.guestCastSequence,
    kind,
    x: w.x,
    y: w.y,
    dx: dx / d,
    dy: dy / d,
    age: 0,
    life: continuous
      ? kind === 'LIGHTNING'
        ? 9
        : 19
      : kind === 'MAGMA'
        ? 115
        : kind === 'BUBBLE' || kind === 'TRAP'
          ? 30
          : kind === 'BOMB'
            ? 75
            : kind === 'EARTH'
              ? 60
              : 70,
    continuous,
    seed: Math.random() * 10000,
    parts: [],
    confirmed: false,
    tx: x,
    ty: y,
    shieldType: null,
  };
  if (kind === 'TRAP') {
    // where the server will put it: towards the cursor, no further than the trap range
    const reach = Math.min(d, TRAP.RANGE);
    q.tx = Math.min(760, Math.max(40, w.x + (dx / d) * reach));
    q.ty = Math.min(560, Math.max(40, w.y + (dy / d) * reach));
    q.spell = net.guestSpell;
  }
  if (kind === 'LIGHTNING')
    q.jag = Array.from({ length: 11 }, () => ({ x: rand(-11, 11), y: rand(-11, 11) }));
  if (kind === 'FIRE' || kind === 'WATER') q.parts = makeSprayParticles(game, w, x, y, kind, 'e');
  if (kind === 'HEAL') {
    q.parts = Array.from({ length: 42 }, () => {
      let a = rand(0, TAU),
        v = rand(0.5, 7);
      return {
        x: w.x,
        y: w.y - 20,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        c: '#4ade80',
        life: rand(12, 28),
        r: rand(2, 5),
      };
    });
    q.wave = { x: w.x, y: w.y, r: 10, life: 25, c: '#4ade80' };
  }
  if (kind === 'FORCE') q.wave = { x: w.x, y: w.y, r: 8, life: 22, c: '#d8b4fe' };
  net.guestFX.push(q);
  net.guestPending.set(q.castId, q);
  if (net.guestPending.size > 120) net.guestPending.delete(net.guestPending.keys().next().value);
  if (net.guestFX.length > 45) net.guestFX.splice(0, net.guestFX.length - 45);
  return true;
}

export function drawGuestFX(dt: number) {
  if (!net.online) return;
  g.save();
  for (const q of net.guestFX) {
    q.age += dt;
    // Keep the locally rendered projectile; authoritative copies are hidden
    // on this client. Damage, collision and status remain server-controlled.
    const fade = Math.min(1, Math.max(0, (q.life - q.age) / Math.min(12, q.life * 0.3)));
    const col = COL[q.kind] || '#d8b4fe';
    g.globalAlpha = fade * 0.9;
    g.strokeStyle = col;
    g.fillStyle = col;
    if (q.kind === 'FIRE' || q.kind === 'WATER') {
      for (const part of q.parts) {
        if (part.life <= 0) continue;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.life -= dt;
        renderParticle(part);
      }
      g.shadowBlur = 0;
      g.globalAlpha = fade * 0.9;
    } else if (q.kind === 'LIGHTNING') {
      const ox = net.visualE?.x ?? q.x,
        oy = net.visualE?.y ?? q.y;
      // Same sharp, independently jagged segments as the server's spray() lightning.
      let end = { x: ox + q.dx * 300, y: oy + q.dy * 300 };
      const wall = ray(ox, oy, end.x, end.y, 3, game.map.obstacles);
      if (wall) end = { x: wall.x, y: wall.y };
      end = stopAtBubbleEdge(game.bubbles, ox, oy, end.x, end.y);
      const pts = [{ x: ox, y: oy - 20 }];
      for (let i = 1; i < 12; i++) {
        const u = i / 12;
        pts.push({
          x: ox + (end.x - ox) * u + q.jag[i - 1].x,
          y: oy - 20 + (end.y - oy) * u + q.jag[i - 1].y,
        });
      }
      pts.push({ x: end.x, y: end.y - 20 });
      renderLightningArc({ points: pts, life: Math.max(0, 11 - q.age) });
      if (q.age < 5) {
        for (let i = 0; i < 9; i++) {
          const a = i * 2.399 + q.seed,
            rr = (i % 4) * 4 + q.age * 2;
          const tx = end.x + Math.cos(a) * rr,
            ty = end.y + Math.sin(a) * rr;
          renderParticle({ x: tx, y: ty - 5, r: 2.5 + (i % 3), c: '#fde047', life: 12 });
        }
      }
    } else if (q.kind === 'HEAL' || q.kind === 'FORCE') {
      if (q.kind === 'HEAL')
        for (const part of q.parts) {
          if (q.age >= part.life) continue;
          renderParticle({
            x: part.x + part.vx * q.age,
            y: part.y + part.vy * q.age + 15,
            c: part.c,
            r: part.r,
            life: part.life - q.age,
          });
        }
      if (q.wave) {
        q.wave.r += (q.kind === 'HEAL' ? 3.8 : 6) * dt;
        q.wave.life = Math.max(0, (q.kind === 'HEAL' ? 25 : 22) - q.age);
        if (q.wave.life > 0) drawWave(q.wave);
      }
    } else if (q.kind === 'SHIELD') {
      // Match actor()'s shield outline; never show the generic
      // purple expanding ring. Keep the preview until the server's shield
      // appears in a snapshot, preventing a gap on higher-latency connections.
      if (!game.e?.shield && q.age < q.life) {
        const ox = net.visualE?.x ?? q.x,
          oy = net.visualE?.y ?? q.y;
        const c = q.shieldType === 4 ? '#4ade80' : COL[names[q.shieldType]] || '#4ade80';
        g.strokeStyle = c;
        g.lineWidth = 5;
        g.shadowColor = c;
        g.shadowBlur = 24;
        g.globalAlpha = fade;
        g.beginPath();
        g.ellipse(ox, oy - 14, 35, 47, 0, 0, TAU);
        g.stroke();
        g.shadowBlur = 0;
      }
    } else if (q.kind === 'BUBBLE') {
      // Shown at the cast spot until the server's own bubble reaches a snapshot (as with SHIELD).
      if (!game.bubbles.some((b) => b.owner === game.e) && q.age < q.life)
        drawBubble(q.x, q.y, BUBBLE.RADIUS, fade);
    } else if (q.kind === 'TRAP') {
      // Shown until the server's own trap reaches a snapshot, like the bubble.
      if (!game.traps.some((t) => t.owner === game.e) && q.age < q.life)
        drawTrapRune(q.tx, q.ty, COL[q.spell] || '#fbbf24', false, q.age);
    } else if (q.kind === 'SWORD') {
      g.lineWidth = 8;
      g.beginPath();
      g.arc(q.x, q.y - 20, 12 + q.age * 2, 0, TAU);
      g.stroke();
    } else {
      const speed = q.kind === 'MAGMA' ? 4 : q.kind === 'EARTH' ? 9 : 7.5;
      const radius = q.kind === 'MAGMA' ? 27 : q.kind === 'EARTH' ? 14 : 10;
      // Magma stops at the clicked target, matching the server's target-locked projectile.
      const maxDist = q.kind === 'MAGMA' ? Math.hypot(q.tx - q.x, q.ty - q.y) : 450;
      const travel = Math.min(q.age * speed, maxDist);
      if (q.kind === 'MAGMA' && q.age * speed >= maxDist) continue;
      const offset = q.kind === 'MAGMA' ? 0 : 25;
      const sx = q.x + q.dx * offset,
        sy = q.y + q.dy * offset,
        px = q.x + q.dx * (offset + travel),
        py = q.y + q.dy * (offset + travel);
      // Predicted visuals must not pass through obstacles or wizards. The
      // authoritative simulation still decides hits and damage; this only
      // ends the caster's local projectile at the first visible contact.
      if (q.kind !== 'BOMB') {
        const margin = q.kind === 'MAGMA' ? 8 : radius * 0.6;
        const wall = ray(sx, sy, px, py, margin, game.map.obstacles);
        const opponent = net.visualP || game.p;
        const wizardAt = opponent
          ? segmentCircleHit(sx, sy, px, py, opponent.x, opponent.y, radius + WIZARD_HIT_RADIUS)
          : null;
        // a pillar or the opponent in the way: the preview stops here
        if (wall || wizardAt !== null) {
          q.confirmed = true;
          continue;
        }
      }
      if (px >= 10 && px <= 790 && py >= 10 && py <= 590) {
        if (q.kind === 'BOMB') {
          g.shadowColor = col;
          g.shadowBlur = 12;
          g.beginPath();
          g.arc(px, py - 20, 12, 0, TAU);
          g.fill();
          g.shadowBlur = 0;
        } else
          projectile({
            x: px,
            y: py,
            vx: q.dx * speed,
            vy: q.dy * speed,
            k: q.kind,
            r: radius,
            life: 90,
          });
      }
    }
  }
  g.restore();
  net.guestFX = net.guestFX.filter((q) => !q.confirmed && q.age < q.life);
}

export function guestSelect(k: string) {
  if (k === 'KeyE') {
    net.guestHeal = true;
    net.guestElements = [];
    return;
  }
  if (k === 'Digit2' && net.guestHeal) {
    net.guestHeal = false;
    guestFXAt('HEAL');
    return;
  }
  if (/^Digit[1-4]$/.test(k)) {
    let i = Number(k.slice(-1)) - 1;
    net.guestHeal = false;
    net.guestElements =
      net.guestElements.length >= 2 || net.guestElements.includes(i)
        ? [i]
        : [...net.guestElements, i];
    $('loaded').textContent = net.guestElements.map((j) => emoji[j]).join(' + ');
    return;
  }
  if (k === 'Space') {
    const now = performance.now();
    const doubleTap = now - net.guestLastSpace <= (BUBBLE.DOUBLE_TAP_TICKS * 1000) / 60;
    net.guestLastSpace = now;
    if (doubleTap && guestFXAt('BUBBLE')) {
      net.guestLastSpace = -Infinity;
      return;
    }
    // The server does nothing when Space is pressed without a loaded element.
    if (net.guestHeal) {
      if (guestFXAt('SHIELD')) net.guestFX.at(-1).shieldType = 4;
    } else if (net.guestElements.length) {
      const type = net.guestElements.at(-1);
      if (guestFXAt('SHIELD')) net.guestFX.at(-1).shieldType = type;
    }
    net.guestHeal = false;
    net.guestElements = [];
    return;
  }
  if (k === 'KeyF') guestFXAt('SWORD');
  if (k === 'KeyQ') guestFXAt('FORCE');
}

export function guestCommit() {
  if (net.guestElements.length) {
    net.guestSpell = comb(net.guestElements) || net.guestSpell;
    net.guestElements = [];
    $('attack').textContent = net.guestSpell;
    $('attack').style.color = COL[net.guestSpell];
    $('spell').textContent = net.guestSpell;
    $('loaded').textContent = '— EMPTY —';
  }
}
