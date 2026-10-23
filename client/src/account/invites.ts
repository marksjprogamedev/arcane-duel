// Invites to a friend's lobby (0.41.1), without the DOM: the queue of `invited` messages waiting for Join or
// Dismiss, when each runs out, and which of them show now. The toasts are ui/menus/invites.ts; net/client.ts
// hands in each `invited` (`receiveInvite`).

import { INVITE_TTL_MS, type Person } from '../../../shared/protocol';
import { onAccount } from './state';
import { personLabel } from './friends';

/** At most this many invites wait at once; a newer one pushes the oldest out. */
export const MAX_INVITES = 3;

export interface Invite {
  /** Unique per invite received (a friend inviting again gets a new key). */
  key: number;
  from: Person;
  code: string;
  /** When it runs out, on our own monotonic clock (performance.now()). */
  until: number;
}

/**
 * When an invite received at `now` (monotonic) runs out. The server's `expiresAt` is on its clock, so only
 * the time left is used, read against our wall clock (`wallNow`) at once. A wall clock far off (time
 * left below zero or beyond the whole lifetime) would make that wrong: then the full lifetime counts.
 */
export function inviteDeadline(expiresAt: number, wallNow: number, now: number): number {
  const left = expiresAt - wallNow;
  return now + (left > 0 && left <= INVITE_TTL_MS ? left : INVITE_TTL_MS);
}

/** `Merlin (@merlin) invites you to a lobby.` */
export const inviteText = (invite: Invite) => `${personLabel(invite.from)} invites you to a lobby.`;

/** The waiting invites, newest first. Time comes in as arguments, so it is testable. */
export class InviteQueue {
  private items: Invite[] = [];
  private nextKey = 1;

  constructor(private readonly max = MAX_INVITES) {}

  /** Adds an invite on top. The same friend's older invite goes (the newest code is the one that counts). */
  add(from: Person, code: string, until: number): Invite {
    const invite = { key: this.nextKey++, from, code, until };
    this.items = [invite, ...this.items.filter((i) => i.from.id !== from.id)].slice(0, this.max);
    return invite;
  }

  remove(key: number) {
    this.items = this.items.filter((i) => i.key !== key);
  }

  /** Drops the ones run out at `now`; true if any went. */
  prune(now: number): boolean {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.until > now);
    return this.items.length !== before;
  }

  clear() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  /**
   * The invites to show at `now`, newest first: none while a match is on screen (they wait for it to
   * end), and never one to the room we are in already.
   */
  showing(now: number, where: { inMatch: boolean; room: string | null }): Invite[] {
    if (where.inMatch) return [];
    return this.items.filter((i) => i.until > now && i.code !== where.room);
  }
}

// ---- the store ----

export const invites = new InviteQueue();
const listeners = new Set<() => void>();

/** Calls `fn` whenever an invite arrives or the queue is emptied (logged out). */
export function onInvites(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The server's `invited`. */
export function receiveInvite(from: Person, code: string, expiresAt: number) {
  invites.add(from, code, inviteDeadline(expiresAt, Date.now(), performance.now()));
  for (const fn of listeners) fn();
}

/** Another account (or none): its invites are not ours. Called once by net/client.ts. */
export function initInvites() {
  onAccount(() => {
    invites.clear();
    for (const fn of listeners) fn();
  });
}
