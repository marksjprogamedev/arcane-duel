import { beforeEach, describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths, update } from '../../shared/sim/update';
import { press, resetDuel, game } from './helpers';

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
