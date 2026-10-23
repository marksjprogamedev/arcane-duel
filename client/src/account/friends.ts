// Friends (0.41.0), without the DOM: the latest list the server sent (`friends`), listeners, the checks
// behind "Add a friend", what changed between two lists (for the toasts), and the messages to the server.
// The screen is ui/menus/friends.ts; net/client.ts hands in the account-bound socket (`initFriends`).

import { normaliseUsername, usernameProblem } from '../../../shared/accountApi';
import {
  INVITE_COOLDOWN_MS,
  MAX_FRIENDS,
  MAX_OUTGOING_REQUESTS,
  type ClientMessage,
  type FriendEntry,
  type FriendsList,
  type Person,
  type Presence,
} from '../../../shared/protocol';
import { onAccount } from './state';

/** `Merlin (@merlin)`: how every list shows a person. */
export const personLabel = (p: Person) => `${p.displayName} (@${p.username})`;

const byName = (a: Person, b: Person) =>
  a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) ||
  a.username.localeCompare(b.username);

/** What a presence dot says (its tooltip and the text next to the name). */
export const PRESENCE_LABEL: Record<Presence, string> = {
  online: 'Online',
  lobby: 'In a lobby',
  match: 'In a match',
  offline: 'Offline',
};

/** Free to play (on the menu or in a lobby) first, then in a match, then offline. */
const PRESENCE_RANK: Record<Presence, number> = { online: 0, lobby: 0, match: 1, offline: 2 };

/** Friends free to play first, then in a match, then offline; then by display name (then username). */
export const sortFriends = (friends: FriendEntry[]) =>
  [...friends].sort(
    (a, b) => (PRESENCE_RANK[a.presence] ?? 3) - (PRESENCE_RANK[b.presence] ?? 3) || byName(a, b),
  );

/** Whether a friend can be invited to our lobby: they have the game open and are not in a match. */
export const invitable = (presence: Presence) => presence === 'online' || presence === 'lobby';

/** Requests and blocks by name; a new array. */
export const sortPeople = <T extends Person>(people: T[]) => [...people].sort(byName);

/** What is new in `next` since `prev`, for toasts. Nothing for the first list (logging in). */
export function friendsNews(prev: FriendsList | null, next: FriendsList) {
  if (!prev) return { newIncoming: [] as Person[], accepted: [] as Person[] };
  const ids = (people: Person[]) => new Set(people.map((p) => p.id));
  const hadIncoming = ids(prev.incoming);
  const wasOutgoing = ids(prev.outgoing);
  return {
    newIncoming: next.incoming.filter((p) => !hadIncoming.has(p.id)),
    // a request we sent that turned into a friendship: they said yes
    accepted: next.friends.filter((p) => wasOutgoing.has(p.id)),
  };
}

/** The toast for `friendsNews`, or null when there is nothing to say. */
export function newsText(news: ReturnType<typeof friendsNews>): string | null {
  const parts: string[] = [];
  const { newIncoming, accepted } = news;
  if (newIncoming.length === 1)
    parts.push(`${personLabel(newIncoming[0])} sent you a friend request.`);
  else if (newIncoming.length > 1) parts.push(`${newIncoming.length} new friend requests.`);
  if (accepted.length === 1)
    parts.push(`${personLabel(accepted[0])} accepted your friend request.`);
  else if (accepted.length > 1)
    parts.push(`${accepted.length} people accepted your friend requests.`);
  return parts.length ? parts.join(' ') : null;
}

/**
 * The instant message for "Add a friend" (the server checks again), or null if the request can go.
 * `me` is our own username.
 */
export function addFriendProblem(
  raw: string,
  list: FriendsList | null,
  me: string | null,
): string | null {
  const username = normaliseUsername(raw);
  if (!username) return 'Enter their username.';
  const rule = usernameProblem(username);
  if (rule) return rule;
  if (username === me) return "That's you!";
  if (!list) return null;
  const find = (people: Person[]) => people.find((p) => p.username === username);
  if (find(list.friends)) return `@${username} is already your friend.`;
  if (find(list.outgoing)) return `You already asked @${username}. Waiting for them to answer.`;
  if (find(list.blocked)) return `You blocked @${username}. Unblock them first (Blocked tab).`;
  if (list.friends.length >= MAX_FRIENDS)
    return `You have ${MAX_FRIENDS} friends, the most there can be. Remove one first.`;
  // asking someone who already asked us just makes us friends: no new outgoing request
  if (!find(list.incoming) && list.outgoing.length >= MAX_OUTGOING_REQUESTS)
    return `You have ${MAX_OUTGOING_REQUESTS} requests waiting. Cancel one first (Sent tab).`;
  return null;
}

/** After "Add": whether `username` is now asked ('sent') or a friend ('friends') in `list`. */
export function addOutcome(list: FriendsList, username: string): 'sent' | 'friends' | null {
  if (list.friends.some((p) => p.username === username)) return 'friends';
  if (list.outgoing.some((p) => p.username === username)) return 'sent';
  return null;
}

// ---- the store ----

