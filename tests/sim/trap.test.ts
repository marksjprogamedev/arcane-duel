import { beforeEach, describe, expect, it } from 'vitest';
import { COOLDOWN_TICKS, TRAP } from '../../shared/constants';
import { applyInput } from '../../shared/sim/input';
import { stepMovement } from '../../shared/sim/movement';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.p.x = 200;
  game.p.y = 300;
  game.e.x = 600;
  game.e.y = 300;
});

const setTrap = (x: number, y: number, element = 'Digit4') => {
  applyInput(game, 0, press(element));
  applyInput(game, 0, { kind: 'trap', x, y });
};

describe('setting a trap (middle click)', () => {
  it('puts a rune of the loaded element at the cursor and starts the cooldown', () => {
    setTrap(300, 300);
    expect(game.traps).toHaveLength(1);
    expect(game.traps[0]).toMatchObject({ x: 300, y: 300, k: 'EARTH', owner: game.p });
    expect(game.p.trapCD).toBe(COOLDOWN_TICKS.TRAP);
  });

  it('reaches no further than the trap range, towards the cursor', () => {
    setTrap(700, 300);
    expect(game.traps[0].x).toBeCloseTo(200 + TRAP.RANGE);
  });

  it('is refused on cooldown, while frozen, or on top of something solid', () => {
    setTrap(300, 300);
    setTrap(320, 300);
    expect(game.traps).toHaveLength(1);
    game.p.trapCD = 0;
    game.p.freeze = 10;
    setTrap(320, 300);
    expect(game.traps[0].x).toBe(300);
    game.p.freeze = 0;
    setTrap(235, 165); // a pillar
    expect(game.traps[0].x).toBe(300);
  });

  it('keeps one trap per wizard: a new one replaces the old', () => {
    setTrap(300, 300);
    game.p.trapCD = 0;
    setTrap(300, 350, 'Digit1');
    expect(game.traps).toHaveLength(1);
    expect(game.traps[0]).toMatchObject({ y: 350, k: 'FIRE' });
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
    game.e.x = 300;
    game.e.y = 300;
    update(game, 5);
    expect(game.e.hp).toBe(200);
    expect(game.traps).toHaveLength(1);
    update(game, TRAP.ARM_TICKS);
    expect(game.e.hp).toBeLessThan(200);
    expect(game.e.burn).toBeGreaterThan(0);
    expect(game.traps).toHaveLength(0);
  });

  it('springs on the owner too once armed (friendly fire)', () => {
    setTrap(300, 300, 'Digit1');
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.traps).toHaveLength(1);
    game.p.x = 300;
    game.p.y = 300;
    update(game, 1);
    expect(game.p.hp).toBeLessThan(200);
  });

  it('an ice trap freezes, a steam trap scalds', () => {
    game.e.x = 300;
    game.e.y = 300;
    setTrap(300, 300, 'Digit2');
    applyInput(game, 0, press('Digit4'));
    game.traps[0].k = 'ICE';
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.e.freeze).toBeGreaterThan(0);
    game.p.trapCD = 0;
    game.e.freeze = 0;
    game.e.x = 400;
    setTrap(400, 300, 'Digit1');
    game.traps[0].k = 'STEAM';
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.e.scald).toBeGreaterThan(0);
  });

  it('an elemental shield of the same element stops it', () => {
    game.e.x = 300;
    game.e.y = 300;
    game.e.shield = { type: 0, life: 200 };
    setTrap(300, 300, 'Digit1');
    update(game, TRAP.ARM_TICKS + 1);
    expect(game.e.hp).toBe(200);
  });
});

describe('the Earth trap is a prison', () => {
  const springEarth = () => {
    game.e.x = 300;
    game.e.y = 300;
    setTrap(300, 300);
    update(game, TRAP.ARM_TICKS + 1);
  };

  it('holds whoever springs it for 4 seconds', () => {
    springEarth();
    expect(game.e.prison).toBeGreaterThan(0);
    expect(TRAP.PRISON_TICKS).toBe(240);
    update(game, TRAP.PRISON_TICKS + 1);
    expect(game.e.prison).toBe(0);
  });

  it('stops walking and knockback, but not casting', () => {
    springEarth();
    game.input[1].keys = { KeyD: true };
    const x = game.e.x;
    update(game, 30);
    expect(game.e.x).toBe(x);
    game.e.kx = 20;
    update(game, 5);
    expect(game.e.x).toBe(x);
    expect(game.e.kx).toBe(0);
    // they can still shoot: a cast is not refused
    applyInput(game, 1, press('Digit1'));
    applyInput(game, 1, { kind: 'pointerdown', x: 100, y: 300 });
    expect(game.input[1].holding).toBe(true);
  });

  it('walks again afterwards', () => {
    springEarth();
    update(game, TRAP.PRISON_TICKS + 1);
    game.input[1].keys = { KeyD: true };
    const x = game.e.x;
    update(game, 10);
    expect(game.e.x).toBeGreaterThan(x);
  });

  it('is predicted by the shared movement code', () => {
    const w = {
      x: 100,
      y: 300,
      kx: 0,
      ky: 0,
      freeze: 0,
      prison: 3,
      chill: 0,
      chargeSpell: null,
      chargeTicks: 0,
    };
    stepMovement(w, { KeyD: true }, 1);
    expect(w.x).toBe(100);
    for (let i = 0; i < 4; i++) stepMovement(w, { KeyD: true }, 1);
    expect(w.x).toBeGreaterThan(100);
  });
});

describe('traps over the network', () => {
  it('are in snapshots with their owner seat, and prison state is public', () => {
    setTrap(300, 300);
    game.e.prison = 50;
    const snap = serializeSnapshot(game, 1, { roundId: 1, seq: 1 });
    expect(snap.traps).toEqual([
      {
        id: game.traps[0].id,
        x: 300,
        y: 300,
        k: 'EARTH',
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
