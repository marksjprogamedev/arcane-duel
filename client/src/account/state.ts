// Who is logged in: the current Account (or null for a guest) and listeners for changes.
// Accounts need HTTPS (the session cookie is `__Host-`, Secure), so on a plain-http page (LAN play,
// the old IP:port slots) the account UI stays hidden and everyone is a guest.

import type { Account } from '../../../shared/accountApi';
import { callApi } from './api';

let current: Account | null = null;
let loaded = false;
const listeners = new Set<(account: Account | null) => void>();

/** True when this page can use accounts at all (a secure context: HTTPS or localhost). */
export const accountsAvailable = () => globalThis.isSecureContext === true;

export const currentAccount = () => current;

/** True once start-up has asked the server (or decided not to). */
export const accountLoaded = () => loaded;

/** Sets the logged-in account (null: logged out) and tells every listener. */
export function setAccount(account: Account | null) {
  current = account;
  loaded = true;
  for (const listener of listeners) listener(account);
}

/** Calls `listener` on every change; returns a function that stops it. */
export function onAccount(listener: (account: Account | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Start-up: asks the server who we are (the cookie decides). Not on a plain-http page, and any failure
 * (no server, old server, offline) silently leaves us a guest. Always ends with a setAccount call.
 */
export async function loadAccount(): Promise<Account | null> {
  let account: Account | null = null;
  if (accountsAvailable()) {
    try {
      account = (await callApi('/api/me')).account ?? null;
    } catch {
      account = null;
    }
  }
  setAccount(account);
  return account;
}

let ownSignOutUntil = 0;
/**
 * This tab is logging out or deleting the account itself: for a few seconds, the server's `signed_out`
 * for this tab's connection is the expected echo, not news from another device.
 */
export function expectOwnSignOut(ms = 5000) {
  ownSignOutUntil = Date.now() + ms;
}
export const ownSignOutExpected = () => Date.now() < ownSignOutUntil;
