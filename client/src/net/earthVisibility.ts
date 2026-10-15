/** Earth uses one canonical projectile visual in online games: the snapshot.
 * No independent local Earth projectile is created, so an inaccurate handover
 * cannot produce double images or hide successful casts.
 */
export function usesAuthoritativeProjectile(kind: string): boolean {
  return kind === 'EARTH';
}

/**
 * Whether the client draws this shot itself, from its own prediction, rather than from the server's
 * snapshot. Only a plain shot you cast qualifies: variants and Earth come from the server, and so
 * does one a bubble reflected (it is yours now, but you never cast it).
 */
export function isPredictedShot(
  s: { owner: object; k: string; variant?: string; reflected?: boolean },
  me: object | undefined,
): boolean {
  return s.owner === me && !s.variant && !s.reflected && !usesAuthoritativeProjectile(s.k);
}
