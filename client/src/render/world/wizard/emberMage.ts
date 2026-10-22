import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { ellipse } from '../../shapes';
import type { WizardPaint } from './context';

/** Painterly prototype — Ember Mage only, then the illustrated pass over it. */
export function drawEmberMage(paint: WizardPaint) {
  if (paint.styleIndex !== 0) return;
  painterly(paint);
  illustrated(paint);
}

// Painterly prototype — Ember Mage only. Layered warm highlights,
// stitched embroidery and brushed edge lighting retain the chibi silhouette.
function painterly({ stroke, jewel }: WizardPaint) {
  ctx.save();
  ctx.globalAlpha = 0.78;
  stroke('#f5bf7a', 1.5, [
    [-16, -7],
    [-19, 3],
    [-23, 16],
  ]);
  stroke('#f8d8a1', 1.2, [
    [-9, -7],
    [-12, 2],
    [-14, 11],
  ]);
  stroke('#6b2535', 2, [
    [11, -5],
    [16, 7],
    [19, 15],
  ]);
  stroke('#f0a95e', 1.2, [
    [5, 3],
    [9, 10],
    [12, 14],
  ]);
  // Ornamental hem: asymmetric embroidered flame motifs.
  for (let i = 0; i < 4; i++) {
    const xx = -16 + i * 10;
    stroke('#e9ad64', 1.2, [
      [xx, 13],
      [xx + 2, 9],
      [xx + 4, 14],
    ]);
  }
  // Hat brim catches a narrow streak of sunset light.
  stroke('#f7c68b', 1.8, [
    [-22, -20],
    [-12, -22],
    [1, -22],
  ]);
  stroke('#543047', 1.8, [
    [5, -39],
    [10, -31],
    [12, -26],
  ]);
  // A glowing buckle and flecks of molten brass on the mantle.
  jewel(-9, -10, 2, '#f6bd63');
  jewel(10, -10, 2, '#f6bd63');
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffb866';
  ctx.beginPath();
  ctx.ellipse(-10, -2, 9, 16, -0.25, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Illustrated Ember Mage: bold ink contours, translucent paint washes,
// stitched gold filigree and a lit face. Keep the compact silhouette.
function illustrated({ stroke }: WizardPaint) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Hand-inked irregular outer contour gives the robe illustrated weight.
  ctx.strokeStyle = '#2a1728';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-15, -9);
  ctx.lineTo(-19, 2);
  ctx.lineTo(-23, 20);
  ctx.lineTo(-10, 17);
  ctx.lineTo(0, 22);
  ctx.lineTo(9, 16);
  ctx.lineTo(21, 19);
  ctx.lineTo(17, 3);
  ctx.lineTo(12, -9);
  ctx.stroke();
  // Transparent glaze creates a warm reflected-firelight gradient.
  const robeLight = ctx.createLinearGradient(-22, -12, 21, 21);
  robeLight.addColorStop(0, '#ffc27c65');
  robeLight.addColorStop(0.42, '#ec774c28');
  robeLight.addColorStop(1, '#200f3300');
  ctx.fillStyle = robeLight;
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.lineTo(-18, 6);
  ctx.lineTo(-21, 18);
  ctx.lineTo(-10, 16);
  ctx.lineTo(-1, 19);
  ctx.lineTo(2, -9);
  ctx.closePath();
  ctx.fill();
  // Sculpted folds with thin warm rims and dark ink valleys.
  stroke('#381b30', 2.3, [
    [-8, -3],
    [-6, 6],
    [-9, 17],
  ]);
  stroke('#f8c28a', 1.4, [
    [-13, -5],
    [-15, 5],
    [-18, 15],
  ]);
  stroke('#e78865', 1.5, [
    [7, -1],
    [10, 7],
    [15, 16],
  ]);
  stroke('#321b2e', 2, [
    [12, 0],
    [16, 10],
    [18, 17],
  ]);
  // Ornate shoulder mantle, with contrasting seams.
  stroke('#f5d39a', 2, [
    [-16, -10],
    [-10, -14],
    [-3, -11],
  ]);
  stroke('#f5d39a', 2, [
    [4, -11],
    [12, -14],
    [17, -9],
  ]);
  for (let i = 0; i < 5; i++) {
    const px = -15 + i * 8;
    stroke('#f2c16c', 1, [
      [px, 13],
      [px + 2, 10],
      [px + 4, 14],
    ]);
  }
  // A little painted light catches the cheeks and brim.
  ellipse(-5, -13, 3.2, 1.4, '#ffe0b766');
  stroke('#f8d2a0', 1.8, [
    [-21, -20],
    [-11, -23],
    [2, -23],
  ]);
  stroke('#2a1728', 2.2, [
    [-23, -19],
    [-13, -37],
    [0, -47],
    [13, -37],
    [19, -19],
  ]);
  // Glowing staff jewel casts a warm halo on nearby clothing.
  const halo = ctx.createRadialGradient(-27, -34, 0, -27, -34, 31);
  halo.addColorStop(0, '#ffb95b48');
  halo.addColorStop(1, '#ffb95b00');
  ctx.fillStyle = halo;
  ctx.fillRect(-60, -65, 65, 65);
  ctx.restore();
}
