import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { resolveDeaths, update } from '../../shared/sim/update';
import type { FxEvent } from '../../shared/types';
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
    expect(snap.shots[0]).not.toHaveProperty('hitTargets');
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

  it('carries fx events instead of particles', () => {
    for (let i = 0; i < 200; i++)
      game.particles.push({ x: 0, y: 0, vx: 0, vy: 0, c: '#fff', life: 10, r: 2 });
    const snap = serializeSnapshot(game, 'e', meta, [
      { type: 'burst', x: 10.123456, y: 20, c: '#f00', n: 5, power: 4, castOwner: 'p' },
    ]);
    expect(snap).not.toHaveProperty('particles');
    expect(snap.fx).toEqual([
      { type: 'burst', x: 10.1, y: 20, c: '#f00', n: 5, power: 4, castOwner: 'p' },
    ]);
  });

  it('flips wizard references in fx events for viewer p', () => {
    const fx: FxEvent[] = [
      { type: 'spray', wizard: 'p', x: 1, y: 2, spell: 'FIRE', castOwner: 'p' },
      { type: 'burst', x: 1, y: 2, c: '#fff', n: 2, power: 2, castOwner: 'e' },
      { type: 'bolt_trail', x: 1, y: 2, spell: 'ICE' },
      { type: 'lightning', x: 1, y: 2, tx: 3, ty: 4, castOwner: 'p' },
      { type: 'text', x: 1, y: 2, text: '-14', c: '#fff', damageOwner: 'e' },
      { type: 'text', x: 1, y: 2, text: 'BLOCKED!', c: '#fff' },
    ];
    const snap = serializeSnapshot(game, 'p', meta, fx);
    expect(snap.fx[0]).toMatchObject({ wizard: 'e', castOwner: 'e' });
    expect(snap.fx[1]).toMatchObject({ castOwner: 'p' });
    expect(snap.fx[2]).toMatchObject({ type: 'bolt_trail' });
    expect(snap.fx[3]).toMatchObject({ castOwner: 'e' });
    expect(snap.fx[4]).toMatchObject({ damageOwner: 'p' });
    expect(snap.fx[5]).not.toHaveProperty('damageOwner');
  });

  it('carries only what clients draw: no timers, no projectile bookkeeping', () => {
    game.e.x = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    const snap = serializeSnapshot(game, 'e', meta);
    for (const key of ['rest', 'burnTick', 'burnTime', 'healTick', 'spell', 'cast'])
      expect(snap.e).not.toHaveProperty(key);
    // the opponent's cooldowns and knockback are none of the viewer's business
    for (const key of ['healCD', 'magmaCD', 'kx', 'ky']) expect(snap.p).not.toHaveProperty(key);
    // the viewer's own are (HUD, prediction)
    for (const key of ['healCD', 'magmaCD', 'kx', 'ky']) expect(snap.e).toHaveProperty(key);
    expect(Object.keys(snap.shots[0]).sort()).toEqual(
      ['id', 'k', 'owner', 'r', 'vx', 'vy', 'x', 'y'].sort(),
    );
  });

  it("carries bubbles, owned from the viewer's side, and the viewer's bubble cooldown", () => {
    game.bubbles.push({ x: 123.456, y: 200, r: 90, owner: game.p, life: 100 });
    game.p.bubbleCD = 50;
    const snap = serializeSnapshot(game, 'e', meta);
    expect(snap.bubbles).toEqual([{ x: 123.5, y: 200, r: 90, life: 100, owner: 'p' }]);
    expect(serializeSnapshot(game, 'p', meta).bubbles[0].owner).toBe('e');
    expect(snap.p).not.toHaveProperty('bubbleCD');
    expect(serializeSnapshot(game, 'p', meta).e).toHaveProperty('bubbleCD', 50);
  });

  it("carries each wizard's charge state, so both players see a charge meter", () => {
    game.p.chargeSpell = 'EARTH';
    game.p.chargeTicks = 30;
    const snap = serializeSnapshot(game, 'e', meta);
    expect(snap.p).toMatchObject({ chargeSpell: 'EARTH', chargeTicks: 30 });
    expect(snap.e).toMatchObject({ chargeSpell: null });
  });

  it('carries the bomb fuse, so clients can draw the countdown', () => {
    game.bombs.push({ ...game.bombs[0], id: 99, x: 1, y: 2, fuse: 40 } as (typeof game.bombs)[0]);
    const snap = serializeSnapshot(game, 'e', meta);
    expect(snap.bombs.at(-1)).toMatchObject({ id: 99, fuse: 40 });
  });

  it('never carries cosmetics (text, arcs, rings) as state', () => {
    game.labels.push({ x: 0, y: 0, s: 'x', c: '#fff', life: 10 });
    const snap = serializeSnapshot(game, 'e', meta);
    for (const key of ['labels', 'arcs', 'waves', 'particles'])
      expect(snap).not.toHaveProperty(key);
  });
});
