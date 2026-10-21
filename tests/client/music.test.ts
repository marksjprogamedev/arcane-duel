import { describe, expect, it } from 'vitest';
import { newShuffle, peekNext, pickNext, type ShuffleState } from '../../client/src/audio/shuffle';
import { titleFromId, tracksFrom, TRACKS } from '../../client/src/audio/tracks';

/** A small seeded random number generator, so the shuffle tests are repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function play(ids: string[], picks: number, seed: number) {
  const rng = seeded(seed);
  let state: ShuffleState = newShuffle();
  const out: string[] = [];
  for (let i = 0; i < picks; i++) {
    const r = pickNext(state, ids, rng);
    state = r.state;
    out.push(r.id as string);
  }
  return out;
}

describe('music shuffle', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];

  it('plays every song once before any song repeats', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picks = play(ids, 15, seed);
      for (let round = 0; round < 3; round++) {
        expect([...picks.slice(round * 5, round * 5 + 5)].sort()).toEqual(ids);
      }
    }
  });

  it('never plays the same song twice in a row, including between rounds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const picks = play(['a', 'b'], 40, seed);
      for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    }
    for (let seed = 1; seed <= 200; seed++) {
      const picks = play(ids, 60, seed);
      for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    }
  });

  it('repeats a single song and gives nothing for an empty list', () => {
    expect(play(['only'], 4, 1)).toEqual(['only', 'only', 'only', 'only']);
    expect(pickNext(newShuffle(), [], Math.random).id).toBeNull();
  });

  it('drops a song that was removed from the round', () => {
    const rng = seeded(7);
    const first = pickNext(newShuffle(), ids, rng);
    const left = ids.filter((id) => id !== first.id);
    const gone = left[0];
    const rest = ids.filter((id) => id !== gone);
    const next = pickNext(first.state, rest, rng);
    expect(next.id).not.toBe(gone);
    expect(rest).toContain(next.id);
  });

  it('peeks at the next song only when the round already decided it', () => {
    expect(peekNext(newShuffle(), ids)).toBeNull();
    const first = pickNext(newShuffle(), ids, seeded(3));
    const peek = peekNext(first.state, ids);
    expect(peek).not.toBeNull();
    expect(pickNext(first.state, ids, seeded(99)).id).toBe(peek);
  });
});

describe('music tracks', () => {
  it('makes a title from a file name', () => {
    expect(titleFromId('shadow_runes')).toBe('Shadow Runes');
    expect(titleFromId('menu_waltz')).toBe('Menu Waltz');
    expect(titleFromId('boss-fight_2')).toBe('Boss Fight 2');
  });

  it('lists tracks by id from file paths', () => {
    const tracks = tracksFrom({
      './music/battle/zeta_storm.ogg': '/assets/zeta.ogg',
      './music/battle/alpha_dawn.ogg': '/assets/alpha.ogg',
    });
    expect(tracks.map((t) => t.id)).toEqual(['alpha_dawn', 'zeta_storm']);
    expect(tracks[0]).toEqual({ id: 'alpha_dawn', title: 'Alpha Dawn', url: '/assets/alpha.ogg' });
  });

  it('finds the songs in the folders', () => {
    expect(TRACKS.menu.map((t) => t.id)).toContain('menu_waltz');
    expect(TRACKS.battle.map((t) => t.id)).toContain('shadow_runes');
    expect(TRACKS.battle.map((t) => t.id)).toContain('magicians_march');
    for (const t of [...TRACKS.menu, ...TRACKS.battle]) expect(t.url).toMatch(/\.ogg/);
  });
});
