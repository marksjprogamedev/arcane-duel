import { SPELL_COLOR, ELEMENT_NAMES } from '../../../../../shared/constants';
import { CHARGE_TICKS, showChargeMeter } from '../../../../../shared/charge';
import { TAU, clamp, rand } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { poly } from '../../shapes';
import { STAFF_TIP_X, STAFF_TIP_Y } from './staff';
import type { WizardPaint } from './context';

/**
 * Arcane charge ring and a growing elemental orb: one visual telegraph
 * shared by both wizards via the authoritative charge state. The orb sits on the staff tip.
 */
export function drawChargeTelegraph({ w, x, y, bob }: WizardPaint) {
  if (showChargeMeter(w.chargeTicks, w.chargeSpell)) {
    // Arcane charge ring and a growing elemental orb: one visual telegraph
    // shared by both wizards via the authoritative charge state.
    const color = SPELL_COLOR[w.chargeSpell!];
    const earthCharge = w.chargeSpell === 'EARTH';
    const moss = '#465f3b';
    const stone = '#765838';
    const progress = clamp(w.chargeTicks / CHARGE_TICKS, 0, 1);
    const t = game.t * 0.055;
    const cx = x,
      cy = y - 18;
    const orbX = x - 35,
      orbY = y + bob - 47;
    const orbRadius = 5 + progress * 10;
    g.save();

    // Rotating rune circle with a progress sweep.
    g.lineCap = 'round';
    g.strokeStyle = earthCharge ? moss : color;
    g.globalAlpha = 0.23 + progress * 0.2;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, 43, 0, TAU);
    g.stroke();
    g.globalAlpha = 0.95;
    g.shadowColor = earthCharge ? moss : color;
    g.strokeStyle = earthCharge ? stone : color;
    g.shadowBlur = 9 + progress * 14;
    g.lineWidth = 3.5;
    g.beginPath();
    g.arc(cx, cy, 43, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    g.stroke();
    g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const angle = t + (i * TAU) / 7;
      const rx = cx + Math.cos(angle) * 48;
      const ry = cy + Math.sin(angle) * 48;
      if (earthCharge) g.strokeStyle = i % 2 ? moss : stone;
      g.beginPath();
      g.moveTo(rx - Math.cos(angle) * 4, ry - Math.sin(angle) * 4);
      g.lineTo(rx + Math.cos(angle) * 4, ry + Math.sin(angle) * 4);
      g.stroke();
    }

    // Energy converges toward the casting hand. Deterministic motion avoids
    // allocating persistent particles or affecting the combat simulation.
    for (let i = 0; i < 5 + Math.floor(progress * 7); i++) {
      const angle = i * 2.39996 + t * (0.6 + progress);
      const distance = 13 + ((i * 17 + game.t * 1.2) % 28);
      const px = orbX + Math.cos(angle) * distance;
      const py = orbY + Math.sin(angle) * distance * 0.65;
      g.globalAlpha = 0.35 + progress * 0.5;
      g.fillStyle = w.chargeSpell === 'EARTH' ? (i % 2 ? '#465f3b' : '#765838') : color;
      g.beginPath();
      g.arc(px, py, 1.1 + progress * 1.1, 0, TAU);
      g.fill();
    }

    // Elemental energy orb, brighter and larger toward maximum charge.
    g.globalAlpha = 0.5;
    g.fillStyle = earthCharge ? moss : color;
    g.beginPath();
    g.arc(orbX, orbY, orbRadius + 4, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = earthCharge ? stone : color;
    g.beginPath();
    g.arc(orbX, orbY, orbRadius, 0, TAU);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.55 + progress * 0.4;
    g.beginPath();
    g.arc(orbX - orbRadius * 0.22, orbY - orbRadius * 0.25, Math.max(2, orbRadius * 0.42), 0, TAU);
    g.fill();

    // A small spell label remains readable without a boxed HUD element.
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.font = 'bold 10px monospace';
    g.fillStyle = color;
    g.shadowColor = '#081018';
    g.shadowBlur = 5;
    g.fillText(w.chargeSpell!, x, y - 74);
    g.restore();
  }
}

/** The shield outline: an element colour, or green for the healing shield. */
export function drawShield({ w, x, y }: WizardPaint) {
  if (w.shield) {
    let c = w.shield.type === 4 ? '#4ade80' : SPELL_COLOR[ELEMENT_NAMES[w.shield.type]];
    g.strokeStyle = c;
    g.lineWidth = 5;
    g.shadowColor = c;
    g.shadowBlur = 24;
    g.beginPath();
    g.ellipse(x, y - 14, 35, 47, 0, 0, TAU);
    g.stroke();
    g.shadowBlur = 0;
  }
}

