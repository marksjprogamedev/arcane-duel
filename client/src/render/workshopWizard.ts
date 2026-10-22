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
  skin: string;
};
const defaults: Appearance = { head: 0, hat: 0, body: 0, staff: 0, off: 0, feet: 0, skin: '#c98f70' };
const skinColors = ['#c98f70','#f2c9a2','#a96e50','#704737','#d4aa85','#8fa66c','#92b8d7','#b28fc5','#a5a5a5'];
const headsBase = new Image();
const headsMask = new Image();
const isolatedHeads: HTMLCanvasElement[] = [];
let headsReady = false;
function tintHeads() {
  if (!headsBase.naturalWidth || !headsMask.naturalWidth) return;
  const source = document.createElement('canvas');
  source.width = 128;
  source.height = 88;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(headsBase, 0, 0);
  const pixels = ctx.getImageData(0, 0, 128, 88);
  ctx.clearRect(0, 0, 128, 88);
  ctx.drawImage(headsMask, 0, 0);
  const mask = ctx.getImageData(0, 0, 128, 88);
  const color = [1, 3, 5].map(i => parseInt(appearance.skin.slice(i, i + 2), 16));
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (mask.data[i] < 128 || pixels.data[i + 3] === 0) continue;
    const shade = pixels.data[i] / 160;
    for (let channel = 0; channel < 3; channel++)
      pixels.data[i + channel] = Math.min(255, Math.round(color[channel] * shade));
  }
  // Each head has an independent 32×44 transparent canvas. Unlike drawing
  // atlas subrectangles at fractional scales, this cannot sample a neighbor.
  isolatedHeads.length = 0;
  for (let index = 0; index < 8; index++) {
    const head = document.createElement('canvas');
    head.width = 32;
    head.height = 44;
    const headCtx = head.getContext('2d');
    if (!headCtx) return;
    const tile = headCtx.createImageData(32, 44);
    const startX = (index % 4) * 32;
    const startY = Math.floor(index / 4) * 44;
    for (let row = 0; row < 44; row++) {
      const source = ((startY + row) * 128 + startX) * 4;
      tile.data.set(pixels.data.subarray(source, source + 32 * 4), row * 32 * 4);
    }
    headCtx.putImageData(tile, 0, 0);
    isolatedHeads.push(head);
  }
  headsReady = isolatedHeads.length === 8;
}
headsBase.onload = tintHeads;
headsMask.onload = tintHeads;
headsBase.src = '/ui/wizard-workshop/heads_gray_8.png?v=3';
headsMask.src = '/ui/wizard-workshop/heads_skin_mask_8.png?v=3';
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
const sleevelessRobe = new Image();
let sleevelessRobeReady = false;
sleevelessRobe.onload = () => { sleevelessRobeReady = true; };
sleevelessRobe.onerror = () => { sleevelessRobeReady = false; };
sleevelessRobe.src = '/ui/wizard-workshop/blue_robe_sleeveless_v2.png';
const staffGrip = new Image();
const tintedGrip = document.createElement('canvas');
let gripReady = false;
function tintGrip() {
  if (!staffGrip.naturalWidth) return;
  tintedGrip.width = staffGrip.naturalWidth;
  tintedGrip.height = staffGrip.naturalHeight;
  const ctx = tintedGrip.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(staffGrip, 0, 0);
  const image = ctx.getImageData(0, 0, tintedGrip.width, tintedGrip.height);
  const tone = [1, 3, 5].map(i => parseInt(appearance.skin.slice(i, i + 2), 16));
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = image.data[i];
    if (image.data[i + 3] === 0 || gray < 48) continue;
    const shade = gray / 175;
    for (let ch = 0; ch < 3; ch++)
      image.data[i + ch] = Math.min(255, Math.round(tone[ch] * shade));
  }
  ctx.putImageData(image, 0, 0);
  gripReady = true;
}
staffGrip.onload = tintGrip;
staffGrip.src = '/ui/wizard-workshop/greyscale_staff_grip.png';
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
  const limits = { head: 17, hat: 11, body: 12, staff: 14, off: 11, feet: 10 };
  const result = { ...defaults };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const v = value[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < limits[key]) result[key] = v;
  }
  if (typeof value.skin === 'string' && skinColors.includes(value.skin)) result.skin = value.skin;
  return result;
}
window.addEventListener('arcane-wizard-appearance', ((e: Event) => {
  const previous = appearance.skin;
  appearance = validate((e as CustomEvent<Record<string, unknown>>).detail || {});
  if (previous !== appearance.skin) { tintHeads(); tintGrip(); }
}) as EventListener);
type LayoutAdjustment = { x: number; y: number; scale: number; rotate: number };
const layoutKey = 'arcane-wizard-layout';
const layoutDefaults: LayoutAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 };
function validateLayout(value: unknown): Record<string, LayoutAdjustment> {
  const output: Record<string, LayoutAdjustment> = {};
  if (!value || typeof value !== 'object') return output;
  for (const [key, raw] of Object.entries(value)) {
    if (!/^(head|hat|body|staff|off|handR|handStaff|feetL|feetR):\d+$/.test(key) ||
        !raw || typeof raw !== 'object') continue;
    const part = raw as Record<string, unknown>;
    const x = Number(part.x), y = Number(part.y), scale = Number(part.scale);
    const rotate = part.rotate == null ? 0 : Number(part.rotate);
    if (Number.isFinite(x) && Math.abs(x) <= 150 && Number.isFinite(y) && Math.abs(y) <= 150 &&
        Number.isFinite(scale) && scale >= 0.25 && scale <= 3 && Number.isFinite(rotate) && Math.abs(rotate) <= 180)
      output[key] = { x, y, scale, rotate };
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
  handStaff: [27, 193, 56, 52],
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
/**
 * Visual-only walking cycle. Movement is inferred from successive local player
 * positions; nothing is written to the authoritative game simulation.
 * Staff and grip share one transform, keeping their saved relative alignment.
 */
const walking = {
  lastX: NaN,
  lastY: NaN,
  lastTick: -1,
  phase: 0,
  staffPhase: 0,
  strength: 0,
  dirX: 1,
  dirY: 0,
};
function updateWalking(x: number, y: number) {
  const elapsed = walking.lastTick < 0 ? 1 : Math.max(0, Math.min(4, game.t - walking.lastTick));
  if (elapsed === 0) return;
  const dx = x - walking.lastX, dy = y - walking.lastY;
  const distance = Math.hypot(dx, dy);
  // Ignore teleportation, respawn and unusually large reconciliation jumps.
  const moving = Number.isFinite(distance) && distance > 0.08 && distance < 14 * elapsed;
  if (moving) {
    walking.dirX = dx / distance;
    walking.dirY = dy / distance;
    const step = Math.min(distance, 7 * elapsed) * 0.16;
    walking.phase = (walking.phase + step) % (Math.PI * 2);
    // The staff/grip circle runs in reverse at one third of the foot cadence.
    walking.staffPhase = (walking.staffPhase - step / 3 + Math.PI * 2) % (Math.PI * 2);
  }
  // Fade motion rather than abruptly snapping limbs back to their saved layout.
  const blend = 1 - Math.pow(moving ? 0.75 : 0.70, elapsed);
  walking.strength += ((moving ? 1 : 0) - walking.strength) * blend;
  walking.lastX = x;
  walking.lastY = y;
  walking.lastTick = game.t;
}
/** Draw a miniature modular wizard at the actor's position, preserving status overlays. */
export function drawWorkshopWizard(x: number, y: number): boolean {
  if (!ready) return false;
  updateWalking(x, y);
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
    ...(appearance.staff > 0
      ? [['handStaff', 'hands', 0] as [keyof typeof positions, string, number]]
      : []),
  ];
  g.save();
  // Subtle whole-character idle bob; walking transforms affect only feet and staff/grip.
  g.translate(x, y + Math.sin(game.t * 0.065) * 1.5);
  g.imageSmoothingEnabled = false;
  // Slightly larger than the first pass to match the original character silhouettes.
  // Equipment remains rigidly attached during the gentle whole-character bob.
  const scale = 0.32;
  for (const [slot, category, idx] of selected) {
    const isStaffGrip = slot === 'handStaff';
    const isPlainStaff = slot === 'staff' && appearance.staff === 13;
    const isCustomHead = slot === 'head' && appearance.head === 8;
    const isCustomRobe = slot === 'body' && appearance.body === 10;
    const isSleevelessRobe = slot === 'body' && appearance.body === 11;
    const isPaletteHead = slot === 'head' && appearance.head >= 9 && appearance.head <= 16;
    const sprite = isSleevelessRobe
      ? ([0, 0, 80, 71] as [number, number, number, number])
      : isStaffGrip
      ? ([0, 0, 56, 52] as [number, number, number, number])
      : isPaletteHead
      ? ([0, 0, 32, 44] as [number, number, number, number])
      : isPlainStaff
      ? ([0, 0, 96, 105] as [number, number, number, number])
      : isCustomHead
        ? ([0, 0, 36, 35] as [number, number, number, number])
        : isCustomRobe
          ? ([0, 0, 36, 33] as [number, number, number, number])
          : rect(category, idx);
    if (!sprite || (isPlainStaff && !plainStaffReady) || (isCustomHead && !customHeadReady) || (isCustomRobe && !customRobeReady) || (isSleevelessRobe && !sleevelessRobeReady) || (isPaletteHead && !headsReady) || (isStaffGrip && !gripReady)) continue;
    const [sx, sy, sw, sh] = sprite;
    const [px, py, pw, ph] = isPaletteHead
      ? [49, 55, 162, 149]
      : isPlainStaff
      ? [-12, 88, 142, 216]
      : isCustomHead
        ? [49, 55, 162, 149]
        : isCustomRobe || isSleevelessRobe
          ? [50, 143, 160, 162]
          : positions[slot];
    const assetIndex = slot === 'handR' ? 0 : slot === 'handStaff' ? appearance.staff : slot === 'feetL' || slot === 'feetR' ? appearance.feet : appearance[slot];
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
    // Alternating tiny foot shuffles. The front and rear feet are exactly
    // half a cycle apart, with a gentle upward lift on each forward step.
    const phase = walking.phase;
    const strength = walking.strength;
    let motionX = 0, motionY = 0;
    if (foot) {
      const step = phase + (right ? Math.PI : 0);
      const stride = Math.sin(step);
      motionX = walking.dirX * 3.2 * stride * strength;
      motionY = (walking.dirY * 2.5 * stride - 2.7 * Math.max(0, Math.cos(step))) * strength;
    } else if (slot === 'staff' || isStaffGrip) {
      // Identical offset for both sprites: the fist never slides off the staff.
      // A closed ellipse lifts the cane, advances it along the walking vector,
      // then plants it again. Sine/cosine guarantee a seamless loop.
      const swing = Math.sin(walking.staffPhase);
      const lift = (1 - Math.cos(walking.staffPhase)) * 0.5;
      motionX = walking.dirX * 7 * swing * strength;
      motionY = (walking.dirY * 5 * swing - 6 * lift) * strength;
    }
    // Match the Workshop preview: rotate about the centre of this individual sprite.
    g.save();
    g.translate(dx + width * scale / 2 + motionX, dy + height * scale / 2 + motionY);
    g.rotate((adjustment.rotate * Math.PI) / 180);
    g.drawImage(
      isStaffGrip ? tintedGrip : isPaletteHead ? isolatedHeads[appearance.head - 9] : isPlainStaff ? plainStaff : isCustomHead ? customHead : isCustomRobe ? customRobe : isSleevelessRobe ? sleevelessRobe : atlas,
      sx + cx, sy, cw, sh,
      -width * scale / 2, -height * scale / 2, width * scale, height * scale,
    );
    g.restore();
  }
  g.restore();
  return true;
}
