// The account screens over the main menu (docs/ACCOUNTS-PLAN.md section 8): the account chip, Log in /
// Sign up, the recovery code, the Account page and Forgot password. Thin DOM wiring only: the checks are
// in account/forms.ts, the calls in account/api.ts, who is logged in in account/state.ts.

import {
  normaliseDisplayName,
  normaliseRecoveryCode,
  normaliseUsername,
  type Account,
  type ApiField,
} from '../../../../shared/accountApi';
import { AccountApiError, callApi, errorText } from '../../account/api';
import {
  deleteReady,
  displayNameProblems,
  hasProblems,
  loginProblems,
  passwordChangeProblems,
  passwordOnlyProblems,
  recoverProblems,
  signupProblems,
  type Problems,
} from '../../account/forms';
import {
  accountsAvailable,
  currentAccount,
  loadAccount,
  onAccount,
  setAccount,
} from '../../account/state';
import { $ } from '../../dom';
import { copyText } from '../clipboard';
import { initTabs, type Tabs } from '../tabs';
import { showToast } from '../toast';

const SCREENS = ['accountLogin', 'accountCode', 'accountProfile', 'accountForgot'] as const;
type Screen = (typeof SCREENS)[number];

/** Where Back (and Esc) goes from each screen; the code screen has none, only Continue. */
const BACK: Partial<Record<Screen, Screen | 'menu'>> = {
  accountLogin: 'menu',
  accountProfile: 'menu',
  accountForgot: 'accountLogin',
};

let showing: Screen | null = null;
/** Where Continue goes from the recovery code screen, and what to say. */
let afterCode: () => void = () => closeAccount();

/** True while an account screen is up (the menu underneath is inert). */
export const accountShowing = () => showing !== null;

function show(screen: Screen) {
  showing = screen;
  for (const id of SCREENS) $(id).hidden = id !== screen;
  $('menu').inert = true;
  // the first empty field, or the first control, gets the keyboard
  const el = $(screen);
  const target =
    [...el.querySelectorAll<HTMLInputElement>('input.ui-field')].find(
      (i) => !i.closest('[hidden]') && !i.value,
    ) ?? el.querySelector<HTMLElement>('button:not([disabled])');
  target?.focus({ focusVisible: false });
}

function closeAccount() {
  showing = null;
  for (const id of SCREENS) $(id).hidden = true;
  $('menu').inert = false;
  const chip = $('accountChip');
  if (!chip.hidden) chip.focus({ focusVisible: false });
}

function back() {
  const to = showing && BACK[showing];
  if (!to) return;
  if (to === 'menu') closeAccount();
  else show(to);
}

// ---- forms: field messages, busy button, server errors ----

type Values = Record<string, string>;

const valuesOf = (form: HTMLFormElement): Values =>
  Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v)]));

function fieldOf(form: HTMLFormElement, name: string) {
  return form.querySelector<HTMLInputElement>(`input[name="${name}"].ui-field`);
}

function setFieldError(form: HTMLFormElement, name: string, text: string) {
  const note = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  const input = fieldOf(form, name);
  if (note) note.textContent = text;
  if (input) {
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (note) {
      note.id ||= `${input.id}-error`;
      const ids = new Set(
        (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean),
      );
      if (text) ids.add(note.id);
      else ids.delete(note.id);
      input.setAttribute('aria-describedby', [...ids].join(' '));
    }
  }
}

function setFormError(form: HTMLFormElement, text: string) {
  const line = form.querySelector<HTMLElement>('[data-form-error]');
  if (line) line.textContent = text;
}

function clearErrors(form: HTMLFormElement) {
  form
    .querySelectorAll<HTMLElement>('[data-error-for]')
    .forEach((n) => setFieldError(form, n.dataset.errorFor!, ''));
  setFormError(form, '');
}

/**
 * Wires one form: the shared rules give instant messages under each field (when it is left, and again as
 * it is fixed), Enter or the submit button runs `submit` with the button disabled while it waits, and a
 * server error lands under its field (ApiError.field) or on the form's error line. `ready` (if given)
 * decides whether the button is on again afterwards.
 */
function wireForm(
  form: HTMLFormElement,
  check: (v: Values) => Problems,
  submit: (v: Values) => Promise<void>,
  ready: () => boolean = () => true,
) {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const recheck = (name: string, always: boolean) => {
    const shown = !!form.querySelector(`[data-error-for="${name}"]`)?.textContent;
    if (!always && !shown) return;
    setFieldError(form, name, check(valuesOf(form))[name as ApiField] ?? '');
  };
  form.querySelectorAll<HTMLInputElement>('input.ui-field').forEach((input) => {
    input.addEventListener('input', () => recheck(input.name, false));
    input.addEventListener('change', () => input.value && recheck(input.name, true));
  });
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (button.disabled) return;
    clearErrors(form);
    const values = valuesOf(form);
    const problems = check(values);
    if (hasProblems(problems)) {
      for (const [name, text] of Object.entries(problems)) setFieldError(form, name, text);
      fieldOf(form, Object.keys(problems)[0])?.focus();
      return;
    }
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await submit(values);
    } catch (err) {
      const field = err instanceof AccountApiError ? err.field : undefined;
      if (field && fieldOf(form, field)) {
        setFieldError(form, field, errorText(err));
        fieldOf(form, field)?.focus();
      } else setFormError(form, errorText(err));
      await checkStillLoggedIn(err);
    } finally {
      button.disabled = !ready();
      form.removeAttribute('aria-busy');
    }
  });
}

