import { poly } from '../../primitives';

export function drawPebbles() {
  poly(
    [
      [-5, -3],
      [-1, -6],
      [5, -2],
      [4, 4],
      [-3, 5],
    ],
    '#857663',
  );
  poly(
    [
      [-5, -3],
      [-1, -6],
      [5, -2],
      [-2, 0],
    ],
    '#e2d0af',
  );
}
