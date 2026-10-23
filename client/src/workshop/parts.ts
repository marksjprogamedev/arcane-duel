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
/**
 * Every drawable slot. `handR` and the two feet slots follow other choices (off / feet);
 * `handStaff` is the skin-tinted fist drawn over the staff (its layout follows the staff choice).
 */
export type SlotId =
  'head' | 'hat' | 'body' | 'staff' | 'off' | 'handR' | 'handStaff' | 'feetL' | 'feetR';
export type Box = { x: number; y: number; w: number; h: number };

// Historical names/indices stay fixed: saved layouts and pair alignments use these IDs.
// AVAILABLE below controls which pieces can actually be selected or restored.
export const SETS: Record<PartKey, string[]> = {
  head: [
    ...Array.from({ length: 8 }, (_, i) => 'Head ' + (i + 1)),
    'Eccentric Old Wizard',
    ...Array.from({ length: 8 }, (_, i) => 'Grey Head ' + (i + 1)),
  ],
  hat: [
    'None',
    ...Array.from({ length: 10 }, (_, i) => 'Hat ' + (i + 1)),
    'Blue Pointed Hat',
    'Plum Floppy Hat',
    'Green Feathered Hat',
    'Golden Star Wizard Hat',
  ],
  body: [
    ...Array.from({ length: 10 }, (_, i) => 'Robe ' + (i + 1)),
    'Stout Blue Robe',
    'Sleeveless Blue Robe',
    'Sand-wrapped Acolyte',
    'Burgundy Battlemage',
    'Forest Traveller',
    'Plum Archmage',
  ],
  staff: [
    'None',
    ...Array.from({ length: 12 }, (_, i) => 'Staff ' + (i + 1)),
    'Plain Quarterstaff',
  ],
  off: [
    'None',
    ...Array.from({ length: 10 }, (_, i) => 'Offhand ' + (i + 1)),
    'Left Reaching Hand',
    'Round Shield',
    'Tall Shield',
  ],
  feet: Array.from({ length: 10 }, (_, i) => 'Boots ' + (i + 1)),
};
/** What the Workshop picks on a fresh browser. */
export const DEFAULTS: Appearance = { head: 16, hat: 0, body: 11, staff: 7, off: 0, feet: 9 };
/** Skin tones for the grayscale heads (only the masked skin is recolored). */
export const SKIN_COLORS = [
  '#c98f70',
  '#f2c9a2',
  '#a96e50',
  '#704737',
  '#d4aa85',
  '#8fa66c',
  '#92b8d7',
  '#b28fc5',
  '#a5a5a5',
];
export const DEFAULT_SKIN = '#c98f70';
/** Robe dye affects fabric only, independently of the skin tone. */
export const ROBE_COLORS = [
  'original',
  '#3379cf',
  '#c4444e',
  '#38835b',
  '#8051bd',
  '#796a65',
  '#d3a04b',
  '#151a28',
];
export const DEFAULT_ROBE_COLOR = 'original';
export const ROBE_FIRST = 12;
export const ROBE_LAST = 15;
export const ROBE_SHEET_URL = '/art/workshop/four_recolorable_robes.png';
export const ROBE_TILE = { w: 72, h: 67, box: { x: 50, y: 143, w: 160, h: 162 } };

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
export const ATLAS_URL = '/art/workshop/wizard_workshop_game_atlas.png';
export const PLAIN_STAFF_URL = '/art/workshop/plain_quarterstaff_right_hand.png';
export const CUSTOM_HEAD_URL = '/art/workshop/eccentric_old_wizard_head.png';
export const CUSTOM_ROBE_URL = '/art/workshop/blue_robe_stout.png';
export const SLEEVELESS_ROBE_URL = '/art/workshop/blue_robe_sleeveless_v2.png';
export const GRIP_URL = '/art/workshop/greyscale_staff_grip.png';
export const LEFT_HAND_URL = '/art/workshop/left_reaching_offhand_pixel_v2.png?v=3';
export const LEFT_HAND_INDEX = 11;
export const LEFT_HAND = { w: 72, h: 45 };
export const HEADS_URL = '/art/workshop/heads_gray_8.png';
export const HEADS_MASK_URL = '/art/workshop/heads_skin_mask_8.png';
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
/** The grayscale heads: 8 cells of 32x44 in a 4x2 sheet, each extracted to its own sprite. */
export const SKIN_HEAD = { w: 32, h: 44, box: CUSTOM_HEAD.box };
/** The greyscale staff-grip fist: image size, drawn at its own size inside its slot box. */
export const STAFF_GRIP = { w: 56, h: 52 };
export const CUSTOM_ROBE = { w: 36, h: 33, box: { x: 50, y: 143, w: 160, h: 162 } };
/** The sleeveless blue robe: its own sprite, placed like the stout robe. */
export const SLEEVELESS_ROBE = { w: 80, h: 71, box: CUSTOM_ROBE.box };
/** Choice index that selects each stand-alone sprite. */
export const CUSTOM_STAFF_INDEX = 13;
export const CUSTOM_HEAD_INDEX = 8;
export const CUSTOM_ROBE_INDEX = 10;
export const SLEEVELESS_ROBE_INDEX = 11;
/** Choice indices of the grayscale heads (9..16). */
export const SKIN_HEAD_FIRST = 9;
export const SKIN_HEAD_LAST = 16;

