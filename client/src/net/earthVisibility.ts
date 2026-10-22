/** Projectiles best drawn from authoritative snapshots, rather than predicted copies.
 * The default STEAM, PLASMA, ICE and MAGNETIC spells have no dedicated cooldown.
 * Local predicted-FX cooldowns could therefore hide a valid server shot entirely.
 */
export function usesAuthoritativeProjectile(kind: string): boolean {
  return (
    kind === 'EARTH' ||
    kind === 'STEAM' ||
    kind === 'PLASMA' ||
    kind === 'ICE' ||
    kind === 'MAGNETIC'
  );
}

/**
 * Hide a server shot only when a matching locally predicted visual is used.
 * Variant shots, reflected shots and authoritative spell families always
 * render from the server snapshot, including the four default combo bolts.
 */
export function isPredictedShot(
  s: { owner: object; spell: string; variant?: string; reflected?: boolean },
  me: object | undefined,
): boolean {
  return s.owner === me && !s.variant && !s.reflected && !usesAuthoritativeProjectile(s.spell);
}
