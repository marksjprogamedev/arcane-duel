// Password hashing (argon2id, built into Node), session tokens and recovery codes. What is stored is
// always a hash: a copy of the database gives no passwords, no working sessions and no recovery codes.

import { argon2, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { normaliseRecoveryCode } from '../../shared/accountApi';
import { COMMON_PASSWORDS } from './commonPasswords';

/** OWASP's minimum for argon2id (19 MiB, 2 passes, 1 lane). Stored with each hash, so it can be raised. */
export const ARGON2_PARAMS = { memory: 19456, passes: 2, parallelism: 1 };
const TAG_BYTES = 32;
const SALT_BYTES = 16;

// One hash at a time: each takes ~19 MiB and a good share of the VM's 1/8 core, and the matches come
// first. Logins queue behind each other instead of running side by side.
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;
/** How many hashes are queued or running (for /stats). */
export const hashQueueLength = () => waiting;

function runArgon2(password: string, salt: Buffer, params: typeof ARGON2_PARAMS): Promise<Buffer> {
  waiting++;
  const job = queue.then(
    () =>
      new Promise<Buffer>((resolve, reject) =>
        argon2(
          'argon2id',
          { message: password, nonce: salt, tagLength: TAG_BYTES, ...params },
          (err, key) => (err ? reject(err) : resolve(key)),
        ),
      ),
  );
  queue = job.catch(() => {}).finally(() => waiting--);
  return job;
}

/** `argon2id$m=19456,t=2,p=1$<salt>$<hash>` (base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await runArgon2(password, salt, ARGON2_PARAMS);
  const { memory, passes, parallelism } = ARGON2_PARAMS;
  return `argon2id$m=${memory},t=${passes},p=${parallelism}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** Whether `password` matches a stored hash (false for anything malformed). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const m = /^argon2id\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(
    stored,
  );
  if (!m) return false;
  const expected = Buffer.from(m[5], 'base64');
  const key = await runArgon2(password, Buffer.from(m[4], 'base64'), {
    memory: Number(m[1]),
    passes: Number(m[2]),
    parallelism: Number(m[3]),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * A hash nothing matches, compared against when the username does not exist, so a wrong username takes
 * as long as a wrong password (no telling which accounts exist by timing).
 */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () =>
  (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

/** The server-only password checks (the shared ones are in passwordProblem). */
export function weakPasswordProblem(password: string, username: string): string | null {
  const lower = password.toLowerCase();
  if (lower === username || lower.includes(username))
    return 'Your password must not contain your username.';
  if (COMMON_PASSWORDS.has(lower)) return 'That password is too common. Try a longer phrase.';
  return null;
}

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** A session cookie value: 32 random bytes. */
export const newSessionToken = () => randomBytes(32).toString('base64url');

// Crockford's base32 (no I, L, O, U): easy to read back and type.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A recovery code: 16 characters (80 random bits), shown as `XXXX-XXXX-XXXX-XXXX`. */
export function newRecoveryCode(): string {
  const chars = Array.from(randomBytes(16), (b) => CODE_ALPHABET[b % 32]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

/** What is stored for a recovery code: the hash of its normalised form. */
export const recoveryCodeHash = (code: string) => sha256(normaliseRecoveryCode(code));
