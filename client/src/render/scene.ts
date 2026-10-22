import { BOMB_FUSE_TICKS, COL } from '../../../shared/constants';
import type { Bomb, Wizard } from '../../../shared/types';
import { clamp, TAU } from '../../../shared/math';
import { g } from '../dom';
import {
  game,
  greenSide,
  isHidden,
  isUnseen,
  localInput,
  me,
  net,
  others,
  watchers,
} from '../state';
import { drawWizard as drawWizardArt } from './world/wizard';
import {
  drawBubble,
  airborneLift,
  drawKnockUp,
  drawPrison,
  drawTrapRune,
  drawWave,
  ellipse,
  renderLightningArc,
  renderParticle,
} from './primitives';
import { camera, inView, VIEW_H, VIEW_W } from './camera';
import { drawFog, drawHitHint } from './fog';
import { drawMinimap } from './hud/minimap';
import { drawCountdown } from './hud/countdown';
import { drawTeamHud } from './hud/teamHud';
import { projectile } from './world/projectile';
import { drawPillar, frontPillars, mapScenery } from './arena/maps';
import { behindPillar, pillarDepth, wizardDepth } from './arena/pillarMath';
import { isPredictedShot } from '../net/earthVisibility';

export function deathDraw() {
  if (!game.death) return;
  let d = game.death,
    u = clamp(d.age / 95, 0, 1),
    c = greenSide(d.w) ? '#a78bfa' : d.mortal ? '#fbbf24' : '#fb7185';
  g.save();
  g.globalAlpha = 1 - u;
  g.translate(d.x, d.y);
  g.rotate(u * 1.5);
  g.scale(1 - u * 0.35, Math.max(0.03, 1 - u));
  g.translate(-d.x, -d.y);
  drawWizardArt(d.w);
  g.restore();
  g.globalAlpha = (1 - u) * 0.9;
  g.strokeStyle = c;
  g.lineWidth = 5;
  g.shadowColor = c;
  g.shadowBlur = 25;
  g.beginPath();
  g.arc(d.x, d.y - 20, 20 + u * 100, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;
  g.globalAlpha = 1;
}

type Pillar = { x: number; y: number; r: number };
/** Wizards and pillars, nearest last. */
const drawOrder: (Wizard | Pillar)[] = [];
const depth = (o: Wizard | Pillar) => ('seat' in o ? wizardDepth(o) : pillarDepth(o));

function drawShot(s: (typeof game.shots)[number]) {
  // our own plain shots are drawn by the local prediction; variants and reflected shots only come from the server
  if (net.online && isPredictedShot(s, me())) return;
  if (inView(s.x, s.y, 120)) projectile(s);
}

/** Draws a wizard unless it is dying, off screen, or an enemy hidden in the fog or not yet seen. */
function drawWizard(w: Wizard) {
  if ((game.death && w === game.death.w) || isHidden(w) || isUnseen(w) || w.fallen) return;
  if (!inView(w.x, w.y, 160)) return;
  if (w.airborne > 0) {
    const lift = airborneLift(w.airborne, game.t);
    drawKnockUp(w.x, w.y, lift, game.t);
    g.save();
    g.translate(0, -lift);
    drawWizardArt(w);
    g.restore();
  } else drawWizardArt(w);
  if (w.prison > 0) drawPrison(w.x, w.y, w.prison, game.t);
}

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

/** The view runs a little past the bottom of the map (see `cameraOrigin`): that strip is plain dark. */
function drawBelowMap() {
  const edge = game.map.height;
  if (camera.y + VIEW_H <= edge) return;
  g.fillStyle = '#05080d';
  g.fillRect(camera.x, edge, VIEW_W, camera.y + VIEW_H - edge);
}

export function draw() {
  mapScenery();
  drawBelowMap();
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
  for (const t of game.traps)
    if (inView(t.x, t.y, 60)) drawTrapRune(t.x, t.y, COL[t.k], t.arm <= 0, game.t);
  // lower on the screen is nearer to you: draw those last. Shots hidden by a pillar go first.
  const front = frontPillars();
  for (const s of game.shots) if (behindPillar(front, s.x, s.y)) drawShot(s);
  drawOrder.length = 0;
  drawOrder.push(...game.wizards, ...front);
  drawOrder.sort((a, b) => depth(a) - depth(b));
  for (const o of drawOrder) {
    if ('seat' in o) drawWizard(o);
    else if (inView(o.x, o.y, 100)) drawPillar(o);
  }
  deathDraw();
  for (const b of game.bombs) if (inView(b.x, b.y, 200)) drawBomb(b);
  for (const s of game.shots) if (!behindPillar(front, s.x, s.y)) drawShot(s);
  for (const b of game.bubbles)
    if (inView(b.x, b.y, b.r + 30)) drawBubble(b.x, b.y, b.r, Math.min(1, b.life / 40));
  for (let a of game.arcs) {
    if (a.variant === 'plasma_beam' || a.variant === 'magnetic_pull') {
      // Solo, the beam is drawn only while its caster still holds the button. Online the server
      // only sends beam events while it is held, and other players' inputs aren't known here.
      if (!net.online) {
        const input = game.input[a.castOwner];
        const selected = a.variant === 'plasma_beam' ? 'PLASMA' : 'MAGNETIC';
        if (!input.holding || input.attack !== selected || input.loadout[selected] !== a.variant)
          continue;
      }
      const caster = game.wizards[a.castOwner];
      const target = a.points[a.points.length - 1];
      // Cast from a floating aperture just beyond the wizard's body, at a lower
      // screen position so the glow does not cover the caster's face. A leg turned back by a
      // bubble starts at the bubble's edge instead.
      const dx = target.x - caster.x,
        dy = target.y - caster.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance,
        uy = dy / distance;
      const start = a.reflected
        ? a.points[0]
        : { x: caster.x + ux * 37, y: caster.y - 8 + uy * 37 };
      const ex = target.x - start.x,
        ey = target.y - start.y;
      const length = Math.hypot(ex, ey);
      const fraction = length ? Math.min(1, (a.reach ?? 0) / length) : 0;
      renderLightningArc({
        ...a,
        points: [start, { x: start.x + ex * fraction, y: start.y + ey * fraction }],
        hit: a.hit && fraction >= 0.98,
      });
    } else renderLightningArc(a);
  }
  g.globalAlpha = 1;
  for (let q of game.waves) {
    if (
      net.online &&
      net.guestFX.some(
        (f) =>
          (f.kind === 'HEAL' || f.kind === 'FORCE') &&
          Math.hypot(q.x - f.x, q.y - f.y) < 75 &&
          f.age < f.life,
      )
    )
      continue;
    drawWave(q);
  }
  g.globalAlpha = 1;
  for (let q of game.particles) {
    if (net.online && q.castOwner === net.seat) continue;
    if (!inView(q.x, q.y, 60)) continue;
    renderParticle(q);
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  for (let q of game.labels) {
    if (!inView(q.x, q.y, 80)) continue;
    g.globalAlpha = Math.min(1, q.life / 18);
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillStyle = q.c;
    g.fillText(q.s, q.x, q.y);
  }
  g.globalAlpha = 1;
  if (game.active) {
    drawFog(watchers());
    drawHitHint();
    const friends = others().filter((w) => greenSide(w) && !w.fallen);
    drawMinimap(
      me(),
      friends,
      others().filter((w) => !greenSide(w) && !w.fallen && !isHidden(w)),
    );
    drawTeamHud();
    drawCountdown();
  }
  g.strokeStyle = '#ffffffaa';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(localInput().mouse.x, localInput().mouse.y, 9, 0, TAU);
  g.moveTo(localInput().mouse.x - 15, localInput().mouse.y);
  g.lineTo(localInput().mouse.x - 5, localInput().mouse.y);
  g.moveTo(localInput().mouse.x + 5, localInput().mouse.y);
  g.lineTo(localInput().mouse.x + 15, localInput().mouse.y);
  g.stroke();
}

/** Lightweight canvas-only bomb artwork, matching the top-down arena scale. */
function drawBomb(b: Bomb) {
  const color = COL[b.k];
  const height = b.landed ? 0 : Math.sin(Math.min(1, b.u) * Math.PI) * 105;
  const px = b.x,
    py = b.y - height - 12;
  const remaining = clamp(b.fuse / BOMB_FUSE_TICKS, 0, 1);
  const urgency = 1 - remaining;
  const pulse = 1 + Math.sin(game.t * (0.12 + urgency * 0.28)) * (0.04 + urgency * 0.13);
  const angular = game.t * 0.035;
  g.save();

  // Ground shadow makes the throw's height and landing readable.
  g.globalAlpha = b.landed ? 0.3 : 0.16 + height / 750;
  g.fillStyle = '#071319';
  g.beginPath();
  g.ellipse(px, b.y + 3, 12 + height * 0.045, 5 + height * 0.02, 0, 0, TAU);
  g.fill();
  g.globalAlpha = 1;

  if (b.landed) {
    // Fixed gameplay blast radius: purely visual, no collision changes.
    g.strokeStyle = color;
    g.globalAlpha = 0.28 + urgency * 0.58;
    g.lineWidth = 1.5 + urgency;
    g.setLineDash([7, 5]);
    g.beginPath();
    g.ellipse(
      b.x,
      b.y,
      b.k === 'MAGNETIC' ? 165 : 85,
      (b.k === 'MAGNETIC' ? 165 : 85) * 0.72,
      0,
      0,
      TAU,
    );
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  // Draw each elemental sprite in local bomb coordinates. Without this
  // translation the artwork renders at canvas (0, 0), in the top-left.
  g.translate(px, py);
  g.scale(pulse, pulse);

  // Distinct silhouettes: the bombs are not just recoloured spheres.
  g.lineWidth = 2;
  g.strokeStyle = color;
  if (b.k === 'WATER') {
    // Rounded bead of dew: a shallow liquid dome, without a pointed tip or interior lines.
    const dew = g.createRadialGradient(-6, -8, 0.5, 3, 5, 21);
    dew.addColorStop(0, '#ffffff');
    dew.addColorStop(0.24, '#c8f5ff');
    dew.addColorStop(0.45, '#69c8f2');
    dew.addColorStop(0.72, '#1777bb');
    dew.addColorStop(1, '#062f70');
    g.fillStyle = dew;
    g.beginPath();
    g.ellipse(0, 0, 15, 13.5, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#b8f2ff';
    g.lineWidth = 1.35;
    g.stroke();
    // Clean curved surface reflections give the sphere a raised, wet look.
    g.globalAlpha = 0.48;
    g.fillStyle = '#e0faff';
    g.beginPath();
    g.ellipse(-5, -6, 5.2, 3.3, -0.35, 0, TAU);
    g.fill();
    g.globalAlpha = 0.94;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(-6, -7, 2.3, 1.5, -0.3, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  } else if (b.k === 'ICE') {
    // Fractured snow-white ice sphere based on the supplied crystalline bomb drawing.
    // Uneven faceted perimeter, echoing the hand-drawn reference rather than a circle.
    const iceOutline: [number, number][] = [
      [-13, -8],
      [-8, -13],
      [-1, -15],
      [6, -13],
      [12, -9],
      [14, -2],
      [15, 5],
      [11, 12],
      [5, 15],
      [-3, 16],
      [-10, 12],
      [-15, 5],
      [-15, -2],
    ];
    const traceIceOutline = () => {
      g.beginPath();
      iceOutline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };
    g.fillStyle = '#c9f4fa';
    traceIceOutline();
    g.fill();
    g.save();
    traceIceOutline();
    g.clip();
    // Irregular polygon facets: icy whites above, turquoise shadows below.
    const facets: { points: number[][]; fill: string }[] = [
      {
        points: [
          [-13, -2],
          [-6, -11],
          [0, -6],
          [-5, 1],
        ],
        fill: '#edfefe',
      },
      {
        points: [
          [0, -13],
          [9, -10],
          [12, -3],
          [4, -5],
        ],
        fill: '#a0e0ea',
      },
      {
        points: [
          [-12, 2],
          [-5, 1],
          [0, 9],
          [-9, 10],
        ],
        fill: '#9ddae5',
      },
      {
        points: [
          [-5, 1],
          [2, -5],
          [10, 0],
          [2, 7],
        ],
        fill: '#e7fcff',
      },
      {
        points: [
          [2, 7],
          [10, 0],
          [13, 7],
          [7, 12],
        ],
        fill: '#5cbccd',
      },
      {
        points: [
          [-9, 10],
          [0, 9],
          [7, 12],
          [0, 15],
        ],
        fill: '#72c7d4',
      },
      {
        points: [
          [-5, -11],
          [0, -13],
          [4, -5],
          [-5, 1],
        ],
        fill: '#ffffff',
      },
    ];
    for (const facet of facets) {
      g.fillStyle = facet.fill;
      g.beginPath();
      facet.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#70c5d4';
    g.lineWidth = 1.15;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-13, -2);
    g.lineTo(-6, -11);
    g.lineTo(0, -6);
    g.lineTo(4, -5);
    g.lineTo(12, -3);
    g.moveTo(-12, 2);
    g.lineTo(-5, 1);
    g.lineTo(2, 7);
    g.lineTo(7, 12);
    g.moveTo(-5, 1);
    g.lineTo(2, -5);
    g.lineTo(10, 0);
    g.lineTo(13, 7);
    g.moveTo(-9, 10);
    g.lineTo(0, 9);
    g.lineTo(2, 7);
    g.stroke();
    g.restore(); // Clip applies only to crystalline interior, not fuse or frost.
    g.strokeStyle = '#78c9d7';
    g.lineWidth = 1.35;
    g.lineJoin = 'bevel';
    traceIceOutline();
    g.stroke();
    // Little gold fuse emerges from the snow-encrusted crown.
    g.fillStyle = '#b88724';
    g.fillRect(-2.4, -23, 5, 11);
    g.strokeStyle = '#f5cf61';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-1, -22);
    g.lineTo(2, -19);
    g.moveTo(-1, -18);
    g.lineTo(2, -15);
    g.moveTo(-1, -14);
    g.lineTo(2, -12);
    g.stroke();
    g.fillStyle = '#ecfbff';
    g.beginPath();
    g.ellipse(0, -12, 7, 2.5, 0, 0, TAU);
    g.fill();
  } else if (b.k === 'LIGHTNING') {
    // Cartoon lightning bomb: heavy charcoal casing, brass fuse socket and yellow bolt.
    g.fillStyle = '#686d76';
    g.beginPath();
    g.arc(0, 2, 14, 0, TAU);
    g.fill();
    g.strokeStyle = '#a9aab2';
    g.lineWidth = 1.7;
    g.stroke();
    g.fillStyle = '#9fa4ae';
    g.beginPath();
    g.ellipse(-5, -4, 5, 3, -0.45, 0, TAU);
    g.fill();
    // Short unlit fuse and a little electric spark; decorative only.
    g.fillStyle = '#c49c41';
    g.fillRect(-4, -14, 8, 4);
    g.strokeStyle = '#d5c7a3';
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -14);
    g.quadraticCurveTo(2, -19, 6, -20);
    g.stroke();
    g.fillStyle = '#fff29a';
    g.beginPath();
    g.arc(6, -20, 2.2, 0, TAU);
    g.fill();
    // Subtle forged-metal texture: uneven rim segments and small surface scuffs.
    g.strokeStyle = '#d0d2d6';
    g.lineWidth = 0.85;
    g.globalAlpha = 0.65;
    g.beginPath();
    g.arc(0, 2, 12.5, -2.7, -1.35);
    g.arc(0, 2, 12.5, 0.35, 1.1);
    g.stroke();
    g.strokeStyle = '#363c46';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-10, -1);
    g.lineTo(-8, 1);
    g.moveTo(8, 6);
    g.lineTo(10, 4);
    g.moveTo(-5, 10);
    g.lineTo(-3, 11);
    g.stroke();
    g.globalAlpha = 1;
    // Bold, centred lightning insignia on the front.
    g.fillStyle = '#facc15';
    g.strokeStyle = '#fff3a6';
    g.lineWidth = 0.75;
    g.save();
    g.translate(0, 2); // align emblem to the bomb body, which is centred at y = 2
    g.beginPath();
    g.moveTo(2, -8);
    g.lineTo(-4, 2);
    g.lineTo(0, 2);
    g.lineTo(-2, 9);
    g.lineTo(6, -1);
    g.lineTo(2, -1);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  } else if (b.k === 'EARTH') {
    // Four distinctly separated charcoal boulders held together by liquid green energy.
    // Follow the lava-rock reference's negative spaces, not painted-on surface cracks.
    g.save();
    g.lineJoin = 'round';
    const glowPulse = 0.92 + 0.08 * Math.sin(game.t * 0.085);
    // Opaque, sticky emerald magma is the physical bond between the stones.
    // Dark viscous banks, a broad mid-green body and concentrated molten streaks
    // keep it looking like a substance, not transparent backlighting.
    const molten = g.createRadialGradient(-3, -4, 1, 0, 0, 21);
    molten.addColorStop(0, '#b2f36c');
    molten.addColorStop(0.32, '#5ebf42');
    molten.addColorStop(0.64, '#277b39');
    molten.addColorStop(1, '#103f2c');
    g.save();
    g.globalAlpha = glowPulse;
    g.fillStyle = molten;
    g.strokeStyle = '#153b29';
    g.lineWidth = 2.3;
    g.beginPath();
    // Rounded outline, with a slightly uneven circular perimeter.
    g.moveTo(-17, -8);
    g.lineTo(-13, -15);
    g.lineTo(-6, -19);
    g.lineTo(3, -20);
    g.lineTo(11, -17);
    g.lineTo(17, -11);
    g.lineTo(20, -4);
    g.lineTo(19, 5);
    g.lineTo(15, 13);
    g.lineTo(8, 18);
    g.lineTo(-1, 20);
    g.lineTo(-10, 17);
    g.lineTo(-17, 11);
    g.lineTo(-20, 3);
    g.closePath();
    g.fill();
    g.stroke();
    // Short submerged ribbons follow the river-like branches; their softly
    // rounded shapes imply folds and movement in thick, hot molten material.
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const streams: [number, number][][] = [
      [
        [1, -17],
        [-1, -11],
        [1, -7],
        [0, -3],
        [2, 1],
        [0, 6],
        [-2, 12],
      ],
      [
        [-13, 1],
        [-8, 2],
        [-5, 5],
        [-2, 8],
        [2, 12],
        [7, 16],
      ],
      [
        [14, -4],
        [10, 0],
        [6, 2],
        [3, 5],
        [0, 8],
      ],
    ];
    for (let i = 0; i < streams.length; i++) {
      const pts = streams[i];
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length; j++) g.lineTo(pts[j][0], pts[j][1]);
      g.strokeStyle = '#164b2d';
      g.lineWidth = 4.1;
      g.globalAlpha = 0.55;
      g.stroke();
      g.strokeStyle = i === 0 ? '#94df56' : '#64bb4c';
      g.lineWidth = 1.7;
      g.globalAlpha = 0.65 + 0.15 * glowPulse;
      g.stroke();
    }
    g.restore();
    // The rock edges interlock like riverbanks. Their narrow, winding gaps form
    // one connected, branching green river system rather than an open central pool.
    const rock = (points: [number, number][], fill: string) => {
      g.beginPath();
      g.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
      g.closePath();
      g.fillStyle = fill;
      g.strokeStyle = '#202830';
      g.lineWidth = 1.3;
      g.fill();
      g.stroke();
    };
    // Northwest boulder: stepped inward edge makes the upper channel serpentine.
    rock(
      [
        [-18, -5],
        [-16, -12],
        [-10, -17],
        [-3, -19],
        [2, -16],
        [1, -12],
        [-3, -9],
        [-1, -5],
        [-4, -2],
        [-2, 1],
        [-7, 3],
        [-11, 0],
        [-16, -1],
      ],
      '#41444b',
    );
    rock(
      [
        [-15, -12],
        [-10, -17],
        [-4, -17],
        [-8, -12],
        [-12, -9],
      ],
      '#71757e',
    );
    rock(
      [
        [-15, -5],
        [-11, -9],
        [-7, -7],
        [-9, -4],
      ],
      '#5d6169',
    );
    // Northeast crown stone, separated from northwest by a winding fissure.
    rock(
      [
        [5, -18],
        [12, -16],
        [17, -11],
        [19, -5],
        [15, -3],
        [12, 1],
        [7, 2],
        [4, -1],
        [2, -6],
        [3, -13],
      ],
      '#41414a',
    );
    rock(
      [
        [8, -16],
        [12, -16],
        [17, -11],
        [12, -12],
      ],
      '#70717a',
    );
    // Southeast boulder: irregular inward ledge redirects the lower green fork.
    rock(
      [
        [13, 3],
        [18, 0],
        [19, 7],
        [16, 14],
        [9, 18],
        [3, 15],
        [1, 12],
        [4, 9],
        [2, 6],
        [6, 3],
        [10, 6],
      ],
      '#373a43',
    );
    rock(
      [
        [17, 4],
        [19, 9],
        [15, 14],
        [12, 15],
        [14, 9],
      ],
      '#575c67',
    );
    // Southwest base stone forms a staggered opposing bank, without closing the channel.
    rock(
      [
        [-18, 4],
        [-12, 2],
        [-9, 4],
        [-6, 3],
        [-4, 6],
        [-1, 5],
        [1, 8],
        [-2, 11],
        [2, 14],
        [3, 18],
        [-5, 18],
        [-13, 14],
        [-18, 9],
      ],
      '#373940',
    );
    rock(
      [
        [-15, 7],
        [-11, 5],
        [-8, 8],
        [-11, 12],
        [-15, 11],
      ],
      '#656872',
    );
    // No central stone: the four irregular banks nearly meet, but the flowing
    // emerald channels remain connected through the middle.
    // Small moss patches remain confined to the outer faces.
    const moss: [number, number, number, number, string][] = [
      [-13, -13, 2, 0.7, '#4c6940'],
      [-11, -12, 1, 0.55, '#788b51'],
      [13, -12, 1.9, 0.7, '#4d6944'],
      [-13, 12, 2.1, 0.7, '#4b643c'],
      [15, 12, 1.8, 0.65, '#5a7444'],
    ];
    for (const [x, y, rx, ry, c] of moss) {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x, y, rx, ry, -0.3, 0, TAU);
      g.fill();
    }
    g.restore();
  } else if (b.k === 'PLASMA') {
    // Animated swirling plasma sphere and low-cost solar-flare tongues.
    // Rotate the entire shell, luminous markings and flares clockwise together.
    const elapsed = Math.max(0, BOMB_FUSE_TICKS - b.fuse);
    const progress = Math.min(1, elapsed / BOMB_FUSE_TICKS);
    const wholeSpin = 0.038 * elapsed + (0.85 * BOMB_FUSE_TICKS * Math.pow(progress, 4)) / 4;
    g.save();
    g.rotate(wholeSpin);
    g.fillStyle = '#63327c';
    g.strokeStyle = '#e0abff';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 14, 0, TAU);
    g.fill();
    g.stroke();
    const glow = g.createRadialGradient(-3, -4, 0, 0, 0, 14);
    glow.addColorStop(0, '#341044');
    glow.addColorStop(0.17, '#61227b');
    glow.addColorStop(0.38, '#a34acb');
    glow.addColorStop(0.65, '#d185eb');
    glow.addColorStop(0.85, '#8738ae');
    glow.addColorStop(1, '#50216f');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(0, 0, 12, 0, TAU);
    g.fill();
    // Small translucent darker pockets add depth without a hard dividing stripe.
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = '#37104e';
    g.beginPath();
    g.ellipse(5, 5, 4.4, 2.8, -0.6, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(-7, 2, 2.5, 4, 0.25, 0, TAU);
    g.fill();
    g.restore();
    // Soft purple bloom, no bright two-tone ring around the surface.
    g.save();
    g.globalAlpha = 0.32;
    g.strokeStyle = '#b94de7';
    g.shadowColor = '#bb55ef';
    g.shadowBlur = 8;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(0, 0, 14, 0, TAU);
    g.stroke();
    g.restore();
    // Internal currents rotate gently relative to the rapidly spinning shell.
    const plasmaSpin = elapsed * 0.012;
    // Small stationary-on-shell plasma sparks replace the conspicuous arc-shaped stripe.
    const plasmaDots: [number, number, number][] = [
      [-7, -7, 1.5],
      [3, -9, 1.1],
      [8, -4, 1.4],
      [-10, 1, 1.1],
      [-4, 3, 1.2],
      [4, 5, 1.6],
      [-6, 9, 1.1],
      [9, 7, 1.0],
      [0, -3, 1.3],
      [2, 10, 0.9],
    ];
    for (let i = 0; i < plasmaDots.length; i++) {
      const [x, y, r] = plasmaDots[i];
      g.globalAlpha = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(game.t * 0.065 + i * 1.7));
      g.fillStyle = (['#fff1ff', '#d58cf8', '#74239f', '#f6a7df', '#a756ed', '#e0c1ff'] as const)[
        i % 6
      ];
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    // Solar-flare loops projecting from the rim. Fixed canvas paths; no new particles.
    for (let i = 0; i < 3; i++) {
      const a = plasmaSpin * 0.6 + (i * TAU) / 3;
      const length = 4 + 2 * Math.sin(game.t * 0.055 + i * 2);
      g.save();
      g.rotate(a);
      g.strokeStyle = i === 1 ? '#f5b5ff' : '#d56af7';
      g.lineWidth = 1.9;
      g.globalAlpha = 0.72 + 0.16 * Math.sin(game.t * 0.06 + i);
      g.beginPath();
      g.moveTo(10, -3);
      g.bezierCurveTo(15, -7 - length, 20, -5 - length, 14, 3);
      g.stroke();
      g.restore();
    }
    // Short plasma lashes crackle outward more frequently as the fuse runs down.
    // Fixed canvas strokes only: no new particles or gameplay radius changes.
    for (let i = 0; i < 4; i++) {
      const phase = game.t * (0.12 + i * 0.009) + i * 2.37;
      const flicker = Math.max(0, Math.sin(phase));
      const extension = (3 + 9 * progress) * flicker;
      if (extension < 1) continue;
      g.save();
      g.rotate((i * TAU) / 4 + game.t * 0.013);
      g.globalAlpha = (0.32 + 0.55 * progress) * flicker;
      g.strokeStyle = i % 2 ? '#f2b5ff' : '#c36cff';
      g.lineWidth = 1.2 + progress * 0.5;
      g.beginPath();
      g.moveTo(12, 0);
      g.lineTo(16 + extension * 0.35, -2.5);
      g.lineTo(17 + extension, 1.8);
      g.stroke();
      g.restore();
    }
    g.fillStyle = '#ffe4ff';
    g.beginPath();
    g.arc(-3, -4, 1.4, 0, TAU);
    g.fill();
    g.restore();
  } else if (b.k === 'STEAM') {
    // Silver pressure vessel with a rounded domed top and curling white vapour.
    g.fillStyle = '#677586';
    g.strokeStyle = '#dbe7f0';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-12, 8);
    g.lineTo(-12, -3);
    g.quadraticCurveTo(-12, -14, 0, -14);
    g.quadraticCurveTo(12, -14, 12, -3);
    g.lineTo(12, 8);
    g.quadraticCurveTo(0, 15, -12, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#a3b7c4';
    g.beginPath();
    g.ellipse(-5, -5, 4, 6, -0.25, 0, TAU);
    g.fill();
    g.strokeStyle = '#3d4f5e';
    g.lineWidth = 1.7;
    g.beginPath();
    g.moveTo(-10, 7);
    g.quadraticCurveTo(0, 11, 10, 7);
    g.stroke();
    g.fillStyle = '#d5e5ed';
    g.fillRect(-3, -17, 6, 5);
    g.strokeStyle = '#f3faff';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-4, -19);
    g.bezierCurveTo(-10, -24, 1, -26, -4, -32);
    g.moveTo(4, -19);
    g.bezierCurveTo(11, -23, 1, -27, 6, -32);
    g.stroke();
  } else if (b.k !== 'FIRE' && b.k !== 'MAGNETIC') {
    // Other elemental bomb casings remain unchanged until reviewed individually.
    const palettes: Partial<Record<Bomb['k'], [string, string, string, string]>> = {
      EARTH: ['#423e32', '#88795c', '#b4a37e', '#9aad78'],
      ICE: ['#24485f', '#5eb5d9', '#d5faff', '#9ee9ff'],
      MAGMA: ['#292122', '#7e3226', '#ff9b27', '#ffd15b'],
      STEAM: ['#455262', '#94a3b8', '#f1f5f9', '#dce5ee'],
      LIGHTNING: ['#333543', '#85838a', '#facc15', '#fef08a'],
      STORM: ['#2c3651', '#64749c', '#b8c8ff', '#e0e7ff'],
      PLASMA: ['#372340', '#87449e', '#e879f9', '#fae8ff'],
    };
    const [shell, face, seam, glint] = palettes[b.k] ?? ['#263344', '#64748b', color, '#e2e8f0'];
    g.fillStyle = shell;
    g.beginPath();
    g.arc(0, 0, 14, 0, TAU);
    g.fill();
    g.strokeStyle = seam;
    g.lineWidth = 1.7;
    g.stroke();
    g.fillStyle = face;
    g.beginPath();
    g.ellipse(-4, -5, 8, 6, -0.35, 0, TAU);
    g.fill();
    g.strokeStyle = seam;
    g.lineWidth = 2.1;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-10, -6);
    g.lineTo(-4, -2);
    g.lineTo(-6, 4);
    g.lineTo(0, 9);
    g.moveTo(6, -10);
    g.lineTo(3, -4);
    g.lineTo(9, 1);
    g.stroke();
    g.fillStyle = glint;
    g.beginPath();
    g.arc(-6, -8, 2.1, 0, TAU);
    g.fill();
  } else if (b.k === 'FIRE') {
    // A few translucent smoke wisps build up as the fuse nears detonation.
    // Canvas-only and fixed-count: no extra simulated particles or gameplay changes.
    const smokeStrength = 0.16 + urgency * 0.44;
    for (let i = 0; i < 3; i++) {
      const drift = Math.sin(game.t * 0.045 + i * 2.3) * (3 + i * 2);
      const rise = (game.t * (0.35 + i * 0.08) + i * 9) % 29;
      g.globalAlpha = smokeStrength * (1 - rise / 34);
      g.fillStyle = i % 2 ? '#647076' : '#93999a';
      g.beginPath();
      g.ellipse(
        drift - 2,
        -15 - rise,
        4 + i * 1.2 + urgency * 2,
        6 + i * 1.4 + urgency * 2,
        0,
        0,
        TAU,
      );
      g.fill();
    }
    g.globalAlpha = 1;
    // Molten, cracked charcoal sphere with a sparse thrown ember trail.
    if (!b.landed) {
      for (let i = 3; i >= 1; i--) {
        g.globalAlpha = 0.13 + (4 - i) * 0.11;
        g.fillStyle = i % 2 ? '#f97316' : '#facc15';
        g.beginPath();
        g.arc(-i * 8, 6 + Math.sin(game.t * 0.12 + i) * 3, 1.5 + (4 - i) * 0.6, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#211d1b';
    g.strokeStyle = '#9a4322';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 14, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#493029';
    g.beginPath();
    g.ellipse(-3, -5, 8, 6, -0.4, 0, TAU);
    g.fill();
    g.lineJoin = 'round';
    for (const [width, color] of [
      [4, '#c2410c'],
      [1.9, '#ffb52e'],
    ] as const) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(-9, -9);
      g.lineTo(-4, -4);
      g.lineTo(-6, 2);
      g.lineTo(-1, 6);
      g.lineTo(1, 12);
      g.moveTo(5, -12);
      g.lineTo(3, -6);
      g.lineTo(8, -1);
      g.lineTo(5, 5);
      g.lineTo(10, 9);
      g.stroke();
    }
    g.fillStyle = '#ffe08a';
    g.beginPath();
    g.arc(-4, -4, 1.6, 0, TAU);
    g.arc(8, -1, 1.4, 0, TAU);
    g.fill();
  } else if (b.k === 'MAGNETIC') {
    // Miniature forged-iron horseshoe matching Magnetic Pull's silver/red magnet.
    g.save();
    g.rotate(angular * 0.3);
    g.fillStyle = '#475569';
    g.beginPath();
    g.moveTo(10, -11);
    g.lineTo(-6, -11);
    g.bezierCurveTo(-24, -11, -24, 11, -6, 11);
    g.lineTo(10, 11);
    g.lineTo(10, 4);
    g.lineTo(-6, 4);
    g.bezierCurveTo(-14, 4, -14, -4, -6, -4);
    g.lineTo(10, -4);
    g.closePath();
    g.fill();
    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#ef4444';
    g.fillRect(4, -11, 6, 7);
    g.fillRect(4, 4, 6, 7);
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-6, -9);
    g.lineTo(-15, -6);
    g.stroke();
    g.restore();
  }

  // Element-specific orbiting motes and an accelerating fuse glow.
  // These are decorative and never affect collision or detonation.
  g.globalAlpha = 0.6 + urgency * 0.4;
  for (let i = 0; i < 3; i++) {
    const a = angular * (b.k === 'MAGNETIC' ? -1.5 : 1.3) + (i * TAU) / 3;
    const r = 22 + Math.sin(game.t * 0.07 + i) * 2;
    const fx = Math.cos(a) * r,
      fy = Math.sin(a) * r * 0.75;
    g.fillStyle =
      b.k === 'FIRE' || b.k === 'MAGMA'
        ? '#ffe9a3'
        : b.k === 'ICE' || b.k === 'WATER'
          ? '#d9faff'
          : b.k === 'LIGHTNING'
            ? '#fffbc0'
            : color;
    g.beginPath();
    g.arc(fx, fy, 1.5 + urgency * 1.1, 0, TAU);
    g.fill();
  }
  // Orbiting fuse markers contract as the detonation approaches.
  g.globalAlpha = 1;
  g.rotate(angular);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    g.fillStyle = color;
    g.beginPath();
    g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 1.4 + urgency * 0.9, 0, TAU);
    g.fill();
  }
  g.restore();
  // Draw Ice frost in WORLD space, outside the bomb's pulsing/wobbling scale.
  // Five persistent visual snowflakes rise with smooth sideways drift.
  if (b.k === 'ICE') {
    g.save();
    g.translate(px, py);
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      // Uneven release phases, speeds and horizontal origins prevent paired flakes.
      const travel = 54 + i * 3;
      const phase = [0, 23, 8, 39, 15][i];
      const rise = (game.t * (0.2 + i * 0.017) + phase) % travel;
      const drift = Math.sin(rise * (0.075 + i * 0.009) + i * 1.8) * (3 + i * 0.55);
      const x = [-12, 8, -3, 14, -8][i] + drift;
      const y = -24 - rise;
      const fade = Math.min(1, rise / 7, (travel - rise) / 10);
      g.globalAlpha = (0.77 + urgency * 0.12) * Math.max(0, fade);
      g.fillStyle = i % 2 ? '#a7e5ff' : '#f2fdff';
      g.beginPath();
      g.arc(x, y, 2.1, 0, TAU);
      g.fill();
      g.strokeStyle = i % 2 ? '#8bd9ff' : '#ffffff';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm * Math.PI) / 3;
        const dx = Math.cos(angle) * 5;
        const dy = Math.sin(angle) * 5;
        g.moveTo(x - dx, y - dy);
        g.lineTo(x + dx, y + dy);
      }
      g.stroke();
    }
    g.restore();
  }
}
