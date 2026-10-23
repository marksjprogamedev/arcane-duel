// The server's database: one SQLite file per slot (docs/ACCOUNTS-PLAN.md), opened with Node's built-in
// node:sqlite. Everything else reaches SQLite through this module, so swapping to better-sqlite3 would
// touch only this file.

import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from './migrations';

export type Db = DatabaseSync;

/** How many copies made before a migration are kept next to the database. */
const KEEP_PRE_MIGRATE = 3;

/** The database was written by a newer version of the server than this one. */
export class NewerDatabaseError extends Error {}

/**
 * Opens (or creates) the database at `path` (`:memory:` for tests) and brings its schema up to date.
 * Throws NewerDatabaseError if the file is ahead of `migrations`, e.g. a test slot switched to an older
 * branch: that server must not run on it (`arcane-deploy <slot> reset-db` starts a test slot afresh).
 */
export function openDatabase(path: string, migrations: readonly string[] = MIGRATIONS): Db {
  const inMemory = path === ':memory:';
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    if (!inMemory) db.exec('PRAGMA journal_mode = WAL');
    db.exec(`
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 2000;
      PRAGMA cache_size = -2000;
    `);
    migrate(db, inMemory ? null : path, migrations);
  } catch (err) {
    db.close();
    throw err;
  }
  return db;
}

/** How many migrations have run on this database. */
export const schemaVersion = (db: Db): number =>
  Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);

/**
 * Runs the migrations the database has not had yet, all in one transaction. Before changing an existing
 * file it copies it to `<file>.pre-migrate-<version>` (the newest three are kept).
 */
export function migrate(db: Db, path: string | null, migrations: readonly string[]) {
  const from = schemaVersion(db);
  if (from > migrations.length)
    throw new NewerDatabaseError(
      `The database ${path ?? ''} has schema version ${from}, but this server only knows ${migrations.length}. ` +
        'It was written by a newer version: deploy that version, or reset a test slot with `arcane-deploy <slot> reset-db`.',
    );
  if (from === migrations.length) return;
  if (path && from > 0) {
    db.prepare('VACUUM INTO ?').run(`${path}.pre-migrate-${from}`);
    prunePreMigrateCopies(path);
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let v = from; v < migrations.length; v++) db.exec(migrations[v]);
    db.exec(`PRAGMA user_version = ${migrations.length}`);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function prunePreMigrateCopies(path: string) {
  const prefix = `${basename(path)}.pre-migrate-`;
  const copies = readdirSync(dirname(path))
    .filter((f) => f.startsWith(prefix))
    .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
  for (const old of copies.slice(KEEP_PRE_MIGRATE)) rmSync(join(dirname(path), old));
}

/** Size on disk of the database and its write-ahead log, for /stats. */
export function databaseBytes(path: string): number {
  let total = 0;
  for (const file of [path, `${path}-wal`])
    try {
      total += statSync(file).size;
    } catch {
      // no such file (yet)
    }
  return total;
}