/** Flames circling a burning wizard (from 25 buildup), with embers that drift off. */
export function drawBurn({ w, x, y }: WizardPaint) {
  if (w.burn >= 25) {
    let count = Math.ceil(w.burn / 20);
    g.save();
    g.globalAlpha = 0.55 + w.burn / 250;
    for (let i = 0; i < count; i++) {
      let a = (i * TAU) / count + game.t * 0.025,
        r = 14 + Math.sin(game.t * 0.13 + i) * 5,
        fx = x + Math.cos(a) * r,
        fy = y - 23 + Math.sin(a) * 10;
      poly(
        [
          [fx - 7, fy + 10],
          [fx, fy - 13 - w.burn * 0.11 - Math.sin(game.t * 0.2 + i) * 6],
          [fx + 7, fy + 10],
        ],
        i % 2 ? '#f97316' : '#facc15',
      );
    }
    g.restore();
    if (Math.random() < 0.12 + w.burn / 400)
      game.particles.push({
        x: x + rand(-18, 18),
        y: y - 40,
        vx: rand(-1, 1),
        vy: rand(-2.5, -1),
        c: Math.random() < 0.5 ? '#f97316' : '#fde047',
        life: rand(10, 20),
        r: rand(2, 4),
      });
  }
}

/** The ice shell around a fully frozen wizard, and the freeze countdown beside it. */
export function drawFrozen({ w, x, y }: WizardPaint) {
  // Only fully frozen wizards are encased. Partial chill remains a status bar.
  if (w.freeze > 0 && w.chill >= 100) {
    g.save();
    g.translate(x, y);
    // Jagged translucent shell, shaped like a chunk of ice rather than a box.
    g.beginPath();
    const shell: [number, number][] = [
      [-25, 16],
      [-29, -2],
      [-24, -23],
      [-28, -40],
      [-12, -55],
      [0, -63],
      [14, -55],
      [26, -36],
      [23, -18],
      [29, 2],
      [22, 19],
      [0, 23],
    ];
    shell.forEach(([sx, sy], i) => (i ? g.lineTo(sx, sy) : g.moveTo(sx, sy)));
    g.closePath();
    g.fillStyle = '#8bdcff55';
    g.fill();
    g.strokeStyle = '#d8f8ffdd';
    g.lineWidth = 2;
    g.stroke();
    // Ice facets, highlights and a solid frosty base. The wizard remains visible.
    poly(
      [
        [-25, -40],
        [-12, -55],
        [-5, -20],
        [-22, 10],
      ],
      '#d9f8ff66',
    );
    poly(
      [
        [0, -63],
        [14, -55],
        [23, -18],
        [7, -32],
      ],
      '#b5efff77',
    );
    poly(
      [
        [-22, 10],
        [-5, -20],
        [7, 18],
        [0, 23],
      ],
      '#b6eaff88',
    );
    g.strokeStyle = '#ffffffaa';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-12, -55);
    g.lineTo(-5, -20);
    g.lineTo(-17, 5);
    g.moveTo(14, -55);
    g.lineTo(7, -32);
    g.lineTo(21, 1);
    g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5 + 0.3;
      const sx = Math.cos(a) * 25,
        sy = 10 + Math.sin(a) * 7;
      poly(
        [
          [sx - 6, sy + 5],
          [sx, sy - 9],
          [sx + 7, sy + 4],
        ],
        i % 2 ? '#b9efff' : '#e0f9ff',
      );
    }
    g.restore();

    // Frost countdown beside the encased wizard (simulation runs at 60 ticks/s).
    // The ring shrinks with the authoritative freeze timer in multiplayer too.
    const progress = clamp(w.freeze / (w.freezeMax || w.freeze), 0, 1);
    const cx = x + 43,
      cy = y - 28;
    g.save();
    g.fillStyle = '#112e42dd';
    g.strokeStyle = '#a5f3fc';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, cy, 17, 0, TAU);
    g.fill();
    g.stroke();
    g.strokeStyle = '#67e8f9';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    g.stroke();
    // Snowflake motif behind the timer.
    g.strokeStyle = '#b7f2ff77';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx - 8, cy);
    g.lineTo(cx + 8, cy);
    g.moveTo(cx, cy - 8);
    g.lineTo(cx, cy + 8);
    g.stroke();
    g.font = 'bold 10px monospace';
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.shadowColor = '#123447';
    g.shadowBlur = 3;
    g.fillText((w.freeze / 60).toFixed(1) + 's', cx, cy + 3.5);
    g.restore();
  }
}

/** The soaked droplet above a wet wizard. */
export function drawWetIcon({ w, x, y }: WizardPaint) {
  if (w.wet > 0) {
    g.font = '17px sans-serif';
    g.fillText('💧', x + 8, y - 66);
  }
}

export function drawFlurryRing({ w, x, y }: WizardPaint) {
  if (w.flurryTime > 0) {
    // Pebble Flurry: a ring just under the health bar that empties over its 1.5 seconds.
    const left = clamp(w.flurryTime / 90, 0, 1);
    g.save();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    g.beginPath();
    g.arc(x, y - 63, 8, 0, TAU);
    g.stroke();
    g.strokeStyle = SPELL_COLOR.EARTH;
    g.beginPath();
    g.arc(x, y - 63, 8, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    g.stroke();
    g.restore();
  }
}
