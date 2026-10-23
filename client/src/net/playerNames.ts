// Who to name, and what to say, for the players of an online room. Pure: no DOM, no state.

import type { ServerMessage } from '../../../shared/protocol';

/**
 * The label of the player in `seat`: their name from the server (`names` in start / rematch_start /
 * resumed: a logged-in player's display name, else "Player 3") when there is one, else `fallback`
 * (the wizard's look name, as offline).
 */
export function seatLabel(names: readonly string[] | undefined, seat: number, fallback: string) {
  return names?.[seat] || fallback;
}

/** A name in the lobby: guests (no account) are marked, logged-in players show plain. */
export const lobbyName = (name: string, guest: boolean | undefined) =>
  guest ? `${name} (guest)` : name;

/**
 * The toast for a server message that ends our time in the room from outside (logged out elsewhere,
 * or the same account took our place from another tab); null for any other message.
 */
export function sessionEndText(message: ServerMessage): string | null {
  if (message.type === 'replaced') return 'You opened this game in another tab or device.';
  if (message.type !== 'signed_out') return null;
  switch (message.reason) {
    case 'password':
      return 'Your password was changed. Please log in again.';
    case 'deleted':
      return 'Your account was deleted.';
    default:
      return 'You were logged out (on another device).';
  }
}

/** The account key a connection is bound to: the account id, or null for a guest. */
export const accountKey = (account: { id: number } | null | undefined) => account?.id ?? null;
