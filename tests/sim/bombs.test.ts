import { beforeEach, describe, expect, it } from 'vitest';
import { BOMB, TRAP } from '../../shared/constants';
import { SURGE, cast } from '../../shared/sim/combat';
import { applyInput } from '../../shared/sim/input';
import { stepMovement, WALK_SPEED, type Mover } from '../../shared/sim/movement';
import { serializeSnapshot } from '../../shared/sim/snapshot';
import { update } from '../../shared/sim/update';
import type { Bomb, SpellName, Wizard } from '../../shared/types';
import { game, press, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.p.x = 100;
  game.p.y = 300;
  game.e.x = 400;
  game.e.y = 300;
});

const mover = (over: Partial<Mover> = {}): Mover => ({
  x: 200,
  y: 300,
  kx: 0,
  ky: 0,
  freeze: 0,
  prison: 0,
  airborne: 0,
  slow: 0,
  pulled: 0,
  glide: 0,
  chill: 0,
  chargeSpell: null,
  chargeTicks: 0,
  ...over,
});

/** Steps the match one tick at a time (a single big step would move knockback in one jump). */
const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) update(game, 1);
};

/** A bomb of the caster's, already landed and about to go off. */
const bombAt = (k: SpellName, x: number, y: number, owner: Wizard = game.p): Bomb => {
  const b: Bomb = {
    id: game.nextId++,
    x,
    y,
    sx: x,
    sy: y,
    tx: x,
    ty: y,
    u: 1,
    flight: 25,
    fuse: 0.5,
    k,
    owner,
    landed: true,
    dead: false,
  };
  game.bombs.push(b);
  return b;
};

describe('every bomb gives its whole element', () => {
  it('Water soaks to 100, Fire burns to 100, Steam scalds to 100', () => {
    bombAt('WATER', 400, 300);
    update(game, 1);
    expect(game.e.wet).toBe(100);
    game.e.wet = 0;
    bombAt('FIRE', 400, 300);
    update(game, 1);
    expect(game.e.burn).toBe(100);
    bombAt('STEAM', 400, 300);
    update(game, 1);
    expect(game.e.scald).toBe(100);
  });

  it('Magnetic magnetises to 100', () => {
    bombAt('MAGNETIC', 400, 300);
    update(game, 1);
    expect(game.e.mag).toBe(100);
  });

  it('Storm fills the static meter, which discharges at once', () => {
    bombAt('STORM', 400, 300);
    update(game, 1);
    expect(game.e.stat).toBe(0);
    expect(game.e.hp).toBeLessThan(200 - 18);
  });

  it('traps do the same: a Water trap soaks to 100, a Fire trap burns to 100', () => {
    for (const [k, field] of [
      ['WATER', 'wet'],
      ['FIRE', 'burn'],
    ] as const) {
      game.traps.push({ id: 1, x: 400, y: 300, k, owner: game.p, life: 500, arm: 0 });
      update(game, 1);
      expect(game.e[field], k).toBe(100);
      game.e.wet = game.e.burn = 0;
    }
  });
});

describe('the Water bomb', () => {
  it('shoves everyone in its blast away from the centre', () => {
    game.e.x = 450;
    bombAt('WATER', 400, 300);
    update(game, 1);
    expect(game.e.kx).toBeGreaterThan(BOMB.WATER_KNOCKBACK * 0.9);
    expect(Math.abs(game.e.ky)).toBeLessThan(1);
    const x = game.e.x;
    run(20);
    expect(game.e.x).toBeGreaterThan(x + 100);
  });

  it('carries them a long way in a glide, not a jump', () => {
    game.p.x = 100;
    game.e.x = 250;
    bombAt('WATER', 200, 300);
    let last = game.e.x;
    let farthestStep = 0;
    for (let i = 0; i < 120; i++) {
      update(game, 1);
      farthestStep = Math.max(farthestStep, game.e.x - last);
      last = game.e.x;
    }
    expect(last - 250).toBeGreaterThan(300);
    expect(farthestStep).toBeLessThan(BOMB.WATER_KNOCKBACK + 1);
    expect(game.e.glide).toBe(0);
  });

  it('does not shove through a shield of water', () => {
    game.e.x = 450;
    game.e.shield = { type: 1, life: 100 };
    bombAt('WATER', 400, 300);
    update(game, 1);
    expect(game.e.kx).toBe(0);
  });
});

describe('the Water trap', () => {
  const spring = () => {
    game.traps.push({ id: 1, x: 400, y: 300, k: 'WATER', owner: game.p, life: 500, arm: 0 });
    update(game, 1);
  };

  it('knocks the victim up for a second: no walking, no pushing', () => {
    spring();
    expect(game.e.airborne).toBeGreaterThan(TRAP.KNOCKUP_TICKS - 3);
    game.input[1].keys = { KeyD: true };
    game.e.kx = 20;
    const x = game.e.x;
    run(30);
    expect(game.e.x).toBe(x);
    run(TRAP.KNOCKUP_TICKS);
    run(10);
    expect(game.e.x).toBeGreaterThan(x);
  });

  it('can still cast while in the air', () => {
    spring();
    applyInput(game, 1, press('Digit1'));
    applyInput(game, 1, { kind: 'pointerdown', x: 100, y: 300 });
    update(game, 1);
    expect(game.input[1].holding).toBe(true);
    expect(game.events.some((ev) => ev.type === 'spray')).toBe(true);
  });

  it('is predicted by the shared movement code, and sent to everyone', () => {
    const w = mover({ airborne: 3 });
    stepMovement(w, { KeyD: true }, 1);
    expect(w.x).toBe(200);
    for (let i = 0; i < 4; i++) stepMovement(w, { KeyD: true }, 1);
    expect(w.x).toBeGreaterThan(200);
    game.e.airborne = 40;
    const snap = serializeSnapshot(game, 0, { roundId: 1, seq: 1 });
    expect(snap.others[0].airborne).toBe(40);
  });
});

