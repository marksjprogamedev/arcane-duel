import { poly } from '../../shapes';

export function drawShards() {
  poly(
    [
      [-13, -5],
      [-3, -8],
      [17, 0],
      [-3, 8],
      [-13, 5],
    ],
    '#38bdf8',
  );
  poly(
    [
      [-12, -5],
      [-3, -8],
      [17, 0],
      [-4, -1],
    ],
    '#f0fdfa',
  );
}
