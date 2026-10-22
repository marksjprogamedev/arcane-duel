import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { ellipse, poly } from '../../shapes';
import type { WizardPaint } from './context';

/**
 * Staff is deliberately larger than before and the tip is an exact
 * anchor shared with the charge VFX (in body coordinates). All variants keep that anchor.
 */
export const STAFF_TIP_X = -35;
export const STAFF_TIP_Y = -47;

export function drawStaff({ style, styleIndex, stroke, jewel }: WizardPaint) {
  const tipX = STAFF_TIP_X,
    tipY = STAFF_TIP_Y;
  stroke('#261d1b', 8, [
    [-15, -3],
    [-25, -26],
    [tipX, tipY + 7],
  ]);
  stroke(styleIndex === 4 ? '#caa65c' : styleIndex === 6 ? '#677c98' : '#94704a', 5, [
    [-15, -3],
    [-25, -26],
    [tipX, tipY + 7],
  ]);
  stroke(style.trim, 2, [
    [-22, -20],
    [-27, -28],
  ]);
  if (styleIndex === 0) {
    // Flame prongs.
    poly(
      [
        [-44, -44],
        [-39, -60],
        [-35, -52],
        [-30, -62],
        [-25, -44],
      ],
      '#e87924',
    );
    jewel(tipX, tipY, 7, '#ffb23e');
  } else if (styleIndex === 1) {
    poly(
      [
        [tipX, -64],
        [-24, -48],
        [tipX, -35],
        [-46, -48],
      ],
      '#b9f0ff',
    );
    poly(
      [
        [tipX, -64],
        [-24, -48],
        [tipX, -48],
      ],
      '#f0fdff',
    );
  } else if (styleIndex === 2) {
    stroke('#547b42', 4, [
      [-35, -39],
      [-45, -51],
      [-46, -57],
    ]);
    stroke('#547b42', 4, [
      [-35, -39],
      [-25, -52],
    ]);
    poly(
      [
        [-45, -51],
        [-54, -56],
        [-50, -45],
      ],
      '#8dbd62',
    );
    jewel(tipX, tipY, 7, '#9cf9a1');
  } else if (styleIndex === 3) {
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 11, 0.4, 5.3);
    ctx.stroke();
    jewel(tipX + 3, tipY - 2, 5);
  } else if (styleIndex === 4) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * TAU) / 8;
      stroke('#f0cb6c', 3, [
        [tipX + Math.cos(angle) * 9, tipY + Math.sin(angle) * 9],
        [tipX + Math.cos(angle) * 15, tipY + Math.sin(angle) * 15],
      ]);
    }
    jewel(tipX, tipY, 8, '#ffe69b');
  } else if (styleIndex === 5) {
    poly(
      [
        [-43, -57],
        [-29, -57],
        [-24, -46],
        [-35, -36],
        [-46, -46],
      ],
      '#b68c51',
    );
    jewel(tipX, tipY, 7, '#5be4ce');
  } else if (styleIndex === 6) {
    poly(
      [
        [tipX, -65],
        [-24, -46],
        [tipX, -35],
        [-46, -46],
      ],
      '#7dd3fc',
    );
    poly(
      [
        [tipX, -65],
        [-24, -46],
        [tipX, -46],
      ],
      '#d6f8ff',
    );
  } else {
    ellipse(tipX, tipY, 12, 12, '#a17b4a');
    stroke('#d3b177', 3, [
      [-45, -48],
      [-35, -59],
      [-25, -48],
      [-35, -37],
      [-45, -48],
    ]);
    jewel(tipX, tipY, 6);
  }
}
