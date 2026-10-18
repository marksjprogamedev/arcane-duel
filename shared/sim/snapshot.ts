import { styles } from '../constants';
import type { SimState } from '../simState';
import { canSee, VISION_MARGIN } from './vision';
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
// timers (`rest`, `burnTick`, ...), no projectile bookkeeping (`travel`, `damage`, ...), and the
// opponent's cooldowns and knockback stay on the server.

/** What every client needs to draw a wizard. */
const WIZARD_VIEW = [
  'seat',
  'team',
  'fallen',
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
  'mag',
  'over',
  'stat',
  'chargeSpell',
  'chargeTicks',
  'flurryTime',
  'prison',
] as const;
/** Extra fields for the player's own wizard: HUD cooldowns, and knockback for prediction. */
const OWN_WIZARD_EXTRAS = [
  'kx',
  'ky',
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
  'lightCD',
  'healCD',
  'bubbleCD',
  'trapCD',
] as const;
const SHOT_VIEW = ['id', 'x', 'y', 'vx', 'vy', 'k', 'r'] as const;
const BOMB_VIEW = ['id', 'x', 'y', 'u', 'k', 'landed', 'fuse'] as const;
const ZONE_VIEW = ['x', 'y', 'k', 'r', 'life'] as const;
const TRAP_VIEW = ['id', 'x', 'y', 'k', 'life', 'arm'] as const;
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

function pick<T, K extends keyof T>(o: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = o[k];
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
  t: number;
  ending: boolean;
  death: (Omit<Death, 'w'> & { w: Seat }) | null;
}

// Snapshot numbers are rounded: the long floats JSON produces by default cost far more bytes
// than the precision is worth (positions to 0.1 px, velocities to 0.01).
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
function roundNumbers<T extends object>(o: T, round: (v: number) => number): T {
  const out = { ...o } as Record<string, unknown>;
  for (const k in out) {
    const v = out[k];
    if (typeof v === 'number') out[k] = round(v);
    else if (v && typeof v === 'object' && v.constructor === Object)
      out[k] = roundNumbers(v, round);
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
  meta: { roundId: number; seq: number; ack?: number },
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
  const sees = (at: { x: number; y: number }, extra = 0) =>
    !fogged || watchers.some((w) => canSee(game.map, w, at, VISION_MARGIN + extra));
  const seen = <T extends { x: number; y: number; owner: Wizard }>(o: T, extra = 0) =>
    o.owner.team === mine.team || sees(o, extra);
  const seesFx = (ev: FxEvent) =>
    sees(ev, FX_REACH) || (ev.type === 'lightning' && sees({ x: ev.tx, y: ev.ty }, FX_REACH));
  return {
    roundId: meta.roundId,
    seq: meta.seq,
    ack: meta.ack ?? 0,
    you: { ...wire(mine), ...roundNumbers(pick(mine, OWN_WIZARD_EXTRAS), r2) },
    others: game.wizards.filter((w) => w !== mine && (w.team === mine.team || sees(w))).map(wire),
    shots: game.shots
      .filter((s) => seen(s))
      .map((s) => ({
        ...roundNumbers(pick(s, SHOT_VIEW), r2),
        owner: s.owner.seat,
        ...(s.variant ? { variant: s.variant } : {}),
        ...(s.reflected ? { reflected: true as const } : {}),
      })),
    bombs: game.bombs
      .filter((b) => seen(b))
      .map((b) => ({
        ...roundNumbers(pick(b, BOMB_VIEW), r2),
        owner: b.owner.seat,
      })),
    zones: game.zones
      .filter((z) => seen(z, z.r))
      .map((z) => ({
        ...roundNumbers(pick(z, ZONE_VIEW), r1),
        owner: z.owner.seat,
      })),
    bubbles: game.bubbles
      .filter((b) => seen(b, b.r))
      .map((b) => ({
        ...roundNumbers(pick(b, BUBBLE_VIEW), r1),
        owner: b.owner.seat,
      })),
    traps: game.traps
      .filter((t) => seen(t))
      .map((t) => ({
        ...roundNumbers(pick(t, TRAP_VIEW), r1),
        owner: t.owner.seat,
      })),
    fx: fx.filter(seesFx).map((ev) => roundNumbers(ev, r1)),
    score: game.score,
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: game.death.w.seat } : null,
  };
}
