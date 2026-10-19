import { beforeEach, describe, expect, it } from 'vitest';
import { styles, TEAM_RESPAWN_TICKS } from '../../shared/constants';
import { mapFor } from '../../shared/maps';
import { bomb, cast, trap } from '../../shared/sim/combat';
import { applyInput } from '../../shared/sim/input';
import { resetMatch } from '../../shared/sim/match';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { targetsOf, untouchable } from '../../shared/sim/teams';
import { resolveDeaths, update } from '../../shared/sim/update';
import type { MatchRules } from '../../shared/types';
import { game, press } from './helpers';

/** A 2v2 on the Ruined Keep in the open: seats 0 and 1 are team 0, 2 and 3 team 1. */
function setup(rules: Partial<MatchRules> = {}) {
  resetMatch(game, {
    mode: 'online',
    seed: 1,
    styles: [...styles],
    dummyHP: 100,
    dummyMoving: false,
    map: mapFor('ruins'),
    rules: { teamSize: 2, ...rules },
  });
  const [a, b, c, d] = game.wizards;
  [a.x, a.y] = [600, 900];
  [b.x, b.y] = [600, 1000];
  [c.x, c.y] = [1500, 900];
  [d.x, d.y] = [1500, 1000];
}
const step = () => {
  if (update(game, 1)) resolveDeaths(game);
};
const kill = (seat: number) => {
  game.wizards[seat].hp = 0;
  step();
};

beforeEach(() => setup());

describe('every seat plays, not just the first two', () => {
  it('seats 2 and 3 walk with their keys, aim and cast, and their timers count down', () => {
    for (const seat of [0, 1, 2, 3]) {
      const w = game.wizards[seat];
      [w.x, w.y] = [200 + seat * 80, 700 + seat * 60]; // in the open
      const x = w.x;
      applyInput(game, seat, press('KeyD'));
      game.input[seat].keys = { KeyD: true };
      w.fireCD = 30;
      w.burn = 50;
      w.burnTime = 100;
      for (let i = 0; i < 10; i++) step();
      expect(w.x, `seat ${seat} walks`).toBeGreaterThan(x);
      expect(w.fireCD, `seat ${seat} cooldown ticks`).toBeLessThan(30);
      expect(w.burnTime, `seat ${seat} status ticks`).toBeLessThan(100);
    }
  });

  it('a held spray from seat 3 hits an enemy and a seat-2 shot flies', () => {
    const [a, , c, d] = game.wizards;
    [a.x, a.y] = [1300, 900];
    [d.x, d.y] = [1500, 905];
    game.input[3].mouse = { x: 1300, y: 900 };
    applyInput(game, 3, { kind: 'pointerdown', x: 1300, y: 900 });
    for (let i = 0; i < 10; i++) step();
    expect(a.hp).toBeLessThan(200);
    expect(c).toBeDefined();
  });
});

describe('elimination: a wizard who falls is out, and the round ends when a team has no one left', () => {
  it('a fall does not end the round while a teammate is standing', () => {
    kill(1);
    expect(game.wizards[1].fallen).toBe(true);
    expect(game.ending).toBe(false);
    expect(game.events).toContainEqual({ type: 'fall', seat: 1 });
    expect(game.death).toBeNull();
  });

  it('the last of a team to fall ends the round, and the other team wins', () => {
    kill(1);
    kill(0);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(false); // true would mean team 0 won
    expect(game.events).toContainEqual({ type: 'death', loser: 0, winner: false });
    expect(game.death?.w).toBe(game.wizards[0]);
  });

  it('team 0 wins when team 1 is out', () => {
    kill(2);
    kill(3);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
  });

  it('two wizards falling on the same tick are not both counted as the end', () => {
    game.wizards[0].hp = 0;
    game.wizards[1].hp = 0;
    step();
    expect(game.winner).toBe(false);
    expect(game.events.filter((e) => e.type === 'death')).toHaveLength(1);
  });

  it('a fallen wizard cannot be hit, targeted, or act', () => {
    kill(2);
    const [a, , c, d] = game.wizards;
    expect(untouchable(game, c)).toBe(true);
    expect(targetsOf(game, a)).toEqual([d]);
    // fire at where the fallen one stands: they take nothing, and cannot cast or walk themselves
    c.hp = 50;
    cast(game, a, 1500, 900, 1, 'FIRE');
    for (let i = 0; i < 5; i++) step();
    expect(c.hp).toBe(50);
    applyInput(game, 2, press('KeyD'));
    applyInput(game, 2, { kind: 'pointerdown', x: 0, y: 0 });
    expect(game.input[2].holding).toBe(false);
  });

  it('the snapshot says who has fallen', () => {
    kill(3);
    const snap = serializeSnapshot(game, 0, { roundId: 1, seq: 1 });
    expect(snap.you.fallen).toBe(false);
    const all = [snap.you, ...snap.others];
    expect(all.find((w) => w.seat === 3)?.fallen ?? true).toBe(true);
  });

  it('a duel still ends at the first fall, as before', () => {
    resetMatch(game, {
      mode: 'online',
      seed: 1,
      styles: [...styles],
      dummyHP: 100,
      dummyMoving: false,
    });
    kill(1);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
  });
});

