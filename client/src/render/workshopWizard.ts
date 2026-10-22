/**
 * Client-side-only Wizard Workshop appearance. Does not modify authoritative
 * simulation state or the appearance of other players in multiplayer.
 */
import { g } from '../dom';
import { game } from '../state';

type Appearance = {
  head: number;
  hat: number;
  body: number;
  staff: number;
  off: number;
  feet: number;
};
const defaults: Appearance = { head: 0, hat: 0, body: 0, staff: 0, off: 0, feet: 0 };
const dims: Record<string, [number, number][]> = {
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
const atlas = new Image();
let ready = false;
atlas.onload = () => {
  ready = true;
};
atlas.onerror = () => {
  ready = false;
};
atlas.src = '/ui/wizard-workshop/wizard_workshop_game_atlas.png';
const customHead = new Image();
let customHeadReady = false;
customHead.onload = () => { customHeadReady = true; };
customHead.onerror = () => { customHeadReady = false; };
customHead.src = '/ui/wizard-workshop/eccentric_old_wizard_head.png';
const customRobe = new Image();
let customRobeReady = false;
customRobe.onload = () => { customRobeReady = true; };
customRobe.onerror = () => { customRobeReady = false; };
customRobe.src = '/ui/wizard-workshop/blue_robe_stout.png';
const plainStaff = new Image();
let plainStaffReady = false;
plainStaff.onload = () => { plainStaffReady = true; };
plainStaff.onerror = () => { plainStaffReady = false; };
plainStaff.src = '/ui/wizard-workshop/plain_quarterstaff_right_hand.png';
let appearance: Appearance = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem('arcane-wizard-workshop') || 'null');
  if (saved) appearance = validate(saved);
} catch {
  /* storage unavailable */
}
function validate(value: Record<string, unknown>): Appearance {
  const limits: Appearance = { head: 9, hat: 11, body: 11, staff: 14, off: 11, feet: 10 };
  const result = { ...defaults };
  for (const key of Object.keys(result) as (keyof Appearance)[]) {
    const v = value[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < limits[key]) result[key] = v;
  }
  return result;
}
window.addEventListener('arcane-wizard-appearance', ((e: Event) => {
  appearance = validate((e as CustomEvent<Record<string, unknown>>).detail || {});
}) as EventListener);
type LayoutAdjustment = { x: number; y: number; scale: number };
const layoutKey = 'arcane-wizard-layout';
const layoutDefaults: LayoutAdjustment = { x: 0, y: 0, scale: 1 };
function validateLayout(value: unknown): Record<string, LayoutAdjustment> {
  const output: Record<string, LayoutAdjustment> = {};
  if (!value || typeof value !== 'object') return output;
  for (const [key, raw] of Object.entries(value)) {
    if (!/^(head|hat|body|staff|off|handR|feetL|feetR):\\d+$/.test(key) ||
        !raw || typeof raw !== 'object') continue;
    const part = raw as Record<string, unknown>;
    const x = Number(part.x), y = Number(part.y), scale = Number(part.scale);
    if (Number.isFinite(x) && Math.abs(x) <= 150 && Number.isFinite(y) && Math.abs(y) <= 150 &&
        Number.isFinite(scale) && scale >= 0.25 && scale <= 3)
      output[key] = { x, y, scale };
  }
  return output;
}
let savedLayout: Record<string, LayoutAdjustment> = {};
try { savedLayout = validateLayout(JSON.parse(localStorage.getItem(layoutKey) || '{}')); }
catch { /* storage unavailable */ }
window.addEventListener('arcane-wizard-layout', ((event: Event) => {
  savedLayout = validateLayout((event as CustomEvent<unknown>).detail);
}) as EventListener);
const positions = {
  head: [60, 62, 140, 139],
  hat: [51, 14, 155, 90],
  body: [65, 141, 130, 149],
  staff: [0, 98, 88, 206],
  off: [193, 175, 63, 80],
  handR: [177, 211, 41, 41],
  feetL: [81, 277, 51, 42],
  feetR: [129, 277, 51, 42],
} as const;
function rect(category: string, idx: number): [number, number, number, number] | null {
  const group = dims[category];
  if (!group || idx < 0 || idx >= group.length) return null;
  let n = idx;
  for (const key of Object.keys(dims)) {
    if (key === category) break;
    n += dims[key].length;
  }
  const [w, h] = group[idx];
  return [
    (n % 8) * 171 + Math.floor((171 - w) / 2),
    Math.floor(n / 8) * 243 + Math.floor((243 - h) / 2),
    w,
    h,
  ];
}
/** Draw a miniature modular wizard at the actor's position, preserving status overlays. */
export function drawWorkshopWizard(x: number, y: number): boolean {
  if (!ready) return false;
  // Painter's order: feet behind robe, then offhand, then head/hat,
  // with the main-hand weapon drawn last in the foreground.
  const selected: [keyof typeof positions, string, number][] = [
    ['feetL', 'feet', appearance.feet],
    ['feetR', 'feet', appearance.feet],
    ['body', 'bodies', appearance.body],
    ['off', 'offhands', appearance.off - 1],
    ...(appearance.off === 0
      ? [['handR', 'hands', 0] as [keyof typeof positions, string, number]]
      : []),
    ['head', 'heads', appearance.head],
    ['hat', 'hats', appearance.hat - 1],
    ['staff', 'staffs', appearance.staff - 1],
  ];
  g.save();
  // Subtle whole-character idle bob; individual limbs remain static.
  g.translate(x, y + Math.sin(game.t * 0.065) * 1.5);
  g.imageSmoothingEnabled = false;
  // Slightly larger than the first pass to match the original character silhouettes.
  // Equipment remains rigidly attached during the gentle whole-character bob.
  const scale = 0.32;
  for (const [slot, category, idx] of selected) {
    const isPlainStaff = slot === 'staff' && appearance.staff === 13;
    const isCustomHead = slot === 'head' && appearance.head === 8;
    const isCustomRobe = slot === 'body' && appearance.body === 10;
    const sprite = isPlainStaff
      ? ([0, 0, 96, 105] as [number, number, number, number])
      : isCustomHead
        ? ([0, 0, 36, 35] as [number, number, number, number])
        : isCustomRobe
          ? ([0, 0, 36, 33] as [number, number, number, number])
          : rect(category, idx);
    if (!sprite || (isPlainStaff && !plainStaffReady) || (isCustomHead && !customHeadReady) || (isCustomRobe && !customRobeReady)) continue;
    const [sx, sy, sw, sh] = sprite;
    const [px, py, pw, ph] = isPlainStaff
      ? [-12, 88, 142, 216]
      : isCustomHead
        ? [49, 55, 162, 149]
        : isCustomRobe
          ? [50, 143, 160, 162]
          : positions[slot];
    const assetIndex = slot === 'handR' ? 0 : slot === 'feetL' || slot === 'feetR' ? appearance.feet : appearance[slot];
    const adjustment = savedLayout[`${slot}:${assetIndex}`] || layoutDefaults;
    const foot = slot === 'feetL' || slot === 'feetR';
    const right = slot === 'feetR';
    const cx = foot && right ? Math.floor(sw / 2) : 0;
    const cw = foot ? (right ? sw - cx : Math.floor(sw / 2)) : sw;
    const ratio = Math.min(pw / cw, ph / sh);
    const width = cw * ratio * adjustment.scale,
      height = sh * ratio * adjustment.scale;
    const dx = (px + (pw - width) / 2 + adjustment.x - 128) * scale;
    const dy = (py + (ph - height) / 2 + adjustment.y - 290) * scale;
    g.drawImage(isPlainStaff ? plainStaff : isCustomHead ? customHead : isCustomRobe ? customRobe : atlas, sx + cx, sy, cw, sh, dx, dy, width * scale, height * scale);
  }
  g.restore();
  return true;
}
