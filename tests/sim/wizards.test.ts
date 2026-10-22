import { beforeEach, describe, expect, it } from 'vitest';
import { styles } from '../../shared/constants';
import { mapFor } from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { createSimState, DEFAULT_RULES } from '../../shared/simState';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('a match is a list of wizards', () => {
  it('has two wizards in seats 0 and 1, on teams 0 and 1', () => {
    expect(game.wizards).toHaveLength(2);
    expect(game.wizards.map((w) => [w.seat, w.team])).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('every match starts the same way on any map, and the dummy comes back in its seat', () => {
    for (const mode of ['duel', 'still', 'mortal', 'online'] as const) {
      resetMatch(game, {
        mode,
        seed: 1,
        styles: [styles[0], styles[1]],
        dummyHP: 50,
        dummyMoving: false,
        map: mapFor('ruins'),
      });
      expect(game.wizards.map((w) => w.seat)).toEqual([0, 1]);
    }
    game.mode = 'mortal';
    game.wizards[1].hp = 0;
    game.respawn = 1;
    update(game, 2);
    expect(game.wizards[1]).toMatchObject({ seat: 1, team: 1 });
    expect(game.wizards).toHaveLength(2);
  });
});

describe('match rules', () => {
  it('are a one-on-one duel by default and can be set per match', () => {
    expect(game.rules).toEqual(DEFAULT_RULES);
    expect(createSimState(1).rules).toEqual(DEFAULT_RULES);
    resetMatch(game, {
      mode: 'online',
      seed: 1,
      styles: [styles[0], styles[1]],
      dummyHP: 100,
      dummyMoving: false,
      rules: { friendlyFire: true },
    });
    expect(game.rules).toEqual({
      ...DEFAULT_RULES,
      friendlyFire: true,
    });
    resetDuel(); // the next match starts from the defaults again
    expect(game.rules).toEqual(DEFAULT_RULES);
  });
});
