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
    const v = JSON.parse(raw);
    if (v && typeof v.code === 'string' && typeof v.token === 'string' && v.code && v.token)
      return { code: v.code, token: v.token };
  } catch {
    // fall through
  }
  return null;
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
