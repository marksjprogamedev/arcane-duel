import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_KEY,
  OWNER_KEY,
  SAVE_DELAY_MS,
  createProfileSync,
  planPart,
  sameValue,
  type Part,
  type PartState,
  type SyncDeps,
} from '../../client/src/account/profileSync';
import type { ClientMessage, Profile } from '../../shared/protocol';

const look = { head: 3, hat: 1, skin: '#c58c5c', robeColor: 'original' };
const otherLook = { head: 5, hat: 2, skin: '#f1c27d', robeColor: 'original' };
const loadout = { FIRE: 'fireball' as const };

describe('planPart', () => {
  const base: PartState = {
    server: null,
    local: null,
    pending: false,
    backedUp: false,
    owned: false,
  };
  const plan = (s: Partial<PartState>) => planPart({ ...base, ...s });
  const nothing = { upload: false, apply: false, backup: false };

  it('server never saved, device has one: upload it (sign-up, an old account)', () => {
    expect(plan({ local: look })).toEqual({ ...nothing, upload: true });
  });
  it('server never saved, device has none: nothing', () => {
    expect(plan({})).toEqual(nothing);
  });
  it('server has one, device has none: apply, nothing to back up', () => {
    expect(plan({ server: look })).toEqual({ ...nothing, apply: true });
  });
  it('server has the same as the device (any key order): nothing', () => {
    expect(plan({ server: look, local: reorder(look) })).toEqual(nothing);
  });
  it("server has another: back up the device's own, then apply", () => {
    expect(plan({ server: look, local: otherLook })).toEqual({
      ...nothing,
      apply: true,
      backup: true,
    });
  });
  it('a backup already there is never overwritten', () => {
    expect(plan({ server: look, local: otherLook, backedUp: true })).toEqual({
      ...nothing,
      apply: true,
    });
  });
  it("local is already this account's (another device saved): apply without backing up", () => {
    expect(plan({ server: look, local: otherLook, owned: true })).toEqual({
      ...nothing,
      apply: true,
    });
  });
  it('a local change not sent yet is newer: upload it instead of applying', () => {
    expect(plan({ server: look, local: otherLook, pending: true })).toEqual({
      ...nothing,
      upload: true,
    });
    expect(plan({ server: look, local: look, pending: true })).toEqual(nothing);
  });
});

function reorder<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).reverse()) as T;
}

/** A fake game: local values, a Map store, a socket that may or may not be usable. */
function setup(opts: { account?: number | null; local?: Partial<Profile>; open?: boolean } = {}) {
  const local: Record<Part, object | null> = {
    workshop: opts.local?.workshop ?? null,
    slots: opts.local?.slots ?? null,
    loadout: opts.local?.loadout ?? null,
  };
  const map = new Map<string, string>();
  const store = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  const sent: ClientMessage[] = [];
  const state = { account: opts.account === undefined ? 7 : opts.account, open: opts.open ?? true };
  let sync: ReturnType<typeof createProfileSync>;
  const deps: SyncDeps = {
    account: () => state.account,
    accountKnown: () => true,
    canSend: () => state.open,
    send: (m) => sent.push(m),
    connect: vi.fn(),
    read: (part) => local[part] as never,
    apply: vi.fn((part: Part, value: object) => {
      local[part] = value;
      sync.localSaved(part); // the game fires its save event while applying: must not echo
    }),
    store,
  };
  sync = createProfileSync(deps);
  /** A local save, as the Workshop or spellbook makes one. */
  const save = (part: Part, value: object) => {
    local[part] = value;
    sync.localSaved(part);
  };
  return { sync, deps, sent, local, map, state, save };
}

const wardrobe = {
  active: 1,
  slots: [
    { name: 'Outfit 1', look },
    { name: 'Outfit 2', look: otherLook },
  ],
};

describe('saved outfits (the slots part)', () => {
  it('compares nested data whatever the key order', () => {
    expect(sameValue(wardrobe, JSON.parse(JSON.stringify(wardrobe)))).toBe(true);
    const reordered = {
      slots: wardrobe.slots.map((s) => ({ look: reorder(s.look), name: s.name })),
      active: 1,
    };
    expect(sameValue(wardrobe, reordered)).toBe(true);
    expect(sameValue(wardrobe, { ...wardrobe, active: 0 })).toBe(false);
    expect(
      sameValue(wardrobe, {
        ...wardrobe,
        slots: [wardrobe.slots[0], { name: 'Outfit 2', look }],
      }),
    ).toBe(false);
  });

  it('are uploaded from the device when the account has none, with the current look', () => {
    vi.useFakeTimers();
    const { sync, sent } = setup({ local: { workshop: otherLook, slots: wardrobe } });
    sync.receive({ workshop: null, slots: null, loadout: null });
    expect(sent).toEqual([{ type: 'save_profile', workshop: otherLook, slots: wardrobe }]);
    vi.useRealTimers();
  });

  it("replace the device's own when the account has some, which are kept as a backup", () => {
    vi.useFakeTimers();
    const mine = { active: 0, slots: [{ name: 'Mine', look }] };
    const { sync, local, map, sent } = setup({ local: { slots: mine } });
    sync.receive({ workshop: null, slots: wardrobe, loadout: null });
    expect(local.slots).toEqual(wardrobe);
    expect(JSON.parse(map.get(BACKUP_KEY)!).slots).toEqual(mine);
    expect(sent).toEqual([]);
    vi.useRealTimers();
  });

  it('a local change goes up with the look in use, together, after the quiet time', () => {
    vi.useFakeTimers();
    const { sent, save } = setup();
    save('workshop', otherLook);
    save('slots', wardrobe);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(sent).toEqual([{ type: 'save_profile', workshop: otherLook, slots: wardrobe }]);
    vi.useRealTimers();
  });
});

