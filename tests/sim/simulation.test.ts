import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { FREEZE_TICKS, pillars } from '../../shared/constants';
import { WALK_SPEED } from '../../shared/sim/movement';
import { hit } from '../../shared/sim/combat/damage';
import { DEFAULT_MAP } from '../../shared/maps';
import { walk } from '../../shared/sim/geometry';
import {
  CHARGE_SPELLS,
  CHARGE_MOVEMENT_MULTIPLIER,
  CHARGE_METER_DELAY_TICKS,
  CHARGE_TICKS,
  MAX_HOLD_TICKS,
  showChargeMeter,
} from '../../shared/charge';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { resolveDeaths } from '../../shared/sim/update/deaths';
import { update } from '../../shared/sim/update';
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
    const x0 = game.wizards[0].x;
    applyInput(game, 0, press('KeyD'));
    run(10);
    expect(game.wizards[0].x).toBeGreaterThan(x0);
  });

  it('moves the remote wizard from its own input', () => {
    const x0 = game.wizards[1].x;
    applyInput(game, 1, press('KeyA'));
    run(10);
    expect(game.wizards[1].x).toBeLessThan(x0);
  });
});

describe('combat', () => {
  it('an earth shot at a close target deals damage', () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    run(60);
    expect(game.wizards[1].hp).toBeLessThan(200);
    expect(game.wizards[0].hp).toBe(200);
  });

  it('a held fire spray damages a target in range', () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    run(90);
    expect(game.wizards[1].hp).toBeLessThan(200);
  });

  it('a matching shield blocks earth damage', () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    applyInput(game, 1, press('Digit4'));
    applyInput(game, 1, press('Space'));
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    run(60);
    expect(game.wizards[1].hp).toBe(200);
  });
});

describe('end of round events', () => {
  it('emits a death event and enters the ending state when a wizard dies', () => {
    game.wizards[1].hp = 0;
    run(1);
    expect(game.ending).toBe(true);
    expect(game.winner).toBe(true);
    expect(game.events).toContainEqual({ type: 'death', loser: 1, winner: true });
  });

  it('player p dying means defeat', () => {
    game.wizards[0].hp = 0;
    run(1);
    expect(game.winner).toBe(false);
    expect(game.events).toContainEqual({ type: 'death', loser: 0, winner: false });
  });

  it('update returns false during the ending animation and finally emits round_over', () => {
    game.wizards[1].hp = 0;
    run(1);
    game.events = [];
    expect(update(game, 1)).toBe(false);
    for (let i = 0; i < 120; i++) update(game, 1);
    expect(game.events).toContainEqual({ type: 'round_over' });
  });

  it('does not accept new input after the round ends', () => {
    game.wizards[1].hp = 0;
    run(1);
    applyInput(game, 0, press('Digit1'));
    expect(game.input[0].loaded).toEqual([]);
  });
});

describe('telegraphed charge and speed penalty', () => {
  for (const spell of CHARGE_SPELLS) {
    it(`charges and reveals ${spell} to both players`, () => {
      game.input[0].attack = spell;
      applyInput(game, 0, { kind: 'pointerdown', x: 400, y: 300 });
      run(30);
      expect(game.wizards[0].chargeSpell).toBe(spell);
      expect(game.wizards[0].chargeTicks).toBe(30);
      const viewer = serializeSnapshot(game, 1, { roundId: 1, seq: 1 });
      expect(viewer.others[0].chargeSpell).toBe(spell);
      expect(viewer.others[0].chargeTicks).toBe(30);
      applyInput(game, 0, { kind: 'pointerup', x: 400, y: 300 });
      expect(game.wizards[0].chargeSpell).toBeNull();
    });
  }
  it('reduces movement by 45% while charging and restores it on release', () => {
    game.wizards[0].x = 350;
    game.wizards[0].y = 300;
    applyInput(game, 0, press('KeyD'));
    const baseline = game.wizards[0].x;
    run(1);
    const normal = game.wizards[0].x - baseline;
    game.input[0].attack = 'ICE';
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    run(CHARGE_METER_DELAY_TICKS);
    const before = game.wizards[0].x;
    run(1);
    expect(game.wizards[0].x - before).toBeCloseTo(normal * CHARGE_MOVEMENT_MULTIPLIER);
    applyInput(game, 0, { kind: 'pointerup', x: 600, y: 300 });
    const after = game.wizards[0].x;
    run(1);
    expect(game.wizards[0].x - after).toBeCloseTo(normal);
  });
  it('slows the remote online player as well', () => {
    game.wizards[1].x = 400;
    game.wizards[1].y = 300;
    game.input[1].attack = 'STORM';
    applyInput(game, 1, press('KeyA'));
    applyInput(game, 1, { kind: 'pointerdown', x: 150, y: 300 });
    run(CHARGE_METER_DELAY_TICKS);
    const start = game.wizards[1].x;
    run(1);
    expect(start - game.wizards[1].x).toBeCloseTo(WALK_SPEED * CHARGE_MOVEMENT_MULTIPLIER);
    const view = serializeSnapshot(game, 0, { roundId: 1, seq: 1 });
    expect(view.others[0].chargeSpell).toBe('STORM');
  });
  it('does not slow the continuous FIRE, WATER or LIGHTNING spells', () => {
    for (const spell of ['FIRE', 'WATER', 'LIGHTNING'] as const) {
      resetDuel();
      game.wizards[0].x = 350;
      game.input[0].attack = spell;
      applyInput(game, 0, press('KeyD'));
      applyInput(game, 0, { kind: 'pointerdown', x: 700, y: 300 });
      const x = game.wizards[0].x;
      run(1);
      expect(game.wizards[0].chargeSpell).toBeNull();
      expect(game.wizards[0].x - x).toBeCloseTo(WALK_SPEED);
    }
  });
});

