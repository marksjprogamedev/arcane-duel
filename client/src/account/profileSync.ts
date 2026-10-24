// Keeps the Workshop look and the spellbook loadout in step with the logged-in account
// (docs/ACCOUNTS-PLAN.md section 5, "Local data"). Both stay in localStorage for everyone; this decides
// what goes to the server (`save_profile`) and what comes from it (`profile`). No DOM here: reading,
// writing and showing the local values, the socket and the clock are handed in (profileWiring.ts wires
// them to the game, the tests to fakes).
//
// - `profile` arrives (after `welcome`, or another device saved): a part the server has never saved is
//   uploaded from this device (sign-up copies a guest's look this way); a part it has replaces the local
//   one, which is first kept under BACKUP_KEY if it was this device's own (see planPart).
// - A local save while logged in goes up after SAVE_DELAY_MS of quiet, just the part that changed.
// - Writing the server's value locally never sends it back.

import type { ClientMessage, Profile, Wardrobe, WorkshopLook } from '../../../shared/protocol';
import type { SpellLoadout } from '../../../shared/types';

export type Part = keyof Profile;
export const PARTS: readonly Part[] = ['workshop', 'slots', 'loadout'];
type Value = WorkshopLook | Wardrobe | SpellLoadout;

/** This device's own look and loadout from before an account's replaced them ("Use this device's look"). */
export const BACKUP_KEY = 'arcane-duel-local-backup';
/** Which account (id) each local part was last synced with; null or missing: the device's own. */
export const OWNER_KEY = 'arcane-duel-profile-owner';
/** Quiet time after the last local change before it is sent. */
export const SAVE_DELAY_MS = 800;

/** Any data as text with every object's keys sorted, so the same data compares equal whatever the order. */
function canonical(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const record = value as Record<string, unknown>;
  return (
    '{' +
    Object.keys(record)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical(record[k]))
      .join(',') +
    '}'
  );
}

export const sameValue = (a: unknown, b: unknown) => canonical(a) === canonical(b);

export interface PartState {
  /** The account's saved value; null if it never saved this part. */
  server: Value | null;
  /** This device's saved value; null if it never saved one. */
  local: Value | null;
  /** A local change made while logged in that has not reached the server yet: it is newer. */
  pending: boolean;
  /** The backup already holds this part (the device's own value is kept once, never overwritten). */
  backedUp: boolean;
  /** The local value is already this account's (applied from or uploaded to it): nothing to keep. */
  owned: boolean;
}

export interface PartPlan {
  /** Send the local value to the server. */
  upload: boolean;
  /** Replace the local value with the server's. */
  apply: boolean;
  /** Keep the local value in the backup first. */
  backup: boolean;
}

