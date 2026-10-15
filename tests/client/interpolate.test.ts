import { beforeEach, describe, expect, it } from 'vitest';
import { RenderInterpolator } from '../../client/src/render/interpolate';
import { applyInput } from '../../shared/sim/input';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from '../sim/helpers';

beforeEach(() => resetDuel());

describe('RenderInterpolator', () => {
  it('draws a moving wizard between its previous and current position, then restores it', () => {
    const r = new RenderInterpolator();
    applyInput(game, 0, press('KeyD'));
    r.capture(game);
    const before = game.p.x;
    update(game, 1);
    const after = game.p.x;
    expect(after).toBeGreaterThan(before);

    const restore = r.apply(game, 0.5);
    expect(game.p.x).toBeCloseTo((before + after) / 2, 5);
    restore();
    expect(game.p.x).toBe(after);
  });

  it('alpha 0 shows the old state and alpha 1 the new one', () => {
    const r = new RenderInterpolator();
    applyInput(game, 0, press('KeyD'));
    r.capture(game);
    const before = game.p.x;
    update(game, 1);
    const after = game.p.x;
    let restore = r.apply(game, 0);
    expect(game.p.x).toBe(before);
    restore();
    restore = r.apply(game, 1);
    expect(game.p.x).toBe(after);
    restore();
  });

  it('interpolates projectiles by id', () => {
    const r = new RenderInterpolator();
    game.e.x = 300;
    applyInput(game, 0, press('Digit4'));
    applyInput(game, 0, { kind: 'pointerdown', x: 300, y: 300 });
    applyInput(game, 0, { kind: 'pointerup', x: 300, y: 300 });
    update(game, 1);
    r.capture(game);
    const before = game.shots[0].x;
    update(game, 1);
    const after = game.shots[0].x;
    expect(after).toBeGreaterThan(before);
    const restore = r.apply(game, 0.25);
    expect(game.shots[0].x).toBeCloseTo(before + (after - before) * 0.25, 5);
    restore();
    expect(game.shots[0].x).toBe(after);
  });

  it('does not smooth jumps (respawn / teleport) and ignores things that did not exist before', () => {
    const r = new RenderInterpolator();
    r.capture(game);
    const x = game.e.x;
    game.e.x += 300; // teleport
    const restore = r.apply(game, 0.5);
    expect(game.e.x).toBe(x + 300);
    restore();
    // a replaced wizard object has no previous position
    r.capture(game);
    const fresh = { ...game.e, x: 10 };
    game.e = fresh;
    const restore2 = r.apply(game, 0.5);
    expect(game.e.x).toBe(10);
    restore2();
  });
});