describe('the Earth bomb', () => {
  it('slows the target by 75% for 3 seconds without freezing', () => {
    bombAt('EARTH', 400, 300);
    update(game, 1);
    expect(game.e.slow).toBeGreaterThan(BOMB.SLOW_TICKS - 3);
    expect(game.e.freeze).toBe(0);
    expect(game.e.chill).toBe(0);
    const w = mover({ slow: BOMB.SLOW_TICKS });
    stepMovement(w, { KeyD: true }, 1);
    expect(w.x - 200).toBeCloseTo(WALK_SPEED * (1 - BOMB.SLOW));
    run(BOMB.SLOW_TICKS);
    expect(game.e.slow).toBe(0);
  });
});

describe('the Magnetic bomb', () => {
  it('drags the target into its centre, whatever keys they hold', () => {
    game.e.x = 520;
    game.input[1].keys = { KeyD: true };
    bombAt('MAGNETIC', 400, 300);
    update(game, 1);
    expect(game.e.pulled).toBeGreaterThan(0);
    run(BOMB.MAGNETIC_PULL_TICKS);
    expect(Math.hypot(game.e.x - 400, game.e.y - 300)).toBeLessThan(15);
  });

  it('is predicted: input is ignored while pulled', () => {
    const w = mover({ pulled: 5 });
    stepMovement(w, { KeyD: true }, 1);
    expect(w.x).toBe(200);
  });
});

describe('Water Surge and bombs', () => {
  const surge = () => cast(game, game.p, game.p.x, game.p.y, 1, 'WATER', { WATER: 'water_surge' });

  it('slides a landed bomb outward as far as a wizard is shoved, not in one jump', () => {
    const b = bombAt('FIRE', 250, 300, game.e);
    b.fuse = 5000;
    expect(surge()).toBe(true);
    let largestStep = 0;
    for (let i = 0; i < SURGE.LIFE + 80; i++) {
      const before = b.x;
      run(1);
      largestStep = Math.max(largestStep, b.x - before);
    }
    // a wizard's knockback carries SURGE.KNOCKBACK / (1 - 0.82) px in all; the bomb goes the same way
    expect(b.x - 250).toBeGreaterThan((SURGE.BOMB_KNOCKBACK / 0.18) * 0.9);
    expect(b.x - 250).toBeLessThan(SURGE.BOMB_KNOCKBACK / 0.18 + 1);
    expect(largestStep).toBeLessThanOrEqual(SURGE.BOMB_KNOCKBACK + 0.01);
    expect(b.y).toBeCloseTo(300, 0);
  });

  it('carries a bomb in flight, landing spot and all', () => {
    const b = bombAt('FIRE', 150, 300, game.e);
    b.landed = false;
    b.u = 0.5;
    b.sx = 150;
    b.tx = 190;
    b.flight = 400;
    surge();
    run(SURGE.LIFE + 80);
    // the whole throw moved by the same distance the bomb slid
    const slid = b.sx - 150;
    expect(slid).toBeGreaterThan(200);
    expect(b.tx - 190).toBeCloseTo(slid, 0);
  });

  it('does not push a bomb behind a bubble', () => {
    const b = bombAt('FIRE', 250, 300, game.e);
    b.fuse = 500;
    game.bubbles.push({ x: 250, y: 300, r: 40, owner: game.e, life: 400 });
    surge();
    run(SURGE.LIFE - 1);
    expect(b.x).toBe(250);
  });
});

describe('traps hide from enemies', () => {
  const trap = () => {
    game.traps.push({
      id: 1,
      x: 300,
      y: 300,
      k: 'FIRE',
      owner: game.p,
      life: TRAP.LIFE,
      arm: TRAP.ARM_TICKS,
    });
  };

  it('are sent to the enemy only for the first two seconds', () => {
    trap();
    run(TRAP.VISIBLE_TICKS - 5);
    expect(serializeSnapshot(game, 1, { roundId: 1, seq: 1 }).traps).toHaveLength(1);
    run(10);
    expect(serializeSnapshot(game, 1, { roundId: 1, seq: 1 }).traps).toHaveLength(0);
  });

  it('are always sent to their owner', () => {
    trap();
    run(TRAP.VISIBLE_TICKS + 30);
    expect(serializeSnapshot(game, 0, { roundId: 1, seq: 1 }).traps).toHaveLength(1);
  });

  it('are still sprung by the enemy while invisible', () => {
    trap();
    game.e.x = 300;
    run(TRAP.VISIBLE_TICKS + 1);
    expect(game.e.burn).toBeGreaterThan(0);
    expect(game.traps).toHaveLength(0);
  });
});
