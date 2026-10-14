import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { hit } from '../../shared/sim/combat';
import { CHARGE_SPELLS, CHARGE_MOVEMENT_MULTIPLIER, CHARGE_METER_DELAY_TICKS, showChargeMeter } from '../../shared/charge';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) {
    if (update(game, 1)) resolveDeaths(game);
  }
};

describe('world step', () => {
  it('advances game time and returns true during play', () => {
    expect(update(game, 1)).toBe(true);
    expect(game.t).toBe(1);
  });

  it('moves a wizard while a movement key is held', () => {
    const x0 = game.p.x;
    applyInput(game, 'p', press('KeyD'));
    run(10);
    expect(game.p.x).toBeGreaterThan(x0);
  });

  it('moves the remote wizard from its own input', () => {
    const x0 = game.e.x;
    applyInput(game, 'e', press('KeyA'));
    run(10);
    expect(game.e.x).toBeLessThan(x0);
  });
});

describe('combat', () => {
  it('an earth shot at a close target deals damage', () => {
    game.e.x = 300;
    game.e.y = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    run(60);
    expect(game.e.hp).toBeLessThan(200);
    expect(game.p.hp).toBe(200);
  });

  it('a held fire spray damages a target in range', () => {
    game.e.x = 300;
    game.e.y = 300;
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    run(90);
    expect(game.e.hp).toBeLessThan(200);
  });

  it('a matching shield blocks earth damage', () => {
    game.e.x = 300;
    game.e.y = 300;
    applyInput(game, 'e', press('Digit4'));
    applyInput(game, 'e', press('Space'));
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    run(60);
    expect(game.e.hp).toBe(200);
  });
});

describe('end of round events', () => {
  it('emits a death event and enters the ending state when a wizard dies', () => {
    game.e.hp = 0;
    run(1);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
    expect(game.events).toContainEqual({ type: 'death', loser: 'e', winner: true });
  });

  it('player p dying means defeat', () => {
    game.p.hp = 0;
    run(1);
    expect(game.winner).toBe(false);
    expect(game.events).toContainEqual({ type: 'death', loser: 'p', winner: false });
  });

  it('update returns false during the ending animation and finally emits round_over', () => {
    game.e.hp = 0;
    run(1);
    game.events = [];
    expect(update(game, 1)).toBe(false);
    for (let i = 0; i < 120; i++) update(game, 1);
    expect(game.events).toContainEqual({ type: 'round_over' });
  });

  it('does not accept new input after the round ends', () => {
    game.e.hp = 0;
    run(1);
    applyInput(game, 'p', press('Digit1'));
    expect(game.input.p.loaded).toEqual([]);
  });
});

describe('telegraphed charge and speed penalty', () => {
  for (const spell of CHARGE_SPELLS) {
    it(`charges and reveals ${spell} to both players`, () => {
      game.input.p.attack = spell;
      applyInput(game, 'p', { kind: 'pointerdown', x: 400, y: 300 });
      run(30);
      expect(game.p.chargeSpell).toBe(spell);
      expect(game.p.chargeTicks).toBe(30);
      const viewer = serializeSnapshot(game, 'e', { roundId: 1, seq: 1 });
      expect(viewer.p.chargeSpell).toBe(spell);
      expect(viewer.p.chargeTicks).toBe(30);
      applyInput(game, 'p', { kind: 'pointerup', x: 400, y: 300 });
      expect(game.p.chargeSpell).toBeNull();
    });
  }
  it('reduces movement by 45% while charging and restores it on release', () => {
    game.p.x = 350; game.p.y = 300;
    applyInput(game, 'p', press('KeyD'));
    const baseline = game.p.x;
    run(1);
    const normal = game.p.x - baseline;
    game.input.p.attack = 'ICE';
    applyInput(game, 'p', { kind: 'pointerdown', x: 600, y: 300 });
    const before = game.p.x;
    run(1);
    expect(game.p.x - before).toBeCloseTo(normal * CHARGE_MOVEMENT_MULTIPLIER);
    applyInput(game, 'p', { kind: 'pointerup', x: 600, y: 300 });
    const after = game.p.x;
    run(1);
    expect(game.p.x - after).toBeCloseTo(normal);
  });
  it('slows the remote online player as well', () => {
    game.e.x = 400; game.e.y = 300;
    game.input.e.attack = 'STORM';
    applyInput(game, 'e', press('KeyA'));
    applyInput(game, 'e', { kind: 'pointerdown', x: 150, y: 300 });
    const start = game.e.x;
    run(1);
    expect(start - game.e.x).toBeCloseTo(3.5 * CHARGE_MOVEMENT_MULTIPLIER);
    const view = serializeSnapshot(game, 'p', { roundId: 1, seq: 1 });
    expect(view.p.chargeSpell).toBe('STORM');
  });
  it('does not slow the continuous FIRE, WATER or LIGHTNING spells', () => {
    for (const spell of ['FIRE', 'WATER', 'LIGHTNING'] as const) {
      resetDuel();
      game.p.x = 350;
      game.input.p.attack = spell;
      applyInput(game, 'p', press('KeyD'));
      applyInput(game, 'p', { kind: 'pointerdown', x: 700, y: 300 });
      const x = game.p.x;
      run(1);
      expect(game.p.chargeSpell).toBeNull();
      expect(game.p.x - x).toBeCloseTo(3.5);
    }
  });
});

