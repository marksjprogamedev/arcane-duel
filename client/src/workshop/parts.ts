// Wizard Workshop data shared by the preview panel and the in-match renderer:
// part sets, defaults, palette, and the sprite atlas (URL, cell size, sprite bounds, slot boxes).

export type Appearance = {
  head: number;
  hat: number;
  body: number;
  staff: number;
  off: number;
  feet: number;
};
export type PartKey = keyof Appearance;
/** Every drawable slot. `handR` and the two feet slots follow other choices (off / feet). */
export type SlotId = 'head' | 'hat' | 'body' | 'staff' | 'off' | 'handR' | 'feetL' | 'feetR';
export type Box = { x: number; y: number; w: number; h: number };

export const SETS: Record<PartKey, string[]> = {
  head: [...Array.from({ length: 8 }, (_, i) => 'Head ' + (i + 1)), 'Eccentric Old Wizard'],
  hat: ['None', ...Array.from({ length: 10 }, (_, i) => 'Hat ' + (i + 1))],
  body: [...Array.from({ length: 10 }, (_, i) => 'Robe ' + (i + 1)), 'Stout Blue Robe'],
  staff: [
    'None',
    ...Array.from({ length: 12 }, (_, i) => 'Staff ' + (i + 1)),
    'Plain Quarterstaff',
  ],
  off: ['None', ...Array.from({ length: 10 }, (_, i) => 'Offhand ' + (i + 1))],
  feet: Array.from({ length: 10 }, (_, i) => 'Boots ' + (i + 1)),
};
/** Number of choices per part (the exclusive upper bound of a valid index). */
export const LIMITS = Object.fromEntries(
  Object.entries(SETS).map(([key, values]) => [key, values.length]),
) as Record<PartKey, number>;
/** What the Workshop picks on a fresh browser. */
export const DEFAULTS: Appearance = { head: 0, hat: 1, body: 0, staff: 13, off: 0, feet: 0 };
export const PALETTE = ['#3379cf', '#c4444e', '#38835b', '#8051bd', '#796a65'];

// Exact original sprite bounds, in atlas order. No re-cropping or background removal at runtime.
// The atlas is a lossless layout of the extra-spaced package's 71 transparent sprites.
export const ATLAS_DIMS: Record<string, [number, number][]> = {
  heads: [
    [103, 114],
    [103, 100],
    [103, 100],
    [105, 119],
    [113, 105],
    [106, 125],
    [122, 126],
    [104, 104],
  ],
  hats: [
    [135, 125],
    [131, 130],
    [132, 133],
    [140, 125],
    [133, 131],
    [134, 124],
    [155, 129],
    [134, 129],
    [127, 120],
    [134, 135],
  ],
  bodies: [
    [127, 128],
    [124, 128],
    [133, 128],
    [134, 135],
    [127, 131],
    [134, 136],
    [133, 136],
    [142, 138],
    [144, 138],
    [145, 132],
  ],
  staffs: [
    [82, 215],
    [90, 220],
    [86, 215],
    [98, 219],
    [91, 218],
    [102, 222],
    [107, 211],
    [87, 211],
    [108, 226],
    [126, 211],
    [92, 214],
    [97, 227],
  ],
  offhands: [
    [101, 105],
    [87, 96],
    [93, 85],
    [86, 106],
    [72, 98],
    [97, 101],
    [104, 108],
    [100, 105],
    [76, 126],
    [99, 116],
  ],
  hands: [
    [74, 70],
    [65, 61],
    [71, 64],
    [77, 71],
    [72, 61],
    [62, 65],
    [74, 64],
    [62, 68],
    [74, 65],
    [81, 73],
    [76, 74],
  ],
  feet: [
    [121, 50],
    [128, 50],
    [121, 49],
    [115, 47],
    [114, 53],
    [114, 50],
    [120, 53],
    [129, 57],
    [127, 50],
    [126, 53],
  ],
};
/** Atlas category for each part key. */
export const ATLAS_KEYS: Record<PartKey, string> = {
  head: 'heads',
  hat: 'hats',
  body: 'bodies',
  staff: 'staffs',
  off: 'offhands',
  feet: 'feet',
};
export const ATLAS_URL = '/ui/wizard-workshop/wizard_workshop_game_atlas.png';
export const PLAIN_STAFF_URL = '/ui/wizard-workshop/plain_quarterstaff_right_hand.png';
export const CUSTOM_HEAD_URL = '/ui/wizard-workshop/eccentric_old_wizard_head.png';
export const CUSTOM_ROBE_URL = '/ui/wizard-workshop/blue_robe_stout.png';
export const ATLAS_WIDTH = 1368;
export const ATLAS_HEIGHT = 2187;
export const CELL_WIDTH = 171;
export const CELL_HEIGHT = 243;

/**
 * Stand-alone sprites that replace an atlas cell: pixel size of the image, and the box (in the
 * 256x340 preview coordinate system) it is fitted into.
 */
export const CUSTOM_STAFF = { w: 96, h: 105, box: { x: -12, y: 88, w: 142, h: 216 } };
export const CUSTOM_HEAD = { w: 36, h: 35, box: { x: 49, y: 55, w: 162, h: 149 } };
export const CUSTOM_ROBE = { w: 36, h: 33, box: { x: 50, y: 143, w: 160, h: 162 } };
/** Choice index that selects each stand-alone sprite. */
export const CUSTOM_STAFF_INDEX = 13;
export const CUSTOM_HEAD_INDEX = 8;
export const CUSTOM_ROBE_INDEX = 10;

// Shared 256×340 preview coordinate system. Body and head share centre x=130.
// Head overlaps the collar; feet are centred symmetrically under the robe.
// The in-match wizard uses the same boxes, scaled down.
export const SLOTS: Record<SlotId, Box> = {
  head: { x: 60, y: 62, w: 140, h: 139 },
  hat: { x: 51, y: 14, w: 155, h: 90 },
  body: { x: 65, y: 141, w: 130, h: 149 },
  staff: { x: 0, y: 98, w: 88, h: 206 },
  off: { x: 193, y: 175, w: 63, h: 80 },
  handR: { x: 177, y: 211, w: 41, h: 41 },
  feetL: { x: 81, y: 277, w: 51, h: 42 },
  feetR: { x: 129, y: 277, w: 51, h: 42 },
};

/** Pixel rectangle [x, y, w, h] of one sprite in the atlas, or null for an out-of-range index. */
export function spriteRect(category: string, idx: number): [number, number, number, number] | null {
  const group = ATLAS_DIMS[category];
  if (!group || idx < 0 || idx >= group.length) return null;
  let n = idx;
  for (const [key, values] of Object.entries(ATLAS_DIMS)) {
    if (key === category) break;
    n += values.length;
  }
  const [w, h] = group[idx];
  return [
    Math.floor(n % 8) * CELL_WIDTH + Math.floor((CELL_WIDTH - w) / 2),
    Math.floor(n / 8) * CELL_HEIGHT + Math.floor((CELL_HEIGHT - h) / 2),
    w,
    h,
  ];
}
