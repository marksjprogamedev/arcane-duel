import { beforeEach, describe, expect, it } from 'vitest';
import { COOLDOWN_TICKS, pillars, TRAP } from '../../shared/constants';
import { applyInput } from '../../shared/sim/input';
import { DEFAULT_MAP } from '../../shared/maps';
import { stepMovement } from '../../shared/sim/movement';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.wizards[0].x = 200;
  game.wizards[0].y = 300;
  game.wizards[1].x = 600;
  game.wizards[1].y = 300;
});

const setTrap = (x: number, y: number, element = 'Digit4') => {
  applyInput(game, 0, press(element));
  applyInput(game, 0, { kind: 'trap', x, y });
};

describe('setting a trap (middle click)', () => {
  it('puts a rune of the loaded element at the cursor and starts the cooldown', () => {
    setTrap(300, 300);
    expect(game.traps).toHaveLength(1);
    expect(game.traps[0]).toMatchObject({ x: 300, y: 300, spell: 'EARTH', owner: game.wizards[0] });
    expect(game.wizards[0].trapCD).toBe(COOLDOWN_TICKS.TRAP);
  });

  it('reaches no further than the trap range, towards the cursor', () => {
    setTrap(700, 300);
    expect(game.traps[0].x).toBeCloseTo(200 + TRAP.RANGE);
  });

  it('is refused on cooldown, while frozen, or on top of something solid', () => {
    setTrap(300, 300);
    setTrap(320, 300);
    expect(game.traps).toHaveLength(1);
    game.wizards[0].trapCD = 0;
    game.wizards[0].freeze = 10;
    setTrap(320, 300);
    expect(game.traps[0].x).toBe(300);
    game.wizards[0].freeze = 0;
    setTrap(pillars[0].x, pillars[0].y);
    expect(game.traps[0].x).toBe(300);
  });

  it('keeps one trap per wizard: a new one replaces the old', () => {
    setTrap(300, 300);
    game.wizards[0].trapCD = 0;
    setTrap(300, 350, 'Digit1');
    expect(game.traps).toHaveLength(1);
    expect(game.traps[0]).toMatchObject({ y: 350, spell: 'FIRE' });
  });

  it('fades after its lifetime', () => {
    setTrap(300, 300);
    update(game, TRAP.LIFE + 1);
    expect(game.traps).toHaveLength(0);
  });
});

describe('springing a trap', () => {
  it('does nothing until it is armed', () => {
    setTrap(300, 300, 'Digit1');
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    update(game, 5);
    expect(game.wizards[1].hp).toBe(200);
    expect(game.traps).toHaveLength(1);
    update(game, TRAP.ARM_TICKS);
    expect(game.wizards[1].hp).toBeLessThan(200);
    expect(game.wizards[1].burn).toBeGreaterThan(0);
    expect(game.traps).toHaveLength(0);
  });

  it('springs on the owner too once armed (friendly fire)', () => {
    setTrap(300, 300, 'Digit1');
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.traps).toHaveLength(1);
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    update(game, 1);
    expect(game.wizards[0].hp).toBeLessThan(200);
  });

  it('an ice trap freezes, a steam trap scalds', () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    setTrap(300, 300, 'Digit2');
    applyInput(game, 0, press('Digit4'));
    game.traps[0].spell = 'ICE';
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.wizards[1].freeze).toBeGreaterThan(0);
    game.wizards[0].trapCD = 0;
    game.wizards[1].freeze = 0;
    game.wizards[1].x = 400;
    setTrap(400, 300, 'Digit1');
    game.traps[0].spell = 'STEAM';
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.wizards[1].scald).toBeGreaterThan(0);
  });

  it('an elemental shield of the same element stops it', () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    game.wizards[1].shield = { type: 0, life: 200 };
    setTrap(300, 300, 'Digit1');
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.wizards[1].hp).toBe(200);
  });
});

describe('the Earth trap is a prison', () => {
  const springEarth = () => {
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    setTrap(300, 300);
    update(game, TRAP.ARM_TICKS + 1);
  };

  it('holds whoever springs it for 4 seconds', () => {
    springEarth();
    expect(game.wizards[1].prison).toBeGreaterThan(0);
    expect(TRAP.PRISON_TICKS).toBe(240);
    update(game, TRAP.PRISON_TICKS + 1);
    expect(game.wizards[1].prison).toBe(0);
  });

  it('stops walking and knockback, but not casting', () => {
    springEarth();
    game.input[1].keys = { KeyD: true };
    const x = game.wizards[1].x;
    update(game, 30);
    expect(game.wizards[1].x).toBe(x);
    game.wizards[1].kx = 20;
    update(game, 5);
    expect(game.wizards[1].x).toBe(x);
    expect(game.wizards[1].kx).toBe(0);
    // they can still shoot: a cast is not refused
    applyInput(game, 1, press('Digit1'));
    applyInput(game, 1, { kind: 'pointerdown', x: 100, y: 300 });
    expect(game.input[1].holding).toBe(true);
  });

  it('walks again afterwards', () => {
    springEarth();
    update(game, TRAP.PRISON_TICKS + 1);
    game.input[1].keys = { KeyD: true };
    const x = game.wizards[1].x;
    update(game, 10);
    expect(game.wizards[1].x).toBeGreaterThan(x);
  });

  it('is predicted by the shared movement code', () => {
    const w = {
      x: 100,
      y: 300,
      kx: 0,
      ky: 0,
      freeze: 0,
      prison: 3,
      airborne: 0,
      slow: 0,
      pulled: 0,
      glide: 0,
      chill: 0,
      chargeSpell: null,
      chargeTicks: 0,
    };
    stepMovement(w, { KeyD: true }, 1, DEFAULT_MAP);
    expect(w.x).toBe(100);
    for (let i = 0; i < 4; i++) stepMovement(w, { KeyD: true }, 1, DEFAULT_MAP);
    expect(w.x).toBeGreaterThan(100);
  });
});

describe('traps over the network', () => {
  it('are in snapshots with their owner seat, and prison state is public', () => {
    setTrap(300, 300);
    game.wizards[1].prison = 50;
    const snap = serializeSnapshot(game, 1, { roundId: 1, seq: 1 });
    expect(snap.traps).toEqual([
      {
        id: game.traps[0].id,
        x: 300,
        y: 300,
        spell: 'EARTH',
        life: TRAP.LIFE,
        arm: TRAP.ARM_TICKS,
        owner: 0,
      },
    ]);
    expect(serializeSnapshot(game, 0, { roundId: 1, seq: 1 }).traps[0].owner).toBe(0);
    expect(snap.you.prison).toBe(50);
    expect(snap.others[0]).not.toHaveProperty('trapCD');
    expect(snap.you).toHaveProperty('trapCD');
  });
});
