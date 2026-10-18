import { beforeEach, describe, expect, it } from 'vitest';
import { BEAM } from '../../shared/constants';
import { beamAngle, beamPoint } from '../../shared/sim/aim';
import { applyInput } from '../../shared/sim/input';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.p.x = 200;
  game.p.y = 300;
  game.e.x = 700;
  game.e.y = 300;
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
    expect(game.p.beamAim).toBeCloseTo(0);
    applyInput(game, 0, { kind: 'aim', x: 200, y: 700 }); // straight down: a quarter turn
    let last = game.p.beamAim as number;
    for (let i = 0; i < 5; i++) {
      run(1);
      expect((game.p.beamAim as number) - last).toBeLessThanOrEqual(BEAM.TURN_RATE + 1e-9);
      last = game.p.beamAim as number;
    }
    expect(last).toBeLessThan(0.3);
    game.events.length = 0;
    run(10);
    const ev = sprays().at(-1) as { x: number; y: number };
    expect(Math.atan2(ev.y - game.p.y, ev.x - game.p.x)).toBeLessThan(Math.PI / 4);
    run(Math.ceil(Math.PI / 2 / BEAM.TURN_RATE));
    expect(game.p.beamAim).toBeCloseTo(Math.PI / 2);
  });

  it('forgets the aim when the button is released, and starts at the cursor next time', () => {
    hold(700, 300);
    run(3);
    release();
    run(1);
    expect(game.p.beamAim).toBeNull();
    applyInput(game, 0, { kind: 'aim', x: 200, y: 700 });
    applyInput(game, 0, { kind: 'pointerdown', x: 200, y: 700 });
    run(1);
    expect(game.p.beamAim).toBeCloseTo(Math.PI / 2);
  });
});

describe('the wait after a beam or spray is released', () => {
  it('blocks the same spray for BEAM.COOLDOWN_TICKS, then it fires again', () => {
    hold(700, 300);
    run(10);
    expect(sprays().length).toBeGreaterThan(0);
    release();
    run(1);
    expect(game.p.fireCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
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
    expect(game.p.lightCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
    resetDuel();
    game.input[0].loadout = { PLASMA: 'plasma_beam' };
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Digit3'));
    applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
    run(5);
    release();
    run(1);
    expect(game.p.fireCD).toBeGreaterThan(BEAM.COOLDOWN_TICKS - 3);
  });

  it('does not touch a spell that is not held to fire', () => {
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
    run(5);
    release();
    run(1);
    expect(game.p.earthCD).toBeLessThanOrEqual(40);
    expect(game.p.fireCD).toBe(0);
  });
});

describe('burn numbers', () => {
  const burnTexts = () => game.events.filter((ev) => ev.type === 'text' && ev.text.includes('🔥'));

  it('show over a burning wizard', () => {
    game.e.burn = 100;
    game.e.burnTime = 180;
    run(60);
    expect(burnTexts().length).toBeGreaterThan(0);
  });

  it('stop over a wizard who has fallen, including numbers already waiting', () => {
    game.e.burn = 100;
    game.e.burnTime = 180;
    run(31); // a burn tick has been queued
    game.events.length = 0;
    game.e.fallen = true;
    const hp = game.e.hp;
    run(90);
    expect(burnTexts()).toHaveLength(0);
    expect(game.e.hp).toBe(hp);
  });
});
