import { SPELL_COLOR, ELEMENT_NAMES } from '../../../../../shared/constants';
import { CHARGE_TICKS, showChargeMeter } from '../../../../../shared/charge';
import { TAU, clamp, rand } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { game } from '../../../state';
import { poly } from '../../shapes';
import { drawShieldOutline } from '../controlEffects';
import type { WizardPaint } from './context';

/**
 * Arcane charge ring and a growing elemental orb: one visual telegraph
 * shared by both wizards via the authoritative charge state. The orb sits on the staff tip.
 */
export function drawChargeTelegraph({ wizard, x, y, bob }: WizardPaint) {
  if (showChargeMeter(wizard.chargeTicks, wizard.chargeSpell)) {
    // Arcane charge ring and a growing elemental orb: one visual telegraph
    // shared by both wizards via the authoritative charge state.
    const color = SPELL_COLOR[wizard.chargeSpell!];
    const earthCharge = wizard.chargeSpell === 'EARTH';
    const moss = '#465f3b';
    const stone = '#765838';
    const progress = clamp(wizard.chargeTicks / CHARGE_TICKS, 0, 1);
    const t = game.t * 0.055;
    const cx = x,
      cy = y - 18;
    const orbX = x - 35,
      orbY = y + bob - 47;
    const orbRadius = 5 + progress * 10;
    ctx.save();

    // Rotating rune circle with a progress sweep.
    ctx.lineCap = 'round';
    ctx.strokeStyle = earthCharge ? moss : color;
    ctx.globalAlpha = 0.23 + progress * 0.2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 43, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = earthCharge ? moss : color;
    ctx.strokeStyle = earthCharge ? stone : color;
    ctx.shadowBlur = 9 + progress * 14;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 43, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const angle = t + (i * TAU) / 7;
      const rx = cx + Math.cos(angle) * 48;
      const ry = cy + Math.sin(angle) * 48;
      if (earthCharge) ctx.strokeStyle = i % 2 ? moss : stone;
      ctx.beginPath();
      ctx.moveTo(rx - Math.cos(angle) * 4, ry - Math.sin(angle) * 4);
      ctx.lineTo(rx + Math.cos(angle) * 4, ry + Math.sin(angle) * 4);
      ctx.stroke();
    }

    // Energy converges toward the casting hand. Deterministic motion avoids
    // allocating persistent particles or affecting the combat simulation.
    for (let i = 0; i < 5 + Math.floor(progress * 7); i++) {
      const angle = i * 2.39996 + t * (0.6 + progress);
      const distance = 13 + ((i * 17 + game.t * 1.2) % 28);
      const px = orbX + Math.cos(angle) * distance;
      const py = orbY + Math.sin(angle) * distance * 0.65;
      ctx.globalAlpha = 0.35 + progress * 0.5;
      ctx.fillStyle = wizard.chargeSpell === 'EARTH' ? (i % 2 ? '#465f3b' : '#765838') : color;
      ctx.beginPath();
      ctx.arc(px, py, 1.1 + progress * 1.1, 0, TAU);
      ctx.fill();
    }

    // Elemental energy orb, brighter and larger toward maximum charge.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = earthCharge ? moss : color;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius + 4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = earthCharge ? stone : color;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55 + progress * 0.4;
    ctx.beginPath();
    ctx.arc(
      orbX - orbRadius * 0.22,
      orbY - orbRadius * 0.25,
      Math.max(2, orbRadius * 0.42),
      0,
      TAU,
    );
    ctx.fill();

    // A small spell label remains readable without a boxed HUD element.
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = color;
    ctx.shadowColor = '#081018';
    ctx.shadowBlur = 5;
    ctx.fillText(wizard.chargeSpell!, x, y - 74);
    ctx.restore();
  }
}

/** The shield outline: an element colour, or green for the healing shield. */
export function drawShield({ wizard, x, y }: WizardPaint) {
  if (wizard.shield) {
    const color =
      wizard.shield.type === 4 ? '#4ade80' : SPELL_COLOR[ELEMENT_NAMES[wizard.shield.type]];
    drawShieldOutline(x, y, color, 1, wizard.shield.type, game.t);
  }
}

