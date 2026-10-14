import { styles } from '../constants';
import type { SimState } from '../simState';
import type {
  Bomb,
  Bubble,
  Death,
  FxEvent,
  Shot,
  Wizard,
  WizardId,
  WizardStyle,
  Zone,
} from '../types';

// Snapshots carry only what clients draw or predict, not the whole simulation state: no status
// timers (`rest`, `burnTick`, ...), no projectile bookkeeping (`travel`, `damage`, ...), and the
// opponent's cooldowns and knockback stay on the server.

/** What every client needs to draw a wizard. */
const WIZARD_VIEW = [
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
] as const;
/** Extra fields for the player's own wizard: HUD cooldowns, and knockback for prediction. */
const OWN_WIZARD_EXTRAS = [
  'kx',
  'ky',
  'swordCD',
  'forceCD',
  'bombCD',
  'magmaCD',
  'earthCD',
  'fireCD',
  'waterCD',
  'lightCD',
  'healCD',
  'bubbleCD',
] as const;
const SHOT_VIEW = ['id', 'x', 'y', 'vx', 'vy', 'k', 'r'] as const;
const BOMB_VIEW = ['id', 'x', 'y', 'u', 'k', 'landed', 'fuse'] as const;
const ZONE_VIEW = ['x', 'y', 'k', 'r', 'life'] as const;
const BUBBLE_VIEW = ['x', 'y', 'r', 'life'] as const;

/** A wizard as sent over the wire: the style object is replaced by its index in `styles`. */
export type WireWizard = Pick<Wizard, (typeof WIZARD_VIEW)[number]> & { style: number };
export type WireOwnWizard = WireWizard & Pick<Wizard, (typeof OWN_WIZARD_EXTRAS)[number]>;
export type WireShot = Pick<Shot, (typeof SHOT_VIEW)[number]> & { owner: WizardId };
export type WireBomb = Pick<Bomb, (typeof BOMB_VIEW)[number]> & { owner: WizardId };
export type WireZone = Pick<Zone, (typeof ZONE_VIEW)[number]> & { owner: WizardId };
export type WireBubble = Pick<Bubble, (typeof BUBBLE_VIEW)[number]> & { owner: WizardId };

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
  /** The opponent of the viewer (the viewer's own wizard is always `e`, see serializeSnapshot). */
  p: WireWizard;
  /** The viewer's own wizard. */
  e: WireOwnWizard;
  shots: WireShot[];
  bombs: WireBomb[];
  zones: WireZone[];
  bubbles: WireBubble[];
  /** Cosmetic effect events since the previous snapshot (clients make particles, text, arcs). */
  fx: FxEvent[];
  t: number;
  ending: boolean;
  death: (Omit<Death, 'w'> & { w: WizardId }) | null;
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

const flipId = (id: WizardId): WizardId => (id === 'p' ? 'e' : 'p');

/** Swaps wizard references in an fx event for the player who sees themselves as `e`. */
function flipFx(ev: FxEvent, flip: boolean): FxEvent {
  if (!flip) return ev;
  switch (ev.type) {
    case 'burst':
      return { ...ev, castOwner: ev.castOwner ? flipId(ev.castOwner) : null };
    case 'spray':
      return { ...ev, wizard: flipId(ev.wizard), castOwner: flipId(ev.castOwner) };
    case 'lightning':
      return { ...ev, castOwner: flipId(ev.castOwner) };
    case 'text':
      return ev.damageOwner ? { ...ev, damageOwner: flipId(ev.damageOwner) } : ev;
    default:
      return ev;
  }
}

/**
 * Builds the snapshot sent to one player.
 *
 * The client code treats the local player as wizard `e` and the opponent as `p`. For the
 * player who is really `e` that is the simulation's own layout; for the player who is really
 * `p` every wizard reference is swapped, so both clients can run the same code.
 * Cosmetics are never included, only the fx events that let each client make its own.
 */
export function serializeSnapshot(
  game: SimState,
  viewer: WizardId,
  meta: { roundId: number; seq: number; ack?: number },
  fx: FxEvent[] = [],
): Snapshot {
  const flip = viewer === 'p';
  const own = (o: Wizard): WizardId => {
    const id: WizardId = o === game.p ? 'p' : 'e';
    return flip ? flipId(id) : id;
  };
  const wire = (w: Wizard): WireWizard => ({
    ...roundNumbers(pick(w, WIZARD_VIEW), r2),
    style: styles.indexOf(w.style),
  });
  const mine = flip ? game.p : game.e;
  const theirs = flip ? game.e : game.p;
  return {
    roundId: meta.roundId,
    seq: meta.seq,
    ack: meta.ack ?? 0,
    p: wire(theirs),
    e: { ...wire(mine), ...roundNumbers(pick(mine, OWN_WIZARD_EXTRAS), r2) },
    shots: game.shots.map((s) => ({
      ...roundNumbers(pick(s, SHOT_VIEW), r2),
      owner: own(s.owner),
    })),
    bombs: game.bombs.map((b) => ({
      ...roundNumbers(pick(b, BOMB_VIEW), r2),
      owner: own(b.owner),
    })),
    zones: game.zones.map((z) => ({
      ...roundNumbers(pick(z, ZONE_VIEW), r1),
      owner: own(z.owner),
    })),
    bubbles: game.bubbles.map((b) => ({
      ...roundNumbers(pick(b, BUBBLE_VIEW), r1),
      owner: own(b.owner),
    })),
    fx: fx.map((ev) => roundNumbers(flipFx(ev, flip), r1)),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}

export const styleFromIndex = (i: number): WizardStyle => styles[i] || styles[0];
