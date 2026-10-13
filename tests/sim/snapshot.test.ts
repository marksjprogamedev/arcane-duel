import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel());
const meta = { roundId: 1, seq: 1 };

describe('serializeSnapshot', () => {
  it('survives a JSON round trip (no Sets, no cycles)', () => {
    game.e.x = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    applyInput(game, 'p', { kind: 'bomb', x: 300, y: 300 });
    const snap = serializeSnapshot(game, 'e', meta);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(JSON.parse(JSON.stringify(snap)));
    expect(snap.shots.length).toBeGreaterThan(0);
    expect(snap.shots[0].hitTargets).toBeUndefined();
  });

  it("for viewer 'e' keeps the simulation layout", () => {
    const snap = serializeSnapshot(game, 'e', meta);
    expect(snap.p.x).toBe(game.p.x);
    expect(snap.e.x).toBe(game.e.x);
  });

  it("for viewer 'p' puts the viewer in the `e` slot and swaps every owner", () => {
    game.e.x = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    const snap = serializeSnapshot(game, 'p', meta);
    expect(snap.e.x).toBe(game.p.x);
    expect(snap.p.x).toBe(game.e.x);
    // the shot was fired by simulation wizard p == the viewer == `e` in their view
    expect(snap.shots[0].owner).toBe('e');
    expect(serializeSnapshot(game, 'e', meta).shots[0].owner).toBe('p');
  });

  it('flips the dead wizard in the death record', () => {
    game.e.hp = 0;
    if (update(game, 1)) resolveDeaths(game);
    expect(serializeSnapshot(game, 'e', meta).death?.w).toBe('e');
    expect(serializeSnapshot(game, 'p', meta).death?.w).toBe('p');
  });

  it('keeps snapshots small by capping cosmetic lists', () => {
    for (let i = 0; i < 200; i++)
      game.particles.push({ x: 0, y: 0, vx: 0, vy: 0, c: '#fff', life: 10, r: 2 });
    expect(serializeSnapshot(game, 'e', meta).particles).toHaveLength(35);
  });
});
