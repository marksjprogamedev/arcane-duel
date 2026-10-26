import { beforeEach, describe, expect, it } from 'vitest';
import { BEAM, pillars } from '../../shared/constants';
import { beamAngle, beamPoint } from '../../shared/sim/aim';
import { cast } from '../../shared/sim/combat/cast';
import { applyInput } from '../../shared/sim/input';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.wizards[0].x = 200;
  game.wizards[0].y = 300;
  game.wizards[1].x = 700;
  game.wizards[1].y = 300;
});

const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) update(game, 1);
};
const sprays = () => game.events.filter((ev) => ev.type === 'spray');
const hold = (x: number, y: number, key = 'Digit1') => {
  applyInput(game, 0, press(key));
  applyInput(game, 0, { kind: 'aim', x, y });
  applyInput(game, 0, { kind: 'pointerdown', x, y });
};
const release = () => applyInput(game, 0, { kind: 'pointerup', x: 700, y: 300 });

describe('beam aim turn rate', () => {
  it('turns toward the cursor, at most BEAM.TURN_RATE a tick, and gets there', () => {
    const origin = { x: 0, y: 0 };
    expect(beamAngle(null, origin, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
    expect(beamAngle(0, origin, { x: 0, y: 10 })).toBeCloseTo(BEAM.TURN_RATE);
    expect(beamAngle(0, origin, { x: 0, y: 10 }, 3)).toBeCloseTo(BEAM.TURN_RATE * 3);
    expect(beamAngle(0, origin, { x: 10, y: 0 })).toBe(0);
    // the short way round, across the +/- pi seam
    expect(beamAngle(Math.PI - 0.01, origin, { x: -10, y: -1 })).toBeGreaterThan(Math.PI - 0.01);
    const at = beamPoint({ x: 100, y: 100 }, Math.PI / 2, { x: 130, y: 140 });
    expect(at.x).toBeCloseTo(100);
    expect(at.y).toBeCloseTo(150);
  });

  it("a held spray follows a flicked cursor slowly, and the server's spray event carries the turned aim", () => {
    hold(700, 300);
    run(2);
    expect(game.wizards[0].beamAim).toBeCloseTo(0);
    applyInput(game, 0, { kind: 'aim', x: 200, y: 700 }); // straight down: a quarter turn
    let last = game.wizards[0].beamAim as number;
    for (let i = 0; i < 5; i++) {
      run(1);
      expect((game.wizards[0].beamAim as number) - last).toBeLessThanOrEqual(BEAM.TURN_RATE + 1e-9);
      last = game.wizards[0].beamAim as number;
    }
    expect(last).toBeLessThan(0.3);
    game.events.length = 0;
    run(10);
    const ev = sprays().at(-1) as { x: number; y: number };
    expect(Math.atan2(ev.y - game.wizards[0].y, ev.x - game.wizards[0].x)).toBeLessThan(
      Math.PI / 4,
    );
    run(Math.ceil(Math.PI / 2 / BEAM.TURN_RATE));
    expect(game.wizards[0].beamAim).toBeCloseTo(Math.PI / 2);
  });

  it('forgets the aim when the button is released, and starts at the cursor next time', () => {
    hold(700, 300);
    run(3);
    release();
    run(1);
    expect(game.wizards[0].beamAim).toBeNull();
    applyInput(game, 0, { kind: 'aim', x: 200, y: 700 });
    applyInput(game, 0, { kind: 'pointerdown', x: 200, y: 700 });
    run(1);
    expect(game.wizards[0].beamAim).toBeCloseTo(Math.PI / 2);
  });
});

describe('the wait after a beam or spray is released', () => {
  it('blocks the same spray for BEAM.COOLDOWN_TICKS, then it fires again', () => {
    hold(700, 300);
    run(10);
    expect(sprays().length).toBeGreaterThan(0);
    release();
    run(1);
    expect(game.wizards[0].fireCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
    game.events.length = 0;
    applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
    run(BEAM.COOLDOWN_TICKS - 10);
    expect(sprays()).toHaveLength(0);
    run(15);
    expect(sprays().length).toBeGreaterThan(0);
  });

  it('applies to Lightning and to the Plasma Beam variant too', () => {
    hold(700, 300, 'Digit3');
    run(5);
    release();
    run(1);
    expect(game.wizards[0].lightCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
    resetDuel();
    game.input[0].loadout = { PLASMA: 'plasma_beam' };
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Digit3'));
    applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
    run(5);
    release();
    run(1);
    // the beam is Plasma's own spell: it waits on Plasma's timer and leaves Fire's alone
    expect(game.wizards[0].plasmaCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
    expect(game.wizards[0].fireCD).toBe(0);
  });

  it('does not touch a spell that is not held to fire', () => {
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
    run(5);
    release();
    run(1);
    expect(game.wizards[0].earthCD).toBeLessThanOrEqual(40);
    expect(game.wizards[0].fireCD).toBe(0);
  });
});

describe('burn numbers', () => {
  const burnTexts = () => game.events.filter((ev) => ev.type === 'text' && ev.text.includes('🔥'));

  it('show over a burning wizard', () => {
    game.wizards[1].burn = 100;
    game.wizards[1].burnTime = 180;
    run(60);
    expect(burnTexts().length).toBeGreaterThan(0);
  });

  it('stop over a wizard who has fallen, including numbers already waiting', () => {
    game.wizards[1].burn = 100;
    game.wizards[1].burnTime = 180;
    run(31); // a burn tick has been queued
    game.events.length = 0;
    game.wizards[1].fallen = true;
    const hp = game.wizards[1].hp;
    run(90);
    expect(burnTexts()).toHaveLength(0);
    expect(game.wizards[1].hp).toBe(hp);
  });
});

describe('Lightning collision', () => {
  it('damages the nearest target when no obstacle blocks the bolt', () => {
    game.wizards[1].x = 400;
    cast(game, game.wizards[0], 700, 300, 1, 'LIGHTNING');
    expect(game.damageBatches.has('1:direct')).toBe(true);
  });

  it('stops at a pillar and does not damage a target behind it', () => {
    const pillar = pillars[0];
    game.wizards[0].x = pillar.x - 125;
    game.wizards[0].y = pillar.y;
    game.wizards[1].x = pillar.x + 100;
    game.wizards[1].y = pillar.y;
    cast(game, game.wizards[0], game.wizards[1].x, game.wizards[1].y, 1, 'LIGHTNING');
    expect(game.wizards[1].hp).toBe(200);
    expect(game.damageBatches.has('1:direct')).toBe(false);
    const event = game.events.find((e) => e.type === 'lightning');
    expect(event).toMatchObject({ type: 'lightning' });
    if (event?.type === 'lightning') expect(event.tx).toBeCloseTo(pillar.x - 31);
  });

  it('stops Plasma Beam at the painted face without changing wizard movement clearance', () => {
    const pillar = pillars[0];
    game.wizards[0].x = pillar.x - 125;
    game.wizards[0].y = pillar.y;
    game.wizards[1].x = pillar.x + 100;
    game.wizards[1].y = pillar.y;
    cast(game, game.wizards[0], game.wizards[1].x, game.wizards[1].y, 1, 'PLASMA', {
      PLASMA: 'plasma_beam',
    });
    expect(game.wizards[1].hp).toBe(game.wizards[1].max);
    const event = game.events.find((e) => e.type === 'lightning' && e.variant === 'plasma_beam');
    expect(event).toMatchObject({ type: 'lightning', variant: 'plasma_beam' });
    if (event?.type === 'lightning') expect(event.tx).toBeCloseTo(pillar.x - 32);
  });
});

describe('every spell variant keeps its own cooldown', () => {
  it('Thundercloud and Water Surge do not share a cooldown', () => {
    resetDuel();
    cast(game, game.wizards[0], 400, 300, 1, 'WATER', { WATER: 'water_surge' });
    expect(game.wizards[0].waterCD).toBeGreaterThan(0);
    expect(cast(game, game.wizards[0], 400, 300, 1, 'STORM', { STORM: 'thundercloud' })).toBe(true);
    expect(game.wizards[0].stormCD).toBeGreaterThan(0);
    resetDuel();
    cast(game, game.wizards[0], 400, 300, 1, 'STORM', { STORM: 'thundercloud' });
    expect(game.wizards[0].waterCD).toBe(0);
    expect(cast(game, game.wizards[0], 400, 300, 1, 'WATER', { WATER: 'water_surge' })).toBe(true);
  });
  it('Magnetic Pull and Frost Shards leave Earth alone', () => {
    resetDuel();
    cast(game, game.wizards[0], 700, 300, 1, 'MAGNETIC', { MAGNETIC: 'magnetic_pull' });
    expect(game.wizards[0].earthCD).toBe(0);
    expect(game.wizards[0].magneticCD).toBeGreaterThan(0);
    resetDuel();
    cast(game, game.wizards[0], 700, 300, 1, 'ICE', { ICE: 'shards' });
    expect(game.wizards[0].earthCD).toBe(0);
    expect(game.wizards[0].iceCD).toBeGreaterThan(0);
  });
});
