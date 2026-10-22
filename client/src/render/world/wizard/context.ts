import type { Wizard, WizardStyle } from '../../../../../shared/types';
import { g } from '../../../dom';
import { ellipse } from '../../primitives';

/** The eight silhouettes, in `styles` order; a wizard's index here (`v`) picks its hat, staff and offhand. */
const styleNames = [
  'Ember Mage',
  'Frost Scholar',
  'Grove Keeper',
  'Void Arcanist',
  'Royal Magister',
  'Dune Mystic',
  'Stormcaller',
  'Arcane Alchemist',
];

/**
 * What every part of one wizard's drawing shares, made fresh for each wizard each frame (nothing
 * is kept between wizards). `x`, `y` are the feet; the body is drawn translated to `(x, y + bob)`.
 */
export interface WizardPaint {
  w: Wizard;
  x: number;
  y: number;
  /** The idle bob, in pixels (none while frozen). */
  bob: number;
  s: WizardStyle;
  /** Index of the wizard's style in `styleNames`. */
  v: number;
  /** A round-capped polyline in `color`. */
  stroke: (color: string, width: number, points: number[][]) => void;
  /** A glowing gem (the style's own gem colour unless `color` is given). */
  jewel: (px: number, py: number, radius: number, color?: string) => void;
}

export function paintContext(w: Wizard, x: number, y: number, bob: number): WizardPaint {
  const s = w.style;
  const v = Math.max(0, styleNames.indexOf(s.name));
  const stroke = (color: string, width: number, points: number[][]) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    points.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
  };
  const jewel = (px: number, py: number, radius: number, color = s.gem) => {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 8;
    ellipse(px, py, radius, radius * 1.12, color);
    g.restore();
    ellipse(
      px - radius * 0.3,
      py - radius * 0.4,
      Math.max(1, radius * 0.25),
      Math.max(1, radius * 0.3),
      '#ffffffcc',
    );
  };
  return { w, x, y, bob, s, v, stroke, jewel };
}
