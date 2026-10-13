import { describe, expect, it } from 'vitest';
import { styles } from '../../shared/constants';
import { applyInput } from '../../shared/sim/input';
import { resetMatch } from '../../shared/sim/match';
import { resolveDeaths, update } from '../../shared/sim/update';
import { createSimState } from '../../shared/simState';

const newMatch = (seed: number) => {
  const s = createSimState(seed);
  resetMatch(s, {
    mode: 'duel',
    seed,
    styles: [styles[0], styles[3]],
    dummyHP: 160,
    dummyMoving: false,
  });
  return s;
};

describe('independent matches (one per server room)', () => {
  it('do not share any state', () => {
    const a = newMatch(1);
    const b = newMatch(1);
    a.e.x = 300;
    applyInput(a, 'p', { kind: 'key', code: 'Digit4', down: true });
    applyInput(a, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(a, 'p', { kind: 'pointerup', x: 300, y: 300 });
    for (let i = 0; i < 90; i++) if (update(a, 1)) resolveDeaths(a);
    expect(a.e.hp).toBeLessThan(200);
    expect(b.e.hp).toBe(200);
    expect(b.shots).toHaveLength(0);
    expect(b.input.p.attack).toBe('FIRE');
    expect(b.t).toBe(0);
  });

  it('interleaved stepping gives the same result as running each match alone', () => {
    const script = (s: ReturnType<typeof newMatch>, i: number) => {
      if (i === 5) applyInput(s, 'p', { kind: 'pointerdown', x: 600, y: 300 });
      if (i === 50) applyInput(s, 'p', { kind: 'key', code: 'KeyD', down: true });
      if (update(s, 1)) resolveDeaths(s);
    };
    const fingerprint = (s: ReturnType<typeof newMatch>) =>
      JSON.stringify([s.p.x, s.p.hp, s.e.x, s.e.hp, s.e.spell, s.shots.length]);

    const alone = newMatch(7);
    for (let i = 0; i < 400; i++) script(alone, i);

    const x = newMatch(7);
    const y = newMatch(99);
    for (let i = 0; i < 400; i++) {
      script(x, i);
      script(y, i);
    }
    expect(fingerprint(x)).toBe(fingerprint(alone));
  });
});

describe('projectile ids', () => {
  it('are unique within a match and restart at 1 for a new match', () => {
    const s = newMatch(3);
    s.e.x = 300;
    applyInput(s, 'p', { kind: 'key', code: 'Digit4', down: true });
    for (let n = 0; n < 3; n++) {
      s.p.cast = 0;
      s.p.earthCD = 0;
      applyInput(s, 'p', { kind: 'pointerdown', x: 300, y: 300 });
      applyInput(s, 'p', { kind: 'pointerup', x: 300, y: 300 });
    }
    applyInput(s, 'p', { kind: 'bomb', x: 300, y: 300 });
    const ids = [...s.shots.map((x) => x.id), ...s.bombs.map((b) => b.id)];
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ids).size).toBe(ids.length);
    const t = newMatch(3);
    expect(t.nextId).toBe(1);
  });
});
