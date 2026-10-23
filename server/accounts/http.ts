// The accounts HTTP API: `/api/*` requests (shapes in shared/accountApi.ts). Sign up, log in and out,
// passwords, recovery codes, display name, deleting the account. The session is a random token in an
// HttpOnly cookie; the database keeps only its hash. Security notes: docs/ACCOUNTS-PLAN.md section 4.

import type http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import {
  displayNameProblem,
  normaliseDisplayName,
  normaliseUsername,
  passwordProblem,
  usernameProblem,
  type ApiError,
  type ApiField,
} from '../../shared/accountApi';
import type { Db } from '../db';
import { createWindowLimiter } from './rateLimit';
import {
  dummyPasswordHash,
  hashPassword,
  newRecoveryCode,
  newSessionToken,
  recoveryCodeHash,
  sha256,
  verifyPassword,
  weakPasswordProblem,
} from './secrets';
import {
  createSession,
  createUser,
  deleteExpiredSessions,
  deleteSession,
  deleteSessionsOf,
  deleteUser,
  SESSION_SECONDS,
  setDisplayName,
  setPasswordHash,
  setRecoveryHash,
  toAccount,
  userByUsername,
  userForSession,
  type UserRow,
} from './store';

/** `__Host-`: the browser only keeps it if Secure, Path=/ and host-only, so slots never share a login. */
export const SESSION_COOKIE = '__Host-session';
const MAX_BODY_BYTES = 4096;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.error);
  }
}
const fail = (status: number, error: string, field?: ApiField, retryAfterSeconds?: number) =>
  new ApiFailure(status, {
    error,
    ...(field && { field }),
    ...(retryAfterSeconds && { retryAfterSeconds }),
  });

export interface AccountRoutesOptions {
  /** Called after a user's sessions end (logout everywhere, password change, deletion), e.g. to close sockets. */
  onSessionsEnded?: (userId: number) => void;
}

/**
 * Returns the `/api` request handler. It answers every request whose path starts with `/api/`; the
 * caller sends other paths elsewhere.
 */