describe('friendly fire', () => {
  /** Puts a teammate in the way of a bomb, a spray and a trap, and returns their health. */
  function hurtTeammate() {
    const [a, b] = game.wizards;
    [b.x, b.y] = [700, 900];
    cast(game, a, 800, 900, 1, 'FIRE');
    bomb(game, a, 700, 900, 'FIRE');
    for (let i = 0; i < 400; i++) step();
    return b.hp;
  }

  it('is off by default: teammates are never hurt by your spells, bombs or sprays', () => {
    expect(hurtTeammate()).toBe(200);
  });

  it('when on, your spells hurt your teammates too', () => {
    setup({ friendlyFire: true });
    expect(hurtTeammate()).toBeLessThan(200);
  });

  it('a trap set by a teammate springs on them only with friendly fire', () => {
    const [a, b] = game.wizards;
    trap(game, a, 640, 900, 'FIRE');
    const t = game.traps[0];
    [b.x, b.y] = [t.x, t.y];
    game.traps[0].arm = 0;
    for (let i = 0; i < 3; i++) step();
    expect(b.hp).toBe(200);
    setup({ friendlyFire: true });
    const [a2, b2] = game.wizards;
    trap(game, a2, 640, 900, 'FIRE');
    [b2.x, b2.y] = [game.traps[0].x, game.traps[0].y];
    game.traps[0].arm = 0;
    for (let i = 0; i < 3; i++) step();
    expect(b2.hp).toBeLessThan(200);
  });

  it('an enemy is hurt either way', () => {
    const [a, , c] = game.wizards;
    [c.x, c.y] = [700, 900];
    cast(game, a, 800, 900, 1, 'FIRE');
    for (let i = 0; i < 20; i++) step();
    expect(c.hp).toBeLessThan(200);
  });
});

describe('respawn: a fallen wizard comes back and the first team to the kill target wins', () => {
  beforeEach(() => setup({ deathRule: 'respawn', killTarget: 3 }));

  it('scores for the other team, keeps the round going, and brings the wizard back', () => {
    const w = game.wizards[1];
    kill(1);
    expect(game.score).toEqual([0, 1]);
    expect(w.fallen).toBe(true);
    expect(w.returnIn).toBe(TEAM_RESPAWN_TICKS);
    expect(game.ending).toBe(false);
    // even the whole team being down at once does not end it
    kill(0);
    expect(game.score).toEqual([0, 2]);
    expect(game.ending).toBe(false);
    for (let i = 0; i < TEAM_RESPAWN_TICKS + 2; i++) step();
    expect(w.fallen).toBe(false);
    expect(w.hp).toBe(200);
    expect([w.x, w.y]).toEqual([game.starts[1].x, game.starts[1].y]);
    expect(w).toMatchObject({ seat: 1, team: 0, returnIn: 0 });
    expect(game.events.some((e) => e.type === 'text' && e.text === 'RESPAWNED')).toBe(true);
  });

  it('can be hurt again after coming back, and is untouchable while down', () => {
    kill(2);
    expect(untouchable(game, game.wizards[2])).toBe(true);
    for (let i = 0; i < TEAM_RESPAWN_TICKS + 2; i++) step();
    expect(untouchable(game, game.wizards[2])).toBe(false);
  });

  it('ends the round when a team reaches the kill target', () => {
    kill(2);
    kill(3);
    expect(game.ending).toBe(false);
    game.wizards[2].fallen = false;
    kill(2);
    expect(game.score).toEqual([3, 0]);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
    expect(game.events).toContainEqual({ type: 'death', loser: 2, winner: true });
  });

  it('is sent in the snapshot: the score and the wait', () => {
    kill(3);
    const snap = serializeSnapshot(game, 2, { roundId: 1, seq: 1 }); // their teammate's view
    expect(snap.score).toEqual([1, 0]);
    expect(snap.others.find((w) => w.seat === 3)).toMatchObject({
      fallen: true,
      returnIn: TEAM_RESPAWN_TICKS,
    });
  });

  it('a duel with the respawn rule is still one life', () => {
    resetMatch(game, {
      mode: 'online',
      seed: 1,
      styles: [...styles],
      dummyHP: 100,
      dummyMoving: false,
      rules: { deathRule: 'respawn' },
    });
    kill(1);
    expect(game.ending).toBe(true);
    expect(game.score).toEqual([0, 0]);
  });
});

