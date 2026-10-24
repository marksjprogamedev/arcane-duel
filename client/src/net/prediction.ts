import type { SpellName } from '../../../shared/types';
import { isContinuousSpell } from '../../../shared/charge';
import { spellVariant } from '../../../shared/sim/variants';
import { refreshLegend } from '../ui/hud/hud';

// Instant visuals for your own online casts. The server remains authoritative for hits and HP.

import {
  BEAM,
  BUBBLE,
  SPELL_COLOR,
  COOLDOWN_TICKS,
  ELEMENT_NAMES,
  TRAP,
  WIZARD_HIT_RADIUS,
} from '../../../shared/constants';
import { makeSprayParticles } from '../fx/cosmetics';
import { rand, TAU } from '../../../shared/math';
import { bubbleCrossing, firstObstacleHit, segmentCircleHit } from '../../../shared/sim/geometry';
import { combineElements } from '../../../shared/sim/wizard';
import { ctx } from '../dom';
import { renderParticle } from '../render/effects/particles';
import { drawWave } from '../render/effects/lightning';
import { drawBubble, drawShieldOutline, drawTrapRune } from '../render/world/controlEffects';
import { drawProjectile } from '../render/world/projectiles';
import { game, isHidden, localInput, me, net, others } from '../state';
import { usesAuthoritativeProjectile } from './earthVisibility';

// Visual prediction is gated by the simulation's cooldowns and never applies damage locally.

const isSpellKind = (kind: string): kind is SpellName => kind in SPELL_COLOR;

/** One predicted cast of our own, drawn until the server's version shows up (or it hits something). */
export interface CastPreview {
  castId: number;
  kind: SpellName | 'SHIELD' | 'FORCE' | 'HEAL' | 'BUBBLE' | 'TRAP';
  x: number;
  y: number;
  dx: number;
  dy: number;
  age: number;
  life: number;
  continuous: boolean;
  seed: number;
  parts: Parameters<typeof renderParticle>[0][];
  hitSomething: boolean;
  /** Target point (trap spot, or where a magma shot stops). */
  tx: number;
  ty: number;
  /** Element index of a shield's colour; 4 is the heal shield. */
  shieldType: number | null;
  /** The spell selected when a trap was placed (colours its rune). */
  spell?: SpellName;
  wave?: { x: number; y: number; r: number; life: number; color: string };
}

export function showCastPreview(
  kind: SpellName | 'SHIELD' | 'FORCE' | 'HEAL' | 'BUBBLE' | 'TRAP',
  x: number = localInput().mouse.x,
  y: number = localInput().mouse.y,
) {
  if (!net.online || !game.active || !net.drawnSelf || game.ending) return false;
  // Earth is drawn only from authoritative snapshots. Do not create the
  // competing local projectile or consume its cosmetic-only cooldown.
  if (usesAuthoritativeProjectile(kind)) return false;
  // Lightning comes from the server's arcs only. A local copy drifted from the server's own
  // cooldown, so some of the caster's bolts were never shown to them.
  if (kind === 'LIGHTNING') return false;
  // A spell variant looks nothing like the original, so it is drawn from the server's events and
  // shots only; predicting the original's look would flash the wrong spell.
  if (isSpellKind(kind) && spellVariant(kind, localInput().loadout) !== 'default') return false;
  const cdKey = kind === 'SHIELD' ? null : kind;
  if (cdKey && (net.spellCooldowns[cdKey] || 0) > 0) return false;
  if (me()?.fallen) return false;
  // a shield is the one cast a frozen or swinging wizard can still make; silence stops it too
  if (me()) {
    const caster = me();
    if (caster.freeze > 0 || caster.silence > 0 || (kind !== 'SHIELD' && caster.swing > 0))
      return false;
  }
  if (cdKey) net.spellCooldowns[cdKey] = COOLDOWN_TICKS[cdKey] ?? 20;
  const self = net.drawnSelf,
    dx = x - self.x,
    dy = y - self.y,
    distance = Math.hypot(dx, dy) || 1;
  const continuous = isContinuousSpell(kind);
  const preview: CastPreview = {
    castId: ++net.castSequence,
    kind,
    x: self.x,
    y: self.y,
    dx: dx / distance,
    dy: dy / distance,
    age: 0,
    life: continuous ? 19 : kind === 'MAGMA' ? 115 : kind === 'BUBBLE' || kind === 'TRAP' ? 30 : 70,
    continuous,
    seed: Math.random() * 10000,
    parts: [],
    hitSomething: false,
    tx: x,
    ty: y,
    shieldType: null,
  };
  if (kind === 'TRAP') {
    // where the server will put it: towards the cursor, no further than the trap range
    const reach = Math.min(distance, TRAP.RANGE);
    preview.tx = Math.min(game.map.width - 40, Math.max(40, self.x + (dx / distance) * reach));
    preview.ty = Math.min(game.map.height - 40, Math.max(40, self.y + (dy / distance) * reach));
    preview.spell = net.selectedSpell;
  }
  if (kind === 'FIRE' || kind === 'WATER')
    preview.parts = makeSprayParticles(game, self, x, y, kind, net.seat);
  if (kind === 'HEAL') {
    preview.parts = Array.from({ length: 42 }, () => {
      let angle = rand(0, TAU),
        speed = rand(0.5, 7);
      return {
        x: self.x,
        y: self.y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#4ade80',
        life: rand(12, 28),
        r: rand(2, 5),
      };
    });
    preview.wave = { x: self.x, y: self.y, r: 10, life: 25, color: '#4ade80' };
  }
  if (kind === 'FORCE') preview.wave = { x: self.x, y: self.y, r: 8, life: 22, color: '#d8b4fe' };
  net.castPreviews.push(preview);
  net.pendingCasts.set(preview.castId, preview);
  if (net.pendingCasts.size > 120) net.pendingCasts.delete(net.pendingCasts.keys().next().value);
  if (net.castPreviews.length > 45) net.castPreviews.splice(0, net.castPreviews.length - 45);
  return true;
}

