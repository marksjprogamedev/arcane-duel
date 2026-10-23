import { describe, expect, it } from 'vitest';
import { accountKey, lobbyName, seatLabel, sessionEndText } from '../../client/src/net/playerNames';
import { startText } from '../../client/src/startText';

describe('seatLabel', () => {
  it("uses the server's name for the seat", () => {
    expect(seatLabel(['Merlin', 'Player 2'], 0, 'Ember Mage')).toBe('Merlin');
    expect(seatLabel(['Merlin', 'Player 2'], 1, 'Frost')).toBe('Player 2');
  });
  it('falls back to the look name without names, or for an empty entry', () => {
    expect(seatLabel(undefined, 0, 'Ember Mage')).toBe('Ember Mage');
    expect(seatLabel([], 1, 'Frost')).toBe('Frost');
    expect(seatLabel(['Merlin', ''], 1, 'Frost')).toBe('Frost');
  });
});

describe('lobbyName', () => {
  it('marks guests only', () => {
    expect(lobbyName('Player 3', true)).toBe('Player 3 (guest)');
    expect(lobbyName('Merlin', false)).toBe('Merlin');
    expect(lobbyName('Merlin', undefined)).toBe('Merlin');
  });
});

describe('sessionEndText', () => {
  it('says why we were sent back to the menu', () => {
    expect(sessionEndText({ type: 'signed_out', reason: 'logout' })).toBe(
      'You were logged out (on another device).',
    );
    expect(sessionEndText({ type: 'signed_out', reason: 'password' })).toMatch(/password/);
    expect(sessionEndText({ type: 'signed_out', reason: 'deleted' })).toMatch(/deleted/);
    expect(sessionEndText({ type: 'replaced' })).toBe(
      'You opened this game in another tab or device.',
    );
  });
  it('is null for anything else', () => {
    expect(sessionEndText({ type: 'peer_left' })).toBeNull();
    expect(sessionEndText({ type: 'welcome', account: null })).toBeNull();
  });
});

describe('accountKey', () => {
  it('is the account id, or null for a guest', () => {
    expect(accountKey({ id: 7 })).toBe(7);
    expect(accountKey(null)).toBeNull();
  });
});

describe('startText with player names', () => {
  const wiz = (seat: number, team: number, name: string) => ({ seat, team, style: { name } });
  const duel = [wiz(0, 0, 'Pyro'), wiz(1, 1, 'Frost')];
  it('online names the players by seat', () => {
    const g = { mode: 'online', wizards: duel as never };
    expect(startText(g, 1, ['Merlin', 'Player 2'])).toEqual({
      header: '🟢 You Player 2 · 🔴 Rival Merlin',
      hint: 'Your wizard: Player 2 · Rival: Merlin',
    });
  });
  it('solo ignores names', () => {
    expect(startText({ mode: 'duel', wizards: duel as never }, 0, ['A', 'B']).header).toBe(
      '🟢 Pyro · 🔴 Frost',
    );
  });
});
