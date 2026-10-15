import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { game, press, release, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('loading elements', () => {
  it('loads up to two distinct elements and resets on a third', () => {
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Digit3'));
    expect(game.input[0].loaded).toEqual([0, 2]);
    applyInput(game, 0, press('Digit4'));
    expect(game.input[0].loaded).toEqual([3]);
  });

  it('loading the same element twice restarts the selection', () => {
    applyInput(game, 0, press('Digit2'));
    applyInput(game, 0, press('Digit2'));
    expect(game.input[0].loaded).toEqual([1]);
  });

  it('ignores digits outside 1-4', () => {
    applyInput(game, 0, press('Digit5'));
    applyInput(game, 0, press('Digit0'));
    expect(game.input[0].loaded).toEqual([]);
  });

  it('combines fire+lightning into PLASMA when the mouse is pressed', () => {
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Digit3'));
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    expect(game.input[0].attack).toBe('PLASMA');
    expect(game.input[0].loaded).toEqual([]);
    expect(game.input[0].holding).toBe(true);
  });
});

describe('shields and healing', () => {
  it('Space with a loaded element casts that shield', () => {
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Space'));
    expect(game.p.shield?.type).toBe(0);
    expect(game.input[0].loaded).toEqual([]);
  });

  it('Space with nothing loaded does nothing but hint', () => {
    applyInput(game, 0, press('Space'));
    expect(game.p.shield).toBeNull();
    expect(game.events.at(-1)).toMatchObject({ type: 'hint' });
  });

  it('E then Space casts the healing shield (type 4)', () => {
    applyInput(game, 0, press('KeyE'));
    expect(game.input[0].healArmed).toBe(true);
    applyInput(game, 0, press('Space'));
    expect(game.p.shield?.type).toBe(4);
    expect(game.input[0].healArmed).toBe(false);
  });

  it('E then 2 heals and starts the heal cooldown', () => {
    game.p.hp = 50;
    applyInput(game, 0, press('KeyE'));
    applyInput(game, 0, press('Digit2'));
    expect(game.p.healCD).toBeGreaterThan(0);
    expect(game.p.hp).toBeGreaterThan(50);
  });
});

describe('abilities', () => {
  it('F swings the sword and starts its cooldown', () => {
    applyInput(game, 0, press('KeyF'));
    expect(game.p.swordCD).toBeGreaterThan(0);
  });

  it('Q fires force and starts its cooldown', () => {
    applyInput(game, 0, press('KeyQ'));
    expect(game.p.forceCD).toBeGreaterThan(0);
  });

  it('right-click bomb throws a bomb and starts the bomb cooldown', () => {
    applyInput(game, 0, { kind: 'bomb', x: 500, y: 300 });
    expect(game.bombs).toHaveLength(1);
    expect(game.p.bombCD).toBeGreaterThan(0);
  });

  it('a frozen wizard cannot start attacking', () => {
    game.p.freeze = 60;
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    expect(game.input[0].holding).toBe(false);
  });

  it('releasing a charged earth shot fires a projectile', () => {
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 500, y: 300 });
    expect(game.shots).toHaveLength(1);
    expect(game.shots[0].k).toBe('EARTH');
    expect(game.p.cast).toBe(20);
  });
});

describe('movement keys and clearing', () => {
  it('tracks held WASD keys', () => {
    applyInput(game, 0, press('KeyD'));
    expect(game.input[0].keys.KeyD).toBe(true);
    applyInput(game, 0, release('KeyD'));
    expect(game.input[0].keys.KeyD).toBe(false);
  });

  it('clear drops keys and holding', () => {
    applyInput(game, 0, press('KeyW'));
    applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
    applyInput(game, 0, { kind: 'clear' });
    expect(game.input[0].keys).toEqual({});
    expect(game.input[0].holding).toBe(false);
  });

  it('ignores all input once the round is ending', () => {
    game.ending = true;
    applyInput(game, 0, press('Digit1'));
    expect(game.input[0].loaded).toEqual([]);
  });
});

describe('both sides use the same rules', () => {
  it('player e behaves identically to player p (mirrored)', () => {
    for (const side of [0, 1] as const) {
      applyInput(game, side, press('Digit1'));
      applyInput(game, side, press('Digit2'));
      applyInput(game, side, { kind: 'pointerdown', x: 400, y: 300 });
    }
    expect(game.input[1].attack).toBe(game.input[0].attack);
    expect(game.input[0].attack).toBe('STEAM');
  });

  it('hints are only produced for the local player', () => {
    applyInput(game, 1, press('Digit1'));
    expect(game.events).toEqual([]);
    applyInput(game, 0, press('Digit1'));
    expect(game.events).toHaveLength(1);
  });

  it('input for e never affects wizard p', () => {
    applyInput(game, 1, press('Digit1'));
    applyInput(game, 1, press('Space'));
    expect(game.e.shield?.type).toBe(0);
    expect(game.p.shield).toBeNull();
  });
});
