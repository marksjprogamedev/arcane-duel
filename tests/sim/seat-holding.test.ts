import { beforeEach, describe, expect, it } from 'vitest';
import { styles } from '../../shared/constants';
import { mapFor } from '../../shared/maps';
import { sword } from '../../shared/sim/combat/abilities';
import { resetMatch } from '../../shared/sim/match';
import { resolveDeaths } from '../../shared/sim/update/deaths';
import { update } from '../../shared/sim/update';
import { game } from './helpers';

function setup(teamSize: number) {
  resetMatch(game, {
    mode: 'online',
    seed: 1,
    styles: [...styles],
    dummyHP: 100,
    dummyMoving: false,
    map: mapFor('ruins'),
    rules: { teamSize },
  });
}

describe.each([
  [1, [0, 1]],
  [2, [0, 1, 2, 3]],
])('online %i-seat-per-team sword while holding', (teamSize, seats) => {
  beforeEach(() => setup(teamSize));

  it.each(seats)('seat %i cannot sword while holding the attack button', (seat) => {
    const w = game.wizards[seat];
    const foe = game.wizards.find((o) => o.team !== w.team)!;
    [foe.x, foe.y] = [w.x + 40, w.y];
    game.input[seat].holding = true;
    sword(game, w, 0);
    expect(w.swordCD).toBe(0);
    game.input[seat].holding = false;
    sword(game, w, 0);
    expect(w.swordCD).toBeGreaterThan(0);
  });
});

describe('round end', () => {
  it.each([1, 2])('clears holding for every seat (team size %i)', (teamSize) => {
    setup(teamSize);
    for (const input of game.input) input.holding = true;
    for (const w of game.wizards) if (w.team === 1) w.hp = 0;
    if (update(game, 1)) resolveDeaths(game);
    for (const w of game.wizards) if (w.team === 1) w.hp = 0;
    for (let i = 0; i < 5 && !game.ending; i++) if (update(game, 1)) resolveDeaths(game);
    expect(game.ending).toBe(true);
    expect(game.input.length).toBe(teamSize * 2);
    for (const input of game.input) expect(input.holding).toBe(false);
  });
});
