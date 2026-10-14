import { beforeEach, describe, expect, it } from 'vitest';
import { DARK_CIRCLE, obstaclesFor } from '../../shared/arenas';
import { pillars, styles } from '../../shared/constants';
import { resetMatch } from '../../shared/sim/match';
import { clear, ray, walk } from '../../shared/sim/geometry';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('per-arena obstacles', () => {
  it('uses the four pillars unless the match says otherwise', () => {
    expect(game.obstacles).toBe(pillars);
    expect(obstaclesFor('temple')).toBe(pillars);
  });

  it("takes the arena's obstacles from the match setup", () => {
    resetMatch(game, {
      mode: 'still',
      seed: 1,
      styles: [styles[0], styles[1]],
      dummyHP: 100,
      dummyMoving: false,
      obstacles: obstaclesFor('darkcircle'),
    });
    expect(game.obstacles).toContainEqual(DARK_CIRCLE.table);
    // and the next match starts back on the pillars
    resetDuel();
    expect(game.obstacles).toBe(pillars);
  });

  it("a wizard cannot walk through the middle table of the Dark Wizards' Circle", () => {
    const obstacles = obstaclesFor('darkcircle');
    const walkDown = (obstacles?: Parameters<typeof walk>[3]) => {
      const w = { x: 400, y: 200 };
      for (let i = 0; i < 80; i++) walk(w, 0, 3.5, obstacles);
      return w.y;
    };
    expect(walkDown(obstaclesFor('darkcircle'))).toBeLessThan(
      DARK_CIRCLE.table.y - DARK_CIRCLE.table.r,
    );
    // with only the pillars it would walk straight through
    expect(walkDown()).toBeGreaterThan(DARK_CIRCLE.table.y);
  });

  it('projectiles and spells are blocked by the table and by the monuments', () => {
    const obstacles = obstaclesFor('darkcircle');
    expect(ray(400, 200, 400, 400, 0, obstacles)).not.toBeNull();
    expect(ray(400, 200, 400, 400)).toBeNull();
    expect(clear({ x: 300, y: 300 }, { x: 500, y: 300 }, 5, obstacles)).toBe(false);
    for (const m of DARK_CIRCLE.monuments)
      expect(ray(m.x - 80, m.y, m.x + 80, m.y, 0, obstacles)).not.toBeNull();
  });

  it('a bolt stops at the table in the simulation', () => {
    game.obstacles = obstaclesFor('darkcircle');
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.shots.push({
      id: 1,
      x: 330,
      y: 300,
      vx: 7.5,
      vy: 0,
      k: 'EARTH',
      owner: game.p,
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });
    for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
    expect(game.e.hp).toBe(200);
  });
});
