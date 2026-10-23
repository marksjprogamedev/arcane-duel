// The accounts admin command (docs/ACCOUNTS-PLAN.md section 6), run on the server by Jesse through the
// `arcane-admin <slot> ...` wrapper (deploy/oracle/arcane-admin, docs/DEPLOY-ORACLE.md):
//
//   node dist/server/admin.js <command> [args]      database from ARCANE_DB_PATH (required)
//
// What it prints is the record of what was done; nothing goes to the journal. It never prints a hash. The
// server has the same SQLite file open (WAL mode, busy_timeout), so it runs while the game runs; a ban,
// password reset or delete ends the user's sessions, so their next request is logged out.

import { existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { displayNameProblem, normaliseDisplayName, normaliseUsername } from '../shared/accountApi';
import { openDatabase, type Db } from './db';
import { hashPassword, newRecoveryCode, recoveryCodeHash } from './accounts/secrets';
import {
  deleteSessionsOf,
  deleteUser,
  listUsers,
  nowSeconds,
  setBan,
  setDisplayName,
  setPasswordHash,
  setRecoveryHash,
  userByUsername,
  type UserRow,
} from './accounts/store';

const HELP = [
  'arcane-admin <slot> <command> [args]   (on the server: node dist/server/admin.js <command> [args])',
  '',
  '  list [n]                          newest n users (default 50)',
  '  show <username>                   one user in detail',
  '  reset-password <username>         new password and recovery code (printed once), logs them out',
  '  rename <username> <display name>  change the display name (same rules as in the game)',
  '  ban <username> <reason>           ban and log out',
  '  unban <username>',
  '  delete <username> --yes           delete the account and everything about it (without --yes: dry run)',
  '  help',
];

const OK = 0;
const ERROR = 1;
const USAGE = 2;

/** No 0/o, 1/l/i: easy to read out and type. */
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** A random 16-character password (~79 bits) in groups of four: `abcd-efgh-jkmn-pqrs`. */
export function newAdminPassword(): string {
  const chars = Array.from(
    { length: 16 },
    () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
  );
  return chars.join('').match(/.{4}/g)!.join('-');
}

const date = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);
const dateTime = (seconds: number) =>
  new Date(seconds * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

const count = (db: Db, sql: string, ...params: number[]) =>
  Number((db.prepare(sql).get(...params) as { n: number }).n);

const sessionCount = (db: Db, id: number) =>
  count(
    db,
    'SELECT count(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?',
    id,
    nowSeconds(),
  );

/** Everything a delete removes with the user (by cascade), for the dry run and the record. */
function belongings(db: Db, id: number): string {
  const sessions = count(db, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', id);
  const profile = count(db, 'SELECT count(*) AS n FROM profiles WHERE user_id = ?', id);
  const friends = count(db, 'SELECT count(*) AS n FROM friends WHERE a_id = ? OR b_id = ?', id, id);
  const requests = count(
    db,
    'SELECT count(*) AS n FROM friend_requests WHERE from_id = ? OR to_id = ?',
    id,
    id,
  );
  const blocks = count(
    db,
    'SELECT count(*) AS n FROM blocks WHERE blocker_id = ? OR blocked_id = ?',
    id,
    id,
  );
  return (
    `${sessions} session(s), ${profile ? 'saved look/loadout' : 'no saved look/loadout'}, ` +
    `${friends} friend(s), ${requests} friend request(s), ${blocks} block(s)`
  );
}

const describe = (u: UserRow) => `${u.username} (id ${u.id}, "${u.display_name}")`;

/**
 * Runs one admin command against `db`, writing what it did to `out`. Returns the exit code: 0 ok, 1 error
 * (e.g. unknown user), 2 usage.
 */
export async function runAdmin(
  args: string[],
  db: Db,
  out: (line: string) => void,
): Promise<number> {
  const [command, ...rest] = args;

  const usage = (message: string) => {
    out(message);
    out(`See: arcane-admin <slot> help`);
    return USAGE;
  };
  /** The user with this username, or null after saying so. */
  const findUser = (raw: string): UserRow | null => {
    const username = normaliseUsername(raw);
    const user = userByUsername(db, username);
    if (!user) out(`No user "${username}".`);
    return user ?? null;
  };

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      HELP.forEach((line) => out(line));
      return command === undefined ? USAGE : OK;

    case 'list': {
      if (rest.length > 1) return usage('Usage: list [n]');
      const n = rest.length ? Number(rest[0]) : 50;
      if (!Number.isInteger(n) || n < 1)
        return usage('Usage: list [n] (n is a whole number, 1 or more)');
      const users = listUsers(db, n);
      if (!users.length) {
        out('No users yet.');
        return OK;
      }
      out(
        `${'ID'.padEnd(6)} ${'USERNAME'.padEnd(20)} ${'DISPLAY NAME'.padEnd(16)} ${'CREATED'.padEnd(10)} BANNED`,
      );
      for (const u of users)
        out(
          `${String(u.id).padEnd(6)} ${u.username.padEnd(20)} ${u.display_name.padEnd(16)} ` +
            `${date(u.created_at)} ${u.banned_at === null ? '-' : `yes: ${u.ban_reason ?? ''}`}`,
        );
      return OK;
    }

    case 'show': {
      if (rest.length !== 1) return usage('Usage: show <username>');
      const u = findUser(rest[0]);
      if (!u) return ERROR;
      out(`id:            ${u.id}`);
      out(`username:      ${u.username}`);
      out(`display name:  ${u.display_name}`);
      out(`created:       ${dateTime(u.created_at)}`);
      out(`logged in on:  ${sessionCount(db, u.id)} session(s)`);
      out(`recovery code: ${u.recovery_hash ? 'set' : 'none'}`);
      out(
        `banned:        ${u.banned_at === null ? 'no' : `since ${dateTime(u.banned_at)}: ${u.ban_reason ?? ''}`}`,
      );
      return OK;
    }

    case 'reset-password': {
      if (rest.length !== 1) return usage('Usage: reset-password <username>');
      const u = findUser(rest[0]);
      if (!u) return ERROR;
      const password = newAdminPassword();
      const code = newRecoveryCode();
      const hash = await hashPassword(password);
      const ended = count(db, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', u.id);
      db.exec('BEGIN IMMEDIATE');
      try {
        setPasswordHash(db, u.id, hash);
        setRecoveryHash(db, u.id, recoveryCodeHash(code));
        deleteSessionsOf(db, u.id);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      out(`Reset ${describe(u)}; ended ${ended} session(s).`);
      out(`New password:      ${password}`);
      out(`New recovery code: ${code}`);
      out('Shown only this once: pass them on in person.');
      return OK;
    }

    case 'rename': {
      if (rest.length < 2) return usage('Usage: rename <username> <display name>');
      const u = findUser(rest[0]);
      if (!u) return ERROR;
      const name = normaliseDisplayName(rest.slice(1).join(' '));
      const problem = displayNameProblem(name);
      if (problem) {
        out(`Not renamed: ${problem}`);
        return ERROR;
      }
      setDisplayName(db, u.id, name);
      out(`Renamed ${describe(u)} to "${name}".`);
      return OK;
    }

    case 'ban': {
      if (rest.length < 2) return usage('Usage: ban <username> <reason>');
      const u = findUser(rest[0]);
      if (!u) return ERROR;
      const reason = rest.slice(1).join(' ').trim();
      if (!reason) return usage('Usage: ban <username> <reason>');
      const ended = count(db, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', u.id);
      setBan(db, u.id, reason);
      out(
        `${u.banned_at === null ? 'Banned' : 'Already banned; reason now'} ${describe(u)}: ${reason}; ended ${ended} session(s).`,
      );
      return OK;
    }

    case 'unban': {
      if (rest.length !== 1) return usage('Usage: unban <username>');
      const u = findUser(rest[0]);
      if (!u) return ERROR;
      if (u.banned_at === null) {
        out(`${describe(u)} is not banned.`);
        return OK;
      }
      setBan(db, u.id, null);
      out(`Unbanned ${describe(u)}.`);
      return OK;
    }

    case 'delete': {
      const yes = rest.includes('--yes');
      const names = rest.filter((a) => a !== '--yes');
      if (names.length !== 1) return usage('Usage: delete <username> --yes');
      const u = findUser(names[0]);
      if (!u) return ERROR;
      const what = belongings(db, u.id);
      if (!yes) {
        out(`Would delete ${describe(u)} with ${what}.`);
        out(`Nothing deleted. To delete: arcane-admin <slot> delete ${u.username} --yes`);
        return OK;
      }
      deleteUser(db, u.id);
      out(`Deleted ${describe(u)} with ${what}.`);
      return OK;
    }

    default:
      return usage(`Unknown command "${command}".`);
  }
}

if (require.main === module) {
  const dbPath = process.env.ARCANE_DB_PATH;
  if (!dbPath) {
    console.error('ARCANE_DB_PATH is not set. On the server use: arcane-admin <slot> <command>');
    process.exit(USAGE);
  }
  // Never create a stray empty database through a wrong path.
  if (!existsSync(dbPath)) {
    console.error(`No database at ${dbPath} (has this slot run since 0.37.0?)`);
    process.exit(ERROR);
  }
  const db = openDatabase(dbPath);
  runAdmin(process.argv.slice(2), db, (line) => console.log(line))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = ERROR;
    })
    .finally(() => db.close());
}