/** What to do with one part when the server's profile arrives. */
export function planPart(s: PartState): PartPlan {
  const plan: PartPlan = { upload: false, apply: false, backup: false };
  if (s.local !== null && (s.server === null || s.pending)) {
    plan.upload = !sameValue(s.local, s.server);
    return plan;
  }
  if (s.server === null || sameValue(s.local, s.server)) return plan;
  plan.apply = true;
  plan.backup = s.local !== null && !s.backedUp && !s.owned;
  return plan;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SyncDeps {
  /** The logged-in account's id; null for a guest. */
  account(): number | null;
  /** True once start-up knows whether we are logged in. */
  accountKnown(): boolean;
  /** True when a message sent now reaches the server as this account. */
  canSend(): boolean;
  send(message: ClientMessage & { type: 'save_profile' }): void;
  /** Opens a connection if there is none (its `profile` then settles anything still pending). */
  connect(): void;
  /** This device's saved value of a part; null if never saved. */
  read(part: Part): Value | null;
  /** Saves a value locally and shows it (Workshop preview, in-match wizard, spellbook). */
  apply(part: Part, value: Value): void;
  store: Store | null;
}

export function createProfileSync(deps: SyncDeps) {
  const pending = new Set<Part>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let applying = false;
  const backupListeners = new Set<() => void>();
  // what each part was when last seen, so a save that changes nothing (the Workshop saves on open) is no news
  const lastSeen = {} as Record<Part, string>;
  for (const part of PARTS) lastSeen[part] = canonical(deps.read(part));

  function readJson(key: string): Record<string, unknown> {
    try {
      const value = JSON.parse(deps.store?.getItem(key) ?? 'null');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }
  function writeJson(key: string, value: object) {
    try {
      deps.store?.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked: this visit only */
    }
  }
  const backup = () => readJson(BACKUP_KEY) as Partial<Record<Part, Value>>;
  function setOwner(part: Part, id: number | null) {
    writeJson(OWNER_KEY, { ...readJson(OWNER_KEY), [part]: id });
  }

  function message(parts: Iterable<Part>) {
    const out: ClientMessage & { type: 'save_profile' } = { type: 'save_profile' };
    for (const part of parts) {
      const value = deps.read(part);
      if (!value) continue;
      if (part === 'workshop') out.workshop = value as WorkshopLook;
      else if (part === 'slots') out.slots = value as Wardrobe;
      else out.loadout = value as SpellLoadout;
    }
    return out;
  }

  /** Sends what is pending; with no usable connection, keeps it for the next `profile`. */
  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (!pending.size || deps.account() === null) return;
    if (!deps.canSend()) return deps.connect();
    const out = message(pending);
    pending.clear();
    if (out.workshop || out.slots || out.loadout) deps.send(out);
  }

  function applyPart(part: Part, value: Value) {
    applying = true;
    try {
      deps.apply(part, value);
    } finally {
      applying = false;
    }
    lastSeen[part] = canonical(deps.read(part));
  }

  const notifyBackup = () => backupListeners.forEach((fn) => fn());

  return {
    /** A part was saved locally (the Workshop, the spellbook). */
    localSaved(part: Part) {
      if (applying) return; // the server's value being written: not news for the server
      const now = canonical(deps.read(part));
      if (now === lastSeen[part]) return;
      lastSeen[part] = now;
      const id = deps.account();
      if (id !== null) {
        pending.add(part);
        setOwner(part, id);
        clearTimeout(timer);
        timer = setTimeout(flush, SAVE_DELAY_MS);
      } else if (deps.accountKnown()) setOwner(part, null); // a guest's change: the device's own again
    },

    /** The server's `profile` for the logged-in account. */
    receive(profile: Profile) {
      const id = deps.account();
      if (id === null) return;
      const kept = backup();
      const owners = readJson(OWNER_KEY);
      let backupChanged = false;
      const upload: Part[] = [];
      for (const part of PARTS) {
        const server = profile[part] ?? null;
        const local = deps.read(part);
        const plan = planPart({
          server,
          local,
          pending: pending.has(part),
          backedUp: kept[part] != null,
          owned: owners[part] === id,
        });
        pending.delete(part);
        if (plan.backup && local) {
          kept[part] = local;
          backupChanged = true;
        }
        if (plan.apply && server) applyPart(part, server);
        if (plan.upload) upload.push(part);
        if (local || server) setOwner(part, id);
      }
      if (backupChanged) {
        writeJson(BACKUP_KEY, kept);
        notifyBackup();
      }
      if (upload.length) {
        for (const part of upload) pending.add(part);
        flush();
      }
    },

    /** Logged in or out: anything pending was for the old identity. Logged in: connect to hear `profile`. */
    accountChanged(id: number | null) {
      clearTimeout(timer);
      timer = undefined;
      pending.clear();
      if (id !== null) deps.connect();
    },

    /** True when this device's own look or loadout is kept from before an account's replaced it. */
    hasBackup() {
      const kept = backup();
      return PARTS.some((part) => kept[part] != null);
    },

    /** Calls `fn` whenever the backup appears or goes. */
    onBackupChange(fn: () => void) {
      backupListeners.add(fn);
    },

    /**
     * "Use this device's look": the kept values come back locally, go to the account straight away,
     * and the backup is gone. False if there was none.
     */
    restoreBackup(): boolean {
      const kept = backup();
      const parts = PARTS.filter((part) => kept[part] != null);
      if (!parts.length) return false;
      const id = deps.account();
      for (const part of parts) {
        applyPart(part, kept[part]!);
        if (id !== null) {
          pending.add(part);
          setOwner(part, id);
        }
      }
      try {
        deps.store?.removeItem(BACKUP_KEY);
      } catch {
        /* storage blocked */
      }
      notifyBackup();
      flush();
      return true;
    },
  };
}

export type ProfileSync = ReturnType<typeof createProfileSync>;
