import type { Shot } from '../../../../../shared/types';
import { game } from '../../../state';
import { ellipse, poly } from '../../shapes';

export function drawFireball(shot: Pick<Shot, 'vx' | 'vy' | 'r'>) {
  for (let i = 0; i < 4; i++) {
    const t = i * 0.9 + game.t * 0.12;
    poly(
      [
        [-shot.r - 12 - i * 5, Math.sin(t) * 7],
        [-shot.r + 3, -shot.r * 0.7],
        [shot.r * 0.7, 0],
        [-shot.r + 3, shot.r * 0.7],
      ],
      i % 2 ? '#f97316' : '#dc2626',
    );
  }
  ellipse(0, 0, shot.r + 3, shot.r + 2, '#f97316');
  ellipse(3, -2, shot.r * 0.67, shot.r * 0.67, '#fde047');
  ellipse(6, -4, shot.r * 0.32, shot.r * 0.32, '#fff7ed');
}
