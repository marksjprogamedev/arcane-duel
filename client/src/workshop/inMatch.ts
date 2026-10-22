/**
 * Client-side-only Wizard Workshop appearance. Does not modify authoritative
 * simulation state or the appearance of other players in multiplayer.
 */
import type { Wizard } from '../../../shared/types';
import { ctx } from '../dom';
import { game } from '../state';
import {
  ATLAS_KEYS,
  ATLAS_URL,
  CUSTOM_HEAD,
  CUSTOM_HEAD_INDEX,
  CUSTOM_HEAD_URL,
  CUSTOM_ROBE,
  CUSTOM_ROBE_INDEX,
  CUSTOM_ROBE_URL,
  SLEEVELESS_ROBE,
  SLEEVELESS_ROBE_INDEX,
  SLEEVELESS_ROBE_URL,
  CUSTOM_STAFF,
  CUSTOM_STAFF_INDEX,
  DEFAULT_SKIN,
  LIMITS,
  PLAIN_STAFF_URL,
  SKIN_COLORS,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SKIN_HEAD_LAST,
  SLOTS,
  STAFF_GRIP,
  LEFT_HAND,
  LEFT_HAND_INDEX,
  spriteRect,
} from './parts';
import type { Appearance, SlotId } from './parts';
import { onGripLoaded, onHeadsLoaded, onLeftHandLoaded, tintGrip, tintHeads, tintLeftHand } from './skinTone';
import { LAYOUT_DEFAULTS, sanitiseLayout } from './store';
import type { Layout } from './store';

// Fallback for an unreadable save (not the Workshop's own defaults, which are in parts.ts).
type SkinnedAppearance = Appearance & { skin: string };
const defaults: SkinnedAppearance = {
  head: 0,
  hat: 0,
  body: 0,
  staff: 0,
  off: 0,
  feet: 0,
  skin: DEFAULT_SKIN,
};
const atlas = new Image();
let ready = false;
atlas.onload = () => {
  ready = true;
};
atlas.onerror = () => {
  ready = false;
};
atlas.src = ATLAS_URL;
const customHead = new Image();
let customHeadReady = false;
customHead.onload = () => {
  customHeadReady = true;
};
customHead.onerror = () => {
  customHeadReady = false;
};
customHead.src = CUSTOM_HEAD_URL;
const customRobe = new Image();
let customRobeReady = false;
customRobe.onload = () => {
  customRobeReady = true;
};
customRobe.onerror = () => {
  customRobeReady = false;
};
customRobe.src = CUSTOM_ROBE_URL;
const sleevelessRobe = new Image();
let sleevelessRobeReady = false;
sleevelessRobe.onload = () => {
  sleevelessRobeReady = true;
};
sleevelessRobe.onerror = () => {
  sleevelessRobeReady = false;
};
sleevelessRobe.src = SLEEVELESS_ROBE_URL;
// The staff-grip fist, tinted with the skin tone (rebuilt when the skin changes).
let tintedGrip: HTMLCanvasElement | null = null;
let gripReady = false;
function updateGrip() {
  const grip = tintGrip(appearance.skin);
  if (!grip) return;
  tintedGrip = grip;
  gripReady = true;
}
onGripLoaded(updateGrip);
let tintedLeftHand: HTMLCanvasElement | null = null;
function updateLeftHand() {
  tintedLeftHand = tintLeftHand(appearance.skin);
}

