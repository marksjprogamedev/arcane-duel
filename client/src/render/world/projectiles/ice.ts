import { poly } from '../../primitives';

export function drawIce() {
  poly(
    [
      [-20, -5],
      [11, -7],
      [29, 0],
      [11, 7],
      [-20, 5],
    ],
    '#7dd3fc',
  );
  poly(
    [
      [-20, -5],
      [11, -7],
      [29, 0],
      [-5, 0],
    ],
    '#e0f2fe',
  );
  poly(
    [
      [-10, 2],
      [9, 0],
      [-8, 9],
    ],
    '#38bdf8',
  );
}
