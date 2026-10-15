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
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    applyInput(game, 0, { kind: 'bomb', x: 300, y: 300 });
    const snap = serializeSnapshot(game, 1, meta);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(JSON.parse(JSON.stringify(snap)));
    expect(snap.shots.length).toBeGreaterThan(0);
    expect(snap.shots[0]).not.toHaveProperty('hitTargets');
  });

  it('puts the viewer in `you` and everyone else in `others`, with their seats and teams', () => {
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.you).toMatchObject({ seat: 1, team: 1, x: game.e.x });
    expect(snap.others).toHaveLength(1);
    expect(snap.others[0]).toMatchObject({ seat: 0, team: 0, x: game.p.x });
    const first = serializeSnapshot(game, 0, meta);
    expect(first.you).toMatchObject({ seat: 0, x: game.p.x });
    expect(first.others[0]).toMatchObject({ seat: 1, x: game.e.x });
  });

  it('names owners by seat, the same for every viewer', () => {
    game.e.x = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    expect(serializeSnapshot(game, 0, meta).shots[0].owner).toBe(0);
    expect(serializeSnapshot(game, 1, meta).shots[0].owner).toBe(0);
  });

  it('names the dead wizard by seat', () => {
    game.e.hp = 0;
    if (update(game, 1)) resolveDeaths(game);
    expect(serializeSnapshot(game, 1, meta).death?.w).toBe(1);
    expect(serializeSnapshot(game, 0, meta).death?.w).toBe(1);
  });

  it('carries fx events instead of particles', () => {
    for (let i = 0; i < 200; i++)
      game.particles.push({ x: 0, y: 0, vx: 0, vy: 0, c: '#fff', life: 10, r: 2 });
    const snap = serializeSnapshot(game, 1, meta, [
      { type: 'burst', x: 10.123456, y: 20, c: '#f00', n: 5, power: 4, castOwner: 0 },
    ]);
    expect(snap).not.toHaveProperty('particles');
    expect(snap.fx).toEqual([
      { type: 'burst', x: 10.1, y: 20, c: '#f00', n: 5, power: 4, castOwner: 0 },
    ]);
  });

  it('sends fx events with absolute seats, the same for every viewer', () => {
    const fx: FxEvent[] = [
      { type: 'spray', wizard: 0, x: 1, y: 2, spell: 'FIRE', castOwner: 0 },
      { type: 'burst', x: 1, y: 2, c: '#fff', n: 2, power: 2, castOwner: 1 },
      { type: 'bolt_trail', x: 1, y: 2, spell: 'ICE' },
      { type: 'lightning', x: 1, y: 2, tx: 3, ty: 4, castOwner: 0 },
      { type: 'text', x: 1, y: 2, text: '-14', c: '#fff', damageOwner: 1 },
      { type: 'text', x: 1, y: 2, text: 'BLOCKED!', c: '#fff' },
    ];
    const snap = serializeSnapshot(game, 0, meta, fx);
    expect(snap.fx[0]).toMatchObject({ wizard: 0, castOwner: 0 });
    expect(snap.fx[1]).toMatchObject({ castOwner: 1 });
    expect(snap.fx[3]).toMatchObject({ castOwner: 0 });
    expect(snap.fx[4]).toMatchObject({ damageOwner: 1 });
    expect(snap.fx[5]).not.toHaveProperty('damageOwner');
    expect(serializeSnapshot(game, 1, meta, fx).fx).toEqual(snap.fx);
  });

  it('carries only what clients draw: no timers, no projectile bookkeeping', () => {
    game.e.x = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    const snap = serializeSnapshot(game, 1, meta);
    for (const key of ['rest', 'burnTick', 'burnTime', 'healTick', 'spell', 'cast'])
      expect(snap.you).not.toHaveProperty(key);
    // the opponent's cooldowns and knockback are none of the viewer's business
    for (const key of ['healCD', 'magmaCD', 'kx', 'ky'])
      expect(snap.others[0]).not.toHaveProperty(key);
    // the viewer's own are (HUD, prediction)
    for (const key of ['healCD', 'magmaCD', 'kx', 'ky']) expect(snap.you).toHaveProperty(key);
    expect(Object.keys(snap.shots[0]).sort()).toEqual(
      ['id', 'k', 'owner', 'r', 'vx', 'vy', 'x', 'y'].sort(),
    );
  });

  it("carries a variant shot's variant, so other players see the right spell", () => {
    game.input[0].loadout = { EARTH: 'stone_lance' };
    game.e.x = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.shots[0].variant).toBe('stone_lance');
  });

  it("carries bubbles with their owner's seat, and the viewer's bubble cooldown", () => {
    game.bubbles.push({ x: 123.456, y: 200, r: 90, owner: game.p, life: 100 });
    game.p.bubbleCD = 50;
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.bubbles).toEqual([{ x: 123.5, y: 200, r: 90, life: 100, owner: 0 }]);
    expect(serializeSnapshot(game, 0, meta).bubbles[0].owner).toBe(0);
    expect(snap.others[0]).not.toHaveProperty('bubbleCD');
    expect(serializeSnapshot(game, 0, meta).you).toHaveProperty('bubbleCD', 50);
  });

  it("carries each wizard's charge state, so both players see a charge meter", () => {
    game.p.chargeSpell = 'EARTH';
    game.p.chargeTicks = 30;
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.others[0]).toMatchObject({ chargeSpell: 'EARTH', chargeTicks: 30 });
    expect(snap.you).toMatchObject({ chargeSpell: null });
  });

  it('carries the bomb fuse, so clients can draw the countdown', () => {
    game.bombs.push({ id: 99, x: 1, y: 2, fuse: 40, owner: game.p } as (typeof game.bombs)[0]);
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.bombs.at(-1)).toMatchObject({ id: 99, fuse: 40 });
  });

  it('never carries cosmetics (text, arcs, rings) as state', () => {
    game.labels.push({ x: 0, y: 0, s: 'x', c: '#fff', life: 10 });
    const snap = serializeSnapshot(game, 1, meta);
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
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(1);
  });

  it('a battleground sends the opponent only while they are in sight', () => {
    battleground();
    expect(serializeSnapshot(game, 0, meta).others[0]?.x).toBe(1300);
    game.e.x = 1000 + far;
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(0);
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(0); // and the other way round
    game.e.x = 1000 + BATTLEGROUND_VISION + VISION_MARGIN - 1; // inside the margin
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
  });

  it("the viewer's own wizard is always there, and the snapshot has no trace of a hidden opponent", () => {
    battleground();
    game.e.x = 1000 + far;
    game.e.hp = 77;
    const json = JSON.stringify(serializeSnapshot(game, 0, meta));
    expect(serializeSnapshot(game, 0, meta).you.x).toBe(1000);
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
    const snap = serializeSnapshot(game, 0, meta);
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
    expect(serializeSnapshot(game, 0, meta).zones).toHaveLength(1);
  });

  it('effects out of sight are left out; a lightning bolt counts if either end is in sight', () => {
    battleground();
    const farAt = 1000 + far + 200;
    const snap = serializeSnapshot(game, 0, meta, [
      { type: 'burst', x: farAt, y: 900, c: '#fff', n: 3, power: 3, castOwner: 1 },
      { type: 'text', x: 1100, y: 900, text: 'near', c: '#fff' },
      { type: 'lightning', x: farAt, y: 900, tx: 1100, ty: 900, castOwner: 1 },
      { type: 'lightning', x: farAt, y: 900, tx: farAt + 50, ty: 900, castOwner: 1 },
    ]);
    expect(snap.fx.map((e) => e.type)).toEqual(['text', 'lightning']);
  });

  it('everything is shown once the round is ending', () => {
    battleground();
    game.e.x = 1000 + far;
    game.ending = true;
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
  });
});
