import { beforeEach, describe, expect, it } from 'vitest';
import { stepShots } from '../../shared/sim/update/shots';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('Magnetic homing', () => {
  it('steers projectiles toward a magnetized foe at the buffed strength', () => {
    const [owner, target] = game.wizards;
    owner.x = 100;
    owner.y = 100;
    target.x = 500;
    target.y = 500;
    target.magnetized = 100;
    game.shots.push({
      id: 1,
      x: 300,
      y: 300,
      vx: 10,
      vy: 0,
      spell: 'EARTH',
      owner,
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });

    stepShots(game, 1);

    expect(game.shots[0].vy).toBeGreaterThan(0.3);
  });
});
