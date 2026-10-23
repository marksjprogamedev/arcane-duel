// Logged-in connections, by account. When a session ends (logout, password change, deletion) its
// connections leave their rooms and are told; a display-name change shows in their lobbies at once.
// Also where each account is (presence), so friends' lists can show it.

import { leaveRoom, sendLobby } from './lobby';
import { INVITE_TTL_MS, type Presence, type ServerMessage } from '../../shared/protocol';
import { config, rooms, send, type Client } from './state';

const byUser = new Map<number, Set<Client>>();

/** Remembers a logged-in connection (call once it is bound to an account). */
export function trackAccountSocket(ws: Client) {
  if (!ws.account) return;
  let set = byUser.get(ws.account.id);
  const cameOnline = !set;
  if (!set) byUser.set(ws.account.id, (set = new Set()));
  set.add(ws);
  if (cameOnline) refreshPresence([ws.account.id]);
}

/** Forgets a connection that closed. */
export function untrackAccountSocket(ws: Client) {
  if (!ws.account) return;
  const set = byUser.get(ws.account.id);
  if (!set?.delete(ws)) return;
  if (set.size === 0) {
    byUser.delete(ws.account.id);
    refreshPresence([ws.account.id]);
  }
}

/** Whether an account has the game open anywhere. */
export const isAccountOnline = (userId: number) => byUser.has(userId);

/** Where an account is: in a match beats in a lobby beats just online (any of its connections). */
export function presenceOf(userId: number): Presence {
  const set = byUser.get(userId);
  if (!set) return 'offline';
  let best: Presence = 'online';
  for (const ws of set) {
    const room = ws.room ? rooms.get(ws.room) : undefined;
    if (room?.phase === 'match') return 'match';
    if (room) best = 'lobby';
  }
  return best;
}

const lastPresence = new Map<number, Presence>();

/** Tells friends about every account in `userIds` whose presence changed since last time. */
export function refreshPresence(userIds: Iterable<number>) {
  for (const id of new Set(userIds)) {
    const now = presenceOf(id);
    if ((lastPresence.get(id) ?? 'offline') === now) continue;
    if (now === 'offline') lastPresence.delete(id);
    else lastPresence.set(id, now);
    config.friends?.presenceChanged(id);
  }
}

/** The accounts in `ws`'s room (players and watchers), and `ws`'s own. */
function accountsAround(ws: Client): number[] {
  const ids = ws.account ? [ws.account.id] : [];
  const room = ws.room ? rooms.get(ws.room) : undefined;
  if (room)
    for (const member of [...room.players, ...room.spectators])
      if (member?.account) ids.push(member.account.id);
  return ids;
}

/**
 * Runs `change` (a message from `ws`, or its disconnect), then updates the presence of every account
 * that was or now is in a room with it: joining, leaving, starting a match or going back to the lobby
 * moves everyone in the room.
 */
export function withPresence(ws: Client, change: () => void) {
  const before = accountsAround(ws);
  change();
  refreshPresence([...before, ...accountsAround(ws)]);
}

/** How many accounts have a connection open (for /stats). */
export const onlineAccounts = () => byUser.size;

/**
 * Sessions of `userId` ended: all of them, only the one with `only`, or all but `except` (the session
 * that changed the password stays logged in). Their connections leave their rooms (as if they had
 * pressed Leave), become guests and are told why.
 */
export function endAccountSessions(
  userId: number,
  reason: 'logout' | 'password' | 'deleted',
  sessions: { only?: string; except?: string } = {},
) {
  for (const ws of [...(byUser.get(userId) ?? [])]) {
    if (sessions.only !== undefined && ws.sessionHash !== sessions.only) continue;
    if (sessions.except !== undefined && ws.sessionHash === sessions.except) continue;
    withPresence(ws, () => {
      leaveRoom(ws);
      untrackAccountSocket(ws);
    });
    ws.account = undefined;
    ws.sessionHash = undefined;
    send(ws, { type: 'signed_out', reason });
  }
}

/** Sends `msg` to every connection of `userId` except `except`. */
export function sendToAccount(userId: number, msg: ServerMessage, except?: Client) {
  for (const ws of byUser.get(userId) ?? []) if (ws !== except) send(ws, msg);
}

/**
 * `ws` invites friend `friendId` to the lobby it is in. Returns why not, or null once the invite is on
 * its way (to every connection of the friend).
 */
export function inviteFriend(ws: Client, friendId: number): string | null {
  const friends = config.friends;
  if (!ws.account || !friends) return null;
  const room = ws.room ? rooms.get(ws.room) : undefined;
  if (!room || room.phase !== 'lobby') return 'Join a lobby first, then invite.';
  const friend = friends.person(friendId);
  if (!friend || !friends.areFriends(ws.account.id, friendId))
    return 'You can only invite friends.';
  const where = presenceOf(friendId);
  if (where === 'offline') return `${friend.displayName} is offline.`;
  if (where === 'match') return `${friend.displayName} is in a match right now.`;
  if (!friends.inviteAllowed(ws.account.id, friendId))
    return `Wait a moment before inviting ${friend.displayName} again.`;
  const now = Date.now();
  const from = friends.person(ws.account.id);
  if (!from) return null;
  sendToAccount(friendId, {
    type: 'invited',
    from,
    code: room.code,
    expiresAt: now + INVITE_TTL_MS,
  });
  send(ws, { type: 'invite_sent', to: friend });
  return null;
}

/** A player changed their display name: their connections carry it, and their lobbies show it. */
export function renameAccount(userId: number, displayName: string) {
  const lobbies = new Set<string>();
  for (const ws of byUser.get(userId) ?? []) {
    if (ws.account) ws.account = { ...ws.account, displayName };
    if (ws.room) lobbies.add(ws.room);
  }
  for (const code of lobbies) {
    const room = rooms.get(code);
    if (room?.phase === 'lobby') sendLobby(room);
  }
}
