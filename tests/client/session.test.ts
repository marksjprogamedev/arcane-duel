import { describe, expect, it } from 'vitest';
import {
  clearSession,
  clientId,
  loadSession,
  parseSession,
  saveSession,
} from '../../client/src/net/session';

/** A stand-in for sessionStorage. */
function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('session storage', () => {
  it('saves the room and token and reads them back', () => {
    const store = fakeStore();
    expect(loadSession(store)).toBeNull();
    saveSession({ code: 'ABCDEF', token: 'abc123' }, store);
    expect(loadSession(store)).toEqual({ code: 'ABCDEF', token: 'abc123' });
  });

  it('clears it', () => {
    const store = fakeStore();
    saveSession({ code: 'ABCDEF', token: 'abc123' }, store);
    clearSession(store);
    expect(loadSession(store)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it('a newer save replaces the older one', () => {
    const store = fakeStore();
    saveSession({ code: 'AAAAAA', token: 'one' }, store);
    saveSession({ code: 'BBBBBB', token: 'two' }, store);
    expect(loadSession(store)).toEqual({ code: 'BBBBBB', token: 'two' });
  });

  it('ignores damaged or wrongly shaped entries', () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession('not json')).toBeNull();
    expect(parseSession('null')).toBeNull();
    expect(parseSession('{"code":"ABCDEF"}')).toBeNull();
    expect(parseSession('{"code":1,"token":"x"}')).toBeNull();
    expect(parseSession('{"code":"","token":"x"}')).toBeNull();
  });

  it('copes with storage that is missing or throws', () => {
    expect(loadSession(null)).toBeNull();
    expect(() => saveSession({ code: 'A', token: 'b' }, null)).not.toThrow();
    expect(() => clearSession(null)).not.toThrow();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSession(broken)).toBeNull();
    expect(() => saveSession({ code: 'A', token: 'b' }, broken)).not.toThrow();
    expect(() => clearSession(broken)).not.toThrow();
  });
});

describe('client id', () => {
  it('is made once, kept in the tab store, and short enough for the server to accept', () => {
    const store = fakeStore();
    const id = clientId(store);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(clientId(store)).toBe(id);
  });

  it('works where crypto.randomUUID is missing (the game is served over plain http)', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(clientId(fakeStore())).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });

  it('still gives an id when storage is blocked', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(clientId(broken)).toMatch(/^[0-9a-f]{32}$/);
  });
});
