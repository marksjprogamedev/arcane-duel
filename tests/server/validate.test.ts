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
  it('accepts the simple lobby messages and a known map', () => {
    expect(validateClientMessage({ type: 'start_match', x: 1 })).toEqual({ type: 'start_match' });
    expect(validateClientMessage({ type: 'back_to_lobby' })).toEqual({ type: 'back_to_lobby' });
    expect(
      validateClientMessage({
        type: 'set_options',
        options: { mapId: 'temple', teamSize: 1, extra: 1 },
      }),
    ).toEqual({ type: 'set_options', options: { mapId: 'temple', teamSize: 1 } });
  });

  it('rejects options with an unknown or missing map', () => {
    for (const options of [
      { mapId: 'nowhere', teamSize: 1 },
      { mapId: 5, teamSize: 1 },
      { mapId: 'temple' },
      { mapId: 'temple', teamSize: 0 },
      { mapId: 'temple', teamSize: 5 },
      {},
      null,
      'temple',
    ])
      expect(validateClientMessage({ type: 'set_options', options })).toBeNull();
  });
});
