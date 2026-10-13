import { describe, expect, it } from 'vitest';
import { findMatchingEarthPreview, hasMatchingEarthPreview } from '../../client/src/render/earthVisibility';

const shot = { x: 235, y: 300, vx: 9, vy: 0 };
const preview = { kind: 'EARTH', x: 100, y: 300, dx: 1, dy: 0, age: 12, life: 60 };

describe('caster Earth projectile visibility', () => {
  it('shows server Earth shots when no local preview was created', () => {
    expect(hasMatchingEarthPreview(shot, [])).toBe(false);
  });
  it('hides server duplicate when its local preview is visible nearby', () => {
    expect(hasMatchingEarthPreview(shot, [preview])).toBe(true);
  });
  it('shows a new Earth shot even while an older preview is still active', () => {
    expect(hasMatchingEarthPreview({ ...shot, x: 130 }, [
      { ...preview, age: 45 },
    ])).toBe(false);
  });
  it('does not hide shots for expired or collided previews', () => {
    expect(hasMatchingEarthPreview(shot, [{ ...preview, confirmed: true }])).toBe(false);
    expect(hasMatchingEarthPreview(shot, [{ ...preview, age: 65 }])).toBe(false);
  });
  it('does not match a shot heading in another direction', () => {
    expect(hasMatchingEarthPreview({ ...shot, vx: -9 }, [preview])).toBe(false);
  });
});

  // The authoritative projectile takes ownership as soon as it matches a preview.
  // A preview retired this way must not be drawn during the following FX pass.
  // This prevents the impact-frame double image.
describe('Earth visual handover', () => {
  it('retires a matched preview when an authoritative projectile is visible', () => {
    const fx = { ...preview };
    const found = findMatchingEarthPreview(shot, [fx]);
    expect(found).toBe(fx);
    if (found) found.confirmed = true;
    expect(hasMatchingEarthPreview(shot, [fx])).toBe(false);
  });
  it('does not retire unrelated newer previews', () => {
    const old = { ...preview, age: 44 };
    const newest = { ...preview, age: 1, x: 105 };
    const found = findMatchingEarthPreview({ ...shot, x: 510 }, [old, newest]);
    expect(found).toBe(old);
    if (found) found.confirmed = true;
    expect(newest.confirmed).toBeUndefined();
  });
});
