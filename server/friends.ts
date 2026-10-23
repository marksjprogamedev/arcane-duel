// Friends: requests by username, accept / decline, remove, block (tables from migration 1). Each change
// sends the new `friends` list to every connection of both accounts, and a friend coming online or
// going offline updates their friends' lists. Logged-in players only; no chat (docs/ACCOUNTS-PLAN.md).

import { normaliseUsername } from '../shared/accountApi';
import {
  MAX_FRIENDS,
  MAX_OUTGOING_REQUESTS,
  type ClientMessage,
  type FriendsList,
  type Person,
  type ServerMessage,
} from '../shared/protocol';
import { createWindowLimiter } from './accounts/rateLimit';
import { nowSeconds, userByUsername } from './accounts/store';
import type { Db } from './db';

export type FriendMessage = Extract<
  ClientMessage,
  { type: 'friend_request' | 'friend_answer' | 'friend_remove' | 'block' | 'unblock' }
>;

const FRIEND_TYPES = new Set([
  'friend_request',
  'friend_answer',
  'friend_remove',
  'block',
  'unblock',
]);
export const isFriendMessage = (m: ClientMessage): m is FriendMessage => FRIEND_TYPES.has(m.type);

interface PersonRow {
  id: number;
  username: string;
  display_name: string;
}
const person = (r: PersonRow): Person => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
});
const pair = (a: number, b: number) => (a < b ? [a, b] : [b, a]);

