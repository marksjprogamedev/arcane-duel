import { describe, expect, it } from 'vitest';
import { hasMatchingEarthPreview } from '../../client/src/render/earthVisibility';

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
