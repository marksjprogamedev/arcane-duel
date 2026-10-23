// Logged-in connections, by account. When a session ends (logout, password change, deletion) its
// connections leave their rooms and are told; a display-name change shows in their lobbies at once.

import { leaveRoom, sendLobby } from './lobby';
import type { ServerMessage } from '../../shared/protocol';
import { config, rooms, send, type Client } from './state';

const byUser = new Map<number, Set<Client>>();

/** Remembers a logged-in connection (call once it is bound to an account). */
export function trackAccountSocket(ws: Client) {
  if (!ws.account) return;
  let set = byUser.get(ws.account.id);
  const cameOnline = !set;
  if (!set) byUser.set(ws.account.id, (set = new Set()));
  set.add(ws);
  if (cameOnline) config.friends?.presenceChanged(ws.account.id);
}

/** Forgets a connection that closed. */
export function untrackAccountSocket(ws: Client) {
  if (!ws.account) return;
  const set = byUser.get(ws.account.id);
  if (!set?.delete(ws)) return;
  if (set.size === 0) {
    byUser.delete(ws.account.id);
    config.friends?.presenceChanged(ws.account.id);
  }
}

/** Whether an account has the game open anywhere. */
export const isAccountOnline = (userId: number) => byUser.has(userId);

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
    leaveRoom(ws);
    untrackAccountSocket(ws);
    ws.account = undefined;
    ws.sessionHash = undefined;
    send(ws, { type: 'signed_out', reason });
  }
}

/** Sends `msg` to every connection of `userId` except `except`. */
export function sendToAccount(userId: number, msg: ServerMessage, except?: Client) {
  for (const ws of byUser.get(userId) ?? []) if (ws !== except) send(ws, msg);
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
