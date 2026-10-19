# Bubble reflection: the rules

One rule, written down so that nobody has to guess. If you change how bubbles behave, change this file
and `tests/sim/bubble-matrix.test.ts` in the same commit, and add an entry to `CHANGELOG.md`.

## The rule

**A bubble reflects every projectile that touches its edge, in either direction, whoever cast the
bubble and whoever cast the projectile.** That includes:

- an enemy's bubble (the usual case: your shot comes back at you),
- your own bubble (you cannot shoot out of your own dome: the shot comes back and can hurt you),
- a teammate's bubble (the same: it is just a bubble).

When a projectile is reflected:

1. It stops at the edge and never enters (or leaves) the bubble.
2. It is mirrored about the edge's normal, like light off a mirror.
3. It **belongs to the bubble's owner** from then on. It can hurt anyone who is their enemy, **and the
   original caster too** (even if that is the bubble's own owner, for a shot fired out of your own bubble).
4. Its **range is refilled**: it flies its whole reach again from the point of contact (a Magma lob
   flies its whole original distance back), with enough life to fly it. See "How long can it bounce?".

## What each spell does

| Spell                                                          | At a bubble edge                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Fireball, Pyrodisk, Boulder, Vapor Blast, Plasma Flare, Icicle | **Reflected** (the rule)                                               |
| Gravity Shot, Tempest Bolt, Frost Shards (each shard)          | **Reflected**                                                          |
| Molten Core (the lava lob)                                     | **Reflected**, flies its whole original distance back                  |
| Plasma Beam, Magnetic Pull, Lightning Bolt (instant beams)     | **Reflected** (mirror leg, full length again; owned by bubble's owner) |
| Water Surge (the growing ring)                                 | **Reflected**, see below                                               |
| Firebomb and every other bomb (Magma's is a lob, see above)    | **Reflected** in flight, see below                                     |
| Flamethrower, Water Spray (continuous sprays)                  | **Exception: blocked.** Damage does not cross an edge; particles stop  |
| Sword, Force, traps, Lava Pool, Thundercloud                   | **Exception: ignore bubbles** (they never consult them)                |

The exceptions are deliberate and listed here so they are not mistaken for bugs. To make one of them
reflect, change the code, move its row up, and add it to the matrix test.

### Bombs

A bomb thrown across a bubble edge, in either direction, is reflected like a shot: it turns at the edge, is
mirrored about the normal, and throws its whole range again from the point of contact (its fuse starts when
it lands). It **belongs to the bubble's owner** from then on, so its blast can reach the original thrower, and a
bomb lobbed out of your own bubble comes back inside it. A bomb that has already landed is not moved by a
bubble that appears later. A bomb sliding from a Water Surge's shove is turned back at a bubble edge the same way. Traps never consult bubbles.

### Water Surge

A surge is a ring that grows from the caster. Bubbles treat it like any other spell:

- **The ring cannot cross a bubble edge.** A ring cast outside never reaches anyone inside; a ring cast
  inside never reaches anyone outside. (It is also drawn clipped at the edge, as a true circle.)
- **Where it first touches a bubble, a new ring starts from that point of contact**, on the side the
  surge came from, owned by the bubble's owner. It is the full spell again (the whole ring, the normal
  soak and shove) and can shove the wizard who cast the surge, including the bubble's own owner when they
  cast it from inside their own bubble.
- **The ring that touched the bubble carries on growing** (it just cannot cross the edge), so wizards
  elsewhere are still reached by it as normal. Only the new ring is added.
- A surge cast from inside a bubble still soaks and shoves everyone inside it the normal amount first.
- New rings bounce off the other bubbles they meet in turn, so two bubbles facing each other keep rings
  going back and forth until they expire.
- **Limits that keep this from piling up.** Each ring starts a new ring at each bubble once (it never
  bounces twice off the same bubble), and one cast keeps at most `SURGE.MAX_RINGS` (6) rings alive at once.
  Without them, overlapping bubbles would reflect rings between them forever within a single tick. These
  limits are about how many rings exist, not about time or how often a surge can bounce.
- A surge cast from the exact centre of a bubble touches the whole wall at once; the new ring starts on
  the side the caster is facing.

## How long can it bounce?

There is **no cap on bounces and no clock on a reflected shot**: a reflection refills its range (and
enough life to fly it), so two bubbles facing each other can keep one Pyrodisk (or a chain of Water Surge rings, within the limits above) bouncing between them.
That is deliberate. The only limit is that bubbles expire after `BUBBLE.LIFE` (240 ticks, 4 seconds),
which frees the shot. A disc stuck between two bubbles for a few seconds is harmless.

## Where it lives

- `reflect()` in `shared/sim/combat.ts`: the mirror, the range refill and the change of owner.
- `shared/sim/update.ts`: `bounce()` for projectiles, the bomb loop (`reflectBomb()` in `combat.ts`), the Pyrodisk's own loop (it uses every bubble, like
  the others), `surgeStep()` and `surgeBounce()` for the Water Surge.
- Beams: `bubbleBounce()` in `shared/sim/combat.ts`.
- Clients draw a shot up to a bubble's edge and no further: `client/src/net/shotExtrapolation.ts` and the
  prediction preview in `client/src/net/prediction.ts`.
- Tests: `tests/sim/bubble-matrix.test.ts` (every projectile against enemy, own and nearby bubbles, the
  clock, and the Water Surge), plus the older cases in `tests/sim/bubble.test.ts` and `pyro-disc.test.ts`.