/** Online, our attack button is let go (by the player, or by the auto-release after a long hold). */
export function releasePreview() {
  net.holdingAttack = false;
  net.beamAim = null;
  const input = localInput();
  // already let go (the auto-release): the server has cast, so a second preview would be a ghost
  const wasHolding = input.holding;
  input.holding = false;
  input.charge = 0;
  if (!wasHolding) return;
  if (isContinuousSpell(net.selectedSpell)) {
    // like the server: a spray can't start again at once after you let go
    if (spellVariant(net.selectedSpell, input.loadout) === 'default')
      net.spellCooldowns[net.selectedSpell] = BEAM.COOLDOWN_TICKS;
    return;
  }
  if (showCastPreview(net.selectedSpell))
    net.spellCooldowns[net.selectedSpell] = Math.max(
      net.spellCooldowns[net.selectedSpell] || 0,
      COOLDOWN_TICKS[net.selectedSpell] ?? 20,
    );
}

export function drawCastPreviews(dt: number) {
  if (!net.online) return;
  ctx.save();
  for (const preview of net.castPreviews) {
    preview.age += dt;
    // Keep the locally rendered projectile; authoritative copies are hidden
    // on this client. Damage, collision and status remain server-controlled.
    const fade = Math.min(
      1,
      Math.max(0, (preview.life - preview.age) / Math.min(12, preview.life * 0.3)),
    );
    const color = SPELL_COLOR[preview.kind] || '#d8b4fe';
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (preview.kind === 'FIRE' || preview.kind === 'WATER') {
      for (const part of preview.parts) {
        if (part.life <= 0) continue;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.life -= dt;
        renderParticle(part);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = fade * 0.9;
    } else if (preview.kind === 'HEAL' || preview.kind === 'FORCE') {
      if (preview.kind === 'HEAL')
        for (const part of preview.parts) {
          if (preview.age >= part.life) continue;
          renderParticle({
            x: part.x + part.vx * preview.age,
            y: part.y + part.vy * preview.age + 15,
            vx: part.vx,
            vy: part.vy,
            color: part.color,
            r: part.r,
            life: part.life - preview.age,
          });
        }
      if (preview.wave) {
        preview.wave.r += (preview.kind === 'HEAL' ? 3.8 : 6) * dt;
        preview.wave.life = Math.max(0, (preview.kind === 'HEAL' ? 25 : 22) - preview.age);
        if (preview.wave.life > 0) drawWave(preview.wave);
      }
    } else if (preview.kind === 'SHIELD') {
      // Match actor()'s shield outline; never show the generic
      // purple expanding ring. Keep the preview until the server's shield
      // appears in a snapshot, preventing a gap on higher-latency connections.
      if (!me()?.shield && preview.age < preview.life) {
        const ox = net.drawnSelf?.x ?? preview.x,
          oy = net.drawnSelf?.y ?? preview.y;
        const shieldColor =
          preview.shieldType === 4
            ? '#4ade80'
            : SPELL_COLOR[ELEMENT_NAMES[preview.shieldType]] || '#4ade80';
        drawShieldOutline(ox, oy, shieldColor, fade, preview.shieldType, game.t);
      }
    } else if (preview.kind === 'BUBBLE') {
      // Shown at the cast spot until the server's own bubble reaches a snapshot (as with SHIELD).
      if (!game.bubbles.some((bubble) => bubble.owner === me()) && preview.age < preview.life)
        drawBubble(preview.x, preview.y, BUBBLE.RADIUS, fade);
    } else if (preview.kind === 'TRAP') {
      // Shown until the server's own trap reaches a snapshot, like the bubble.
      if (!game.traps.some((t) => t.owner === me()) && preview.age < preview.life)
        drawTrapRune(
          preview.tx,
          preview.ty,
          SPELL_COLOR[preview.spell] || '#fbbf24',
          false,
          preview.age,
        );
    } else {
      const speed = preview.kind === 'MAGMA' ? 4 : 7.5;
      const radius = preview.kind === 'MAGMA' ? 27 : 10;
      // Magma stops at the clicked target, matching the server's target-locked projectile.
      const maxDist =
        preview.kind === 'MAGMA' ? Math.hypot(preview.tx - preview.x, preview.ty - preview.y) : 450;
      const travel = Math.min(preview.age * speed, maxDist);
      if (preview.kind === 'MAGMA' && preview.age * speed >= maxDist) continue;
      const offset = preview.kind === 'MAGMA' ? 0 : 25;
      const sx = preview.x + preview.dx * offset,
        sy = preview.y + preview.dy * offset,
        px = preview.x + preview.dx * (offset + travel),
        py = preview.y + preview.dy * (offset + travel);
      // Predicted visuals must not pass through obstacles or wizards. The
      // authoritative simulation still decides hits and damage; this only
      // ends the caster's local projectile at the first visible contact.
      const margin = preview.kind === 'MAGMA' ? 8 : radius * 0.6;
      const wall = firstObstacleHit(sx, sy, px, py, margin, game.map.obstacles);
      // someone in sight where the preview would pass (drawn positions, as the player sees them)
      const wizardInWay = others().some((w) => {
        if (isHidden(w)) return false;
        const at = net.visual.get(w.seat) ?? w;
        return segmentCircleHit(sx, sy, px, py, at.x, at.y, radius + WIZARD_HIT_RADIUS) !== null;
      });
      // a bubble edge turns the real shot back, so the preview must not carry on through it
      const bubble = bubbleCrossing(game.bubbles, sx, sy, px, py);
      // a pillar, a wizard or a bubble in the way: the preview stops here
      if (wall || wizardInWay || bubble) {
        preview.hitSomething = true;
        continue;
      }
      if (px >= 10 && px <= game.map.width - 10 && py >= 10 && py <= game.map.height - 10) {
        drawProjectile({
          x: px,
          y: py,
          vx: preview.dx * speed,
          vy: preview.dy * speed,
          spell: preview.kind,
          r: radius,
          life: 90,
        });
      }
    }
  }
  ctx.restore();
  net.castPreviews = net.castPreviews.filter(
    (preview) => !preview.hitSomething && preview.age < preview.life,
  );
}

export function previewSelect(code: string) {
  // as on the server: only Space presses right after each other make a bubble
  if (/^(Digit[1-4]|Key[EFQBT])$/.test(code)) net.lastSpacePressAt = -Infinity;
  if (code === 'KeyE') {
    net.healArmed = true;
    net.selectedElements = [];
    refreshLegend();
    return;
  }
  if (code === 'Digit2' && net.healArmed) {
    net.healArmed = false;
    showCastPreview('HEAL');
    refreshLegend();
    return;
  }
  if (/^Digit[1-4]$/.test(code)) {
    const i = Number(code.slice(-1)) - 1;
    net.healArmed = false;
    net.selectedElements =
      net.selectedElements.length >= 2 || net.selectedElements.includes(i)
        ? [i]
        : [...net.selectedElements, i];
    refreshLegend();
    return;
  }
  if (code === 'Space') {
    // silenced: the server raises no shield and no bubble, and keeps what is loaded
    if (me()?.silence > 0) return;
    const now = performance.now();
    const doubleTap = now - net.lastSpacePressAt <= (BUBBLE.DOUBLE_TAP_TICKS * 1000) / 60;
    net.lastSpacePressAt = now;
    if (doubleTap && showCastPreview('BUBBLE')) {
      net.lastSpacePressAt = -Infinity;
      return;
    }
    // The server does nothing when Space is pressed without a loaded element.
    if (net.healArmed) {
      if (showCastPreview('SHIELD')) net.castPreviews.at(-1).shieldType = 4;
    } else if (net.selectedElements.length) {
      const type = net.selectedElements.at(-1);
      if (showCastPreview('SHIELD')) net.castPreviews.at(-1).shieldType = type;
    }
    net.healArmed = false;
    net.selectedElements = [];
    refreshLegend();
    return;
  }
  // F (the sword) has no preview: its swing is drawn from the server's `swing`, and it casts no ring
  if (code === 'KeyQ') showCastPreview('FORCE');
}

export function previewCommit() {
  if (net.selectedElements.length) {
    net.selectedSpell = combineElements(net.selectedElements) || net.selectedSpell;
    net.selectedElements = [];
    refreshLegend();
  }
}
