import { describe, expect, it } from 'vitest';
import { usesAuthoritativeProjectile } from '../../client/src/render/earthVisibility';

describe('one-source Earth projectile rendering', () => {
  it('uses only authoritative projectiles for Earth', () => {
    expect(usesAuthoritativeProjectile('EARTH')).toBe(true);
  });
  it('preserves predicted visuals for other spells', () => {
    for (const kind of ['ICE', 'MAGNETIC', 'PLASMA', 'STORM', 'MAGMA', 'FIRE', 'WATER']) {
      expect(usesAuthoritativeProjectile(kind)).toBe(false);
    }
  });
  it('never enables Earth prediction based on rapid casts or collision positions', () => {
    for (let click = 0; click < 100; click++) {
      expect(usesAuthoritativeProjectile('EARTH')).toBe(true);
    }
  });
});
