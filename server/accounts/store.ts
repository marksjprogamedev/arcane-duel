// Reading and writing accounts and sessions in the database (server/db). Plain functions over the
// tables of migration 1; the HTTP routes (./http.ts) and the admin command (server/admin.ts) use them.
// Times are unix seconds.

import type { Account } from '../../shared/accountApi';
import type { Db } from '../db';

export interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  recovery_hash: string | null;
  created_at: number;
  banned_at: number | null;
  ban_reason: string | null;
}

export const nowSeconds = () => Math.floor(Date.now() / 1000);

export const toAccount = (u: UserRow): Account => ({
  id: u.id,
  username: u.username,
  displayName: u.display_name,
});

/** Adds a user; null if the username is taken. */
export function createUser(
  db: Db,
  u: { username: string; displayName: string; passwordHash: string; recoveryHash: string },
): UserRow | null {
  try {
    const row = db
      .prepare(
        `INSERT INTO users (username, display_name, password_hash, recovery_hash, created_at)
         VALUES (?, ?, ?, ?, ?) RETURNING *`,
      )
      .get(u.username, u.displayName, u.passwordHash, u.recoveryHash, nowSeconds());
    return row as unknown as UserRow;
  } catch (err) {
    if (/UNIQUE constraint failed: users\.username/.test((err as Error).message)) return null;
    throw err;
  }
}

export const userById = (db: Db, id: number) =>
  db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

export const userByUsername = (db: Db, username: string) =>
  db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;

export function setPasswordHash(db: Db, id: number, hash: string) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
}

export function setRecoveryHash(db: Db, id: number, hash: string) {
  db.prepare('UPDATE users SET recovery_hash = ? WHERE id = ?').run(hash, id);
}

export function setDisplayName(db: Db, id: number, displayName: string) {
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, id);
}

/** Bans (reason set) or unbans (null). A ban also ends every session. */
export function setBan(db: Db, id: number, reason: string | null) {
  db.prepare('UPDATE users SET banned_at = ?, ban_reason = ? WHERE id = ?').run(
    reason === null ? null : nowSeconds(),
    reason,
    id,
  );
  if (reason !== null) deleteSessionsOf(db, id);
}

/** Deletes the user and, by cascade, everything about them (sessions, profile, friends, blocks). */
export function deleteUser(db: Db, id: number) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function listUsers(db: Db, limit = 100): UserRow[] {
  return db
    .prepare('SELECT * FROM users ORDER BY id DESC LIMIT ?')
    .all(limit) as unknown as UserRow[];
}

export const countUsers = (db: Db) =>
  (db.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n;

// ---- sessions ----

/** How long a login lasts without use, and how often its expiry is pushed forward. */
export const SESSION_SECONDS = 30 * 24 * 3600;
const SLIDE_AFTER_SECONDS = 24 * 3600;

export function createSession(db: Db, userId: number, tokenHash: string) {
  const now = nowSeconds();
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(
    tokenHash,
    userId,
    now,
    now + SESSION_SECONDS,
  );
}

/**
 * The user a session belongs to, if it exists, has not expired and the user is not banned. Pushes the
 * expiry forward (at most once a day) so a login used at least monthly lasts.
 */
export function userForSession(db: Db, tokenHash: string): UserRow | undefined {
  const now = nowSeconds();
  const row = db
    .prepare(
      `SELECT users.*, sessions.expires_at AS session_expires FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.banned_at IS NULL`,
    )
    .get(tokenHash, now) as (UserRow & { session_expires: number }) | undefined;
  if (!row) return undefined;
  if (row.session_expires - now < SESSION_SECONDS - SLIDE_AFTER_SECONDS)
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(
      now + SESSION_SECONDS,
      tokenHash,
    );
  const { session_expires: _, ...user } = row;
  return user;
}

export function deleteSession(db: Db, tokenHash: string) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

/** Ends every session of a user, except `keepTokenHash` (the one making the request) if given. */
export function deleteSessionsOf(db: Db, userId: number, keepTokenHash?: string) {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(
    userId,
    keepTokenHash ?? '',
  );
}

export function deleteExpiredSessions(db: Db) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowSeconds());
}
