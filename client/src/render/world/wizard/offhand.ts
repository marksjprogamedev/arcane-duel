import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { ellipse, poly } from '../../shapes';
import type { WizardPaint } from './context';

/**
 * A signature offhand accessory for each wizard. During the sword
 * ability the original sword returns instead (see sword.ts), so its swing and hit cues remain.
 */
export function drawOffhand({ v, stroke, jewel }: WizardPaint) {
  g.save();
  g.translate(16, -8);
  g.rotate(0.12 + Math.sin(game.t * 0.055 + v) * 0.055);
  if (v === 0) {
    // ember lantern
    stroke('#d9a356', 2, [
      [0, -2],
      [0, -19],
    ]);
    g.fillStyle = '#533222';
    g.fillRect(-7, -21, 14, 16);
    jewel(0, -14, 5, '#ff9a32');
    stroke('#e7c77a', 2, [
      [-7, -21],
      [0, -27],
      [7, -21],
    ]);
  } else if (v === 1) {
    // frost prism
    poly(
      [
        [0, -30],
        [9, -17],
        [0, -4],
        [-9, -17],
      ],
      '#6dd6ff',
    );
    poly(
      [
        [0, -30],
        [0, -4],
        [-9, -17],
      ],
      '#d7f7ff',
    );
    stroke('#ffffffaa', 1, [
      [0, -30],
      [9, -17],
      [0, -4],
    ]);
  } else if (v === 2) {
    // leafy familiar / charm
    ellipse(0, -16, 9, 10, '#426a39');
    ellipse(-4, -19, 2, 2, '#baff8c');
    ellipse(4, -19, 2, 2, '#baff8c');
    poly(
      [
        [-8, -25],
        [-15, -31],
        [-13, -20],
      ],
      '#7db55e',
    );
    poly(
      [
        [8, -25],
        [15, -31],
        [13, -20],
      ],
      '#7db55e',
    );
  } else if (v === 3) {
    // floating void orb
    jewel(0, -18, 10, '#a855f7');
    stroke('#e9c4ff', 1.4, [
      [-11, -18],
      [0, -29],
      [11, -18],
      [0, -7],
      [-11, -18],
    ]);
  } else if (v === 4) {
    // gold-bound tome
    poly(
      [
        [-12, -27],
        [0, -24],
        [0, -5],
        [-12, -9],
      ],
      '#f5e4ae',
    );
    poly(
      [
        [0, -24],
        [12, -27],
        [12, -9],
        [0, -5],
      ],
      '#fff6d7',
    );
    stroke('#c69d44', 2, [
      [0, -24],
      [0, -5],
    ]);
    jewel(6, -17, 2, '#eab94b');
  } else if (v === 5) {
    // brass astrolabe
    g.strokeStyle = '#dfba70';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, -17, 11, 14, 0.4, 0, TAU);
    g.stroke();
    g.beginPath();
    g.ellipse(0, -17, 11, 5, -0.4, 0, TAU);
    g.stroke();
    jewel(0, -17, 4, '#65ead3');
  } else if (v === 6) {
    // charged storm globe
    jewel(0, -18, 9, '#60a5fa');
    stroke('#e8f7ff', 2, [
      [-7, -20],
      [-1, -16],
      [-4, -12],
      [7, -22],
    ]);
  } else {
    // runic alchemical tablet
    poly(
      [
        [-10, -29],
        [10, -29],
        [12, -8],
        [-12, -8],
      ],
      '#6b5b42',
    );
    poly(
      [
        [-7, -26],
        [7, -26],
        [8, -11],
        [-8, -11],
      ],
      '#a78b57',
    );
    jewel(0, -19, 4, '#a3e635');
  }
  g.restore();
}
