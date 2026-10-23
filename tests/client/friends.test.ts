import { describe, expect, it, vi } from 'vitest';
import {
  addFriendProblem,
  addOutcome,
  friendsNews,
  initFriends,
  invitable,
  inviteFriend,
  inviteWaitMs,
  newsText,
  onFriendError,
  onFriends,
  onFriendsNews,
  onInviteSent,
  PRESENCE_LABEL,
  receiveFriendError,
  receiveFriends,
  receiveInviteSent,
  removeFriend,
  requestFriend,
  sortFriends,
  sortPeople,
} from '../../client/src/account/friends';
import {
  INVITE_COOLDOWN_MS,
  MAX_FRIENDS,
  MAX_OUTGOING_REQUESTS,
  type FriendEntry,
  type FriendsList,
  type Person,
} from '../../shared/protocol';

const person = (id: number, username: string, displayName = username): Person => ({
  id,
  username,
  displayName,
});
const friend = (p: Person, presence: FriendEntry['presence'] = 'offline'): FriendEntry => ({
  ...p,
  presence,
});
const empty = (): FriendsList => ({ friends: [], incoming: [], outgoing: [], blocked: [] });

const merlin = person(1, 'merlin', 'Merlin');
const morgana = person(2, 'morgana', 'Morgana');
const arthur = person(3, 'arthur', 'arthur');
const nimue = person(4, 'nimue', 'Nimue');

describe('friends sorting', () => {
  it('puts online friends first, then by display name ignoring case', () => {
    const sorted = sortFriends([
      friend(morgana),
      friend(nimue, 'online'),
      friend(arthur),
      friend(merlin, 'online'),
    ]);
    expect(sorted.map((f) => f.username)).toEqual(['merlin', 'nimue', 'arthur', 'morgana']);
  });

  it('puts friends free to play (online or in a lobby) first, then in a match, then offline', () => {
    const lancelot = person(5, 'lancelot', 'Lancelot');
    const sorted = sortFriends([
      friend(morgana),
      friend(arthur, 'match'),
      friend(nimue, 'lobby'),
      friend(lancelot, 'offline'),
      friend(merlin, 'online'),
    ]);
    expect(sorted.map((f) => f.presence)).toEqual([
      'online',
      'lobby',
      'match',
      'offline',
      'offline',
    ]);
    expect(sorted.map((f) => f.username)).toEqual([
      'merlin',
      'nimue',
      'arthur',
      'lancelot',
      'morgana',
    ]);
  });

  it('labels every presence and invites only friends free to play', () => {
    expect(PRESENCE_LABEL).toEqual({
      online: 'Online',
      lobby: 'In a lobby',
      match: 'In a match',
      offline: 'Offline',
    });
    expect(invitable('online')).toBe(true);
    expect(invitable('lobby')).toBe(true);
    expect(invitable('match')).toBe(false);
    expect(invitable('offline')).toBe(false);
  });

  it('breaks a display name tie by username and leaves the input alone', () => {
    const a = person(5, 'zed', 'Same');
    const b = person(6, 'abe', 'same');
    const input = [a, b];
    expect(sortPeople(input).map((p) => p.username)).toEqual(['abe', 'zed']);
    expect(input[0]).toBe(a);
  });
});

describe('friends news for toasts', () => {
  it('says nothing for the first list (logging in)', () => {
    const next = { ...empty(), incoming: [merlin] };
    expect(friendsNews(null, next)).toEqual({ newIncoming: [], accepted: [] });
  });

  it('finds new incoming requests and our accepted requests', () => {
    const prev = { ...empty(), incoming: [merlin], outgoing: [morgana, arthur] };
    const next = {
      ...empty(),
      incoming: [merlin, nimue],
      outgoing: [arthur],
      friends: [friend(morgana, 'online')],
    };
    const news = friendsNews(prev, next);
    expect(news.newIncoming).toEqual([nimue]);
    expect(news.accepted.map((p) => p.id)).toEqual([morgana.id]);
    expect(newsText(news)).toBe(
      'Nimue (@nimue) sent you a friend request. Morgana (@morgana) accepted your friend request.',
    );
  });

  it('does not count a request we accepted, or a presence change, as news', () => {
    const prev = { ...empty(), incoming: [merlin], friends: [friend(morgana)] };
    const next = { ...empty(), friends: [friend(morgana, 'online'), friend(merlin)] };
    const news = friendsNews(prev, next);
    expect(news).toEqual({ newIncoming: [], accepted: [] });
    expect(newsText(news)).toBeNull();
  });

  it('counts several at once', () => {
    expect(newsText({ newIncoming: [merlin, nimue], accepted: [] })).toBe('2 new friend requests.');
  });
});

