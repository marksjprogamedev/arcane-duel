import { beforeEach, describe, expect, it } from 'vitest';
import { advanceCosmetics, spawnFx } from '../../shared/fx/cosmetics';
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

  it('floating text, lightning and rings are events too, never simulation state', () => {
    game.e.x = 300;
    applyInput(game, 'p', press('Digit4'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 'p', { kind: 'pointerup', x: 300, y: 300 });
    applyInput(game, 'p', press('KeyQ')); // force push -> ring
    applyInput(game, 'p', press('Digit3'));
    applyInput(game, 'p', { kind: 'pointerdown', x: 300, y: 300 }); // lightning
    for (let i = 0; i < 60; i++) if (update(game, 1)) resolveDeaths(game);
    const types = new Set(game.events.map((e) => e.type));
    expect(types).toContain('text');
    expect(types).toContain('wave');
    expect(types).toContain('lightning');
    expect(game.labels).toHaveLength(0);
    expect(game.arcs).toHaveLength(0);
    expect(game.waves).toHaveLength(0);
    // damage numbers name the damaged wizard
    expect(game.events).toContainEqual(expect.objectContaining({ type: 'text', damageOwner: 'e' }));
  });

  it('cosmetic randomness does not disturb the gameplay random stream', () => {
    const a = game.rng();
    resetDuel();
    spawnFx(game, { type: 'burst', x: 0, y: 0, c: '#fff', n: 50, power: 4, castOwner: null });
    expect(game.rng()).toBe(a);
  });
});

describe('spawnFx and advanceCosmetics (client side)', () => {
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

  it('makes floating text, lightning arcs and rings', () => {
    spawnFx(game, { type: 'text', x: 1, y: 2, text: 'BLOCKED!', c: '#fff' });
    spawnFx(game, { type: 'lightning', x: 0, y: 100, tx: 300, ty: 100, castOwner: 'p' });
    spawnFx(game, { type: 'wave', x: 1, y: 1, r: 8, life: 22, c: '#fff' });
    expect(game.labels[0]).toMatchObject({ s: 'BLOCKED!', life: 60 });
    expect(game.arcs[0].points).toHaveLength(13);
    expect(game.arcs[0].points.at(-1)).toEqual({ x: 300, y: 80 });
    expect(game.waves[0]).toMatchObject({ r: 8, life: 22 });
  });

  it('keeps at most three damage numbers per wizard, but never drops other text', () => {
    spawnFx(game, { type: 'text', x: 0, y: 0, text: 'SHATTER!', c: '#fff' });
    for (let i = 0; i < 5; i++)
      spawnFx(game, { type: 'text', x: 0, y: 0, text: String(i), c: '#fff', damageOwner: 'e' });
    spawnFx(game, { type: 'text', x: 0, y: 0, text: '9', c: '#fff', damageOwner: 'p' });
    expect(game.labels.map((l) => l.s)).toEqual(['SHATTER!', '2', '3', '4', '9']);
  });

  it('animates text, arcs and rings and removes finished ones', () => {
    spawnFx(game, { type: 'text', x: 0, y: 10, text: 'x', c: '#fff' });
    spawnFx(game, { type: 'wave', x: 0, y: 0, r: 8, life: 22, c: '#fff' });
    advanceCosmetics(game, 1);
    expect(game.labels[0].y).toBeCloseTo(9.4);
    expect(game.waves[0].r).toBe(16);
    advanceCosmetics(game, 100);
    expect(game.labels).toHaveLength(0);
    expect(game.waves).toHaveLength(0);
  });

  it('moves particles and removes dead ones', () => {
    game.particles.push({ x: 0, y: 0, vx: 2, vy: -1, c: '#fff', life: 3, r: 2 });
    advanceCosmetics(game, 1);
    expect(game.particles[0]).toMatchObject({ x: 2, y: -1, life: 2 });
    advanceCosmetics(game, 5);
    expect(game.particles).toHaveLength(0);
  });
});
