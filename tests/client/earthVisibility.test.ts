import { describe, expect, it } from 'vitest';
import { isPredictedShot, usesAuthoritativeProjectile } from '../../client/src/net/earthVisibility';

describe('one-source Earth projectile rendering', () => {
  it('uses only authoritative projectiles for Earth and the four default combo bolts', () => {
    for (const kind of ['EARTH', 'STEAM', 'PLASMA', 'ICE', 'MAGNETIC'])
      expect(usesAuthoritativeProjectile(kind)).toBe(true);
  });
  it('preserves predicted visuals for other spells', () => {
    for (const kind of ['STORM', 'MAGMA', 'FIRE', 'WATER']) {
      expect(usesAuthoritativeProjectile(kind)).toBe(false);
    }
  });
});

describe('which of your own shots the client draws itself', () => {
  const me = { seat: 0 };
  const other = { seat: 1 };
  it('predicts a plain shot you cast, but never one that is not yours', () => {
    expect(isPredictedShot({ owner: me, k: 'FIRE' }, me)).toBe(true);
    expect(isPredictedShot({ owner: other, k: 'FIRE' }, me)).toBe(false);
  });
  it('draws variant, Earth and reflected shots from the server', () => {
    expect(isPredictedShot({ owner: me, k: 'FIRE', variant: 'fireball' }, me)).toBe(false);
    expect(isPredictedShot({ owner: me, k: 'EARTH' }, me)).toBe(false);
    // a bubble gave it to its new owner: they never predicted it, so it must be drawn
    expect(isPredictedShot({ owner: me, k: 'FIRE', reflected: true }, me)).toBe(false);
  });
});