describe('charge meter display threshold', () => {
  it('does not show a meter for quick clicks', () => {
    game.input[0].attack = 'EARTH';
    applyInput(game, 0, { kind: 'pointerdown', x: 450, y: 300 });
    run(CHARGE_METER_DELAY_TICKS - 1);
    expect(showChargeMeter(game.wizards[0].chargeTicks, game.wizards[0].chargeSpell)).toBe(false);
    applyInput(game, 0, { kind: 'pointerup', x: 450, y: 300 });
    expect(showChargeMeter(game.wizards[0].chargeTicks, game.wizards[0].chargeSpell)).toBe(false);
  });
  it('shows the correct meter after holding long enough', () => {
    for (const spell of CHARGE_SPELLS) {
      resetDuel();
      game.input[0].attack = spell;
      applyInput(game, 0, { kind: 'pointerdown', x: 450, y: 300 });
      run(CHARGE_METER_DELAY_TICKS);
      expect(showChargeMeter(game.wizards[0].chargeTicks, game.wizards[0].chargeSpell)).toBe(true);
    }
  });
  it('does not slow a plain click, only a charge that is really building', () => {
    game.wizards[0].x = 350;
    game.input[0].attack = 'ICE';
    applyInput(game, 0, press('KeyD'));
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    const x = game.wizards[0].x;
    run(CHARGE_METER_DELAY_TICKS - 1);
    expect(game.wizards[0].x - x).toBeCloseTo((CHARGE_METER_DELAY_TICKS - 1) * WALK_SPEED);
    const slowed = game.wizards[0].x;
    run(1);
    expect(game.wizards[0].x - slowed).toBeCloseTo(WALK_SPEED * CHARGE_MOVEMENT_MULTIPLIER);
  });
});

describe('charge auto-release', () => {
  it('casts by itself 3 seconds after reaching full charge', () => {
    game.input[0].attack = 'ICE';
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    run(MAX_HOLD_TICKS - 1);
    expect(game.input[0].holding).toBe(true);
    expect(game.shots).toHaveLength(0);
    run(1);
    expect(game.input[0].holding).toBe(false);
    expect(game.wizards[0].chargeSpell).toBeNull();
    expect(game.shots).toHaveLength(1);
    // the later real release is a no-op: nothing fires twice
    applyInput(game, 0, { kind: 'pointerup', x: 600, y: 300 });
    expect(game.shots).toHaveLength(1);
  });
  it('fires at full power however long it was held', () => {
    game.input[0].attack = 'ICE';
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    run(MAX_HOLD_TICKS);
    expect(game.shots[0].damage).toBeGreaterThan(0);
    expect(game.wizards[0].chargeTicks).toBe(0);
  });
  it('shows a full meter, not more, while waiting for the auto-release', () => {
    game.input[0].attack = 'ICE';
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    run(CHARGE_TICKS + 100);
    expect(game.wizards[0].chargeTicks).toBe(CHARGE_TICKS);
  });
});

describe('Magma cooldown gates charging', () => {
  it('does not start charging or slow movement during Magma cooldown', () => {
    game.input[0].attack = 'MAGMA';
    game.wizards[0].magmaCD = 100;
    applyInput(game, 0, press('KeyD'));
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    const startX = game.wizards[0].x;
    run(30);
    expect(game.input[0].holding).toBe(false);
    expect(game.wizards[0].chargeSpell).toBeNull();
    expect(game.wizards[0].chargeTicks).toBe(0);
    expect(game.wizards[0].x - startX).toBeCloseTo(30 * WALK_SPEED); // full speed: not slowed
  });
  it('permits charging after the cooldown expires on a new press', () => {
    game.input[0].attack = 'MAGMA';
    game.wizards[0].magmaCD = 2;
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    run(3);
    expect(game.wizards[0].chargeSpell).toBeNull();
    applyInput(game, 0, { kind: 'pointerup', x: 500, y: 300 });
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    run(15);
    expect(game.wizards[0].chargeSpell).toBe('MAGMA');
    expect(game.wizards[0].chargeTicks).toBe(15);
  });
  it('also blocks charging for the remote online wizard', () => {
    game.input[1].attack = 'MAGMA';
    game.wizards[1].magmaCD = 90;
    applyInput(game, 1, { kind: 'pointerdown', x: 150, y: 300 });
    run(20);
    expect(game.wizards[1].chargeSpell).toBeNull();
    expect(game.wizards[1].chargeTicks).toBe(0);
  });
});

