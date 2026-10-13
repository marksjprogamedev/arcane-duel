import { styles } from '../constants';
import type { SimState } from '../simState';
import type {
  Bomb,
  Death,
  Label,
  LightningArc,
  Particle,
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
  particles: Particle[];
  labels: Label[];
  arcs: LightningArc[];
  waves: Wave[];
  t: number;
  ending: boolean;
  death: (Omit<Death, 'w'> & { w: WizardId }) | null;
}

const flipId = (id: WizardId): WizardId => (id === 'p' ? 'e' : 'p');

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
): Snapshot {
  const flip = viewer === 'p';
  const own = (o: Wizard): WizardId => {
    const id: WizardId = o === game.p ? 'p' : 'e';
    return flip ? flipId(id) : id;
  };
  const fid = (id: WizardId | null | undefined) => (flip && id ? flipId(id) : id);
  const wire = (w: Wizard): WireWizard => ({
    ...w,
    style: styles.indexOf(w.style),
  });
  const mine = flip ? game.p : game.e;
  const theirs = flip ? game.e : game.p;
  return {
    roundId: meta.roundId,
    seq: meta.seq,
    p: wire(theirs),
    e: wire(mine),
    shots: game.shots.map((s) => ({ ...s, owner: own(s.owner), hitTargets: undefined })),
    bombs: game.bombs.map((b) => ({ ...b, owner: own(b.owner) })),
    zones: game.zones.map((z) => ({ ...z, owner: own(z.owner) })),
    particles: game.particles
      .slice(-35)
      .map((q) => (flip ? { ...q, castOwner: fid(q.castOwner) } : q)),
    labels: game.labels
      .slice(-16)
      .map((l) =>
        flip && l.damageOwner ? { ...l, damageOwner: fid(l.damageOwner as WizardId) as string } : l,
      ),
    arcs: game.arcs.slice(-10).map((a) => (flip ? { ...a, castOwner: flipId(a.castOwner) } : a)),
    waves: game.waves.slice(-14),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}

export const styleFromIndex = (i: number): WizardStyle => styles[i] || styles[0];
