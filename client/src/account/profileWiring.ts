// Connects profileSync.ts to the game: the Workshop look and spellbook loadout in localStorage, the
// events that say they were saved, the logged-in account and the socket (handed in by net/client.ts).

import type { ClientMessage, Profile, WorkshopLook } from '../../../shared/protocol';
import { sanitizeLoadout } from '../../../shared/sim/variants';
import { applyLoadout, onLoadoutChange, savedLoadout } from '../ui/menus/spellbook';
import { reloadAppearance } from '../workshop/panel';
import { accountLoaded, currentAccount, onAccount } from './state';
import { createProfileSync, type Part, type ProfileSync } from './profileSync';

/** Where workshop/store.ts keeps the look (`saveAppearance`). */
const APPEARANCE_KEY = 'arcane-wizard-workshop';

const storage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** The saved look: only short keys with string or finite number values (what the server accepts). */
function readLook(): WorkshopLook | null {
  try {
    const raw = JSON.parse(storage()?.getItem(APPEARANCE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const look: WorkshopLook = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!/^[A-Za-z0-9]{1,24}$/.test(key)) continue;
      if ((typeof value === 'string' && value.length <= 40) || Number.isFinite(value))
        look[key] = value as string | number;
    }
    return look;
  } catch {
    return null;
  }
}

let sync: ProfileSync | null = null;

/** Starts syncing; called once by net/client.ts with its socket. */
export function initProfileSync(net: {
  canSend(): boolean;
  send(message: ClientMessage): void;
  connect(): void;
}) {
  sync = createProfileSync({
    account: () => currentAccount()?.id ?? null,
    accountKnown: accountLoaded,
    canSend: net.canSend,
    send: net.send,
    connect: net.connect,
    store: storage(),
    read: (part: Part) => (part === 'workshop' ? readLook() : savedLoadout()),
    apply(part, value) {
      if (part === 'loadout') return applyLoadout(sanitizeLoadout(value));
      try {
        storage()?.setItem(APPEARANCE_KEY, JSON.stringify(value));
      } catch {
        /* storage blocked: shown for this visit only */
      }
      reloadAppearance();
    },
  });
  window.addEventListener('arcane-wizard-appearance', () => sync?.localSaved('workshop'));
  onLoadoutChange(() => sync?.localSaved('loadout'));
  onAccount((account) => sync?.accountChanged(account?.id ?? null));
  // already logged in (the account loaded before the lobby was wired): connect for the profile
  if (accountLoaded() && currentAccount()) sync.accountChanged(currentAccount()!.id);
}

/** The server's `profile` for this connection's account. */
export const receiveProfile = (profile: Profile) => sync?.receive(profile);

/** True when this device's own look is kept from before an account's replaced it. */
export const hasDeviceBackup = () => sync?.hasBackup() ?? false;

/** Puts this device's kept look and loadout back, saves them to the account. False if none. */
export const restoreDeviceLook = () => sync?.restoreBackup() ?? false;

export const onDeviceBackupChange = (fn: () => void) => sync?.onBackupChange(fn);
