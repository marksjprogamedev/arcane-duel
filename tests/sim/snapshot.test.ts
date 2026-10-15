import { beforeEach, describe, expect, it } from 'vitest';
import { styles } from '../../shared/constants';
import { BATTLEGROUND_VISION, mapFor } from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { VISION_MARGIN } from '../../shared/sim/vision';
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

describe('fog of war in snapshots', () => {
  const far = BATTLEGROUND_VISION + VISION_MARGIN + 50;

  function battleground() {
    resetMatch(game, {
      mode: 'online',
      seed: 1,
      styles: [styles[0], styles[3]],
      dummyHP: 160,
      dummyMoving: false,
      map: mapFor('ruins'),
    });
    // both wizards in the open middle, `e` to the right of `p`
    game.p.x = 1000;
    game.p.y = 900;
    game.e.x = 1000 + 300;
    game.e.y = 900;
  }

  it('arenas send everything, wherever it is', () => {
    game.e.x = 700;
    expect(serializeSnapshot(game, 'p', meta).p).not.toBeNull();
    expect(serializeSnapshot(game, 'e', meta).p).not.toBeNull();
  });

  it('a battleground sends the opponent only while they are in sight', () => {
    battleground();
    expect(serializeSnapshot(game, 'p', meta).p?.x).toBe(1300);
    game.e.x = 1000 + far;
    expect(serializeSnapshot(game, 'p', meta).p).toBeNull();
    expect(serializeSnapshot(game, 'e', meta).p).toBeNull(); // and the other way round
    game.e.x = 1000 + BATTLEGROUND_VISION + VISION_MARGIN - 1; // inside the margin
    expect(serializeSnapshot(game, 'p', meta).p).not.toBeNull();
  });

  it("the viewer's own wizard is always there, and the snapshot has no trace of a hidden opponent", () => {
    battleground();
    game.e.x = 1000 + far;
    game.e.hp = 77;
    const json = JSON.stringify(serializeSnapshot(game, 'p', meta));
    expect(serializeSnapshot(game, 'p', meta).e.x).toBe(1000);
    expect(json).not.toContain(String(1000 + far));
    expect(json).not.toContain('"hp":77');
  });

  it("shots, bombs, zones, traps and bubbles out of sight are left out; the viewer's own stay", () => {
    battleground();
    const at = (x: number) => ({ x, y: 900 });
    const base = { vx: 0, vy: 0, k: 'FIRE', r: 5, life: 99, arm: 0, u: 0, landed: true, fuse: 9 };
    const mk = (owner: typeof game.p, x: number, id: number) => ({ ...base, ...at(x), owner, id });
    game.shots.push(mk(game.e, 1000 + far, 1) as never, mk(game.e, 1200, 2) as never);
    game.shots.push(mk(game.p, 1000 + far, 3) as never); // the viewer's own, far away
    game.bombs.push(mk(game.e, 1000 + far, 4) as never);
    game.traps.push(mk(game.e, 1000 + far, 5) as never, mk(game.e, 1100, 6) as never);
    game.zones.push(mk(game.e, 1000 + far, 7) as never);
    game.bubbles.push(mk(game.e, 1000 + far, 8) as never);
    const snap = serializeSnapshot(game, 'p', meta);
    expect(snap.shots.map((s) => s.id)).toEqual([2, 3]);
    expect(snap.bombs).toHaveLength(0);
    expect(snap.traps.map((t) => t.id)).toEqual([6]);
    expect(snap.zones).toHaveLength(0);
    expect(snap.bubbles).toHaveLength(0);
  });

  it('a big zone or bubble whose edge reaches into sight is sent', () => {
    battleground();
    const zone = { x: 1000 + far + 100, y: 900, r: 200, k: 'FIRE', life: 50, owner: game.e };
    game.zones.push(zone as never);
    expect(serializeSnapshot(game, 'p', meta).zones).toHaveLength(1);
  });

  it('effects out of sight are left out; a lightning bolt counts if either end is in sight', () => {
    battleground();
    const farAt = 1000 + far + 200;
    const snap = serializeSnapshot(game, 'p', meta, [
      { type: 'burst', x: farAt, y: 900, c: '#fff', n: 3, power: 3, castOwner: 'e' },
      { type: 'text', x: 1100, y: 900, text: 'near', c: '#fff' },
      { type: 'lightning', x: farAt, y: 900, tx: 1100, ty: 900, castOwner: 'e' },
      { type: 'lightning', x: farAt, y: 900, tx: farAt + 50, ty: 900, castOwner: 'e' },
    ]);
    expect(snap.fx.map((e) => e.type)).toEqual(['text', 'lightning']);
  });

  it('everything is shown once the round is ending', () => {
    battleground();
    game.e.x = 1000 + far;
    game.ending = true;
    expect(serializeSnapshot(game, 'p', meta).p).not.toBeNull();
  });
});