export function createFriends(
  db: Db,
  io: {
    /** Sends to every connection of an account. */
    sendToUser: (userId: number, msg: ServerMessage) => void;
    /** Whether an account has the game open. */
    isOnline: (userId: number) => boolean;
  },
) {
  const requestsPerUser = createWindowLimiter({ limit: 20, windowMs: 3_600_000 });
  const people = (sql: string, ...args: number[]) =>
    (db.prepare(sql).all(...args) as unknown as PersonRow[]).map(person);

  function friendIds(userId: number): number[] {
    return (
      db
        .prepare(
          'SELECT CASE WHEN a_id = ? THEN b_id ELSE a_id END AS id FROM friends WHERE a_id = ? OR b_id = ?',
        )
        .all(userId, userId, userId) as { id: number }[]
    ).map((r) => r.id);
  }

  function listFor(userId: number): FriendsList {
    const friends = people(
      `SELECT u.id, u.username, u.display_name FROM friends f
       JOIN users u ON u.id = CASE WHEN f.a_id = ? THEN f.b_id ELSE f.a_id END
       WHERE f.a_id = ? OR f.b_id = ?`,
      userId,
      userId,
      userId,
    ).map((p) => ({
      ...p,
      presence: io.isOnline(p.id) ? ('online' as const) : ('offline' as const),
    }));
    return {
      friends,
      incoming: people(
        `SELECT u.id, u.username, u.display_name FROM friend_requests r
         JOIN users u ON u.id = r.from_id WHERE r.to_id = ? ORDER BY r.created_at`,
        userId,
      ),
      outgoing: people(
        `SELECT u.id, u.username, u.display_name FROM friend_requests r
         JOIN users u ON u.id = r.to_id WHERE r.from_id = ? ORDER BY r.created_at`,
        userId,
      ),
      blocked: people(
        `SELECT u.id, u.username, u.display_name FROM blocks b
         JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ? ORDER BY b.created_at`,
        userId,
      ),
    };
  }

  const sendList = (userId: number) =>
    io.sendToUser(userId, { type: 'friends', list: listFor(userId) });

  const count = (sql: string, ...args: number[]) =>
    (db.prepare(sql).get(...args) as { n: number }).n;
  const areFriends = (a: number, b: number) =>
    count('SELECT count(*) AS n FROM friends WHERE a_id = ? AND b_id = ?', ...pair(a, b)) > 0;
  const blockedEitherWay = (a: number, b: number) =>
    count(
      'SELECT count(*) AS n FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      a,
      b,
      b,
      a,
    ) > 0;
  const requested = (from: number, to: number) =>
    count('SELECT count(*) AS n FROM friend_requests WHERE from_id = ? AND to_id = ?', from, to) >
    0;
  const friendCount = (id: number) =>
    count('SELECT count(*) AS n FROM friends WHERE a_id = ? OR b_id = ?', id, id);
  const deleteRequests = (a: number, b: number) =>
    db
      .prepare(
        'DELETE FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
      )
      .run(a, b, b, a);

  function befriend(a: number, b: number) {
    db.exec('BEGIN');
    try {
      deleteRequests(a, b);
      db.prepare('INSERT OR IGNORE INTO friends VALUES (?, ?, ?)').run(...pair(a, b), nowSeconds());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /** Handles one friends message from logged-in `userId`; returns an error message, or null. */
  function handle(userId: number, m: FriendMessage): string | null {
    switch (m.type) {
      case 'friend_request': {
        const target = userByUsername(db, normaliseUsername(m.username));
        if (!target || target.banned_at !== null) return 'No player has that username.';
        const to = target.id;
        if (to === userId) return "That's you.";
        if (areFriends(userId, to)) return `You are already friends with ${target.display_name}.`;
        // said the same way as a sent request, so a block is never revealed
        if (blockedEitherWay(userId, to) || requested(userId, to)) return null;
        if (friendCount(userId) >= MAX_FRIENDS)
          return `You can have at most ${MAX_FRIENDS} friends.`;
        if (requested(to, userId)) {
          // they asked us already: that's a yes from both
          if (friendCount(to) >= MAX_FRIENDS) return 'They have too many friends already.';
          befriend(userId, to);
          sendList(to);
          return null;
        }
        if (
          count('SELECT count(*) AS n FROM friend_requests WHERE from_id = ?', userId) >=
          MAX_OUTGOING_REQUESTS
        )
          return `You have ${MAX_OUTGOING_REQUESTS} requests waiting already. Cancel some first.`;
        if (!requestsPerUser.hit(String(userId)).ok)
          return 'Too many friend requests. Please wait a while.';
        db.prepare('INSERT INTO friend_requests VALUES (?, ?, ?)').run(userId, to, nowSeconds());
        sendList(to);
        return null;
      }
      case 'friend_answer': {
        if (!requested(m.id, userId)) return null; // withdrawn meanwhile
        if (m.accept) {
          if (friendCount(userId) >= MAX_FRIENDS)
            return `You can have at most ${MAX_FRIENDS} friends.`;
          if (friendCount(m.id) >= MAX_FRIENDS) return 'They have too many friends already.';
          befriend(userId, m.id);
        } else deleteRequests(userId, m.id);
        sendList(m.id);
        return null;
      }
      case 'friend_remove':
        db.prepare('DELETE FROM friends WHERE a_id = ? AND b_id = ?').run(...pair(userId, m.id));
        db.prepare('DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?').run(userId, m.id);
        sendList(m.id);
        return null;
      case 'block':
        if (m.id === userId) return null;
        db.exec('BEGIN');
        try {
          db.prepare('DELETE FROM friends WHERE a_id = ? AND b_id = ?').run(...pair(userId, m.id));
          deleteRequests(userId, m.id);
          db.prepare('INSERT OR IGNORE INTO blocks VALUES (?, ?, ?)').run(
            userId,
            m.id,
            nowSeconds(),
          );
          db.exec('COMMIT');
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }
        sendList(m.id);
        return null;
      case 'unblock':
        db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(userId, m.id);
        return null;
    }
  }

  return {
    listFor,
    sendList,
    /**
     * Runs a friends message and sends the sender's connections their new list. Returns an error message
     * for the connection that asked, or null.
     */
    receive(userId: number, m: FriendMessage): string | null {
      const error = handle(userId, m);
      sendList(userId);
      return error;
    },
    /** An account came online or went offline: its friends' lists change. */
    presenceChanged(userId: number) {
      for (const id of friendIds(userId)) if (io.isOnline(id)) sendList(id);
    },
  };
}

export type Friends = ReturnType<typeof createFriends>;
