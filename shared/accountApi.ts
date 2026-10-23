// The accounts HTTP API (`/api/*`, JSON) shared by client and server: request and response shapes and
// the rules for names and passwords, so both ends check the same things. Plan: docs/ACCOUNTS-PLAN.md.
//
// Every request is a POST with `Content-Type: application/json` except `GET /api/me`. The session is an
// HttpOnly cookie the browser sends by itself (`credentials: 'same-origin'`, the fetch default), so the
// client never sees it. Errors come back as `ApiError` with the HTTP status below.

/** The logged-in player, as the client sees them. */
export interface Account {
  id: number;
  /** Permanent, lowercase, unique: how friends find you (`@merlin`). */
  username: string;
  /** Shown in rooms; changeable; not unique. */
  displayName: string;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 16;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// ---- requests ----

export interface SignupRequest {
  username: string;
  password: string;
  displayName: string;
}
export interface LoginRequest {
  username: string;
  password: string;
}
/** `everywhere` also ends every other session of this account (other browsers and devices). */
export interface LogoutRequest {
  everywhere?: boolean;
}
export interface PasswordRequest {
  current: string;
  next: string;
}
/** Forgotten password: the recovery code from sign-up sets a new one. */
export interface RecoverRequest {
  username: string;
  recoveryCode: string;
  next: string;
}
/** A new recovery code (the old one stops working). */
export interface RecoveryCodeRequest {
  password: string;
}
export interface DisplayNameRequest {
  displayName: string;
}
export interface DeleteAccountRequest {
  password: string;
}

// ---- responses ----

/** `GET /api/me`: `account` is null when not logged in. */
export interface AccountResponse {
  account: Account | null;
}
/** Log in and display-name: always the account. */
export interface LoggedInResponse {
  account: Account;
}
/** Sign-up and recover: the recovery code is shown once and never again. */
export interface AccountWithCodeResponse {
  account: Account;
  recoveryCode: string;
}
export interface RecoveryCodeResponse {
  recoveryCode: string;
}
export interface OkResponse {
  ok: true;
}

export type ApiField =
  'username' | 'password' | 'displayName' | 'recoveryCode' | 'current' | 'next';

/**
 * A 401 with `field` set is a wrong password or code in that field; a 401 without `field` means the
 * session is gone (log in again), except on login itself ("wrong username or password").
 * Status 400 bad input (`field` says which), 401 wrong username/password/code, 403 banned or wrong origin,
 * 404 unknown endpoint, 409 username taken, 413 body too big, 429 too many tries (`retryAfterSeconds`).
 */
export interface ApiError {
  error: string;
  field?: ApiField;
  retryAfterSeconds?: number;
}

/** The endpoints, by path: request body and success response. */
export interface AccountApi {
  '/api/me': { request: void; response: AccountResponse };
  '/api/signup': { request: SignupRequest; response: AccountWithCodeResponse };
  '/api/login': { request: LoginRequest; response: LoggedInResponse };
  '/api/logout': { request: LogoutRequest; response: OkResponse };
  '/api/password': { request: PasswordRequest; response: OkResponse };
  '/api/recover': { request: RecoverRequest; response: AccountWithCodeResponse };
  '/api/recovery-code': { request: RecoveryCodeRequest; response: RecoveryCodeResponse };
  '/api/display-name': { request: DisplayNameRequest; response: LoggedInResponse };
  '/api/delete-account': { request: DeleteAccountRequest; response: OkResponse };
}

// ---- rules (both ends) ----

/** Usernames are stored and compared in lowercase. */
export const normaliseUsername = (raw: string) => raw.trim().toLowerCase();

/** Reserved so nobody can pass as staff, the server or a guest label. */
const RESERVED_USERNAMES =
  /^(admin|administrator|mod|moderator|staff|support|system|server|root|arcane|arcaneduel|guest|player\d*|null|undefined|me|you)$/;

/** Why a (normalised) username is not allowed, or null if it is fine. */
export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX)
    return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(username)) return 'Use only letters, numbers and _ in a username.';
  if (RESERVED_USERNAMES.test(username)) return 'That username is reserved.';
  return null;
}

/** Display names: single spaces inside, none at the ends. */
export const normaliseDisplayName = (raw: string) => raw.trim().replace(/\s+/g, ' ');

/**
 * A short list of words a display name may not contain (checked without spaces, digits for letters
 * undone). Deliberately small, and without words hidden inside innocent names (Peacock, Grape, Essex): Jesse
 * can rename anything it misses (`arcane-admin rename`).
 */
const RUDE = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'pussy',
  'penis',
  'vagina',
  'whore',
  'slut',
  'nigg',
  'fag',
  'retard',
  'nazi',
  'hitler',
  'porn',
  'wank',
  'bastard',
  'twat',
];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
};

/** Why a (normalised) display name is not allowed, or null if it is fine. */
export function displayNameProblem(name: string): string | null {
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX)
    return `Display names are ${DISPLAY_NAME_MIN} to ${DISPLAY_NAME_MAX} characters.`;
  if (!/^[A-Za-z0-9 ]+$/.test(name))
    return 'Use only letters, numbers and spaces in a display name.';
  const squashed = name
    .toLowerCase()
    .replace(/ /g, '')
    .replace(/[0-9]/g, (d) => LEET[d] ?? d);
  if (RUDE.some((word) => squashed.includes(word))) return 'Please pick a different display name.';
  return null;
}

/**
 * Why a password is not allowed, or null. Length only here; the server also refuses the most common
 * passwords and one equal to the username.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Passwords are at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Passwords are at most ${PASSWORD_MAX} characters.`;
  return null;
}

/**
 * Recovery codes are typed in any case, with or without the dashes and spaces they are shown with (the
 * server normalises too).
 */
export const normaliseRecoveryCode = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
