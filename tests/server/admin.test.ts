// The accounts admin command (server/admin.ts) against an in-memory database: every command, unknown
// users and commands, and that no hash ever shows in what it prints. Hashing is real argon2id, so the
// users share one hash made once.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runAdmin } from '../../server/admin';
import { openDatabase, type Db } from '../../server/db';
import {
  hashPassword,
  recoveryCodeHash,
  sha256,
  verifyPassword,
} from '../../server/accounts/secrets';
import {
  createSession,
  createUser,
  userByUsername,
  userForSession,
  type UserRow,
} from '../../server/accounts/store';

let sharedHash = '';
beforeAll(async () => {
  sharedHash = await hashPassword('correct horse battery');
});

let db: Db;
let lines: string[];
let merlin: UserRow;
let morgana: UserRow;

const run = async (...args: string[]) => {
  lines = [];
  return runAdmin(args, db, (line) => lines.push(line));
};
const output = () => lines.join('\n');
const sessions = (u: UserRow) =>
  (db.prepare('SELECT count(*) AS n FROM sessions WHERE user_id = ?').get(u.id) as { n: number }).n;

/** No stored hash (password, recovery code, session token) appears in anything printed. */
function expectNoHashes() {
  const text = output();
  for (const row of db.prepare('SELECT password_hash, recovery_hash FROM users').all() as {
    password_hash: string;
    recovery_hash: string | null;
  }[]) {
    expect(text).not.toContain(row.password_hash);
    if (row.recovery_hash) expect(text).not.toContain(row.recovery_hash);
  }
  for (const s of db.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[])
    expect(text).not.toContain(s.token_hash);
  expect(text).not.toMatch(/argon2id\$/);
}

beforeEach(() => {
  db = openDatabase(':memory:');
  const add = (username: string, displayName: string) =>
    createUser(db, {
      username,
      displayName,
      passwordHash: sharedHash,
      recoveryHash: recoveryCodeHash('AAAA-BBBB-CCCC-DDDD'),
    })!;
  merlin = add('merlin', 'Merlin');
  morgana = add('morgana', 'Morgana Le Fay');
  createSession(db, merlin.id, sha256('token-1'));
  createSession(db, merlin.id, sha256('token-2'));
  createSession(db, morgana.id, sha256('token-3'));
});

describe('arcane-admin', () => {
  it('help, unknown commands and bad usage', async () => {
    expect(await run('help')).toBe(0);
    expect(output()).toContain('reset-password <username>');
    expect(await run()).toBe(2);
    expect(await run('frobnicate')).toBe(2);
    expect(output()).toContain('Unknown command "frobnicate"');
    expect(await run('show')).toBe(2);
    expect(await run('list', 'many')).toBe(2);
    expect(await run('ban', 'merlin')).toBe(2);
  });

  it('says so for an unknown user, for every command', async () => {
    for (const args of [
      ['show', 'nobody'],
      ['reset-password', 'nobody'],
      ['rename', 'nobody', 'New Name'],
      ['ban', 'nobody', 'spam'],
      ['unban', 'nobody'],
      ['delete', 'nobody', '--yes'],
    ]) {
      expect(await run(...args)).toBe(1);
      expect(output()).toContain('No user "nobody"');
    }
  });

  it('lists the newest users first, limited to n', async () => {
    expect(await run('list')).toBe(0);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('morgana');
    expect(lines[2]).toContain('merlin');
    expect(await run('list', '1')).toBe(0);
    expect(lines).toHaveLength(2);
    expect(output()).not.toContain('merlin');
    expectNoHashes();
  });

  it('shows one user (username in any case) with their session count', async () => {
    expect(await run('show', ' Merlin ')).toBe(0);
    expect(output()).toContain('display name:  Merlin');
    expect(output()).toMatch(/2 session\(s\)/);
    expect(output()).toContain('banned:        no');
    expectNoHashes();
  });

  it('reset-password sets a working new password and recovery code and ends the sessions', async () => {
    expect(await run('reset-password', 'merlin')).toBe(0);
    expectNoHashes();
    const password = /New password:\s+(\S+)/.exec(output())![1];
    const code = /New recovery code:\s+(\S+)/.exec(output())![1];
    expect(password).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    const after = userByUsername(db, 'merlin')!;
    expect(after.password_hash).not.toBe(sharedHash);
    expect(await verifyPassword(password, after.password_hash)).toBe(true);
    expect(after.recovery_hash).toBe(recoveryCodeHash(code));
    expect(sessions(merlin)).toBe(0);
    expect(userForSession(db, sha256('token-1'))).toBeUndefined();
    expect(sessions(morgana)).toBe(1);
  });

  it('rename normalises and validates the display name', async () => {
    expect(await run('rename', 'merlin', '  The ', '  Wizard ')).toBe(0);
    expect(userByUsername(db, 'merlin')!.display_name).toBe('The Wizard');
    expect(await run('rename', 'merlin', 'sh1t', 'wizard')).toBe(1);
    expect(output()).toContain('Not renamed');
    expect(await run('rename', 'merlin', 'no!')).toBe(1);
    expect(userByUsername(db, 'merlin')!.display_name).toBe('The Wizard');
  });

  it('ban ends sessions and shows in show and list; unban lifts it', async () => {
    expect(await run('ban', 'merlin', 'rude', 'in', 'lobby')).toBe(0);
    expect(output()).toContain('ended 2 session(s)');
    expect(sessions(merlin)).toBe(0);
    expect(userByUsername(db, 'merlin')!.ban_reason).toBe('rude in lobby');
    await run('show', 'merlin');
    expect(output()).toMatch(/banned:\s+since .*: rude in lobby/);
    await run('list');
    expect(lines.find((l) => l.includes('merlin'))).toContain('yes: rude in lobby');
    expect(lines.find((l) => l.includes('morgana'))).not.toContain('yes');

    expect(await run('unban', 'merlin')).toBe(0);
    expect(userByUsername(db, 'merlin')!.banned_at).toBeNull();
    expect(await run('unban', 'merlin')).toBe(0);
    expect(output()).toContain('is not banned');
  });

  it('delete without --yes changes nothing; with --yes removes the user and their sessions', async () => {
    expect(await run('delete', 'merlin')).toBe(0);
    expect(output()).toContain('Would delete merlin');
    expect(output()).toContain('2 session(s)');
    expect(userByUsername(db, 'merlin')).toBeDefined();
    expect(sessions(merlin)).toBe(2);

    expect(await run('delete', 'merlin', '--yes')).toBe(0);
    expect(output()).toContain('Deleted merlin');
    expect(userByUsername(db, 'merlin')).toBeUndefined();
    expect(sessions(merlin)).toBe(0);
    expect(userByUsername(db, 'morgana')).toBeDefined();
    expectNoHashes();
  });
});
