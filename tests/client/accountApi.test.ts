import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AccountApiError,
  NETWORK_ERROR,
  callApi,
  errorText,
  formatWait,
} from '../../client/src/account/api';

/** Replaces fetch with one that answers `status` and `body` (a string is sent as is), and records calls. */
function fakeFetch(status: number, body: unknown) {
  const fn = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function failure(p: Promise<unknown>): Promise<AccountApiError> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(AccountApiError);
    return err as AccountApiError;
  }
  throw new Error('expected the call to fail');
}

const merlin = { id: 1, username: 'merlin', displayName: 'Merlin' };

describe('account api calls', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs JSON with the content type and same-origin cookies', async () => {
    const fetch = fakeFetch(200, { account: merlin });
    const res = await callApi('/api/login', { username: 'merlin', password: 'correct horse' });
    expect(res.account).toEqual(merlin);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/login');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual({
      username: 'merlin',
      password: 'correct horse',
    });
  });

  it('asks who we are with a GET and no body', async () => {
    const fetch = fakeFetch(200, { account: null });
    expect(await callApi('/api/me')).toEqual({ account: null });
    const [, init] = fetch.mock.calls[0];
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(init?.credentials).toBe('same-origin');
  });

  it("turns the server's ApiError into an AccountApiError with status and field", async () => {
    fakeFetch(409, { error: 'That username is taken.', field: 'username' });
    const err = await failure(
      callApi('/api/signup', { username: 'merlin', password: 'x'.repeat(8), displayName: 'Mer' }),
    );
    expect(err.status).toBe(409);
    expect(err.field).toBe('username');
    expect(err.message).toBe('That username is taken.');
    expect(errorText(err)).toBe('That username is taken.');
  });

  it('adds the wait to a too-many-tries error', async () => {
    fakeFetch(429, { error: 'Too many tries.', retryAfterSeconds: 840 });
    const err = await failure(callApi('/api/login', { username: 'a', password: 'b' }));
    expect(err.retryAfterSeconds).toBe(840);
    expect(errorText(err)).toBe('Too many tries. Try again in 14 minutes.');
  });

  it('a network failure becomes a friendly status-0 error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const err = await failure(callApi('/api/logout', {}));
    expect(err.status).toBe(0);
    expect(errorText(err)).toBe(NETWORK_ERROR);
  });

  it('an error page that is not JSON still gives a readable message', async () => {
    fakeFetch(502, '<html>Bad gateway</html>');
    const err = await failure(callApi('/api/me'));
    expect(err.status).toBe(502);
    expect(err.message).toMatch(/server had a problem/);
    fakeFetch(404, 'Not found');
    expect((await failure(callApi('/api/me'))).message).toMatch(/not available/);
  });

  it('a success that is not JSON is an error, not a crash later', async () => {
    fakeFetch(200, '<!doctype html>');
    expect((await failure(callApi('/api/me'))).status).toBe(200);
  });

  it('formats waits', () => {
    expect(formatWait(1)).toBe('1 second');
    expect(formatWait(15)).toBe('15 seconds');
    expect(formatWait(60)).toBe('1 minute');
    expect(formatWait(61)).toBe('2 minutes');
    expect(errorText(new Error('boom'))).toMatch(/went wrong/);
  });
});
