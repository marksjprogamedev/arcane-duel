// The accounts HTTP API (`/api/*`) from the browser: one typed call per endpoint in shared/accountApi.ts.
// The session cookie is HttpOnly and travels by itself (same-origin credentials), so nothing here sees it.
// Every failure becomes an AccountApiError with a message fit to show the player.

import type { AccountApi, ApiError, ApiField } from '../../../shared/accountApi';

/** A failed call. `status` is the HTTP status, 0 when the server could not be reached. */
export class AccountApiError extends Error {
  readonly status: number;
  /** The form field the problem is about, when the server says. */
  readonly field?: ApiField;
  readonly retryAfterSeconds?: number;
  constructor(status: number, body: Partial<ApiError> = {}) {
    super(body.error || fallbackMessage(status));
    this.name = 'AccountApiError';
    this.status = status;
    this.field = body.field;
    this.retryAfterSeconds = body.retryAfterSeconds;
  }
}

export const NETWORK_ERROR = "Can't reach the server. Check your connection and try again.";

/** What to say when the server sent no readable error (a proxy page, an old server without /api). */
function fallbackMessage(status: number): string {
  if (status === 0) return NETWORK_ERROR;
  if (status === 429) return 'Too many tries. Please wait a little and try again.';
  if (status === 404) return 'Accounts are not available on this server.';
  if (status >= 500) return 'The server had a problem. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

/** "15 seconds", "2 minutes" */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    const s = Math.max(1, Math.ceil(seconds));
    return `${s} second${s === 1 ? '' : 's'}`;
  }
  const m = Math.ceil(seconds / 60);
  return `${m} minute${m === 1 ? '' : 's'}`;
}

/** The text to show for an error from `callApi` (adds the wait after "too many tries"). */
export function errorText(err: unknown): string {
  if (!(err instanceof AccountApiError)) return fallbackMessage(-1);
  return err.retryAfterSeconds
    ? `${err.message} Try again in ${formatWait(err.retryAfterSeconds)}.`
    : err.message;
}

type Path = keyof AccountApi;
type RequestOf<P extends Path> = AccountApi[P]['request'];
type ResponseOf<P extends Path> = AccountApi[P]['response'];

/**
 * Calls one endpoint: `GET /api/me`, every other path a JSON POST. Resolves with the success body;
 * rejects with an AccountApiError (never anything else).
 */
export async function callApi<P extends Path>(
  path: P,
  ...body: RequestOf<P> extends void ? [] : [RequestOf<P>]
): Promise<ResponseOf<P>> {
  const init: RequestInit =
    path === '/api/me'
      ? { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } }
      : {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body[0] ?? {}),
        };
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new AccountApiError(0);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // not JSON: an error page from a proxy, or an empty body
  }
  if (!res.ok) throw new AccountApiError(res.status, isApiError(json) ? json : {});
  if (json === null || typeof json !== 'object') throw new AccountApiError(res.status || 500);
  return json as ResponseOf<P>;
}

function isApiError(x: unknown): x is ApiError {
  return !!x && typeof x === 'object' && typeof (x as ApiError).error === 'string';
}