export function createAccountRoutes(db: Db, options: AccountRoutesOptions = {}) {
  const perIp = createWindowLimiter({ limit: 120, windowMs: MINUTE });
  const loginPerIp = createWindowLimiter({ limit: 10, windowMs: MINUTE });
  const signupPerIp = createWindowLimiter({ limit: 5, windowMs: HOUR });
  const recoverPerIp = createWindowLimiter({ limit: 5, windowMs: HOUR });
  // Wrong passwords (or recovery codes) per username: the 6th within 15 minutes locks it for the rest.
  const failuresPerUser = createWindowLimiter({ limit: 5, windowMs: 15 * MINUTE });

  const sweep = setInterval(() => deleteExpiredSessions(db), HOUR);
  sweep.unref();

  function limited(limiter: ReturnType<typeof createWindowLimiter>, key: string) {
    const { ok, retryAfterSeconds } = limiter.hit(key);
    if (!ok)
      throw fail(429, 'Too many tries. Please wait and try again.', undefined, retryAfterSeconds);
  }
  function lockedOut(username: string) {
    const { ok, retryAfterSeconds } = failuresPerUser.blocked(username);
    if (!ok)
      throw fail(
        429,
        'Too many wrong tries for this account. Please wait and try again.',
        undefined,
        retryAfterSeconds,
      );
  }

  /** Checks a password for an existing user; a wrong one counts towards the username's lock. */
  async function checkPassword(user: UserRow, password: string, field: ApiField) {
    lockedOut(user.username);
    if (await verifyPassword(password, user.password_hash)) return;
    failuresPerUser.hit(user.username);
    throw fail(401, 'Wrong password.', field);
  }

  function startSession(res: http.ServerResponse, user: UserRow) {
    const token = newSessionToken();
    createSession(db, user.id, sha256(token));
    setCookie(res, token, SESSION_SECONDS);
  }

  /** The logged-in user of this request, if any, and their session's token hash. */
  function sessionOf(req: http.IncomingMessage) {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const tokenHash = sha256(token);
    const user = userForSession(db, tokenHash);
    return user ? { user, token, tokenHash } : null;
  }
  function requireSession(req: http.IncomingMessage) {
    const session = sessionOf(req);
    if (!session) throw fail(401, 'Please log in again.');
    return session;
  }

  function newPassword(password: unknown, username: string, field: ApiField): string {
    const pw = text(password, 1000);
    const problem = passwordProblem(pw) ?? weakPasswordProblem(pw, username);
    if (problem) throw fail(400, problem, field);
    return pw;
  }

  type Handler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: Record<string, unknown>,
    ip: string,
  ) => Promise<unknown> | unknown;

  const post: Record<string, Handler> = {
    async '/api/signup'(_req, res, body, ip) {
      const username = normaliseUsername(text(body.username, 100));
      const usernameError = usernameProblem(username);
      if (usernameError) throw fail(400, usernameError, 'username');
      const displayName = normaliseDisplayName(text(body.displayName, 100));
      const nameError = displayNameProblem(displayName);
      if (nameError) throw fail(400, nameError, 'displayName');
      const password = newPassword(body.password, username, 'password');
      limited(signupPerIp, ip);
      if (userByUsername(db, username)) throw fail(409, 'That username is taken.', 'username');
      const recoveryCode = newRecoveryCode();
      const user = createUser(db, {
        username,
        displayName,
        passwordHash: await hashPassword(password),
        recoveryHash: recoveryCodeHash(recoveryCode),
      });
      if (!user) throw fail(409, 'That username is taken.', 'username');
      console.log(`account: signed up #${user.id}`);
      startSession(res, user);
      return { account: toAccount(user), recoveryCode };
    },

    async '/api/login'(_req, res, body, ip) {
      limited(loginPerIp, ip);
      const username = normaliseUsername(text(body.username, 100));
      const password = text(body.password, 1000);
      lockedOut(username);
      const user = userByUsername(db, username);
      // the same work whether or not the username exists, so timing doesn't tell
      const ok = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()));
      if (!user || !ok) {
        failuresPerUser.hit(username);
        throw fail(401, 'Wrong username or password.');
      }
      if (user.banned_at !== null) throw fail(403, 'This account is banned.');
      failuresPerUser.clear(username);
      startSession(res, user);
      return { account: toAccount(user) };
    },

    '/api/logout'(req, res, body) {
      const session = sessionOf(req);
      if (session) {
        if (body.everywhere === true) {
          deleteSessionsOf(db, session.user.id);
          deleteSession(db, session.tokenHash);
          options.onSessionsEnded?.(session.user.id);
        } else deleteSession(db, session.tokenHash);
      }
      setCookie(res, '', 0);
      return { ok: true };
    },

    async '/api/password'(req, _res, body) {
      const { user, tokenHash } = requireSession(req);
      await checkPassword(user, text(body.current, 1000), 'current');
      const next = newPassword(body.next, user.username, 'next');
      setPasswordHash(db, user.id, await hashPassword(next));
      deleteSessionsOf(db, user.id, tokenHash);
      options.onSessionsEnded?.(user.id);
      return { ok: true };
    },

    async '/api/recover'(_req, res, body, ip) {
      limited(recoverPerIp, ip);
      const username = normaliseUsername(text(body.username, 100));
      lockedOut(username);
      const user = userByUsername(db, username);
      const given = Buffer.from(recoveryCodeHash(text(body.recoveryCode, 100)));
      const stored = Buffer.from(user?.recovery_hash ?? '');
      if (!user || given.length !== stored.length || !timingSafeEqual(given, stored)) {
        failuresPerUser.hit(username);
        throw fail(401, 'Wrong username or recovery code.', 'recoveryCode');
      }
      if (user.banned_at !== null) throw fail(403, 'This account is banned.');
      const next = newPassword(body.next, username, 'next');
      const recoveryCode = newRecoveryCode();
      setPasswordHash(db, user.id, await hashPassword(next));
      setRecoveryHash(db, user.id, recoveryCodeHash(recoveryCode));
      deleteSessionsOf(db, user.id);
      options.onSessionsEnded?.(user.id);
      failuresPerUser.clear(username);
      startSession(res, user);
      return { account: toAccount(user), recoveryCode };
    },

    async '/api/recovery-code'(req, _res, body) {
      const { user } = requireSession(req);
      await checkPassword(user, text(body.password, 1000), 'password');
      const recoveryCode = newRecoveryCode();
      setRecoveryHash(db, user.id, recoveryCodeHash(recoveryCode));
      return { recoveryCode };
    },

    '/api/display-name'(req, _res, body) {
      const { user } = requireSession(req);
      const displayName = normaliseDisplayName(text(body.displayName, 100));
      const problem = displayNameProblem(displayName);
      if (problem) throw fail(400, problem, 'displayName');
      setDisplayName(db, user.id, displayName);
      return { account: { ...toAccount(user), displayName } };
    },

    async '/api/delete-account'(req, res, body) {
      const { user } = requireSession(req);
      await checkPassword(user, text(body.password, 1000), 'password');
      deleteUser(db, user.id);
      options.onSessionsEnded?.(user.id);
      console.log(`account: deleted #${user.id}`);
      setCookie(res, '', 0);
      return { ok: true };
    },
  };

  return async function handleApi(req: http.IncomingMessage, res: http.ServerResponse) {
    const path = (req.url ?? '').split('?')[0];
    const ip = clientIp(req);
    try {
      limited(perIp, ip);
      if (path === '/api/me' && req.method === 'GET') {
        const session = sessionOf(req);
        // keep the cookie as long as the session, which each use pushes forward
        if (session) setCookie(res, session.token, SESSION_SECONDS);
        return reply(res, 200, { account: session ? toAccount(session.user) : null });
      }
      const handler = Object.hasOwn(post, path) ? post[path] : undefined;
      if (!handler) throw fail(404, 'Not found.');
      if (req.method !== 'POST') throw fail(405, 'Use POST.');
      if (!sameOrigin(req)) throw fail(403, 'Wrong origin.');
      if (!/^application\/json\b/.test(req.headers['content-type'] ?? ''))
        throw fail(415, 'Send JSON.');
      const body = await readJson(req);
      reply(res, 200, await handler(req, res, body, ip));
    } catch (err) {
      if (err instanceof ApiFailure) {
        if (err.body.retryAfterSeconds) res.setHeader('Retry-After', err.body.retryAfterSeconds);
        reply(res, err.status, err.body);
      } else {
        console.error('account api:', err);
        reply(res, 500, { error: 'Something went wrong. Please try again.' });
      }
    }
  };
}

// ---- helpers ----

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

function reply(res: http.ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function setCookie(res: http.ServerResponse, value: string, maxAgeSeconds: number) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
  );
}

export function readCookie(req: http.IncomingMessage, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}

/**
 * Whether the request comes from a page of this same site. Browsers send `Origin` on every POST from
 * a page; a form or script on another site can't fake it. (Also used for the WebSocket from 0.39.)
 */
export function sameOrigin(req: http.IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin || !req.headers.host) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/** The client's address: Caddy's X-Forwarded-For when the request came through it (from this machine). */
export function clientIp(req: http.IncomingMessage): string {
  const direct = req.socket.remoteAddress ?? '';
  const viaProxy = direct === '127.0.0.1' || direct === '::1' || direct === '::ffff:127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (viaProxy && typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return direct;
}

function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // stop reading (but keep the connection, so the 413 can still be sent)
        req.removeAllListeners('data');
        req.resume();
        reject(fail(413, 'Too big.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        reject(fail(400, 'Bad JSON.'));
      }
    });
    req.on('error', reject);
  });
}
