import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '../../shared/accountApi';

const merlin: Account = { id: 1, username: 'merlin', displayName: 'Merlin' };

// state.ts keeps the account in module state: a fresh copy per test
async function freshState() {
  vi.resetModules();
  return import('../../client/src/account/state');
}

describe('account state', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('on a plain-http page: no request, a guest, and accounts are off', async () => {
    vi.stubGlobal('isSecureContext', false);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const state = await freshState();
    const seen: (Account | null)[] = [];
    state.onAccount((a) => seen.push(a));
    expect(state.accountsAvailable()).toBe(false);
    expect(await state.loadAccount()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.currentAccount()).toBeNull();
    expect(state.accountLoaded()).toBe(true);
    expect(seen).toEqual([null]);
  });

  it('on a secure page: asks /api/me and tells the listeners', async () => {
    vi.stubGlobal('isSecureContext', true);
    const fetch = vi.fn(async () => new Response(JSON.stringify({ account: merlin })));
    vi.stubGlobal('fetch', fetch);
    const state = await freshState();
    const seen: (Account | null)[] = [];
    state.onAccount((a) => seen.push(a));
    expect(await state.loadAccount()).toEqual(merlin);
    expect(fetch).toHaveBeenCalledOnce();
    expect(state.currentAccount()).toEqual(merlin);
    expect(seen).toEqual([merlin]);
  });

  it('any failure leaves us a guest, silently', async () => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    let state = await freshState();
    expect(await state.loadAccount()).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    state = await freshState();
    expect(await state.loadAccount()).toBeNull();
    expect(state.currentAccount()).toBeNull();
  });

  it('setAccount updates listeners until they stop', async () => {
    const state = await freshState();
    const seen: (Account | null)[] = [];
    const stop = state.onAccount((a) => seen.push(a));
    state.setAccount(merlin);
    stop();
    state.setAccount(null);
    expect(seen).toEqual([merlin]);
    expect(state.currentAccount()).toBeNull();
  });
});