/** Approved hat PNGs, with transparent margins excluded from their fitting bounds.
 * IDs 1–10 remain retired; their old pair records must not apply to these new hats.
 * Each brim starts at the same preview baseline, ready for per-head alignment.
 */
type HatSprite = {
  url: string;
  rect: [number, number, number, number];
  imageWidth: number;
  imageHeight: number;
  box: Box;
};
function hatSprite(
  file: string,
  rect: HatSprite['rect'],
  imageWidth = 1536,
  imageHeight = 1024,
): HatSprite {
  const w = 155;
  const h = (w * rect[3]) / rect[2];
  return {
    url: '/art/workshop/' + file,
    rect,
    imageWidth,
    imageHeight,
    box: { x: 130 - w / 2, y: 104 - h, w, h },
  };
}
export const HAT_SPRITES: Record<number, HatSprite> = {
  11: hatSprite('hat_blue_pointed.png', [239, 166, 1085, 719]),
  12: hatSprite('hat_plum_floppy.png', [135, 220, 1283, 627]),
  13: hatSprite('hat_green_feathered.png', [268, 201, 1034, 672]),
  // The uploaded image has a deep crown; its brim is aligned to the same y=104 baseline.
  14: hatSprite('hat_golden_star.png', [43, 105, 1161, 1149], 1254, 1254),
};

export type OffhandSprite = {
  url: string;
  rect: [number, number, number, number];
  imageWidth: number;
  imageHeight: number;
  box: Box;
};
/** Uploaded shields are full transparent PNGs; crop only their transparent margin when fitting. */
export const OFFHAND_SPRITES: Record<number, OffhandSprite> = {
  12: {
    url: '/art/workshop/round_shield.png',
    rect: [3, 3, 518, 651],
    imageWidth: 524,
    imageHeight: 657,
    box: { x: 193, y: 175, w: 63, h: 80 },
  },
  13: {
    url: '/art/workshop/tall_shield.png',
    rect: [3, 3, 431, 789],
    imageWidth: 437,
    imageHeight: 795,
    box: { x: 193, y: 175, w: 63, h: 80 },
  },
};

/** Curated Workshop choices, retaining each piece's original saved ID. */
export const AVAILABLE: Record<PartKey, number[]> = {
  head: Array.from({ length: 8 }, (_, i) => SKIN_HEAD_FIRST + i),
  hat: [0, ...Object.keys(HAT_SPRITES).map(Number)],
  body: [SLEEVELESS_ROBE_INDEX, 12, 13, 14, 15],
  staff: Array.from({ length: 13 }, (_, i) => i),
  off: [0, ...Object.keys(OFFHAND_SPRITES).map(Number)],
  feet: Array.from({ length: 10 }, (_, i) => i),
};

export function isAvailablePart(key: PartKey, value: unknown): value is number {
  return typeof value === 'number' && AVAILABLE[key].includes(value);
}

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
  handStaff: { x: 27, y: 193, w: 56, h: 52 },
  feetL: { x: 81, y: 277, w: 51, h: 42 },
  feetR: { x: 129, y: 277, w: 51, h: 42 },
};

/** Pixel rectangle [x, y, w, h] of one sprite in the atlas, or null for an out-of-range index. */
export function spriteRect(category: string, idx: number): [number, number, number, number] | null {
  const group = ATLAS_DIMS[category];
  if (!group || idx < 0 || idx >= group.length) return null;
  let offset = idx;
  for (const [key, values] of Object.entries(ATLAS_DIMS)) {
    if (key === category) break;
    offset += values.length;
  }
  const [w, h] = group[idx];
  return [
    Math.floor(offset % 8) * CELL_WIDTH + Math.floor((CELL_WIDTH - w) / 2),
    Math.floor(offset / 8) * CELL_HEIGHT + Math.floor((CELL_HEIGHT - h) / 2),
    w,
    h,
  ];
}
