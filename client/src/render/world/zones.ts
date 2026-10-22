import { COL } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { g } from '../../dom';
import { game } from '../../state';
import { inView } from '../camera';
import { ellipse } from '../shapes';

/** Elevated storm cloud with a clearly attached two-tone downward strike. */
function drawStormCloud(z: { x: number; y: number; r: number; life: number }) {
  g.save();
  g.globalAlpha = Math.min(0.92, z.life / 50);
  const cloudY = z.y - 111; // higher above the wizard's hat
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7 + game.t * 0.02 * (i % 2 ? 1 : -1);
    ellipse(
      z.x + Math.cos(a) * z.r * 0.5,
      cloudY + Math.sin(a) * 7,
      24 + (i % 3) * 5,
      15 + (i % 2) * 4,
      i % 2 ? '#475569' : '#64748b',
    );
  }
  ellipse(z.x, cloudY - 2, z.r * 0.45, 17, '#334155');
  if (Math.sin(game.t * 0.31 + z.x * 0.05) > 0.82) {
    // Both strokes share a single path, rooted within the cloud rather
    // than appearing to fall from above it. This is cosmetic STORM damage.
    const drawBolt = () => {
      g.beginPath();
      g.moveTo(z.x - 4, cloudY + 9);
      g.lineTo(z.x + 7, cloudY + 34);
      g.lineTo(z.x - 5, cloudY + 56);
      g.lineTo(z.x + 6, cloudY + 80);
      g.lineTo(z.x + 3, z.y - 8);
      g.stroke();
    };
    g.lineJoin = 'round';
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 5;
    g.shadowColor = '#0ea5e9';
    g.shadowBlur = 14;
    drawBolt();
    g.strokeStyle = '#fef08a';
    g.lineWidth = 2;
    g.shadowColor = '#fde047';
    g.shadowBlur = 8;
    drawBolt();
  }
  g.restore();
}

/**
 * A Water Surge: a true circle (the simulation's reach) with a bright, foamy rim. Like the water
 * itself it stops at a bubble edge: a ring cast outside is clipped away from every bubble, one cast
 * inside is clipped to it. The new ring a bubble reflects starts at the point of contact.
 */
function drawSurge(z: { x: number; y: number; r: number; life: number }) {
  g.save();
  for (const b of game.bubbles) {
    g.beginPath();
    if (Math.hypot(z.x - b.x, z.y - b.y) < b.r) {
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.clip();
    } else {
      g.rect(-1e5, -1e5, 2e5, 2e5);
      g.arc(b.x, b.y, b.r, 0, TAU);
      g.clip('evenodd');
    }
  }
  g.globalAlpha = Math.min(0.65, z.life / 80);
  g.fillStyle = COL.WATER + '55';
  g.beginPath();
  g.arc(z.x, z.y, z.r, 0, TAU);
  g.fill();
  g.strokeStyle = COL.WATER;
  g.lineWidth = 3;
  g.stroke();
  g.globalAlpha = Math.min(0.9, z.life / 25);
  g.strokeStyle = '#e0f2fe';
  g.lineWidth = 6;
  g.stroke();
  g.restore();
}

/** Every zone on screen: a tinted ground ellipse (a bubble-clipped circle for Water), Magma sparks, and the Storm cloud. */
export function drawZones() {
  for (let z of game.zones) {
    if (!inView(z.x, z.y, z.r + 20)) continue;
    if (z.k === 'WATER') {
      drawSurge(z);
      continue;
    }
    g.globalAlpha = Math.min(0.65, z.life / 80);
    g.fillStyle = COL[z.k] + '55';
    g.beginPath();
    g.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU);
    g.fill();
    g.strokeStyle = COL[z.k];
    g.lineWidth = 3;
    g.stroke();
    if (z.k === 'MAGMA')
      for (let i = 0; i < 9; i++) {
        let a = (i * TAU) / 9 + game.t * 0.008,
          r = z.r * 0.55;
        ellipse(
          z.x + Math.cos(a) * r,
          z.y + Math.sin(a) * r * 0.7,
          4 + Math.sin(game.t * 0.1 + i) * 2,
          3,
          '#ffb347',
        );
      }
    g.globalAlpha = 1;
    if (z.k === 'STORM') drawStormCloud(z);
  }
}
