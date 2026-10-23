import { describe, expect, it } from 'vitest';
import { createRateLimiter, validateClientMessage } from '../../server/validate';
import { MAX_MAP_COORD } from '../../shared/protocol';

describe('validateClientMessage', () => {
  it('accepts well-formed messages and clamps coordinates to the largest allowed map', () => {
    expect(validateClientMessage({ type: 'join', code: 'ABCDEF' })).toEqual({
      type: 'join',
      code: 'ABCDEF',
    });
    expect(
      validateClientMessage({ type: 'move', roundId: 1, seq: 5, keys: 255, x: -50, y: 9999 }),
    ).toEqual({ type: 'move', roundId: 1, seq: 5, keys: 15, x: 0, y: MAX_MAP_COORD });
    expect(
      validateClientMessage({ type: 'input', action: 'down', roundId: 2, x: 10, y: 20, castId: 3 }),
    ).toMatchObject({ action: 'down', castId: 3, inputId: undefined, key: '', down: false });
  });

  it('rejects anything malformed', () => {
    for (const bad of [
      null,
      'create',
      { type: 'nope' },
      { type: 'join', code: 42 },
      { type: 'join', code: 'X'.repeat(100) },
      { type: 'resume', code: 'ABCDEF' },
      { type: 'input', action: 'teleport', roundId: 1 },
      { type: 'input', action: 'key', roundId: '1' },
      { type: 'move', roundId: 1, seq: 1.5, keys: 0 },
      { type: 'ping', stamp: 'now' },
      { type: 'hello' },
    ])
      expect(validateClientMessage(bad)).toBeNull();
  });

  it('drops unknown fields', () => {
    expect(validateClientMessage({ type: 'create', admin: true })).toEqual({ type: 'create' });
  });
});

describe('createRateLimiter', () => {
  it('allows a burst, then refills over time', () => {
    const limit = createRateLimiter({ perSecond: 10, burst: 5 });
    const t = 1_000_000;
    const verdicts = Array.from({ length: 7 }, () => limit(t));
    expect(verdicts).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'drop', 'drop']);
    expect(limit(t + 1000)).toBe('ok');
  });

  it('disconnects a client that keeps flooding far past the budget', () => {
    const limit = createRateLimiter({ perSecond: 10, burst: 5 });
    const verdicts = Array.from({ length: 12 }, () => limit(0));
    expect(verdicts.at(-1)).toBe('disconnect');
  });

  it('a normal client (60 moves + a few actions per second) is never limited', () => {
    const limit = createRateLimiter();
    for (let ms = 0; ms < 10_000; ms += 1000 / 70) expect(limit(ms)).toBe('ok');
  });
});

describe('lobby messages', () => {
  const good = {
    mapId: 'temple',
    teamSize: 1,
    friendlyFire: false,
    deathRule: 'elimination',
    wizardHp: 200,
  };

  it('accepts the simple lobby messages and a known map', () => {
    expect(validateClientMessage({ type: 'start_match', x: 1 })).toEqual({ type: 'start_match' });
    expect(validateClientMessage({ type: 'back_to_lobby' })).toEqual({ type: 'back_to_lobby' });
    expect(validateClientMessage({ type: 'set_options', options: { ...good, extra: 1 } })).toEqual({
      type: 'set_options',
      options: good,
    });
  });

  it('accepts 2v2 options with friendly fire and respawning', () => {
    const options = { ...good, teamSize: 2, friendlyFire: true, deathRule: 'respawn' };
    expect(validateClientMessage({ type: 'set_options', options })).toEqual({
      type: 'set_options',
      options,
    });
  });

  it('accepts the very high health choice, defaults a missing one, and rejects any other', () => {
    expect(
      validateClientMessage({ type: 'set_options', options: { ...good, wizardHp: 1000 } }),
    ).toEqual({ type: 'set_options', options: { ...good, wizardHp: 1000 } });
    const { wizardHp: _, ...old } = good;
    expect(validateClientMessage({ type: 'set_options', options: old })).toEqual({
      type: 'set_options',
      options: good,
    });
    for (const wizardHp of [0, 500, 99999, '1000', null])
      expect(
        validateClientMessage({ type: 'set_options', options: { ...good, wizardHp } }),
      ).toBeNull();
  });

  it('rejects options with an unknown map, a bad team size or a missing rule', () => {
    for (const options of [
      { ...good, mapId: 'nowhere' },
      { ...good, mapId: 5 },
      { ...good, teamSize: 0 },
      { ...good, teamSize: 5 },
      { ...good, teamSize: 1.5 },
      { ...good, friendlyFire: 'yes' },
      { ...good, deathRule: 'never' },
      { mapId: 'temple', teamSize: 1 },
      { mapId: 'temple' },
      {},
      null,
      'temple',
    ])
      expect(validateClientMessage({ type: 'set_options', options })).toBeNull();
  });

  it('accepts a team choice of 0, 1 or spec only', () => {
    for (const team of [0, 1, 'spec'])
      expect(validateClientMessage({ type: 'set_team', team })).toEqual({ type: 'set_team', team });
    for (const m of [
      { type: 'set_team', team: 2 },
      { type: 'set_team', team: -1 },
      { type: 'set_team', team: 'spectate' },
      { type: 'set_team', team: '0' },
      { type: 'set_team' },
    ])
      expect(validateClientMessage(m)).toBeNull();
  });
});

describe('set_loadout', () => {
  it('keeps real variants of the right spell and drops everything else', () => {
    const loadout = {
      FIRE: 'pyro_disc',
      WATER: 'pyro_disc', // another spell's variant
      EARTH: 'default',
      ICE: 'tidal_surge', // a variant that no longer exists
      NOPE: 'fireball', // not a spell
      MAGMA: 7,
    };
    expect(validateClientMessage({ type: 'set_loadout', loadout })).toEqual({
      type: 'set_loadout',
      loadout: { FIRE: 'pyro_disc' },
    });
  });

  it('turns a missing or malformed loadout into the originals', () => {
    for (const loadout of [undefined, null, 'x', 5, []])
      expect(validateClientMessage({ type: 'set_loadout', loadout })).toEqual({
        type: 'set_loadout',
        loadout: {},
      });
  });
});
