import { describe, expect, it } from 'vitest';
import {
  inviteDeadline,
  InviteQueue,
  inviteText,
  MAX_INVITES,
} from '../../client/src/account/invites';
import { INVITE_TTL_MS, type Person } from '../../shared/protocol';

const person = (id: number, username: string, displayName = username): Person => ({
  id,
  username,
  displayName,
});
const merlin = person(1, 'merlin', 'Merlin');
const nimue = person(2, 'nimue', 'Nimue');
const arthur = person(3, 'arthur', 'Arthur');
const morgana = person(4, 'morgana', 'Morgana');
const free = { inMatch: false, room: null };

describe('invite deadline', () => {
  it('counts the time left when received on our own clock', () => {
    // server says 90 s left; received at monotonic 5000
    expect(inviteDeadline(1_000_090_000, 1_000_000_000, 5000)).toBe(95_000);
  });

  it('falls back to the whole lifetime when the wall clocks disagree', () => {
    // our wall clock is ahead: already "expired"
    expect(inviteDeadline(1_000, 500_000, 0)).toBe(INVITE_TTL_MS);
    // our wall clock is behind: more than the lifetime left
    expect(inviteDeadline(1_000_000, 0, 10)).toBe(10 + INVITE_TTL_MS);
  });
});

describe('invite queue', () => {
  it('says who invites', () => {
    const q = new InviteQueue();
    expect(inviteText(q.add(merlin, 'ABCDEF', 1000))).toBe(
      'Merlin (@merlin) invites you to a lobby.',
    );
  });

  it('stacks newest on top, at most MAX_INVITES', () => {
    const q = new InviteQueue();
    q.add(merlin, 'AAAAAA', 1000);
    q.add(nimue, 'BBBBBB', 1000);
    q.add(arthur, 'CCCCCC', 1000);
    q.add(morgana, 'DDDDDD', 1000);
    expect(MAX_INVITES).toBe(3);
    expect(q.showing(0, free).map((i) => i.from.username)).toEqual(['morgana', 'arthur', 'nimue']);
    expect(q.size).toBe(3);
  });

  it('keeps only the newest invite from the same friend', () => {
    const q = new InviteQueue();
    const first = q.add(merlin, 'AAAAAA', 1000);
    q.add(nimue, 'BBBBBB', 1000);
    const again = q.add(merlin, 'CCCCCC', 2000);
    expect(again.key).not.toBe(first.key);
    expect(q.showing(0, free).map((i) => i.code)).toEqual(['CCCCCC', 'BBBBBB']);
  });

  it('lets invites run out, and removes one on Join or Dismiss', () => {
    const q = new InviteQueue();
    const a = q.add(merlin, 'AAAAAA', 1000);
    q.add(nimue, 'BBBBBB', 3000);
    expect(q.showing(999, free)).toHaveLength(2);
    expect(q.showing(1000, free).map((i) => i.code)).toEqual(['BBBBBB']);
    expect(q.prune(1000)).toBe(true);
    expect(q.prune(1000)).toBe(false);
    expect(q.size).toBe(1);
    q.add(arthur, 'CCCCCC', 5000);
    q.remove(a.key); // already gone: nothing happens
    q.remove(q.showing(0, free)[0].key);
    expect(q.showing(0, free).map((i) => i.code)).toEqual(['BBBBBB']);
  });

  it('holds invites back during a match and shows them after, unless they ran out', () => {
    const q = new InviteQueue();
    q.add(merlin, 'AAAAAA', 10_000);
    q.add(nimue, 'BBBBBB', 50_000);
    expect(q.showing(0, { inMatch: true, room: 'ZZZZZZ' })).toEqual([]);
    expect(q.size).toBe(2);
    // the match ended at 20 s: Merlin's ran out meanwhile, Nimue's shows
    expect(q.showing(20_000, { inMatch: false, room: 'ZZZZZZ' }).map((i) => i.code)).toEqual([
      'BBBBBB',
    ]);
  });

  it('never shows an invite to the room we are in', () => {
    const q = new InviteQueue();
    q.add(merlin, 'AAAAAA', 1000);
    q.add(nimue, 'BBBBBB', 1000);
    expect(q.showing(0, { inMatch: false, room: 'AAAAAA' }).map((i) => i.code)).toEqual(['BBBBBB']);
  });
});
