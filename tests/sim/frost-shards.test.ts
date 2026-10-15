import { beforeEach, describe, expect, it } from 'vitest';
import { cast, hit } from '../../shared/sim/combat';
import type { BoltShot } from '../../shared/types';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const shards = { ICE: 'shards' } as const;
const volley = (power: number) => {
  game.shots = [];
  game.p.earthCD = 0;
  cast(game, game.p, 700, 300, power, 'ICE', shards);
  return game.shots as BoltShot[];
};

describe('charging Frost Shards', () => {
  it("multiplies each shard's damage up to six times at full charge", () => {
    const plain = volley(1)[0].damage;
    const full = volley(3)[0].damage;
    expect(plain).toBeCloseTo(3.5);
    expect(full).toBeCloseTo(plain * 6);
    expect(volley(2)[0].damage).toBeGreaterThan(plain * 2); // steeper than the old straight 2x
  });

  it('chills a target far more per shard, so a full volley freezes', () => {
    hit(game, game.e, 'ICE', 3.5, false, false, 'shards', 1);
    const uncharged = game.e.chill;
    expect(uncharged).toBeCloseTo(7, 0);
    game.e.chill = 0;
    hit(game, game.e, 'ICE', 21, true, false, 'shards', 3);
    expect(game.e.chill).toBeCloseTo(42, 0);
    hit(game, game.e, 'ICE', 21, true, false, 'shards', 3);
    hit(game, game.e, 'ICE', 21, true, false, 'shards', 3);
    expect(game.e.freeze).toBeGreaterThan(0); // three charged shards freeze
  });

  it('carries the charge on the shot, so the hit knows how strong it was', () => {
    for (const s of volley(3)) expect(s.power).toBe(3);
  });
});
