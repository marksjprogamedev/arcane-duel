// The checks behind the account forms, without the DOM: which field has which problem, by the shared
// rules in shared/accountApi.ts. They only give instant messages; the server checks everything again.

import {
  displayNameProblem,
  normaliseDisplayName,
  normaliseRecoveryCode,
  normaliseUsername,
  passwordProblem,
  usernameProblem,
  type Account,
  type ApiField,
} from '../../../shared/accountApi';

/** A message per field that has a problem; no key means the field is fine. */
export type Problems = Partial<Record<ApiField, string>>;

/** Log in: just that both are filled in (a wrong one is the server's "Wrong username or password"). */
export function loginProblems(v: { username: string; password: string }): Problems {
  const p: Problems = {};
  if (!normaliseUsername(v.username)) p.username = 'Enter your username.';
  if (!v.password) p.password = 'Enter your password.';
  return p;
}

export function signupProblems(v: {
  username: string;
  password: string;
  displayName: string;
}): Problems {
  const p: Problems = {};
  const username = normaliseUsername(v.username);
  const u = usernameProblem(username);
  if (u) p.username = u;
  const pw = passwordProblem(v.password);
  if (pw) p.password = pw;
  else if (username && v.password.toLowerCase() === username)
    p.password = "Your password can't be your username.";
  const d = displayNameProblem(normaliseDisplayName(v.displayName));
  if (d) p.displayName = d;
  return p;
}

export function displayNameProblems(v: { displayName: string }): Problems {
  const d = displayNameProblem(normaliseDisplayName(v.displayName));
  return d ? { displayName: d } : {};
}

export function passwordChangeProblems(v: { current: string; next: string }): Problems {
  const p: Problems = {};
  if (!v.current) p.current = 'Enter your current password.';
  const n = passwordProblem(v.next);
  if (n) p.next = n;
  else if (v.next === v.current) p.next = 'Pick a password different from the current one.';
  return p;
}

export function recoverProblems(v: {
  username: string;
  recoveryCode: string;
  next: string;
}): Problems {
  const p: Problems = {};
  if (!normaliseUsername(v.username)) p.username = 'Enter your username.';
  if (!normaliseRecoveryCode(v.recoveryCode)) p.recoveryCode = 'Enter the recovery code you saved.';
  const n = passwordProblem(v.next);
  if (n) p.next = n;
  return p;
}

export function passwordOnlyProblems(v: { password: string }): Problems {
  return v.password ? {} : { password: 'Enter your password.' };
}

/** Delete is armed only once the player has typed their own username and a password. */
export const deleteReady = (account: Account | null, typedUsername: string, password: string) =>
  !!account && normaliseUsername(typedUsername) === account.username && password.length > 0;

export const hasProblems = (p: Problems) => Object.keys(p).length > 0;
