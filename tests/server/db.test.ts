// The database module (server/db): migrations run once, in order, in one transaction; a database
// from a newer server is refused; an existing file is copied before it is changed; deleting a user
// removes everything about them.
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { databaseBytes, NewerDatabaseError, openDatabase, schemaVersion } from '../../server/db';
import { MIGRATIONS } from '../../server/db/migrations';

const dirs: string[] = [];
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arcane-db-'));
  dirs.push(dir);
  return join(dir, 'nested', 'arcane.db');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const tables = (db: ReturnType<typeof openDatabase>) =>
  (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((t) => t.name);

describe('openDatabase', () => {
  it('creates the schema on a new database', () => {
    const db = openDatabase(':memory:');
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(tables(db)).toEqual([
      'blocks',
      'friend_requests',
      'friends',
      'profiles',
      'sessions',
      'users',
      'workshop_editors',
      'workshop_shared',
    ]);
    db.close();
  });

  it('creates the folder, uses WAL, and opening again changes nothing', () => {
    const path = tempDb();
    const db = openDatabase(path);
    expect((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode).toBe(
      'wal',
    );
    db.prepare("INSERT INTO users VALUES (1, 'merlin', 'Merlin', 'h', NULL, 0, NULL, NULL)").run();
    db.close();
    const again = openDatabase(path);
    expect(schemaVersion(again)).toBe(MIGRATIONS.length);
    expect(again.prepare('SELECT count(*) AS n FROM users').get()).toEqual({ n: 1 });
    again.close();
    expect(databaseBytes(path)).toBeGreaterThan(0);
    // no copy when nothing had to change
    expect(readdirSync(join(path, '..')).some((f) => f.includes('pre-migrate'))).toBe(false);
  });

  it('refuses a database written by a newer server', () => {
    const path = tempDb();
    openDatabase(path, ['CREATE TABLE a (x INTEGER)', 'CREATE TABLE b (x INTEGER)']).close();
    expect(() => openDatabase(path, ['CREATE TABLE a (x INTEGER)'])).toThrow(NewerDatabaseError);
  });

  it('copies an existing database before migrating it, keeping the newest three copies', () => {
    const path = tempDb();
    const steps = ['CREATE TABLE t (x INTEGER)'];
    openDatabase(path, steps).close();
    for (let i = 0; i < 4; i++) {
      steps.push(`ALTER TABLE t ADD COLUMN c${i} INTEGER`);
      openDatabase(path, steps).close();
    }
    const copies = readdirSync(join(path, '..'))
      .filter((f) => f.includes('pre-migrate'))
      .sort();
    expect(copies).toEqual([
      'arcane.db.pre-migrate-2',
      'arcane.db.pre-migrate-3',
      'arcane.db.pre-migrate-4',
    ]);
    expect(existsSync(`${path}.pre-migrate-4`)).toBe(true);
  });

  it('a failing migration changes nothing', () => {
    const path = tempDb();
    openDatabase(path, ['CREATE TABLE t (x INTEGER)']).close();
    expect(() =>
      openDatabase(path, ['CREATE TABLE t (x INTEGER)', 'CREATE TABLE u (x INTEGER); NOT SQL']),
    ).toThrow();
    const db = openDatabase(path, ['CREATE TABLE t (x INTEGER)']);
    expect(schemaVersion(db)).toBe(1);
    expect(tables(db)).toEqual(['t']);
    db.close();
  });

  it('deleting a user deletes their sessions, profile, friends, requests and blocks', () => {
    const db = openDatabase(':memory:');
    const user = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, NULL, 0, NULL, NULL)');
    user.run(1, 'merlin', 'Merlin', 'h');
    user.run(2, 'morgana', 'Morgana', 'h');
    user.run(3, 'nimue', 'Nimue', 'h');
    db.exec(`
      INSERT INTO sessions VALUES ('t1', 1, 0, 9);
      INSERT INTO profiles (user_id, workshop, loadout, updated_at) VALUES (1, '{}', '{}', 0);
      INSERT INTO friends VALUES (1, 2, 0);
      INSERT INTO friend_requests VALUES (3, 1, 0);
      INSERT INTO blocks VALUES (2, 1, 0);
      INSERT INTO friends VALUES (2, 3, 0);
    `);
    db.prepare('DELETE FROM users WHERE id = 1').run();
    const count = (table: string) =>
      (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
    expect([
      count('sessions'),
      count('profiles'),
      count('friend_requests'),
      count('blocks'),
    ]).toEqual([0, 0, 0, 0]);
    expect(count('friends')).toBe(1); // 2 and 3 are still friends
    expect(() => db.exec('INSERT INTO friends VALUES (3, 2, 0)')).toThrow(); // smaller id first
    db.close();
  });
});
