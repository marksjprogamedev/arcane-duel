// Friends (0.41.0), without the DOM: the latest list the server sent (`friends`), listeners, the checks
// behind "Add a friend", what changed between two lists (for the toasts), and the messages to the server.
// The screen is ui/menus/friends.ts; net/client.ts hands in the account-bound socket (`initFriends`).

import { normaliseUsername, usernameProblem } from '../../../shared/accountApi';
import {
  MAX_FRIENDS,
  MAX_OUTGOING_REQUESTS,
  type ClientMessage,
  type FriendEntry,
  type FriendsList,
  type Person,
} from '../../../shared/protocol';
import { onAccount } from './state';

/** `Merlin (@merlin)`: how every list shows a person. */
export const personLabel = (p: Person) => `${p.displayName} (@${p.username})`;

const byName = (a: Person, b: Person) =>
  a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }) ||
  a.username.localeCompare(b.username);

/** Friends online first, then by display name (then username); a new array. */
export const sortFriends = (friends: FriendEntry[]) =>
  [...friends].sort(
    (a, b) => Number(b.presence === 'online') - Number(a.presence === 'online') || byName(a, b),
  );

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
const errorListeners = new Set<(message: string) => void>();
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

/** Calls `fn` with each `friend_error` (or a send that could not go). */
export function onFriendError(fn: (message: string) => void): () => void {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
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

/** The server's `friend_error`. */
export function receiveFriendError(message: string) {
  for (const fn of errorListeners) fn(message);
}

/** Starts the store; called once by net/client.ts with its account-bound socket. */
export function initFriends(net: {
  canSend(): boolean;
  send(message: ClientMessage): void;
  connect(): void;
}) {
  socket = net;
  // another account (or none): its list comes with the new connection's `profile`
  onAccount(() => setList(null));
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
