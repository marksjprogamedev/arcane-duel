import { SPELL_COLOR } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { game, me } from '../../state';
import { camera, inView, VIEW_H, VIEW_W } from '../camera';
import { ellipse } from '../shapes';

/** Elevated storm cloud with a clearly attached two-tone downward strike. */
function drawStormCloud(storm: { x: number; y: number; r: number; life: number }) {
  ctx.save();
  ctx.globalAlpha = Math.min(0.92, storm.life / 50);
  const cloudY = storm.y - 111; // higher above the wizard's hat
  for (let i = 0; i < 7; i++) {
    const angle = (i * TAU) / 7 + game.t * 0.02 * (i % 2 ? 1 : -1);
    ellipse(
      storm.x + Math.cos(angle) * storm.r * 0.5,
      cloudY + Math.sin(angle) * 7,
      24 + (i % 3) * 5,
      15 + (i % 2) * 4,
      i % 2 ? '#475569' : '#64748b',
    );
  }
  ellipse(storm.x, cloudY - 2, storm.r * 0.45, 17, '#334155');
  if (Math.sin(game.t * 0.31 + storm.x * 0.05) > 0.82) {
    // Both strokes share a single path, rooted within the cloud rather
    // than appearing to fall from above it. This is cosmetic STORM damage.
    const drawBolt = () => {
      ctx.beginPath();
      ctx.moveTo(storm.x - 4, cloudY + 9);
      ctx.lineTo(storm.x + 7, cloudY + 34);
      ctx.lineTo(storm.x - 5, cloudY + 56);
      ctx.lineTo(storm.x + 6, cloudY + 80);
      ctx.lineTo(storm.x + 3, storm.y - 8);
      ctx.stroke();
    };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 14;
    drawBolt();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 8;
    drawBolt();
  }
  ctx.restore();
}

/**
 * A Water Surge: a true circle (the simulation's reach) with a bright, foamy rim. Like the water
 * itself it stops at a bubble edge: a ring cast outside is clipped away from every bubble, one cast
 * inside is clipped to it. The new ring a bubble reflects starts at the point of contact.
 */
function drawSurge(surge: { x: number; y: number; r: number; life: number }) {
  ctx.save();
  for (const bubble of game.bubbles) {
    ctx.beginPath();
    if (Math.hypot(surge.x - bubble.x, surge.y - bubble.y) < bubble.r) {
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, TAU);
      ctx.clip();
    } else {
      ctx.rect(-1e5, -1e5, 2e5, 2e5);
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, TAU);
      ctx.clip('evenodd');
    }
  }
  ctx.globalAlpha = Math.min(0.65, surge.life / 80);
  ctx.fillStyle = SPELL_COLOR.WATER + '55';
  ctx.beginPath();
  ctx.arc(surge.x, surge.y, surge.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = SPELL_COLOR.WATER;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = Math.min(0.9, surge.life / 25);
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

/** Every zone on screen: a tinted ground ellipse (a bubble-clipped circle for Water), Magma sparks, and the Storm cloud. */
export function drawZones() {
  for (let zone of game.zones) {
    if (!inView(zone.x, zone.y, zone.r + 20)) continue;
    if (zone.spell === 'SMOKE') continue; // drawn over characters after the actor layer
    if (zone.spell === 'WATER') {
      drawSurge(zone);
      continue;
    }
    ctx.globalAlpha = Math.min(0.65, zone.life / 80);
    ctx.fillStyle = SPELL_COLOR[zone.spell] + '55';
    ctx.beginPath();
    ctx.ellipse(zone.x, zone.y, zone.r, zone.r * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = SPELL_COLOR[zone.spell];
    ctx.lineWidth = 3;
    ctx.stroke();
    if (zone.spell === 'MAGMA')
      for (let i = 0; i < 9; i++) {
        let angle = (i * TAU) / 9 + game.t * 0.008,
          r = zone.r * 0.55;
        ellipse(
          zone.x + Math.cos(angle) * r,
          zone.y + Math.sin(angle) * r * 0.7,
          4 + Math.sin(game.t * 0.1 + i) * 2,
          3,
          '#ffb347',
        );
      }
    ctx.globalAlpha = 1;
    if (zone.spell === 'STORM') drawStormCloud(zone);
  }
}

/** Billowing smoke overlays the actors inside its radius; server snapshots hide enemies within it. */
export function drawSmokeShrouds() {
  for (const zone of game.zones) {
    if (zone.spell !== 'SMOKE' || !inView(zone.x, zone.y, zone.r + 20)) continue;
    const fade = Math.min(1, zone.life / 30);
    ctx.save();
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, TAU);
    ctx.clip();

    const fog = ctx.createRadialGradient(zone.x, zone.y, zone.r * 0.12, zone.x, zone.y, zone.r);
    fog.addColorStop(0, 'rgba(73, 82, 91, 0.76)');
    fog.addColorStop(0.7, 'rgba(76, 86, 96, 0.67)');
    fog.addColorStop(1, 'rgba(87, 98, 108, 0.35)');
    ctx.globalAlpha = fade;
    ctx.fillStyle = fog;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r, 0, TAU);
    ctx.fill();

    // Overlapping soft puffs make the concealment read as smoke rather than a flat spell circle.
    for (let i = 0; i < 11; i++) {
      const angle = (i * TAU) / 11 + game.t * 0.006 * (i % 2 ? 1 : -1);
      const distance = zone.r * (0.22 + (i % 3) * 0.13);
      const drift = Math.sin(game.t * 0.025 + i * 1.7) * 8;
      ctx.globalAlpha = fade * (0.08 + (i % 3) * 0.015);
      ctx.fillStyle = i % 2 ? '#d4dbe0' : '#28323a';
      ctx.beginPath();
      ctx.ellipse(
        zone.x + Math.cos(angle) * (distance + drift),
        zone.y + Math.sin(angle) * (distance + drift),
        zone.r * (0.32 + (i % 2) * 0.06),
        zone.r * (0.2 + (i % 3) * 0.035),
        angle,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Clips what follows (beams, sprays, particles) to what you can see through smoke: inside a cloud
 * only that cloud; outside, everything except clouds of an enemy (you can't see into those).
 * Call between `ctx.save()` and `ctx.restore()`. The server already drops events it hides.
 */
export function clipToSmokeSight() {
  const self = me();
  if (!self || game.ending || game.death) return;
  const clouds = game.zones.filter((zone) => zone.spell === 'SMOKE');
  if (clouds.length === 0) return;
  const inside = clouds.filter((c) => (self.x - c.x) ** 2 + (self.y - c.y) ** 2 <= c.r ** 2);
  const hidden = inside.length === 0 ? clouds.filter((c) => c.owner.team !== self.team) : [];
  if (inside.length === 0 && hidden.length === 0) return;
  ctx.beginPath();
  if (inside.length > 0) {
    for (const c of inside) {
      ctx.moveTo(c.x + c.r, c.y);
      ctx.arc(c.x, c.y, c.r, 0, TAU);
    }
    ctx.clip();
    return;
  }
  ctx.rect(camera.x, camera.y, VIEW_W, VIEW_H);
  for (const c of hidden) {
    ctx.moveTo(c.x + c.r, c.y);
    ctx.arc(c.x, c.y, c.r, 0, TAU);
  }
  ctx.clip('evenodd');
}