/** Flames circling a burning wizard (from 25 buildup), with embers that drift off. */
export function drawBurn({ wizard, x, y }: WizardPaint) {
  if (wizard.burn >= 25) {
    let count = Math.ceil(wizard.burn / 20);
    ctx.save();
    ctx.globalAlpha = 0.55 + wizard.burn / 250;
    for (let i = 0; i < count; i++) {
      let angle = (i * TAU) / count + game.t * 0.025,
        r = 14 + Math.sin(game.t * 0.13 + i) * 5,
        fx = x + Math.cos(angle) * r,
        fy = y - 23 + Math.sin(angle) * 10;
      poly(
        [
          [fx - 7, fy + 10],
          [fx, fy - 13 - wizard.burn * 0.11 - Math.sin(game.t * 0.2 + i) * 6],
          [fx + 7, fy + 10],
        ],
        i % 2 ? '#f97316' : '#facc15',
      );
    }
    ctx.restore();
    if (Math.random() < 0.12 + wizard.burn / 400)
      game.particles.push({
        x: x + rand(-18, 18),
        y: y - 40,
        vx: rand(-1, 1),
        vy: rand(-2.5, -1),
        color: Math.random() < 0.5 ? '#f97316' : '#fde047',
        life: rand(10, 20),
        r: rand(2, 4),
      });
  }
}

/** The ice shell around a fully frozen wizard, and the freeze countdown beside it. */
export function drawFrozen({ wizard, x, y }: WizardPaint) {
  // Only fully frozen wizards are encased. Partial chill remains a status bar.
  if (wizard.freeze > 0 && wizard.chill >= 100) {
    ctx.save();
    ctx.translate(x, y);
    // Jagged translucent shell, shaped like a chunk of ice rather than a box.
    ctx.beginPath();
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
    shell.forEach(([sx, sy], i) => (i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
    ctx.closePath();
    ctx.fillStyle = '#8bdcff55';
    ctx.fill();
    ctx.strokeStyle = '#d8f8ffdd';
    ctx.lineWidth = 2;
    ctx.stroke();
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
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, -55);
    ctx.lineTo(-5, -20);
    ctx.lineTo(-17, 5);
    ctx.moveTo(14, -55);
    ctx.lineTo(7, -32);
    ctx.lineTo(21, 1);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const angle = (i * TAU) / 5 + 0.3;
      const sx = Math.cos(angle) * 25,
        sy = 10 + Math.sin(angle) * 7;
      poly(
        [
          [sx - 6, sy + 5],
          [sx, sy - 9],
          [sx + 7, sy + 4],
        ],
        i % 2 ? '#b9efff' : '#e0f9ff',
      );
    }
    ctx.restore();

    // Frost countdown beside the encased wizard (simulation runs at 60 ticks/s).
    // The ring shrinks with the authoritative freeze timer in multiplayer too.
    const progress = clamp(wizard.freeze / (wizard.freezeMax || wizard.freeze), 0, 1);
    const cx = x + 43,
      cy = y - 28;
    ctx.save();
    ctx.fillStyle = '#112e42dd';
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    ctx.stroke();
    // Snowflake motif behind the timer.
    ctx.strokeStyle = '#b7f2ff77';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#123447';
    ctx.shadowBlur = 3;
    ctx.fillText((wizard.freeze / 60).toFixed(1) + 's', cx, cy + 3.5);
    ctx.restore();
  }
}

/** The soaked droplet above a wet wizard. */
export function drawWetIcon({ wizard, x, y }: WizardPaint) {
  if (wizard.wet > 0) {
    ctx.font = '17px sans-serif';
    ctx.fillText('💧', x + 8, y - 66);
  }
}

export function drawFlurryRing({ wizard, x, y }: WizardPaint) {
  if (wizard.flurryTime > 0) {
    // Pebble Flurry: a ring just under the health bar that empties over its 1.5 seconds.
    const left = clamp(wizard.flurryTime / 90, 0, 1);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y - 63, 8, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = SPELL_COLOR.EARTH;
    ctx.beginPath();
    ctx.arc(x, y - 63, 8, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    ctx.stroke();
    ctx.restore();
  }
}