describe('charge meter display threshold', () => {
  it('does not show a meter for quick clicks', () => {
    game.input.p.attack = 'EARTH';
    applyInput(game, 'p', { kind: 'pointerdown', x: 450, y: 300 });
    run(CHARGE_METER_DELAY_TICKS - 1);
    expect(showChargeMeter(game.p.chargeTicks, game.p.chargeSpell)).toBe(false);
    applyInput(game, 'p', { kind: 'pointerup', x: 450, y: 300 });
    expect(showChargeMeter(game.p.chargeTicks, game.p.chargeSpell)).toBe(false);
  });
  it('shows the correct meter after holding long enough', () => {
    for (const spell of CHARGE_SPELLS) {
      resetDuel();
      game.input.p.attack = spell;
      applyInput(game, 'p', { kind: 'pointerdown', x: 450, y: 300 });
      run(CHARGE_METER_DELAY_TICKS);
      expect(showChargeMeter(game.p.chargeTicks, game.p.chargeSpell)).toBe(true);
    }
  });
  it('keeps the charge speed penalty effective before the visual meter appears', () => {
    game.p.x = 350;
    game.input.p.attack = 'ICE';
    applyInput(game, 'p', press('KeyD'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 600, y: 300 });
    const x = game.p.x;
    run(1);
    expect(game.p.x - x).toBeCloseTo(3.5 * CHARGE_MOVEMENT_MULTIPLIER);
    expect(showChargeMeter(game.p.chargeTicks, game.p.chargeSpell)).toBe(false);
  });
});

describe('Magma cooldown gates charging', () => {
  it('does not start charging or slow movement during Magma cooldown', () => {
    game.input.p.attack = 'MAGMA';
    game.p.magmaCD = 100;
    applyInput(game, 'p', press('KeyD'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 500, y: 300 });
    run(30);
    expect(game.input.p.holding).toBe(false);
    expect(game.p.chargeSpell).toBeNull();
    expect(game.p.chargeTicks).toBe(0);
    expect(game.p.x).toBeGreaterThan(155 + 30 * 3);
  });
  it('permits charging after the cooldown expires on a new press', () => {
    game.input.p.attack = 'MAGMA';
    game.p.magmaCD = 2;
    applyInput(game, 'p', { kind: 'pointerdown', x: 500, y: 300 });
    run(3);
    expect(game.p.chargeSpell).toBeNull();
    applyInput(game, 'p', { kind: 'pointerup', x: 500, y: 300 });
    applyInput(game, 'p', { kind: 'pointerdown', x: 500, y: 300 });
    run(15);
    expect(game.p.chargeSpell).toBe('MAGMA');
    expect(game.p.chargeTicks).toBe(15);
  });
  it('also blocks charging for the remote online wizard', () => {
    game.input.e.attack = 'MAGMA';
    game.e.magmaCD = 90;
    applyInput(game, 'e', { kind: 'pointerdown', x: 150, y: 300 });
    run(20);
    expect(game.e.chargeSpell).toBeNull();
    expect(game.e.chargeTicks).toBe(0);
  });
});

describe('completed freeze clears Chill', () => {
  it('resets Chill to zero when a full freeze ends', () => {
    game.p.chill = 100;
    game.p.freeze = 1;
    game.p.rest.chill = 160;
    run(1);
    expect(game.p.freeze).toBe(0);
    expect(game.p.chill).toBe(0);
    expect(game.p.rest.chill).toBe(0);
  });
  it('keeps partial Chill and the other status meters unchanged', () => {
    game.p.chill = 75;
    game.p.freeze = 0;
    game.p.rest.chill = 100;
    game.p.wet = 80;
    game.p.rest.wet = 100;
    run(1);
    expect(game.p.chill).toBe(75);
    expect(game.p.wet).toBe(80);
  });
  it('does not clear Chill before the freeze finishes', () => {
    game.p.chill = 100;
    game.p.freeze = 30;
    game.p.rest.chill = 160;
    run(1);
    expect(game.p.chill).toBe(100);
  });
});

describe('ice freeze timer cannot be refreshed', () => {
  it('does not extend an active freeze on repeated Ice hits', () => {
    game.e.chill = 100;
    game.e.freeze = 25;
    game.e.rest.chill = 160;
    hit(game, game.e, 'ICE', 0, true, false);
    hit(game, game.e, 'ICE', 0, false, true);
    expect(game.e.freeze).toBe(25);
    expect(game.e.chill).toBe(100);
    run(25);
    expect(game.e.freeze).toBe(0);
    expect(game.e.chill).toBe(0);
  });
  it('still freezes again only after rebuilding Chill from zero', () => {
    game.e.chill = 100;
    game.e.freeze = 1;
    run(1);
    hit(game, game.e, 'ICE', 0);
    expect(game.e.chill).toBe(25);
    expect(game.e.freeze).toBe(0);
  });
});