describe('team vision on a fogged map', () => {
  const view = (seat: number) => serializeSnapshot(game, seat, { roundId: 1, seq: 1 });
  const seats = (snap: ReturnType<typeof view>) => snap.others.map((w) => w.seat).sort();

  it('every viewer sees their teammate however far away, and not the far enemies', () => {
    const [a, b] = game.wizards;
    [b.x, b.y] = [2000, 300]; // across the map from a, but a teammate
    expect(seats(view(0))).toEqual([1]);
    expect(seats(view(1))).toEqual([0]);
  });

  it('an enemy one teammate can see is sent to the whole team', () => {
    const [a, b, c] = game.wizards;
    [b.x, b.y] = [1000, 900]; // b stands near the enemy c, far from a
    [c.x, c.y] = [1400, 900];
    expect(seats(view(0))).toContain(2);
    expect(seats(view(1))).toContain(2);
  });

  it('a fallen teammate no longer shares sight', () => {
    const [a, b, c] = game.wizards;
    [b.x, b.y] = [1000, 900];
    [c.x, c.y] = [1400, 900];
    kill(1);
    expect(seats(view(0))).not.toContain(2);
  });

  it('enemies’ shots are sent when a teammate sees them, and a teammate’s own always', () => {
    const [a, b, c] = game.wizards;
    [b.x, b.y] = [1100, 900];
    const base = { vx: 1, vy: 0, k: 'FIRE', r: 5, life: 99 } as never;
    game.shots.push({ ...(base as object), id: 1, x: 1200, y: 900, owner: c } as never);
    game.shots.push({ ...(base as object), id: 2, x: 2200, y: 100, owner: b } as never); // b's, far away
    const ids = view(0).shots.map((s) => s.id);
    expect(ids).toContain(1); // an enemy shot b can see
    expect(ids).toContain(2); // a teammate's shot, wherever it is
  });

  it('the end of the round shows everything', () => {
    kill(0);
    kill(1);
    expect(seats(view(0))).toEqual([1, 2, 3]);
  });
});

describe('uneven teams: empty seats never play', () => {
  it('an empty seat is absent and fallen, so the lone player on a team is the whole team', () => {
    setup({ emptySeats: [1] }); // a 1 v 2: seat 1 is empty
    expect(game.wizards.map((w) => w.absent)).toEqual([false, true, false, false]);
    expect(game.wizards[1].fallen).toBe(true);
    kill(0); // team 0's only player falls: the round ends
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(false);
  });

  it('the other team plays on until its own players are gone', () => {
    setup({ emptySeats: [1] });
    kill(2);
    expect(game.ending).toBe(false);
    kill(3);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
  });

  it('an empty seat is not a target and is left out of snapshots, also in a respawn match', () => {
    setup({ emptySeats: [3], deathRule: 'respawn' });
    expect(targetsOf(game, game.wizards[0], true).map((w) => w.seat)).toEqual([2, 0]);
    for (let i = 0; i < 400; i++) step();
    expect(game.wizards[3].fallen).toBe(true); // it never respawns
    const others = serializeSnapshot(game, 2, { roundId: 1, seq: 1 }).others;
    expect(others.map((w) => w.seat)).not.toContain(3);
  });
});
