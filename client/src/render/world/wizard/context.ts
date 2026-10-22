import type { Wizard, WizardStyle } from '../../../../../shared/types';
import { ctx } from '../../../dom';
import { ellipse } from '../../shapes';

/** The eight silhouettes, in `styles` order; a wizard's index here (`styleIndex`) picks its hat, staff and offhand. */
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
  wizard: Wizard;
  x: number;
  y: number;
  /** The idle bob, in pixels (none while frozen). */
  bob: number;
  style: WizardStyle;
  /** Index of the wizard's style in `styleNames`. */
  styleIndex: number;
  /** A round-capped polyline in `color`. */
  stroke: (color: string, width: number, points: number[][]) => void;
  /** A glowing gem (the style's own gem colour unless `color` is given). */
  jewel: (px: number, py: number, radius: number, color?: string) => void;
}

export function paintContext(wizard: Wizard, x: number, y: number, bob: number): WizardPaint {
  const style = wizard.style;
  const styleIndex = Math.max(0, styleNames.indexOf(style.name));
  const stroke = (color: string, width: number, points: number[][]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  };
  const jewel = (px: number, py: number, radius: number, color = style.gem) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ellipse(px, py, radius, radius * 1.12, color);
    ctx.restore();
    ellipse(
      px - radius * 0.3,
      py - radius * 0.4,
      Math.max(1, radius * 0.25),
      Math.max(1, radius * 0.3),
      '#ffffffcc',
    );
  };
  return { wizard, x, y, bob, style, styleIndex, stroke, jewel };
}
