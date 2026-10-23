import { describe, expect, it } from 'vitest';
import {
  deleteReady,
  displayNameProblems,
  hasProblems,
  loginProblems,
  passwordChangeProblems,
  recoverProblems,
  signupProblems,
} from '../../client/src/account/forms';

describe('account form checks', () => {
  it('log in only needs both fields', () => {
    expect(loginProblems({ username: ' ', password: '' })).toEqual({
      username: expect.any(String),
      password: expect.any(String),
    });
    expect(hasProblems(loginProblems({ username: 'x', password: 'y' }))).toBe(false);
  });

  it('sign up uses the shared rules, after normalising', () => {
    expect(
      signupProblems({ username: '  Merlin ', password: 'long enough', displayName: ' Mer  lin ' }),
    ).toEqual({});
    const p = signupProblems({ username: 'admin', password: 'short', displayName: 'x!' });
    expect(Object.keys(p).sort()).toEqual(['displayName', 'password', 'username']);
    expect(p.username).toMatch(/reserved/);
    expect(
      signupProblems({ username: 'merlin', password: 'MERLIN', displayName: 'Merlin' }).password,
    ).toMatch(/at least/);
    expect(
      signupProblems({ username: 'merlinthe', password: 'MerlinThe', displayName: 'Merlin' })
        .password,
    ).toMatch(/username/);
  });

  it('display name, password change and recovery', () => {
    expect(displayNameProblems({ displayName: 'f u c k' }).displayName).toBeTruthy();
    expect(passwordChangeProblems({ current: '', next: 'short' })).toEqual({
      current: expect.any(String),
      next: expect.any(String),
    });
    expect(passwordChangeProblems({ current: 'same pass', next: 'same pass' }).next).toMatch(
      /different/,
    );
    expect(
      recoverProblems({ username: 'merlin', recoveryCode: '--', next: 'long enough' }),
    ).toEqual({ recoveryCode: expect.any(String) });
  });

  it('delete is armed only by your own username and a password', () => {
    const me = { id: 1, username: 'merlin', displayName: 'Merlin' };
    expect(deleteReady(me, ' MERLIN', 'pw')).toBe(true);
    expect(deleteReady(me, 'merlin', '')).toBe(false);
    expect(deleteReady(me, 'morgana', 'pw')).toBe(false);
    expect(deleteReady(null, 'merlin', 'pw')).toBe(false);
  });
});
