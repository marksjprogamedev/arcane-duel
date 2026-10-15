/** Earth uses one canonical projectile visual in online games: the snapshot.
 * No independent local Earth projectile is created, so an inaccurate handover
 * cannot produce double images or hide successful casts.
 */
export function usesAuthoritativeProjectile(kind: string): boolean {
  return kind === 'EARTH';
}
