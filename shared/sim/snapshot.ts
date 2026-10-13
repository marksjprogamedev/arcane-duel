import { styles } from '../constants';
import type { SimState } from '../simState';
import type { Bomb, Death, FxEvent, Wizard, WizardId, WizardStyle, Zone } from '../types';

/** A wizard as sent over the wire: the style object is replaced by its index in `styles`. */
export type WireWizard = Omit<Wizard, 'style'> & { style: number };

type WireOwner<T extends { owner: Wizard }> = Omit<T, 'owner'> & { owner: WizardId };

export interface Snapshot {
  roundId: number;
  seq: number;
  /** The opponent of the viewer (the viewer's own wizard is always `e`, see serializeSnapshot). */
  p: WireWizard;
  /** The viewer's own wizard. */
  e: WireWizard;
  shots: (Omit<WireOwner<import('../types').Shot>, 'hitTargets'> & { hitTargets?: undefined })[];
  bombs: WireOwner<Bomb>[];
  zones: WireOwner<Zone>[];
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
  meta: { roundId: number; seq: number },
  fx: FxEvent[] = [],
): Snapshot {
  const flip = viewer === 'p';
  const own = (o: Wizard): WizardId => {
    const id: WizardId = o === game.p ? 'p' : 'e';
    return flip ? flipId(id) : id;
  };
  const wire = (w: Wizard): WireWizard => ({
    ...roundNumbers(w, r2),
    style: styles.indexOf(w.style),
  });
  const mine = flip ? game.p : game.e;
  const theirs = flip ? game.e : game.p;
  return {
    roundId: meta.roundId,
    seq: meta.seq,
    p: wire(theirs),
    e: wire(mine),
    shots: game.shots.map((s) => ({
      ...roundNumbers(s, r2),
      owner: own(s.owner),
      hitTargets: undefined,
    })),
    bombs: game.bombs.map((b) => ({ ...roundNumbers(b, r2), owner: own(b.owner) })),
    zones: game.zones.map((z) => ({ ...roundNumbers(z, r1), owner: own(z.owner) })),
    fx: fx.map((ev) => roundNumbers(flipFx(ev, flip), r1)),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}

export const styleFromIndex = (i: number): WizardStyle => styles[i] || styles[0];
