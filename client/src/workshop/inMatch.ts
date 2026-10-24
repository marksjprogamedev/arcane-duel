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
  DEFAULT_ROBE_COLOR,
  ROBE_COLORS,
  ROBE_FIRST,
  ROBE_LAST,
  ROBE_TILE,
  DEFAULTS,
  isAvailablePart,
  PLAIN_STAFF_URL,
  SKIN_COLORS,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SKIN_HEAD_LAST,
  SLOTS,
  STAFF_GRIP,
  LEFT_HAND,
  LEFT_HAND_INDEX,
  HAT_SPRITES,
  OFFHAND_SPRITES,
  MAINHAND_SPRITES,
  spriteRect,
} from './parts';
import type { Appearance, SlotId } from './parts';
import { onRobesLoaded, tintRobe } from './robeTint';
import { tintHatSprite } from './hatTint';
import {
  onGripLoaded,
  onHeadsLoaded,
  onLeftHandLoaded,
  tintGrip,
  tintHeads,
  tintLeftHand,
} from './skinTone';
import {
  DEFAULT_LAYOUT,
  sanitiseLayout,
  effectiveLayout,
  loadPairs,
  pairAlignments,
} from './store';
import type { Layout } from './store';
import { groundedSpritePlacement } from './grounding';

// Fallback for an unreadable save (not the Workshop's own defaults, which are in parts.ts).
type SkinnedAppearance = Appearance & { skin: string; robeColor: string };
const defaults: SkinnedAppearance = {
  ...DEFAULTS,
  skin: DEFAULT_SKIN,
  robeColor: DEFAULT_ROBE_COLOR,
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
const hatImages: Record<number, HTMLImageElement> = {};
for (const [id, sprite] of Object.entries(HAT_SPRITES)) {
  const image = new Image();
  image.onload = () => updateHats();
  image.src = sprite.url;
  hatImages[Number(id)] = image;
}
const offhandImages: Record<number, HTMLImageElement> = {};
for (const [id, sprite] of Object.entries(OFFHAND_SPRITES)) {
  const image = new Image();
  image.src = sprite.url;
  offhandImages[Number(id)] = image;
}
const mainhandImages: Record<number, HTMLImageElement> = {};
for (const [id, sprite] of Object.entries(MAINHAND_SPRITES)) {
  const image = new Image();
  image.src = sprite.url;
  mainhandImages[Number(id)] = image;
}
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
const dyedRobes: Record<number, HTMLCanvasElement> = {};
const dyedHats: Record<number, HTMLCanvasElement> = {};
function updateRobes() {
  for (let index = SLEEVELESS_ROBE_INDEX; index <= ROBE_LAST; index++) {
    const robe = tintRobe(index, appearance.robeColor);
    if (robe) dyedRobes[index] = robe;
  }
}
function updateHats() {
  for (const [id, image] of Object.entries(hatImages)) {
    const dyed = tintHatSprite(Number(id), image, appearance.robeColor);
    if (dyed) dyedHats[Number(id)] = dyed;
    else delete dyedHats[Number(id)];
  }
}
onRobesLoaded(updateRobes);
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
// If the sprite sheet loaded before browser preferences, refresh its dye now.
updateRobes();
updateHats();
onLeftHandLoaded(updateLeftHand);
function validate(value: Record<string, unknown>): SkinnedAppearance {
  const result = { ...defaults };
  for (const key of Object.keys(DEFAULTS) as (keyof Appearance)[]) {
    const entry = value[key];
    if (isAvailablePart(key, entry)) result[key] = entry;
  }
  if (typeof value.skin === 'string' && SKIN_COLORS.includes(value.skin)) result.skin = value.skin;
  if (typeof value.robeColor === 'string' && ROBE_COLORS.includes(value.robeColor))
    result.robeColor = value.robeColor;
  return result;
}
window.addEventListener('arcane-wizard-appearance', ((e: Event) => {
  const previous = appearance.skin;
  const previousRobeColor = appearance.robeColor;
  appearance = validate((e as CustomEvent<Record<string, unknown>>).detail || {});
  if (previous !== appearance.skin) {
    updateHeads();
    updateGrip();
    updateLeftHand();
  }
  if (previousRobeColor !== appearance.robeColor) updateRobes();
}) as EventListener);
loadPairs();
window.addEventListener('arcane-wizard-pairs', ((event: Event) => {
  const next = (event as CustomEvent<typeof pairAlignments>).detail;
  for (const kind of ['hatHead', 'headBody'] as const)
    Object.assign(pairAlignments[kind], next[kind] || {});
}) as EventListener);
let savedLayout: Layout = { ...DEFAULT_LAYOUT };
try {
  savedLayout = {
    ...DEFAULT_LAYOUT,
    ...sanitiseLayout(JSON.parse(localStorage.getItem('arcane-wizard-layout') || '{}')),
  };
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
  // Keep the wizard perfectly still when stationary; only movement-driven
  // limb animations run while walking. No global idle bob.
  ctx.translate(x, y);
  // Mirror the entire assembled character, including staff, grip and feet.
  if (castFacing.left) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  // Slightly larger than the first pass to match the original character silhouettes.
  // Equipment remains rigidly attached during the gentle whole-character bob.
  const scale = 0.32;
  for (const [slot, category, idx] of selected) {
    const isStaffGrip = slot === 'handStaff';
    const isLeftHand =
      slot === 'off' && (appearance.off === 0 || appearance.off === LEFT_HAND_INDEX);
    const isPlainStaff = slot === 'staff' && appearance.staff === CUSTOM_STAFF_INDEX;
    const isCustomHead = slot === 'head' && appearance.head === CUSTOM_HEAD_INDEX;
    const isCustomRobe = slot === 'body' && appearance.body === CUSTOM_ROBE_INDEX;
    const isSleevelessRobe = slot === 'body' && appearance.body === SLEEVELESS_ROBE_INDEX;
    const isDyedRobe =
      slot === 'body' && appearance.body >= ROBE_FIRST && appearance.body <= ROBE_LAST;
    const isPaletteHead =
      slot === 'head' && appearance.head >= SKIN_HEAD_FIRST && appearance.head <= SKIN_HEAD_LAST;
    const hat = slot === 'hat' ? HAT_SPRITES[appearance.hat] : undefined;
    const hatImage = hat ? hatImages[appearance.hat] : undefined;
    const offhand =
      slot === 'staff'
        ? MAINHAND_SPRITES[appearance.staff]
        : slot === 'off'
          ? OFFHAND_SPRITES[appearance.off]
          : undefined;
    const offhandImage =
      slot === 'staff'
        ? mainhandImages[appearance.staff]
        : offhand
          ? offhandImages[appearance.off]
          : undefined;
    const dyedHat = hat ? dyedHats[appearance.hat] : undefined;
    const sprite = hat
      ? dyedHat
        ? ([0, 0, hat.rect[2], hat.rect[3]] as [number, number, number, number])
        : hat.rect
      : offhand
        ? offhand.rect
        : isDyedRobe
          ? ([0, 0, ROBE_TILE.w, ROBE_TILE.h] as [number, number, number, number])
          : isLeftHand
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
      (hat && (!hatImage?.complete || !hatImage.naturalWidth)) ||
      (offhand && (!offhandImage?.complete || !offhandImage.naturalWidth)) ||
      (isPlainStaff && !plainStaffReady) ||
      (isCustomHead && !customHeadReady) ||
      (isCustomRobe && !customRobeReady) ||
      (isSleevelessRobe && !sleevelessRobeReady) ||
      (isDyedRobe && !dyedRobes[appearance.body]) ||
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
    } = hat
      ? hat.box
      : offhand
        ? offhand.box
        : isPaletteHead
          ? SKIN_HEAD.box
          : isPlainStaff
            ? CUSTOM_STAFF.box
            : isCustomHead
              ? CUSTOM_HEAD.box
              : isCustomRobe || isSleevelessRobe || isDyedRobe
                ? CUSTOM_ROBE.box
                : SLOTS[slot];
    const adjustment = effectiveLayout(slot, false, appearance, savedLayout);
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
      // Broad, slow elliptical orbit: the offhand advances, lifts, returns and
      // lowers over a continuous cycle, fading smoothly to rest when stationary.
      // Its cycle is independent of the faster foot shuffle and staff swing.
      const handOrbit = walking.phase * 0.125 + Math.PI;
      motionX = Math.sin(handOrbit) * 5.2 * strength;
      motionY = Math.cos(handOrbit) * 3.1 * strength;
    } else if (slot === 'staff' || isStaffGrip) {
      // Identical offset for both sprites: the fist never slides off the staff.
      // A closed ellipse lifts the cane, advances it along the walking vector,
      // then plants it again. Sine/cosine guarantee a seamless loop.
      const swing = Math.sin(walking.staffPhase);
      const lift = (1 - Math.cos(walking.staffPhase)) * 0.5;
      motionX = walking.dirX * 7 * swing * strength;
      motionY = (walking.dirY * 5 * swing - 6 * lift) * strength;
    }
    // Body and feet are grounded at their bottom-centre. Other layers retain
    // the Workshop's centre-pivot transforms so oversized hats, staffs and
    // shields can extend freely without moving the wizard's logical position.
    const grounded = slot === 'body' || foot;
    const placement = grounded
      ? groundedSpritePlacement(SLOTS[slot], width, height, scale, adjustment)
      : null;
    ctx.save();
    ctx.translate(
      grounded ? placement!.x + motionX : dx + (width * scale) / 2 + motionX,
      grounded ? placement!.y + placement!.pivotY + motionY : dy + (height * scale) / 2 + motionY,
    );
    ctx.rotate((adjustment.rotate * Math.PI) / 180);
    if (adjustment.flipX) ctx.scale(-1, 1);
    ctx.drawImage(
      dyedHat ||
        hatImage ||
        offhandImage ||
        (isDyedRobe
          ? dyedRobes[appearance.body]
          : isLeftHand
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
                        ? dyedRobes[appearance.body] || sleevelessRobe
                        : atlas),
      sx + cx,
      sy,
      cw,
      sh,
      grounded ? -placement!.width / 2 : (-width * scale) / 2,
      grounded ? -placement!.height / 2 : (-height * scale) / 2,
      grounded ? placement!.width : width * scale,
      grounded ? placement!.height : height * scale,
    );
    ctx.restore();
  }
  ctx.restore();
  return true;
}