describe('createProfileSync', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uploads what the server lacks, and applies what it has, in one profile', () => {
    const t = setup({ local: { workshop: look } });
    t.sync.receive({ workshop: null, loadout });
    expect(t.sent).toEqual([{ type: 'save_profile', workshop: look }]);
    expect(t.local.loadout).toEqual(loadout);
    expect(t.sync.hasBackup()).toBe(false); // the device had no loadout to keep
  });

  it('backs up the replaced local values once, and applying sends nothing back', () => {
    const t = setup({ local: { workshop: otherLook, loadout: {} } });
    const changed = vi.fn();
    t.sync.onBackupChange(changed);
    t.sync.receive({ workshop: look, loadout });
    expect(t.local).toEqual({ workshop: look, slots: null, loadout });
    expect(JSON.parse(t.map.get(BACKUP_KEY)!)).toEqual({ workshop: otherLook, loadout: {} });
    expect(changed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SAVE_DELAY_MS * 2);
    expect(t.sent).toEqual([]);
    // another device saves: local is the account's now, the backup stays the device's own
    t.sync.receive({ workshop: otherLook, loadout });
    expect(JSON.parse(t.map.get(BACKUP_KEY)!).workshop).toEqual(otherLook);
    expect(JSON.parse(t.map.get(OWNER_KEY)!)).toEqual({ workshop: 7, loadout: 7 });
    vi.advanceTimersByTime(SAVE_DELAY_MS * 2);
    expect(t.sent).toEqual([]);
  });

  it('equal values: no backup, no apply, no upload', () => {
    const t = setup({ local: { workshop: reorder(look), loadout } });
    t.sync.receive({ workshop: look, loadout });
    expect(t.deps.apply).not.toHaveBeenCalled();
    expect(t.sync.hasBackup()).toBe(false);
    expect(t.sent).toEqual([]);
  });

  it('local saves while logged in go up debounced, just the part that changed', () => {
    const t = setup({ local: { workshop: look } });
    t.save('workshop', otherLook);
    t.save('workshop', { ...otherLook, head: 9 });
    vi.advanceTimersByTime(SAVE_DELAY_MS - 1);
    expect(t.sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(t.sent).toEqual([{ type: 'save_profile', workshop: { ...otherLook, head: 9 } }]);
  });

  it('a save that changes nothing (the Workshop saving on open) is not sent', () => {
    const t = setup({ local: { workshop: look } });
    t.save('workshop', { ...look });
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(t.sent).toEqual([]);
  });

  it('guests send nothing, and their change makes the local look the device own again', () => {
    const t = setup({ account: null, local: { workshop: look } });
    t.save('workshop', otherLook);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(t.sent).toEqual([]);
    expect(JSON.parse(t.map.get(OWNER_KEY)!)).toEqual({ workshop: null });
  });

  it('no usable connection: connects, and the next profile uploads the newer local change', () => {
    const t = setup({ local: { workshop: look }, open: false });
    t.save('workshop', otherLook);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(t.sent).toEqual([]);
    expect(t.deps.connect).toHaveBeenCalled();
    t.state.open = true;
    t.sync.receive({ workshop: look, loadout: null });
    expect(t.local.workshop).toEqual(otherLook);
    expect(t.sent).toEqual([{ type: 'save_profile', workshop: otherLook }]);
  });

  it('an account change drops what was pending for the old one', () => {
    const t = setup({ local: { workshop: look } });
    t.save('workshop', otherLook);
    t.state.account = null;
    t.sync.accountChanged(null);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(t.sent).toEqual([]);
  });

  it('restoring the backup applies it, uploads it at once and removes it', () => {
    const t = setup({ local: { workshop: otherLook, loadout: {} } });
    t.sync.receive({ workshop: look, loadout });
    expect(t.sync.restoreBackup()).toBe(true);
    expect(t.local).toEqual({ workshop: otherLook, slots: null, loadout: {} });
    expect(t.sent).toEqual([{ type: 'save_profile', workshop: otherLook, loadout: {} }]);
    expect(t.sync.hasBackup()).toBe(false);
    expect(t.sync.restoreBackup()).toBe(false);
  });
});
