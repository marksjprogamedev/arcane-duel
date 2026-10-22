import { describe, expect, it } from 'vitest';
import { startText } from '../../client/src/startText';

const wiz = (seat: number, team: number, name: string) => ({
  seat,
  team,
  style: { name },
});
const duel = [wiz(0, 0, 'Pyro'), wiz(1, 1, 'Frost')];
const twoVTwo = [wiz(0, 0, 'Pyro'), wiz(1, 0, 'Frost'), wiz(2, 1, 'Storm'), wiz(3, 1, 'Stone')];

describe('startText', () => {
  it('solo duel and training keep the old text', () => {
    expect(startText({ mode: 'duel', wizards: duel as never }, 0)).toEqual({
      header: '🟢 Pyro · 🔴 Frost',
      hint: 'Your wizard: Pyro · Rival: Frost',
    });
    expect(startText({ mode: 'mortal', wizards: duel as never }, 0).header).toBe(
      '🟢 Pyro · 🔴 Training Dummy',
    );
  });
  it('online names your own wizard, seat 0 and seat 1', () => {
    const g = { mode: 'online', wizards: duel as never };
    expect(startText(g, 0).header).toBe('🟢 You Pyro · 🔴 Rival Frost');
    expect(startText(g, 1)).toEqual({
      header: '🟢 You Frost · 🔴 Rival Pyro',
      hint: 'Your wizard: Frost · Rival: Pyro',
    });
  });
  it('2v2 names your wizard and the team sizes', () => {
    const g = { mode: 'online', wizards: twoVTwo as never };
    expect(startText(g, 3)).toEqual({
      header: '🟢 You Stone · 🔴 Enemy team',
      hint: 'Your wizard: Stone · Team match, 2 vs 2',
    });
  });
  it('empty seats are not counted', () => {
    const threePlayers = [...twoVTwo.slice(0, 3), { ...twoVTwo[3], absent: true }];
    const g = { mode: 'online', wizards: threePlayers as never };
    expect(startText(g, 0).hint).toBe('Your wizard: Pyro · Team match, 2 vs 1');
  });
});
