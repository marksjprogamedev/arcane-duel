import { SPELL_COLOR, styles, TRAP } from '../constants';
import type { SimState } from '../simState';
import { canSee, smokeAllows, VISION_MARGIN } from './vision';
import type {
  Bomb,
  Bubble,
  Death,
  FxEvent,
  Shot,
  Trap,
  Wizard,
  Seat,
  SpellVariant,
  Zone,
} from '../types';

// Snapshots carry only what clients draw or predict, not the whole simulation state: no status
// timers (`statusDelay`, `burnTick`, ...), no projectile bookkeeping (`travel`, `damage`, ...), and the
// other wizards' cooldowns and knockback stay on the server.

/** What every client needs to draw a wizard. */
const WIZARD_VIEW = [
  'seat',
  'team',
  'fallen',
  'away',
  'returnIn',
  'x',
  'y',
  'hp',
  'max',
  'shield',
  'swing',
  'face',
  'freeze',
  'freezeMax',
  'silence',
  'burn',
  'wet',
  'chill',
  'scald',
  'magnetized',
  'overload',
  'static',
  'chargeSpell',
  'chargeTicks',
  'flurryTime',
  'prison',
  'airborne',
] as const;
/** Extra fields for the player's own wizard: HUD cooldowns, and knockback for prediction. */
const OWN_WIZARD_EXTRAS = [
  'kx',
  'ky',
  'slow',
  'pulled',
  'glide',
  'swordCD',
  'forceCD',
  'bombCD',
  'magmaCD',
  'steamCD',
  'plasmaCD',
  'iceCD',
  'magneticCD',
  'earthCD',
  'fireCD',
  'waterCD',
  'stormCD',
  'lightCD',
  'healCD',
  'bubbleCD',
  'trapCD',
  'flurryCD',
] as const;
const SHOT_VIEW = ['id', 'x', 'y', 'vx', 'vy', 'spell', 'r'] as const;
const BOMB_VIEW = ['id', 'x', 'y', 'flightProgress', 'spell', 'landed', 'fuse'] as const;
const ZONE_VIEW = ['x', 'y', 'spell', 'r', 'life'] as const;
const TRAP_VIEW = ['id', 'x', 'y', 'spell', 'life', 'arm'] as const;
const BUBBLE_VIEW = ['x', 'y', 'r', 'life'] as const;

/** A wizard as sent over the wire: the style object is replaced by its index in `styles`. */
export type WireWizard = Pick<Wizard, (typeof WIZARD_VIEW)[number]> & { style: number };
export type WireOwnWizard = WireWizard & Pick<Wizard, (typeof OWN_WIZARD_EXTRAS)[number]>;
/** `variant` is only there for a spell variant's shot (a default shot is left plain on the wire). */
export type WireShot = Pick<Shot, (typeof SHOT_VIEW)[number]> & {
  owner: Seat;
  variant?: SpellVariant;
  reflected?: true;
};
export type WireBomb = Pick<Bomb, (typeof BOMB_VIEW)[number]> & { owner: Seat };
export type WireZone = Pick<Zone, (typeof ZONE_VIEW)[number]> & { owner: Seat };
export type WireTrap = Pick<Trap, (typeof TRAP_VIEW)[number]> & { owner: Seat };
export type WireBubble = Pick<Bubble, (typeof BUBBLE_VIEW)[number]> & { owner: Seat };

function pick<T, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) out[key] = source[key];
  return out;
}

export interface Snapshot {
  roundId: number;
  seq: number;
  /** Newest move command `seq` from the receiving player that the server had applied. */
  ack: number;
  /** The viewer's own wizard (its `seat` says which one that is). */
  you: WireOwnWizard;
  /** Every other wizard the viewer can see; ones out of sight on a fogged map are left out. */
  others: WireWizard[];
  shots: WireShot[];
  bombs: WireBomb[];
  zones: WireZone[];
  bubbles: WireBubble[];
  traps: WireTrap[];
  /** Cosmetic effect events since the previous snapshot (clients make particles, text, arcs). */
  fx: FxEvent[];
  /** Kills by team 0 and team 1 (respawn matches). */
  score: [number, number];
  /** Ticks left of the countdown before the match begins; 0 once it is under way. */
  countdown: number;
  t: number;
  ending: boolean;
  death: (Omit<Death, 'wizard'> & { wizard: Seat }) | null;
}

// Snapshot numbers are rounded: the long floats JSON produces by default cost far more bytes
// than the precision is worth (positions to 0.1 px, velocities to 0.01).
const r1 = (value: number) => Math.round(value * 10) / 10;
const r2 = (value: number) => Math.round(value * 100) / 100;
function roundNumbers<T extends object>(source: T, round: (v: number) => number): T {
  const out = { ...source } as Record<string, unknown>;
  for (const key in out) {
    const value = out[key];
    if (typeof value === 'number') out[key] = round(value);
    else if (value && typeof value === 'object' && value.constructor === Object)
      out[key] = roundNumbers(value, round);
  }
  return out as T;
}

