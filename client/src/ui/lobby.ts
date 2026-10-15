// The lobby overlay: the room code, the creator's options and the Start button. Pure DOM; the
// buttons are wired to the network in net/client.ts.

import type { LobbyOptions } from '../../../shared/protocol';
import { $ } from '../dom';
import { mapPickerHtml } from '../render/maps';

export interface LobbyView {
  code: string;
  /** True for the room creator, who picks the options and starts the match. */
  host: boolean;
  options: LobbyOptions;
  /** How many seats are taken, out of how many. */
  filled: number;
  total: number;
}

/** Fills the map pickers (lobby and menu) from the client's map list; call once at startup. */
export function initLobbyView() {
  $<HTMLSelectElement>('lobbyMap').innerHTML = mapPickerHtml();
  $<HTMLSelectElement>('arenaMap').innerHTML = mapPickerHtml();
}

/** Shows the lobby (hiding the menu) as this view describes. */
export function showLobby(v: LobbyView) {
  $('menu').style.display = 'none';
  $('lobby').style.display = 'flex';
  $<HTMLInputElement>('lobbyCode').value = v.code;
  const map = $<HTMLSelectElement>('lobbyMap');
  map.value = v.options.mapId;
  map.disabled = !v.host;
  $('lobbyMapNote').textContent = v.host
    ? 'You choose the map. It is kept for rematches.'
    : 'The host chooses the map.';
  const start = $<HTMLButtonElement>('startMatch');
  start.style.display = v.host ? '' : 'none';
  const full = v.filled === v.total;
  start.disabled = !full;
  $('lobbyStatus').textContent = full
    ? v.host
      ? v.total === 2
        ? 'Your opponent is here. Press START when you are ready.'
        : 'Everyone is here. Press START when you are ready.'
      : 'Connected. Waiting for the host to start…'
    : v.total === 2
      ? 'Share the code and wait for your opponent…'
      : `Share the code and wait for players (${v.filled}/${v.total})…`;
}

export function hideLobby() {
  $('lobby').style.display = 'none';
}

/**
 * Copies text to the clipboard. The Clipboard API only exists on secure pages, and the game is
 * served over plain HTTP, so fall back to selecting the code field and a copy command.
 */
export async function copyRoomCode() {
  const field = $<HTMLInputElement>('lobbyCode');
  let ok = false;
  try {
    await navigator.clipboard.writeText(field.value);
    ok = true;
  } catch {
    field.select();
    ok = document.execCommand('copy');
  }
  const button = $('copyCode');
  button.textContent = ok ? 'COPIED ✓' : 'PRESS CTRL+C';
  setTimeout(() => (button.textContent = 'COPY'), 1500);
}
