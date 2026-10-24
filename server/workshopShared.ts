// The shared Wizard Workshop layouts (the `workshop_shared` table, one JSON copy) and the accounts
// allowed to publish them (`workshop_editors`, set with `arcane-admin <slot> workshop-editor <user>`).
// Everyone, guests included, may read; only editors write. The shape is in shared/workshopShared.ts.

import { parseSharedWorkshop, type SharedWorkshop } from '../shared/workshopShared';
import type { Db } from './db';
import { nowSeconds } from './accounts/store';

/** The published copy, or null if none was published yet or what is stored is unreadable. */
export function loadSharedWorkshop(db: Db): SharedWorkshop | null {
  const row = db.prepare('SELECT data FROM workshop_shared WHERE id = 1').get() as
    { data: string } | undefined;
  if (!row) return null;
  try {
    return parseSharedWorkshop(JSON.parse(row.data));
  } catch {
    return null;
  }
}

export function saveSharedWorkshop(db: Db, doc: SharedWorkshop, userId: number) {
  db.prepare(
    `INSERT INTO workshop_shared (id, data, updated_at, updated_by) VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  ).run(JSON.stringify(doc), nowSeconds(), userId);
}

export function isWorkshopEditor(db: Db, userId: number): boolean {
  return !!db.prepare('SELECT 1 FROM workshop_editors WHERE user_id = ?').get(userId);
}

export function setWorkshopEditor(db: Db, userId: number, allowed: boolean) {
  if (allowed)
    db.prepare('INSERT OR IGNORE INTO workshop_editors (user_id, created_at) VALUES (?, ?)').run(
      userId,
      nowSeconds(),
    );
  else db.prepare('DELETE FROM workshop_editors WHERE user_id = ?').run(userId);
}