/** Effects (particles, rings, text) reach this far from the point they are made at. */
const FX_REACH = 120;

/**
 * Builds the snapshot sent to the player in seat `viewer`: their own wizard, and the others they
 * can see. Owners and fx events carry absolute seats. Cosmetics are never included, only the fx
 * events that let each client make its own.
 */
export function serializeSnapshot(
  game: SimState,
  viewer: Seat,
  meta: { roundId: number; seq: number; ack?: number; countdown?: number },
  fx: FxEvent[] = [],
): Snapshot {
  const wire = (w: Wizard): WireWizard => ({
    ...roundNumbers(pick(w, WIZARD_VIEW), r2),
    style: styles.indexOf(w.style),
  });
  const mine = game.wizards[viewer];
  // Fog of war: a team shares its sight. Enemies and their things are sent only if some standing
  // member of the viewer's team could see them (plus a margin); the team's own wizards and things
  // are always sent. When the round is ending everything is shown.
  const fogged = game.map.vision !== null && !game.ending && !game.death;
  const watchers = game.wizards.filter((w) => w.team === mine.team && !w.fallen);
  const clouds =
    game.ending || game.death ? [] : game.zones.filter((zone) => zone.spell === 'SMOKE');
  // Smoke: nobody sees out of a cloud and only its caster's team sees in (see `smokeAllows`). A team
  // sees a point if any standing member does.
  const smokeSees = (at: { x: number; y: number }) =>
    clouds.length === 0 ||
    watchers.length === 0 ||
    watchers.some((w) => smokeAllows(clouds, w, at));
  const sees = (at: { x: number; y: number }, extra = 0) =>
    (!fogged || watchers.some((w) => canSee(game.map, w, at, VISION_MARGIN + extra))) &&
    smokeSees(at);
  const seen = <T extends { x: number; y: number; owner: Wizard }>(item: T, extra = 0) =>
    item.owner.team === mine.team ? smokeSees(item) : sees(item, extra);
  // The smoke clouds themselves stay visible to everyone who could see them.
  const seenCloud = (zone: SimState['zones'][number]) =>
    zone.spell === 'SMOKE'
      ? zone.owner.team === mine.team ||
        !fogged ||
        watchers.some((w) => canSee(game.map, w, zone, VISION_MARGIN + zone.r))
      : seen(zone, zone.r);
  // Floating text sits well above the ground point it belongs to. Your own damage numbers always show.
  const seesFx = (ev: FxEvent) => {
    if (ev.type === 'text' && ev.damageOwner === viewer) return true;
    if (ev.type === 'burst' && ev.color === SPELL_COLOR.SMOKE) return true;
    const at = ev.type === 'text' ? { x: ev.x, y: ev.y + 110 } : ev;
    return (
      sees(at, FX_REACH) || (ev.type === 'lightning' && sees({ x: ev.tx, y: ev.ty }, FX_REACH))
    );
  };
  return {
    roundId: meta.roundId,
    seq: meta.seq,
    ack: meta.ack ?? 0,
    you: { ...wire(mine), ...roundNumbers(pick(mine, OWN_WIZARD_EXTRAS), r2) },
    others: game.wizards
      .filter((w) => w !== mine && !w.absent && (w.team === mine.team ? smokeSees(w) : sees(w)))
      .map(wire),
    shots: game.shots
      .filter((shot) => seen(shot))
      .map((shot) => ({
        ...roundNumbers(pick(shot, SHOT_VIEW), r2),
        owner: shot.owner.seat,
        ...(shot.variant ? { variant: shot.variant } : {}),
        ...(shot.reflected ? { reflected: true as const } : {}),
      })),
    bombs: game.bombs
      .filter((bomb) => seen(bomb))
      .map((bomb) => ({
        ...roundNumbers(pick(bomb, BOMB_VIEW), r2),
        owner: bomb.owner.seat,
      })),
    zones: game.zones.filter(seenCloud).map((zone) => ({
      ...roundNumbers(pick(zone, ZONE_VIEW), r1),
      owner: zone.owner.seat,
    })),
    bubbles: game.bubbles
      .filter((bubble) => seen(bubble, bubble.r))
      .map((bubble) => ({
        ...roundNumbers(pick(bubble, BUBBLE_VIEW), r1),
        owner: bubble.owner.seat,
      })),
    // a trap fades from its enemies' sight `TRAP.VISIBLE_TICKS` after it was set
    traps: game.traps
      .filter(
        (t) => seen(t) && (t.owner.team === mine.team || TRAP.LIFE - t.life < TRAP.VISIBLE_TICKS),
      )
      .map((t) => ({
        ...roundNumbers(pick(t, TRAP_VIEW), r1),
        owner: t.owner.seat,
      })),
    fx: fx.filter(seesFx).map((ev) => roundNumbers(ev, r1)),
    score: game.score,
    countdown: meta.countdown ?? 0,
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, wizard: game.death.wizard.seat } : null,
  };
}