/**
 * A 401 without a field on the Account page can mean the session is gone (logged out everywhere from
 * another device). Ask the server; if we are a guest now, say so and go back to the menu.
 */
async function checkStillLoggedIn(err: unknown) {
  if (showing !== 'accountProfile' || !(err instanceof AccountApiError) || err.status !== 401)
    return;
  if (err.field) return;
  const account = await loadAccount();
  if (!account) {
    closeAccount();
    showToast('You have been logged out.');
  }
}

/** Empties a form's inputs (passwords never stay on the page) and its messages. */
function resetForm(form: HTMLFormElement) {
  form.reset();
  clearErrors(form);
}

// ---- the recovery code screen ----

function showCode(code: string, intro: string, then: () => void) {
  $('accountCodeIntro').textContent = intro;
  $('accountCodeText').textContent = code;
  const saved = $<HTMLInputElement>('accountCodeSaved');
  saved.checked = false;
  $<HTMLButtonElement>('accountCodeContinue').disabled = true;
  $('accountCodeCopy').textContent = 'COPY';
  afterCode = then;
  show('accountCode');
}

function wireCodeScreen() {
  const saved = $<HTMLInputElement>('accountCodeSaved');
  const cont = $<HTMLButtonElement>('accountCodeContinue');
  saved.addEventListener('change', () => (cont.disabled = !saved.checked));
  $('accountCodeCopy').addEventListener('click', async () => {
    const shown = $('accountCodeText');
    const ok = await copyText(shown.textContent ?? '', shown);
    const button = $('accountCodeCopy');
    button.textContent = ok ? 'COPIED ✓' : 'PRESS CTRL+C';
    setTimeout(() => (button.textContent = 'COPY'), 1500);
  });
  cont.addEventListener('click', () => {
    if (cont.disabled) return;
    $('accountCodeText').textContent = ''; // shown once: gone from the page after this
    const then = afterCode;
    afterCode = () => closeAccount();
    then();
  });
}

// ---- the screens ----

let loginTabs: Tabs;
let profileTabs: Tabs;

function fillProfile(account: Account) {
  $('accountProfileName').textContent = account.displayName;
  $('accountProfileUsername').textContent = account.username;
  $<HTMLInputElement>('accountDisplayName').value = account.displayName;
  document
    .querySelectorAll<HTMLInputElement>('[data-account-username]')
    .forEach((i) => (i.value = account.username));
}

function openProfile() {
  const account = currentAccount();
  if (!account) return show('accountLogin');
  for (const id of ['accountPasswordForm', 'accountRecoveryForm', 'accountDeleteForm'])
    resetForm($<HTMLFormElement>(id));
  clearErrors($<HTMLFormElement>('accountNameForm'));
  fillProfile(account);
  $<HTMLButtonElement>('accountDeleteButton').disabled = true;
  profileTabs.select('accountNameForm');
  show('accountProfile');
}

function wireLoginScreen() {
  loginTabs = initTabs($('accountLogin').querySelector('.ui-tabs')!);
  wireForm($<HTMLFormElement>('accountLoginForm'), loginProblems, async (v) => {
    const { account } = await callApi('/api/login', {
      username: normaliseUsername(v.username),
      password: v.password,
    });
    if (!account) throw new AccountApiError(401, { error: 'Wrong username or password.' });
    setAccount(account);
    resetForm($<HTMLFormElement>('accountLoginForm'));
    closeAccount();
    showToast(`Welcome back, ${account.displayName}!`);
  });
  wireForm($<HTMLFormElement>('accountSignupForm'), signupProblems, async (v) => {
    const { account, recoveryCode } = await callApi('/api/signup', {
      username: normaliseUsername(v.username),
      password: v.password,
      displayName: normaliseDisplayName(v.displayName),
    });
    setAccount(account);
    resetForm($<HTMLFormElement>('accountSignupForm'));
    showCode(recoveryCode, `Welcome, ${account.displayName}! One last thing:`, () => {
      closeAccount();
      showToast(`You're logged in as ${account.displayName}.`);
    });
  });
  $('accountForgotLink').addEventListener('click', () => {
    resetForm($<HTMLFormElement>('accountForgotForm'));
    const typed = $<HTMLInputElement>('loginUsername').value;
    $<HTMLInputElement>('forgotUsername').value = typed;
    show('accountForgot');
  });
}