let list: FriendsList | null = null;
const listeners = new Set<(list: FriendsList | null) => void>();
const newsListeners = new Set<(news: ReturnType<typeof friendsNews>) => void>();
const errorListeners = new Set<(message: string, fromInvite: boolean) => void>();
const inviteSentListeners = new Set<(to: Person) => void>();
/** Friends we just invited, by id: until when (performance.now()) their Invite button waits. */
const inviteWait = new Map<number, number>();
/** Whether `inviteWait` holds the short wait for the server's answer (true) or the cooldown after it. */
const inviteAsked = new Set<number>();
/** How long Invite waits for `invite_sent` / `friend_error` before it can be pressed again. */
const INVITE_ANSWER_MS = 5000;
let socket: { canSend(): boolean; send(message: ClientMessage): void; connect(): void } | null =
  null;

/** The latest list, or null (a guest, or not heard from the server yet). */
export const friendsList = () => list;

/** Incoming requests waiting for an answer (the badge). */
export const incomingCount = () => list?.incoming.length ?? 0;

/** Calls `fn` with every new list (null: logged out); returns a function that stops it. */
export function onFriends(fn: (list: FriendsList | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Calls `fn` when a list brings news (new incoming requests, accepted requests). */
export function onFriendsNews(fn: (news: ReturnType<typeof friendsNews>) => void): () => void {
  newsListeners.add(fn);
  return () => newsListeners.delete(fn);
}

/**
 * Calls `fn` with each `friend_error` (or a send that could not go). `fromInvite`: an invite was waiting
 * for its answer, so the error is most likely about it (the message does not say).
 */
export function onFriendError(fn: (message: string, fromInvite: boolean) => void): () => void {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

/** Calls `fn` with each `invite_sent` (our invite went out). */
export function onInviteSent(fn: (to: Person) => void): () => void {
  inviteSentListeners.add(fn);
  return () => inviteSentListeners.delete(fn);
}

/** How many ms the Invite button for friend `id` still waits at `now` (performance.now()); 0 if none. */
export function inviteWaitMs(id: number, now: number): number {
  const until = inviteWait.get(id);
  if (until === undefined) return 0;
  if (until > now) return until - now;
  inviteWait.delete(id);
  inviteAsked.delete(id);
  return 0;
}

/** Invites friend `id` to the lobby we are in; false if it could not be sent. */
export function inviteFriend(id: number, now: number): boolean {
  if (inviteWaitMs(id, now) > 0) return false;
  // marked first, so a send that cannot go reports its error as the invite's
  inviteWait.set(id, now + INVITE_ANSWER_MS);
  inviteAsked.add(id);
  return sendFriends({ type: 'invite', id });
}

/** The server's `invite_sent`: the friend can be invited again after INVITE_COOLDOWN_MS. */
export function receiveInviteSent(to: Person, now: number) {
  inviteAsked.delete(to.id);
  inviteWait.set(to.id, now + INVITE_COOLDOWN_MS);
  for (const fn of inviteSentListeners) fn(to);
}

function setList(next: FriendsList | null) {
  const prev = list;
  list = next;
  for (const fn of listeners) fn(next);
  if (!next) return;
  const news = friendsNews(prev, next);
  if (news.newIncoming.length || news.accepted.length) for (const fn of newsListeners) fn(news);
}

/** The server's `friends` for this connection's account. */
export const receiveFriends = (next: FriendsList) => setList(next);

/** The server's `friend_error`. An invite still waiting for its answer was the one refused. */
export function receiveFriendError(message: string) {
  const fromInvite = inviteAsked.size > 0;
  for (const id of inviteAsked) inviteWait.delete(id);
  inviteAsked.clear();
  for (const fn of errorListeners) fn(message, fromInvite);
}

/** Starts the store; called once by net/client.ts with its account-bound socket. */
export function initFriends(net: {
  canSend(): boolean;
  send(message: ClientMessage): void;
  connect(): void;
}) {
  socket = net;
  // another account (or none): its list comes with the new connection's `profile`
  onAccount(() => {
    inviteWait.clear();
    inviteAsked.clear();
    setList(null);
  });
}

/** Opens the account-bound connection if there is none (the screen opened before the list came). */
export const connectFriends = () => socket?.connect();

/** Sends one friends message; false (and an error to the listeners) if not connected. */
function sendFriends(message: ClientMessage): boolean {
  if (socket?.canSend()) {
    socket.send(message);
    return true;
  }
  socket?.connect();
  receiveFriendError('Not connected to the server. Try again in a moment.');
  return false;
}

export const requestFriend = (username: string) =>
  sendFriends({ type: 'friend_request', username: normaliseUsername(username) });
export const answerFriend = (id: number, accept: boolean) =>
  sendFriends({ type: 'friend_answer', id, accept });
/** Ends a friendship, or withdraws our outgoing request. */
export const removeFriend = (id: number) => sendFriends({ type: 'friend_remove', id });
export const blockPerson = (id: number) => sendFriends({ type: 'block', id });
export const unblockPerson = (id: number) => sendFriends({ type: 'unblock', id });
