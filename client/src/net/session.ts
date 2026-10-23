// The room and resume token of the online match this tab is in, kept in sessionStorage so a page
// reload can take the seat back. sessionStorage belongs to one tab: a new tab, or another browser,
// has no entry and so is a new player.

export interface SavedSession {
  code: string;
  token: string;
}

const KEY = 'arcane-duel-session';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The tab's storage, or null where it is blocked (private modes, file:// in some browsers). */
function tabStore(): Store | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Reads the stored text back; anything damaged or of the wrong shape is no session. */
export function parseSession(raw: string | null): SavedSession | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (
      saved &&
      typeof saved.code === 'string' &&
      typeof saved.token === 'string' &&
      saved.code &&
      saved.token
    )
      return { code: saved.code, token: saved.token };
  } catch {
    // fall through
  }
  return null;
}

const ID_KEY = 'arcane-duel-client-id';

/**
 * A random id for this tab, kept across reloads: the server uses it to give a seat back to the player
 * who left it. A new tab or browser gets its own (it is a new player).
 */
export function clientId(store: Store | null = tabStore()): string {
  try {
    const known = store?.getItem(ID_KEY);
    if (known) return known;
    const fresh = randomId();
    store?.setItem(ID_KEY, fresh);
    return fresh;
  } catch {
    return randomId();
  }
}

/** 32 random hex digits. Not crypto.randomUUID: that exists only on https/localhost, and the game is served over http. */
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function saveSession(session: SavedSession, store: Store | null = tabStore()) {
  try {
    store?.setItem(KEY, JSON.stringify({ code: session.code, token: session.token }));
  } catch {
    // storage full or blocked: the match just can't be resumed after a reload
  }
}

export function loadSession(store: Store | null = tabStore()): SavedSession | null {
  try {
    return parseSession(store?.getItem(KEY) ?? null);
  } catch {
    return null;
  }
}

export function clearSession(store: Store | null = tabStore()) {
  try {
    store?.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