const plainStaff = new Image();
let plainStaffReady = false;
plainStaff.onload = () => {
  plainStaffReady = true;
};
plainStaff.onerror = () => {
  plainStaffReady = false;
};
plainStaff.src = PLAIN_STAFF_URL;
let appearance: SkinnedAppearance = { ...defaults };
// Tinted grayscale heads, one 32×44 canvas each; rebuilt when the skin tone changes.
let isolatedHeads: HTMLCanvasElement[] = [];
let headsReady = false;
function updateHeads() {
  const heads = tintHeads(appearance.skin);
  if (!heads) return;
  isolatedHeads = heads;
  headsReady = true;
}
onHeadsLoaded(updateHeads);
try {
  const saved = JSON.parse(localStorage.getItem('arcane-wizard-workshop') || 'null');
  if (saved) appearance = validate(saved);
} catch {
  /* storage unavailable */
}
onLeftHandLoaded(updateLeftHand);
function validate(value: Record<string, unknown>): SkinnedAppearance {
  const result = { ...defaults };
  for (const key of Object.keys(LIMITS) as (keyof Appearance)[]) {
    const entry = value[key];
    if (typeof entry === 'number' && Number.isInteger(entry) && entry >= 0 && entry < LIMITS[key])
      result[key] = entry;
  }
  if (typeof value.skin === 'string' && SKIN_COLORS.includes(value.skin)) result.skin = value.skin;
  return result;
}
window.addEventListener('arcane-wizard-appearance', ((e: Event) => {
  const previous = appearance.skin;
  appearance = validate((e as CustomEvent<Record<string, unknown>>).detail || {});
  if (previous !== appearance.skin) {
    updateHeads();
    updateGrip();
    updateLeftHand();
  }
}) as EventListener);
let savedLayout: Layout = {};
try {
  savedLayout = sanitiseLayout(JSON.parse(localStorage.getItem('arcane-wizard-layout') || '{}'));
} catch {
  /* storage unavailable */
}
window.addEventListener('arcane-wizard-layout', ((event: Event) => {
  savedLayout = sanitiseLayout((event as CustomEvent<unknown>).detail);
}) as EventListener);
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
  // A rematch starts the simulation clock over without reloading this module.
  // Reset the cached frame/position or elapsed stays at zero until the new
  // battle's clock catches up with the previous one.
  if (game.t < walking.lastTick) {
    walking.lastX = NaN;
    walking.lastY = NaN;
    walking.lastTick = -1;
    walking.phase = 0;
    walking.staffPhase = 0;
    walking.strength = 0;
    walking.dirX = 1;
    walking.dirY = 0;
  }
  const elapsed = walking.lastTick < 0 ? 1 : Math.max(0, Math.min(4, game.t - walking.lastTick));
  if (elapsed === 0) return;
  const dx = x - walking.lastX,
    dy = y - walking.lastY;
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
  const blend = 1 - Math.pow(moving ? 0.75 : 0.7, elapsed);
  walking.strength += ((moving ? 1 : 0) - walking.strength) * blend;
  walking.lastX = x;
  walking.lastY = y;
  walking.lastTick = game.t;
}
// The default artwork faces right. Only a completed cast can flip it.
const castFacing = { left: false, lastFace: 0, lastTick: -1 };
function updateCastFacing(wizard: Wizard) {
  if (game.t < castFacing.lastTick) {
    castFacing.left = false;
    castFacing.lastFace = 0;
  }
  if (wizard.face !== castFacing.lastFace && wizard.swing <= 0) {
    castFacing.left = Math.cos(wizard.face) < 0;
  }
  // Consume sword-facing changes without turning the custom wizard.
  castFacing.lastFace = wizard.face;
  castFacing.lastTick = game.t;
}
/** Draw a miniature modular wizard at the actor's position, preserving status overlays. */
export function drawWorkshopWizard(x: number, y: number, wizard: Wizard): boolean {
  if (!ready) return false;
  updateWalking(x, y);
  updateCastFacing(wizard);
  // Painter's order: feet behind robe, then offhand, then head/hat,
  // with the main-hand weapon drawn last in the foreground.
  const selected: [SlotId, string, number][] = [
    ['feetL', ATLAS_KEYS.feet, appearance.feet],
    ['feetR', ATLAS_KEYS.feet, appearance.feet],
    ['body', ATLAS_KEYS.body, appearance.body],
    ['off', ATLAS_KEYS.off, appearance.off - 1],
    ['head', ATLAS_KEYS.head, appearance.head],
    ['hat', ATLAS_KEYS.hat, appearance.hat - 1],
    ['staff', ATLAS_KEYS.staff, appearance.staff - 1],
    ...(appearance.staff > 0 ? [['handStaff', 'hands', 0] as [SlotId, string, number]] : []),
  ];
  ctx.save();
  // Subtle whole-character idle bob; walking transforms affect only feet and staff/grip.
  ctx.translate(x, y + Math.sin(game.t * 0.065) * 1.5);
  // Mirror the entire assembled character, including staff, grip and feet.
  if (castFacing.left) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  // Slightly larger than the first pass to match the original character silhouettes.
  // Equipment remains rigidly attached during the gentle whole-character bob.
  const scale = 0.32;
  for (const [slot, category, idx] of selected) {
    const isStaffGrip = slot === 'handStaff';
    const isLeftHand = slot === 'off' && (appearance.off === 0 || appearance.off === LEFT_HAND_INDEX);
    const isPlainStaff = slot === 'staff' && appearance.staff === CUSTOM_STAFF_INDEX;
    const isCustomHead = slot === 'head' && appearance.head === CUSTOM_HEAD_INDEX;
    const isCustomRobe = slot === 'body' && appearance.body === CUSTOM_ROBE_INDEX;
    const isSleevelessRobe = slot === 'body' && appearance.body === SLEEVELESS_ROBE_INDEX;
    const isPaletteHead =
      slot === 'head' && appearance.head >= SKIN_HEAD_FIRST && appearance.head <= SKIN_HEAD_LAST;
    const sprite = isLeftHand
      ? ([0, 0, LEFT_HAND.w, LEFT_HAND.h] as [number, number, number, number])
      : isSleevelessRobe
      ? ([0, 0, SLEEVELESS_ROBE.w, SLEEVELESS_ROBE.h] as [number, number, number, number])
      : isStaffGrip
        ? ([0, 0, STAFF_GRIP.w, STAFF_GRIP.h] as [number, number, number, number])
        : isPaletteHead
          ? ([0, 0, SKIN_HEAD.w, SKIN_HEAD.h] as [number, number, number, number])
          : isPlainStaff
            ? ([0, 0, CUSTOM_STAFF.w, CUSTOM_STAFF.h] as [number, number, number, number])
            : isCustomHead
              ? ([0, 0, CUSTOM_HEAD.w, CUSTOM_HEAD.h] as [number, number, number, number])
              : isCustomRobe
                ? ([0, 0, CUSTOM_ROBE.w, CUSTOM_ROBE.h] as [number, number, number, number])
                : spriteRect(category, idx);
    if (
      !sprite ||
      (isPlainStaff && !plainStaffReady) ||
      (isCustomHead && !customHeadReady) ||
      (isCustomRobe && !customRobeReady) ||
      (isSleevelessRobe && !sleevelessRobeReady) ||
      (isPaletteHead && !headsReady) ||
      (isStaffGrip && !gripReady) ||
      (isLeftHand && !tintedLeftHand)
    )
      continue;
    const [sx, sy, sw, sh] = sprite;
    const {
      x: px,
      y: py,
      w: pw,
      h: ph,
    } = isPaletteHead
      ? SKIN_HEAD.box
      : isPlainStaff
        ? CUSTOM_STAFF.box
        : isCustomHead
          ? CUSTOM_HEAD.box
          : isCustomRobe || isSleevelessRobe
            ? CUSTOM_ROBE.box
            : SLOTS[slot];
    const assetIndex =
      slot === 'handR'
        ? 0
        : slot === 'handStaff'
          ? appearance.staff
          : slot === 'feetL' || slot === 'feetR'
            ? appearance.feet
            : appearance[slot];
    const adjustment = savedLayout[`${slot}:${assetIndex}`] || LAYOUT_DEFAULTS;
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
    let motionX = 0,
      motionY = 0;
    if (foot) {
      const step = phase + (right ? Math.PI : 0);
      const stride = Math.sin(step);
      motionX = walking.dirX * 3.2 * stride * strength;
      motionY = (walking.dirY * 2.5 * stride - 2.7 * Math.max(0, Math.cos(step))) * strength;
    } else if (isLeftHand) {
      // Wider, slower offhand sway: 50% more travel and 25% slower than before.
      // Remains synchronized with walking and fades to rest when movement stops.
      motionX = Math.sin(walking.phase * 0.1875 + Math.PI) * 3.9 * strength;
      motionY = Math.cos(walking.phase * 0.1875 + Math.PI) * 0.85 * strength;
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
    ctx.save();
    ctx.translate(dx + (width * scale) / 2 + motionX, dy + (height * scale) / 2 + motionY);
    ctx.rotate((adjustment.rotate * Math.PI) / 180);
    ctx.drawImage(
      isLeftHand
        ? tintedLeftHand
        : isStaffGrip
        ? tintedGrip
        : isPaletteHead
          ? isolatedHeads[appearance.head - SKIN_HEAD_FIRST]
          : isPlainStaff
            ? plainStaff
            : isCustomHead
              ? customHead
              : isCustomRobe
                ? customRobe
                : isSleevelessRobe
                  ? sleevelessRobe
                  : atlas,
      sx + cx,
      sy,
      cw,
      sh,
      (-width * scale) / 2,
      (-height * scale) / 2,
      width * scale,
      height * scale,
    );
    ctx.restore();
  }
  ctx.restore();
  return true;
}