function wireForgotScreen() {
  wireForm($<HTMLFormElement>('accountForgotForm'), recoverProblems, async (v) => {
    const { account, recoveryCode } = await callApi('/api/recover', {
      username: normaliseUsername(v.username),
      recoveryCode: normaliseRecoveryCode(v.recoveryCode),
      next: v.next,
    });
    setAccount(account);
    resetForm($<HTMLFormElement>('accountForgotForm'));
    showCode(
      recoveryCode,
      'Your password is changed and you are logged in. Your old recovery code no longer works; here is the new one:',
      () => {
        closeAccount();
        showToast(`You're logged in as ${account.displayName}.`);
      },
    );
  });
}

function wireProfileScreen() {
  profileTabs = initTabs($('accountProfile').querySelector('.ui-tabs')!);
  wireForm($<HTMLFormElement>('accountNameForm'), displayNameProblems, async (v) => {
    const { account } = await callApi('/api/display-name', {
      displayName: normaliseDisplayName(v.displayName),
    });
    if (account) {
      setAccount(account);
      fillProfile(account);
    }
    showToast('Display name saved.');
  });
  wireForm($<HTMLFormElement>('accountPasswordForm'), passwordChangeProblems, async (v) => {
    await callApi('/api/password', { current: v.current, next: v.next });
    resetForm($<HTMLFormElement>('accountPasswordForm'));
    fillProfile(currentAccount()!);
    showToast('Password changed.');
  });
  wireForm($<HTMLFormElement>('accountRecoveryForm'), passwordOnlyProblems, async (v) => {
    const { recoveryCode } = await callApi('/api/recovery-code', { password: v.password });
    resetForm($<HTMLFormElement>('accountRecoveryForm'));
    fillProfile(currentAccount()!);
    showCode(recoveryCode, 'Your old recovery code no longer works. Here is the new one:', () => {
      show('accountProfile');
      showToast('New recovery code saved.');
    });
  });
  const del = $<HTMLFormElement>('accountDeleteForm');
  const delButton = $<HTMLButtonElement>('accountDeleteButton');
  // armed only while the typed username matches and a password is in
  const canDelete = () => {
    const v = valuesOf(del);
    return deleteReady(currentAccount(), v.confirmUsername ?? '', v.password ?? '');
  };
  del.addEventListener('input', () => (delButton.disabled = !canDelete()));
  wireForm(
    del,
    passwordOnlyProblems,
    async (v) => {
      if (!canDelete()) throw new AccountApiError(400, { error: 'Type your username to confirm.' });
      await callApi('/api/delete-account', { password: v.password });
      resetForm(del);
      setAccount(null);
      closeAccount();
      showToast('Your account is deleted.');
    },
    canDelete,
  );

  const logout = async (everywhere: boolean, button: HTMLButtonElement) => {
    button.disabled = true;
    try {
      await callApi('/api/logout', everywhere ? { everywhere: true } : {});
      setAccount(null);
      closeAccount();
      showToast(everywhere ? 'Logged out on every device.' : 'Logged out.');
    } catch (err) {
      showToast(errorText(err), 4000);
    } finally {
      button.disabled = false;
    }
  };
  const one = $<HTMLButtonElement>('accountLogout');
  const all = $<HTMLButtonElement>('accountLogoutAll');
  one.addEventListener('click', () => logout(false, one));
  all.addEventListener('click', () => logout(true, all));
}

function wireChip() {
  const chip = $<HTMLButtonElement>('accountChip');
  const label = (account: Account | null) => {
    chip.textContent = account ? `👤 ${account.displayName}` : '👤 Log in';
    chip.setAttribute(
      'aria-label',
      account ? `Account: ${account.displayName} (@${account.username})` : 'Log in or sign up',
    );
    chip.hidden = false;
  };
  onAccount((account) => {
    label(account);
    // logged out (here or found out on the Account page): that page has nothing to show any more
    if (!account && showing === 'accountProfile') closeAccount();
  });
  chip.addEventListener('click', () => {
    if (currentAccount()) openProfile();
    else {
      loginTabs.select('accountLoginForm');
      show('accountLogin');
    }
  });
}

/**
 * Wires the account chip and screens and asks the server who we are. On a plain-http page nothing is
 * shown and no request is made: everyone plays as a guest.
 */
export function initAccountMenu() {
  if (!accountsAvailable()) return;
  wireLoginScreen();
  wireForgotScreen();
  wireProfileScreen();
  wireCodeScreen();
  wireChip();
  document
    .querySelectorAll('[data-account-back]')
    .forEach((b) => b.addEventListener('click', back));
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && showing) back();
  });
  void loadAccount();
}
