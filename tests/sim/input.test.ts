import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../client/src/sim/input';
import { game } from '../../client/src/state';
import { press, release, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('loading elements', () => {
  it('loads up to two distinct elements and resets on a third', () => {
    applyInput('p', press('Digit1'));
    applyInput('p', press('Digit3'));
    expect(game.input.p.loaded).toEqual([0, 2]);
    applyInput('p', press('Digit4'));
    expect(game.input.p.loaded).toEqual([3]);
  });

  it('loading the same element twice restarts the selection', () => {
    applyInput('p', press('Digit2'));
    applyInput('p', press('Digit2'));
    expect(game.input.p.loaded).toEqual([1]);
  });

  it('ignores digits outside 1-4', () => {
    applyInput('p', press('Digit5'));
    applyInput('p', press('Digit0'));
    expect(game.input.p.loaded).toEqual([]);
  });

  it('combines fire+lightning into PLASMA when the mouse is pressed', () => {
    applyInput('p', press('Digit1'));
    applyInput('p', press('Digit3'));
    applyInput('p', { kind: 'pointerdown', x: 600, y: 300 });
    expect(game.input.p.attack).toBe('PLASMA');
    expect(game.input.p.loaded).toEqual([]);
    expect(game.input.p.holding).toBe(true);
  });
});

describe('shields and healing', () => {
  it('Space with a loaded element casts that shield', () => {
    applyInput('p', press('Digit1'));
    applyInput('p', press('Space'));
    expect(game.p.shield?.type).toBe(0);
    expect(game.input.p.loaded).toEqual([]);
  });

  it('Space with nothing loaded does nothing but hint', () => {
    applyInput('p', press('Space'));
    expect(game.p.shield).toBeNull();
    expect(game.events.at(-1)).toMatchObject({ type: 'hint' });
  });

  it('E then Space casts the healing shield (type 4)', () => {
    applyInput('p', press('KeyE'));
    expect(game.input.p.healArmed).toBe(true);
    applyInput('p', press('Space'));
    expect(game.p.shield?.type).toBe(4);
    expect(game.input.p.healArmed).toBe(false);
  });

  it('E then 2 heals and starts the heal cooldown', () => {
    game.p.hp = 50;
    applyInput('p', press('KeyE'));
    applyInput('p', press('Digit2'));
    expect(game.p.healCD).toBeGreaterThan(0);
    expect(game.p.hp).toBeGreaterThan(50);
  });
});

describe('abilities', () => {
  it('F swings the sword and starts its cooldown', () => {
    applyInput('p', press('KeyF'));
    expect(game.p.swordCD).toBeGreaterThan(0);
  });

  it('Q fires force and starts its cooldown', () => {
    applyInput('p', press('KeyQ'));
    expect(game.p.forceCD).toBeGreaterThan(0);
  });

  it('right-click bomb throws a bomb and starts the bomb cooldown', () => {
    applyInput('p', { kind: 'bomb', x: 500, y: 300 });
    expect(game.bombs).toHaveLength(1);
    expect(game.p.bombCD).toBeGreaterThan(0);
  });

  it('a frozen wizard cannot start attacking', () => {
    game.p.freeze = 60;
    applyInput('p', { kind: 'pointerdown', x: 500, y: 300 });
    expect(game.input.p.holding).toBe(false);
  });

  it('releasing a charged earth shot fires a projectile', () => {
    applyInput('p', press('Digit4'));
    applyInput('p', { kind: 'pointerdown', x: 500, y: 300 });
    applyInput('p', { kind: 'pointerup', x: 500, y: 300 });
    expect(game.shots).toHaveLength(1);
    expect(game.shots[0].k).toBe('EARTH');
    expect(game.p.cast).toBe(20);
  });
});

describe('movement keys and clearing', () => {
  it('tracks held WASD keys', () => {
    applyInput('p', press('KeyD'));
    expect(game.input.p.keys.KeyD).toBe(true);
    applyInput('p', release('KeyD'));
    expect(game.input.p.keys.KeyD).toBe(false);
  });

  it('clear drops keys and holding', () => {
    applyInput('p', press('KeyW'));
    applyInput('p', { kind: 'pointerdown', x: 500, y: 300 });
    applyInput('p', { kind: 'clear' });
    expect(game.input.p.keys).toEqual({});
    expect(game.input.p.holding).toBe(false);
  });

  it('ignores all input once the round is ending', () => {
    game.ending = true;
    applyInput('p', press('Digit1'));
    expect(game.input.p.loaded).toEqual([]);
  });
});

describe('both sides use the same rules', () => {
  it('player e behaves identically to player p (mirrored)', () => {
    for (const side of ['p', 'e'] as const) {
      applyInput(side, press('Digit1'));
      applyInput(side, press('Digit2'));
      applyInput(side, { kind: 'pointerdown', x: 400, y: 300 });
    }
    expect(game.input.e.attack).toBe(game.input.p.attack);
    expect(game.input.p.attack).toBe('STEAM');
  });

  it('hints are only produced for the local player', () => {
    applyInput('e', press('Digit1'));
    expect(game.events).toEqual([]);
    applyInput('p', press('Digit1'));
    expect(game.events).toHaveLength(1);
  });

  it('input for e never affects wizard p', () => {
    applyInput('e', press('Digit1'));
    applyInput('e', press('Space'));
    expect(game.e.shield?.type).toBe(0);
    expect(game.p.shield).toBeNull();
  });
});
