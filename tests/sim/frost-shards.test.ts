import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat/cast';
import { hit } from '../../shared/sim/combat/damage';
import type { BoltShot } from '../../shared/types';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const shards = { ICE: 'shards' } as const;
const volley = (power: number) => {
  game.shots = [];
  game.p.iceCD = 0;
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

  it('chills 7% per uncharged shard and 17% per fully charged one', () => {
    hit(game, game.e, 'ICE', 3.5, false, false, 'shards', 1);
    expect(game.e.chill).toBeCloseTo(7, 0);
    game.e.chill = 0;
    hit(game, game.e, 'ICE', 21, true, false, 'shards', 3);
    expect(game.e.chill).toBeCloseTo(17, 0);
    game.e.chill = 0;
    hit(game, game.e, 'ICE', 14, true, false, 'shards', 2);
    expect(game.e.chill).toBeCloseTo(12, 0); // half charge sits between
  });

  it('does not freeze, even when all five shards of a full volley hit', () => {
    for (let i = 0; i < 5; i++) hit(game, game.e, 'ICE', 21, true, false, 'shards', 3);
    expect(game.e.chill).toBeCloseTo(85, 0);
    expect(game.e.freeze).toBe(0);
    for (let i = 0; i < 2; i++) hit(game, game.e, 'ICE', 21, true, false, 'shards', 3); // a second volley
    expect(game.e.freeze).toBeGreaterThan(0);
  });

  it('carries the charge on the shot, so the hit knows how strong it was', () => {
    for (const s of volley(3)) expect(s.power).toBe(3);
  });
});
