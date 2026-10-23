// An account's saved Workshop look and spellbook loadout (the `profiles` table), as JSON. What is stored
// has passed validateClientMessage; it is parsed back defensively all the same.

import type { Profile, WorkshopLook } from '../../shared/protocol';
import type { SpellLoadout } from '../../shared/types';
import { sanitizeLoadout } from '../../shared/sim/variants';
import type { Db } from '../db';
import { nowSeconds } from './store';

function parse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function loadProfile(db: Db, userId: number): Profile {
  const row = db.prepare('SELECT workshop, loadout FROM profiles WHERE user_id = ?').get(userId) as
    { workshop: string | null; loadout: string | null } | undefined;
  const workshop = parse(row?.workshop ?? null);
  const loadout = parse(row?.loadout ?? null);
  return {
    workshop: workshop && typeof workshop === 'object' ? (workshop as WorkshopLook) : null,
    loadout: loadout && typeof loadout === 'object' ? sanitizeLoadout(loadout) : null,
  };
}

/** Saves the parts given; the other part keeps what was saved before. */
export function saveProfile(
  db: Db,
  userId: number,
  part: { workshop?: WorkshopLook; loadout?: SpellLoadout },
) {
  const workshop = part.workshop === undefined ? null : JSON.stringify(part.workshop);
  const loadout = part.loadout === undefined ? null : JSON.stringify(part.loadout);
  db.prepare(
    `INSERT INTO profiles (user_id, workshop, loadout, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       workshop = coalesce(excluded.workshop, workshop),
       loadout = coalesce(excluded.loadout, loadout),
       updated_at = excluded.updated_at`,
  ).run(userId, workshop, loadout, nowSeconds());
}
