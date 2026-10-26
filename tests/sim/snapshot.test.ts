import { beforeEach, describe, expect, it } from 'vitest';
import { styles, TRAP } from '../../shared/constants';
import { BATTLEGROUND_VISION, mapFor } from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { VISION_MARGIN } from '../../shared/sim/vision';
import { applyInput } from '../../shared/sim/input';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { resolveDeaths } from '../../shared/sim/update/deaths';
import { update } from '../../shared/sim/update';
import type { FxEvent } from '../../shared/types';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel());
const meta = { roundId: 1, seq: 1 };

describe('serializeSnapshot', () => {
  it('survives a JSON round trip (no Sets, no cycles)', () => {
    game.wizards[1].x = 300;
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
    expect(snap.you).toMatchObject({ seat: 1, team: 1, x: game.wizards[1].x });
    expect(snap.others).toHaveLength(1);
    expect(snap.others[0]).toMatchObject({ seat: 0, team: 0, x: game.wizards[0].x });
    const first = serializeSnapshot(game, 0, meta);
    expect(first.you).toMatchObject({ seat: 0, x: game.wizards[0].x });
    expect(first.others[0]).toMatchObject({ seat: 1, x: game.wizards[1].x });
  });

  it('hides an enemy wizard inside a Smoke Bomb cloud from opposing snapshots', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 500;
    game.wizards[1].y = 300;
    game.zones.push({
      x: 300,
      y: 300,
      spell: 'SMOKE',
      r: 150,
      owner: game.wizards[0],
      life: 100,
      tick: 0,
    });

    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(0); // an enemy outside can't see in
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(0); // the caster, inside, can't see out

    game.wizards[0].x = 700; // the caster steps out: the enemy outside sees nobody inside; nobody inside to see
    game.wizards[1].x = 300; // the enemy walks into the cloud
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1); // the caster sees into their own cloud
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(0); // the enemy inside can't see out

    game.wizards[0].x = 300; // both inside: they see each other
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(1);
  });

  it('hides shots and hit text from someone who cannot see where they happen', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.zones.push({
      x: 300,
      y: 300,
      spell: 'SMOKE',
      r: 150,
      owner: game.wizards[0],
      life: 100,
      tick: 0,
    });
    const text = (x: number, seat: number) =>
      ({ type: 'text', x, y: 215, text: '12', color: '#fff', damageOwner: seat }) as const;
    const outsideShot = { x: 600, y: 300, vx: 0, vy: 0, owner: game.wizards[1] };
    game.shots.push({ ...game.shots[0], ...outsideShot } as never);
    const fx = [text(700, 1), text(300, 0)];
    const inside = serializeSnapshot(game, 0, meta, fx);
    expect(inside.shots).toHaveLength(0); // in the smoke you cannot see a shot outside it
    expect(inside.fx.map((e) => (e as { x: number }).x)).toEqual([300]);
    const outside = serializeSnapshot(game, 1, meta, fx);
    expect(outside.shots).toHaveLength(1);
    expect(outside.fx.map((e) => (e as { x: number }).x)).toEqual([700]); // text inside the cloud is hidden
  });

  it('hides a beam with an end in smoke the viewer cannot see into', () => {
    game.wizards[0].x = 700;
    game.wizards[0].y = 300;
    game.wizards[1].x = 600;
    game.wizards[1].y = 300;
    game.zones.push({
      x: 300,
      y: 300,
      spell: 'SMOKE',
      r: 150,
      owner: game.wizards[0],
      life: 100,
      tick: 0,
    });
    const beam = { type: 'lightning', x: 600, y: 300, tx: 300, ty: 300, castOwner: 1 } as const;
    expect(serializeSnapshot(game, 1, meta, [beam]).fx).toHaveLength(0); // the enemy can't see its end
    expect(serializeSnapshot(game, 0, meta, [beam]).fx).toHaveLength(1); // the cloud's caster can
  });

  it('tells everyone which wizards are away (disconnected), the viewer included', () => {
    expect(serializeSnapshot(game, 0, meta).others[0].away).toBe(false);
    game.wizards[1].away = true;
    expect(serializeSnapshot(game, 0, meta).others[0].away).toBe(true);
    expect(serializeSnapshot(game, 1, meta).you.away).toBe(true);
    expect(serializeSnapshot(game, 1, meta).others[0].away).toBe(false);
  });

  it('names owners by seat, the same for every viewer', () => {
    game.wizards[1].x = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    expect(serializeSnapshot(game, 0, meta).shots[0].owner).toBe(0);
    expect(serializeSnapshot(game, 1, meta).shots[0].owner).toBe(0);
  });

  it('names the dead wizard by seat', () => {
    game.wizards[1].hp = 0;
    if (update(game, 1)) resolveDeaths(game);
    expect(serializeSnapshot(game, 1, meta).death?.wizard).toBe(1);
    expect(serializeSnapshot(game, 0, meta).death?.wizard).toBe(1);
  });

  it('carries fx events instead of particles', () => {
    for (let i = 0; i < 200; i++)
      game.particles.push({ x: 0, y: 0, vx: 0, vy: 0, color: '#fff', life: 10, r: 2 });
    const snap = serializeSnapshot(game, 1, meta, [
      { type: 'burst', x: 10.123456, y: 20, color: '#f00', count: 5, power: 4, castOwner: 0 },
    ]);
    expect(snap).not.toHaveProperty('particles');
    expect(snap.fx).toEqual([
      { type: 'burst', x: 10.1, y: 20, color: '#f00', count: 5, power: 4, castOwner: 0 },
    ]);
  });

  it('sends fx events with absolute seats, the same for every viewer', () => {
    const fx: FxEvent[] = [
      { type: 'spray', wizard: 0, x: 1, y: 2, spell: 'FIRE', castOwner: 0 },
      { type: 'burst', x: 1, y: 2, color: '#fff', count: 2, power: 2, castOwner: 1 },
      { type: 'bolt_trail', x: 1, y: 2, spell: 'ICE' },
      { type: 'lightning', x: 1, y: 2, tx: 3, ty: 4, castOwner: 0 },
      { type: 'text', x: 1, y: 2, text: '-14', color: '#fff', damageOwner: 1 },
      { type: 'text', x: 1, y: 2, text: 'BLOCKED!', color: '#fff' },
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
    game.wizards[1].x = 300;
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
      ['id', 'spell', 'owner', 'r', 'vx', 'vy', 'x', 'y'].sort(),
    );
  });

  it("carries a variant shot's variant, so other players see the right spell", () => {
    game.input[0].loadout = { FIRE: 'fireball' };
    game.wizards[1].x = 300;
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.shots[0].variant).toBe('fireball');
  });

  it("marks a reflected shot, so its new owner's client draws it", () => {
    game.input[0].loadout = { FIRE: 'fireball' };
    game.wizards[1].x = 300;
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    expect(serializeSnapshot(game, 1, meta).shots[0]).not.toHaveProperty('reflected');
    game.shots[0].reflected = true;
    expect(serializeSnapshot(game, 1, meta).shots[0].reflected).toBe(true);
  });

  it("carries bubbles with their owner's seat, and the viewer's bubble cooldown", () => {
    game.bubbles.push({ x: 123.456, y: 200, r: 90, owner: game.wizards[0], life: 100 });
    game.wizards[0].bubbleCD = 50;
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.bubbles).toEqual([{ x: 123.5, y: 200, r: 90, life: 100, owner: 0 }]);
    expect(serializeSnapshot(game, 0, meta).bubbles[0].owner).toBe(0);
    expect(snap.others[0]).not.toHaveProperty('bubbleCD');
    expect(serializeSnapshot(game, 0, meta).you).toHaveProperty('bubbleCD', 50);
  });

  it("carries each wizard's charge state, so both players see a charge meter", () => {
    game.wizards[0].chargeSpell = 'EARTH';
    game.wizards[0].chargeTicks = 30;
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.others[0]).toMatchObject({ chargeSpell: 'EARTH', chargeTicks: 30 });
    expect(snap.you).toMatchObject({ chargeSpell: null });
  });

  it('carries the bomb fuse, so clients can draw the countdown', () => {
    game.bombs.push({
      id: 99,
      x: 1,
      y: 2,
      fuse: 40,
      owner: game.wizards[0],
    } as (typeof game.bombs)[0]);
    const snap = serializeSnapshot(game, 1, meta);
    expect(snap.bombs.at(-1)).toMatchObject({ id: 99, fuse: 40 });
  });

  it('never carries cosmetics (text, arcs, rings) as state', () => {
    game.labels.push({ x: 0, y: 0, text: 'x', color: '#fff', life: 10 });
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
    game.wizards[0].x = 1000;
    game.wizards[0].y = 900;
    game.wizards[1].x = 1000 + 300;
    game.wizards[1].y = 900;
  }

  it('arenas send everything, wherever it is', () => {
    game.wizards[1].x = 700;
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(1);
  });

  it('a battleground sends the opponent only while they are in sight', () => {
    battleground();
    expect(serializeSnapshot(game, 0, meta).others[0]?.x).toBe(1300);
    game.wizards[1].x = 1000 + far;
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(0);
    expect(serializeSnapshot(game, 1, meta).others).toHaveLength(0); // and the other way round
    game.wizards[1].x = 1000 + BATTLEGROUND_VISION + VISION_MARGIN - 1; // inside the margin
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
  });

  it("the viewer's own wizard is always there, and the snapshot has no trace of a hidden opponent", () => {
    battleground();
    game.wizards[1].x = 1000 + far;
    game.wizards[1].hp = 77;
    const json = JSON.stringify(serializeSnapshot(game, 0, meta));
    expect(serializeSnapshot(game, 0, meta).you.x).toBe(1000);
    expect(json).not.toContain(String(1000 + far));
    expect(json).not.toContain('"hp":77');
  });

  it("shots, bombs, zones, traps and bubbles out of sight are left out; the viewer's own stay", () => {
    battleground();
    const at = (x: number) => ({ x, y: 900 });
    const base = {
      vx: 0,
      vy: 0,
      spell: 'FIRE',
      r: 5,
      life: 99,
      arm: 0,
      flightProgress: 0,
      landed: true,
      fuse: 9,
    };
    const mk = (owner: (typeof game.wizards)[0], x: number, id: number) => ({
      ...base,
      ...at(x),
      owner,
      id,
    });
    game.shots.push(
      mk(game.wizards[1], 1000 + far, 1) as never,
      mk(game.wizards[1], 1200, 2) as never,
    );
    game.shots.push(mk(game.wizards[0], 1000 + far, 3) as never); // the viewer's own, far away
    game.bombs.push(mk(game.wizards[1], 1000 + far, 4) as never);
    const fresh = { life: TRAP.LIFE - 10 }; // set a moment ago: still visible to its enemies
    game.traps.push(
      { ...mk(game.wizards[1], 1000 + far, 5), ...fresh } as never,
      { ...mk(game.wizards[1], 1100, 6), ...fresh } as never,
    );
    game.zones.push(mk(game.wizards[1], 1000 + far, 7) as never);
    game.bubbles.push(mk(game.wizards[1], 1000 + far, 8) as never);
    const snap = serializeSnapshot(game, 0, meta);
    expect(snap.shots.map((s) => s.id)).toEqual([2, 3]);
    expect(snap.bombs).toHaveLength(0);
    expect(snap.traps.map((t) => t.id)).toEqual([6]);
    expect(snap.zones).toHaveLength(0);
    expect(snap.bubbles).toHaveLength(0);
  });

  it('a big zone or bubble whose edge reaches into sight is sent', () => {
    battleground();
    const zone = {
      x: 1000 + far + 100,
      y: 900,
      r: 200,
      spell: 'FIRE',
      life: 50,
      owner: game.wizards[1],
    };
    game.zones.push(zone as never);
    expect(serializeSnapshot(game, 0, meta).zones).toHaveLength(1);
  });

  it('effects out of sight are left out; a lightning bolt counts if either end is in sight', () => {
    battleground();
    const farAt = 1000 + far + 200;
    const snap = serializeSnapshot(game, 0, meta, [
      { type: 'burst', x: farAt, y: 900, color: '#fff', count: 3, power: 3, castOwner: 1 },
      { type: 'text', x: 1100, y: 900, text: 'near', color: '#fff' },
      { type: 'lightning', x: farAt, y: 900, tx: 1100, ty: 900, castOwner: 1 },
      { type: 'lightning', x: farAt, y: 900, tx: farAt + 50, ty: 900, castOwner: 1 },
    ]);
    expect(snap.fx.map((e) => e.type)).toEqual(['text', 'lightning']);
  });

  it('everything is shown once the round is ending', () => {
    battleground();
    game.wizards[1].x = 1000 + far;
    game.ending = true;
    expect(serializeSnapshot(game, 0, meta).others).toHaveLength(1);
  });
});
