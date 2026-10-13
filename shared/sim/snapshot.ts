import { styles } from '../constants';
import type { SimState } from '../simState';
import type {
    Bomb,
    Death,
    FxEvent,
    Label,
    LightningArc,
    Wave,
    Wizard,
    WizardId,
    WizardStyle,
    Zone,
} from '../types';

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
  /** Cosmetic effect events since the previous snapshot (clients generate the particles). */
  fx: FxEvent[];
  labels: Label[];
  arcs: LightningArc[];
  waves: Wave[];
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
  if (ev.type === 'burst') return { ...ev, castOwner: ev.castOwner ? flipId(ev.castOwner) : null };
  if (ev.type === 'spray')
    return { ...ev, wizard: flipId(ev.wizard), castOwner: flipId(ev.castOwner) };
  return ev;
}

/**
 * Builds the snapshot sent to one player.
 *
 * The client code treats the local player as wizard `e` and the opponent as `p`. For the
 * player who is really `e` that is the simulation's own layout; for the player who is really
 * `p` every wizard reference is swapped, so both clients can run the same code.
 * Cosmetic lists (particles, labels, ...) are capped to keep snapshots small.
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
  const fid = (id: WizardId | null | undefined) => (flip && id ? flipId(id) : id);
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
    labels: game.labels.slice(-16).map((l) => {
      const o = roundNumbers(l, r1);
      if (flip && l.damageOwner) o.damageOwner = fid(l.damageOwner as WizardId) as string;
      return o;
    }),
    arcs: game.arcs.slice(-10).map((a) => ({
      ...roundNumbers(a, r1),
      points: a.points.map((pt) => ({ x: r1(pt.x), y: r1(pt.y) })),
      castOwner: flip ? flipId(a.castOwner) : a.castOwner,
    })),
    waves: game.waves.slice(-14).map((w) => roundNumbers(w, r1)),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}

export const styleFromIndex = (i: number): WizardStyle => styles[i] || styles[0];
