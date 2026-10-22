import { g } from '../../../dom';
import { game } from '../../../state';
import { poly } from '../../primitives';

export function drawEarth() {
  // Small stone fragments stream behind the boulder (local -X is backwards).
  // Deterministic motion avoids random frame-to-frame popping.
  g.shadowBlur = 0;
  for (let i = 0; i < 7; i++) {
    const drift = (game.t * (0.45 + i * 0.08) + i * 13) % 55;
    const px = -22 - drift;
    const py = Math.sin(game.t * 0.06 + i * 2.3) * (5 + i * 1.4);
    const size = 2.5 + (i % 3) * 1.2;
    g.globalAlpha = 0.75 * (1 - drift / 65);
    poly(
      [
        [px - size, py],
        [px - size * 0.3, py - size],
        [px + size, py - size * 0.3],
        [px + size * 0.5, py + size],
      ],
      i % 3 === 0 ? '#728055' : i % 2 ? '#a08b6d' : '#685741',
    );
  }
  g.globalAlpha = 1;
  // A rough earthen boulder: brown rock, mossy facets and sharp stone edges,
  // matching the moss-and-soil palette of Earth Shot's spellbook icon.
  g.shadowColor = '#51432b';
  g.shadowBlur = 7;
  poly(
    [
      [-20, -3],
      [-16, -13],
      [-7, -19],
      [5, -17],
      [17, -9],
      [20, 1],
      [12, 13],
      [-1, 17],
      [-14, 12],
      [-21, 4],
    ],
    '#594d38',
  );
  g.shadowBlur = 0;
  poly(
    [
      [-18, -4],
      [-15, -13],
      [-7, -19],
      [5, -17],
      [4, -7],
      [-8, 1],
    ],
    '#978565',
  );
  poly(
    [
      [5, -17],
      [17, -9],
      [20, 1],
      [11, 5],
      [4, -7],
    ],
    '#637049',
  );
  poly(
    [
      [-8, 1],
      [4, -7],
      [11, 5],
      [12, 13],
      [-1, 17],
      [-14, 12],
    ],
    '#786249',
  );
  poly(
    [
      [-15, -13],
      [-7, -19],
      [5, -17],
      [-1, -13],
      [-10, -9],
    ],
    '#b4a180',
  );
  poly(
    [
      [4, -7],
      [11, -9],
      [16, -4],
      [11, 5],
      [5, 1],
    ],
    '#83915f',
  );
  poly(
    [
      [-16, 5],
      [-8, 1],
      [-2, 7],
      [-5, 12],
      [-14, 12],
    ],
    '#4f6040',
  );
  // Subtle fractures give the projectile a rocky, rather than geometric, silhouette.
  g.strokeStyle = '#403c2d';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-8, 1);
  g.lineTo(4, -7);
  g.lineTo(11, 5);
  g.moveTo(-2, 7);
  g.lineTo(2, 11);
  g.stroke();
}
