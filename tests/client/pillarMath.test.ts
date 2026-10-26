import { describe, expect, it } from 'vitest';
import { pillars } from '../../shared/constants';
import {
  behindPillar,
  pillarDepth,
  PILLAR_FOOT,
  wizardDepth,
} from '../../client/src/render/arena/pillarMath';

const pillar = pillars[0];

describe('pillar depth sorting', () => {
  it('puts a wizard above the pillar in the sort when its feet are higher on the screen', () => {
    // a wizard stopped by the pillar from behind and one stopped from the front (body 18 + radius)
    const stop = pillar.r + 18;
    expect(wizardDepth({ y: pillar.y - stop })).toBeLessThan(pillarDepth(pillar));
    expect(wizardDepth({ y: pillar.y + stop })).toBeGreaterThan(pillarDepth(pillar));
  });

  it('stands the painted base just behind where a wizard or a shot is stopped from the front', () => {
    expect(pillarDepth(pillar)).toBe(pillar.y + PILLAR_FOOT);
    expect(pillar.y + pillar.r).toBeLessThan(pillarDepth(pillar));
  });

  it('hides only what is over the pillar face and behind its base', () => {
    expect(behindPillar(pillars, pillar.x, pillar.y)).toBe(true);
    expect(behindPillar(pillars, pillar.x, pillarDepth(pillar) + 1)).toBe(false);
    expect(behindPillar(pillars, pillar.x + 80, pillar.y)).toBe(false);
    expect(behindPillar(pillars, pillar.x, pillar.y - 120)).toBe(false);
    expect(behindPillar([], pillar.x, pillar.y)).toBe(false);
  });

  it('hides the glow extending just above the painted pillar face', () => {
    const aboveFace = pillarDepth(pillar) - 72 - 10;
    expect(behindPillar(pillars, pillar.x, aboveFace)).toBe(false);
    expect(behindPillar(pillars, pillar.x, aboveFace, 12)).toBe(true);
    expect(behindPillar(pillars, pillar.x, pillarDepth(pillar) + 1, 12)).toBe(false);
  });
});