describe('add a friend checks', () => {
  it('uses the shared username rules after normalising', () => {
    expect(addFriendProblem('  ', null, 'me')).toMatch(/Enter/);
    expect(addFriendProblem('ab', null, 'me')).toMatch(/3 to 20/);
    expect(addFriendProblem('bad name', null, 'me')).toMatch(/letters, numbers/);
    expect(addFriendProblem('admin', null, 'me')).toMatch(/reserved/);
    expect(addFriendProblem(' Merlin ', null, 'me')).toBeNull();
  });

  it('knows yourself, friends, sent requests and blocks', () => {
    const list = {
      ...empty(),
      friends: [friend(merlin)],
      outgoing: [morgana],
      blocked: [arthur],
    };
    expect(addFriendProblem('MySelf', list, 'myself')).toMatch(/you/);
    expect(addFriendProblem('merlin', list, 'me')).toMatch(/already your friend/);
    expect(addFriendProblem('morgana', list, 'me')).toMatch(/already asked/);
    expect(addFriendProblem('arthur', list, 'me')).toMatch(/blocked/);
    expect(addFriendProblem('nimue', list, 'me')).toBeNull();
  });

  it('stops at the limits, except for answering someone who asked us', () => {
    const many = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => person(from + i, `user${from + i}`));
    const full = { ...empty(), friends: many(MAX_FRIENDS, 100).map((p) => friend(p)) };
    expect(addFriendProblem('nimue', full, 'me')).toMatch(/most/);
    const waiting = { ...empty(), outgoing: many(MAX_OUTGOING_REQUESTS, 100), incoming: [nimue] };
    expect(addFriendProblem('merlin', waiting, 'me')).toMatch(/requests waiting/);
    expect(addFriendProblem('nimue', waiting, 'me')).toBeNull();
  });

  it('reads the outcome of an Add from the next list', () => {
    expect(addOutcome({ ...empty(), outgoing: [merlin] }, 'merlin')).toBe('sent');
    expect(addOutcome({ ...empty(), friends: [friend(merlin)] }, 'merlin')).toBe('friends');
    expect(addOutcome(empty(), 'merlin')).toBeNull();
  });
});

describe('friends store', () => {
  it('sends through the account socket, or reports that it cannot', () => {
    let up = true;
    const send = vi.fn();
    const connect = vi.fn();
    initFriends({ canSend: () => up, send, connect });
    expect(requestFriend(' Merlin ')).toBe(true);
    expect(send).toHaveBeenLastCalledWith({ type: 'friend_request', username: 'merlin' });
    removeFriend(7);
    expect(send).toHaveBeenLastCalledWith({ type: 'friend_remove', id: 7 });
    up = false;
    const errors: string[] = [];
    const stop = onFriendError((m) => errors.push(m));
    expect(requestFriend('merlin')).toBe(false);
    expect(connect).toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    stop();
  });

  it('tells listeners each list and the news between lists', () => {
    const lists: (FriendsList | null)[] = [];
    const news: unknown[] = [];
    const stopLists = onFriends((l) => lists.push(l));
    const stopNews = onFriendsNews((n) => news.push(n));
    receiveFriends(empty());
    receiveFriends({ ...empty(), incoming: [merlin] });
    expect(lists).toHaveLength(2);
    expect(news).toEqual([{ newIncoming: [merlin], accepted: [] }]);
    stopLists();
    stopNews();
  });

  it('sends an invite, waits for the answer, then cools down after invite_sent', () => {
    const send = vi.fn();
    initFriends({ canSend: () => true, send, connect: vi.fn() });
    const sent: Person[] = [];
    const stop = onInviteSent((p) => sent.push(p));
    expect(inviteFriend(10, 1000)).toBe(true);
    expect(send).toHaveBeenLastCalledWith({ type: 'invite', id: 10 });
    expect(inviteWaitMs(10, 1000)).toBeGreaterThan(0);
    expect(inviteFriend(10, 1100)).toBe(false); // a second press while waiting does not send
    expect(send).toHaveBeenCalledTimes(1);
    receiveInviteSent(person(10, 'gawain', 'Gawain'), 2000);
    expect(sent.map((p) => p.username)).toEqual(['gawain']);
    expect(inviteWaitMs(10, 2000)).toBe(INVITE_COOLDOWN_MS);
    expect(inviteWaitMs(10, 2000 + INVITE_COOLDOWN_MS)).toBe(0);
    expect(inviteFriend(10, 2000 + INVITE_COOLDOWN_MS)).toBe(true);
    stop();
  });

  it('a refused invite frees its button and says the error was about an invite', () => {
    initFriends({ canSend: () => true, send: vi.fn(), connect: vi.fn() });
    const errors: [string, boolean][] = [];
    const stop = onFriendError((m, fromInvite) => errors.push([m, fromInvite]));
    inviteFriend(11, 0);
    receiveFriendError('Join a lobby first.');
    expect(inviteWaitMs(11, 1)).toBe(0);
    receiveFriendError('No player is called @nobody.');
    expect(errors).toEqual([
      ['Join a lobby first.', true],
      ['No player is called @nobody.', false],
    ]);
    stop();
  });
});
