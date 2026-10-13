import { beforeEach, describe, expect, it } from 'vitest';
import { advanceParticles, spawnFx } from '../../shared/fx/particles';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('the simulation emits cosmetic events and never makes particles itself', () => {
  it('a hit produces a burst event and no particles', () => {
    game.e.x = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    for (let i = 0; i < 60; i++) if (update(game, 1)) resolveDeaths(game);
    expect(game.events.some((e) => e.type === 'burst')).toBe(true);
    expect(game.particles).toHaveLength(0);
  });

  it('a held fire spray emits spray events', () => {
    applyInput(game, 'p', { kind: 'pointerdown', x: 400, y: 300 });
    for (let i = 0; i < 12; i++) update(game, 1);
    const sprays = game.events.filter((e) => e.type === 'spray');
    expect(sprays.length).toBeGreaterThanOrEqual(2);
    expect(sprays[0]).toMatchObject({ wizard: 'p', spell: 'FIRE', castOwner: 'p' });
  });

  it('cosmetic randomness does not disturb the gameplay random stream', () => {
    const a = game.rng();
    resetDuel();
    spawnFx(game, { type: 'burst', x: 0, y: 0, c: '#fff', n: 50, power: 4, castOwner: null });
    expect(game.rng()).toBe(a);
  });
});

describe('spawnFx and advanceParticles (client side)', () => {
  it('spawns the requested number of burst particles', () => {
    spawnFx(game, { type: 'burst', x: 5, y: 6, c: '#abc', n: 12, power: 4, castOwner: 'e' });
    expect(game.particles).toHaveLength(12);
    expect(game.particles[0]).toMatchObject({ x: 5, y: 6, c: '#abc', castOwner: 'e' });
  });

  it('spawns a spray from the named wizard', () => {
    spawnFx(game, { type: 'spray', wizard: 'p', x: 500, y: 300, spell: 'FIRE', castOwner: 'p' });
    expect(game.particles.length).toBeGreaterThanOrEqual(19);
  });

  it('spawns trails', () => {
    spawnFx(game, { type: 'magma_trail', x: 1, y: 1, vx: 1, vy: 1 });
    expect(game.particles).toHaveLength(4);
    spawnFx(game, { type: 'bolt_trail', x: 1, y: 1, spell: 'ICE' });
    expect(game.particles).toHaveLength(5);
  });

  it('moves particles and removes dead ones', () => {
    game.particles.push({ x: 0, y: 0, vx: 2, vy: -1, c: '#fff', life: 3, r: 2 });
    advanceParticles(game, 1);
    expect(game.particles[0]).toMatchObject({ x: 2, y: -1, life: 2 });
    advanceParticles(game, 5);
    expect(game.particles).toHaveLength(0);
  });
});