describe('completed freeze clears Chill', () => {
  it('resets Chill to zero when a full freeze ends', () => {
    game.wizards[0].chill = 100;
    game.wizards[0].freeze = 1;
    game.wizards[0].rest.chill = 160;
    run(1);
    expect(game.wizards[0].freeze).toBe(0);
    expect(game.wizards[0].chill).toBe(0);
    expect(game.wizards[0].rest.chill).toBe(0);
  });
  it('keeps partial Chill and the other status meters unchanged', () => {
    game.wizards[0].chill = 75;
    game.wizards[0].freeze = 0;
    game.wizards[0].rest.chill = 100;
    game.wizards[0].wet = 80;
    game.wizards[0].rest.wet = 100;
    run(1);
    expect(game.wizards[0].chill).toBe(75);
    expect(game.wizards[0].wet).toBe(80);
  });
  it('does not clear Chill before the freeze finishes', () => {
    game.wizards[0].chill = 100;
    game.wizards[0].freeze = 30;
    game.wizards[0].rest.chill = 160;
    run(1);
    expect(game.wizards[0].chill).toBe(100);
  });
});

describe('ice freeze timer cannot be refreshed', () => {
  it('does not extend an active freeze on repeated Ice hits', () => {
    game.wizards[1].chill = 100;
    game.wizards[1].freeze = 25;
    game.wizards[1].rest.chill = 160;
    hit(game, game.wizards[1], 'ICE', 0, true, false);
    hit(game, game.wizards[1], 'ICE', 0, false, true);
    expect(game.wizards[1].freeze).toBe(25);
    expect(game.wizards[1].chill).toBe(100);
    run(25);
    expect(game.wizards[1].freeze).toBe(0);
    expect(game.wizards[1].chill).toBe(0);
  });
  it('records how long the freeze started at, for the countdown', () => {
    hit(game, game.wizards[1], 'ICE', 0, false, true); // ice bomb
    expect(game.wizards[1].freezeMax).toBe(FREEZE_TICKS.BOMB);
    run(40); // the length stays put while the timer runs down
    expect(game.wizards[1].freeze).toBeLessThan(FREEZE_TICKS.CHILL);
    expect(game.wizards[1].freezeMax).toBe(FREEZE_TICKS.BOMB);
  });
  it('still freezes again only after rebuilding Chill from zero', () => {
    game.wizards[1].chill = 100;
    game.wizards[1].freeze = 1;
    run(1);
    hit(game, game.wizards[1], 'ICE', 0);
    expect(game.wizards[1].chill).toBe(25);
    expect(game.wizards[1].freeze).toBe(0);
  });
});

describe('fire melts a frozen wizard', () => {
  it('thaws the target, clears Chill and still burns and hurts', () => {
    game.wizards[1].freeze = 100;
    game.wizards[1].chill = 100;
    const hp = game.wizards[1].hp;
    hit(game, game.wizards[1], 'FIRE', 10);
    expect(game.wizards[1].freeze).toBe(0);
    expect(game.wizards[1].chill).toBe(0);
    expect(game.wizards[1].burn).toBeGreaterThan(0);
    expect(game.wizards[1].hp).toBeLessThan(hp);
  });
  it('is not done by a hit that is not fire', () => {
    game.wizards[1].freeze = 100;
    hit(game, game.wizards[1], 'WATER', 10);
    expect(game.wizards[1].freeze).toBe(100);
  });
});

describe('tree-line arena boundaries', () => {
  it('blocks wizards from walking beyond the clearing on all four sides', () => {
    game.wizards[0].x = 400;
    game.wizards[0].y = 300;
    walk(game.wizards[0], -1000, 0);
    expect(game.wizards[0].x).toBe(DEFAULT_MAP.bounds.left);
    walk(game.wizards[0], 1000, 0);
    expect(game.wizards[0].x).toBe(DEFAULT_MAP.bounds.right);
    walk(game.wizards[0], 0, -1000);
    expect(game.wizards[0].y).toBe(DEFAULT_MAP.bounds.top);
    walk(game.wizards[0], 0, 1000);
    expect(game.wizards[0].y).toBe(DEFAULT_MAP.bounds.bottom);
  });
  it('keeps the existing pillar collisions', () => {
    const left = pillars[0].x - 45;
    game.wizards[0].x = left;
    game.wizards[0].y = 165;
    walk(game.wizards[0], 45, 0);
    expect(game.wizards[0].x).toBe(left);
  });
});
