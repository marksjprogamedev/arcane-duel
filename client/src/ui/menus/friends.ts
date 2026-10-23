// The Friends screen (docs/ACCOUNTS-PLAN.md section 8 item 6), over the main menu or the lobby, and the
// Friends buttons that open it (a chip next to the account chip, a button in the lobby; logged in only).
// Thin DOM wiring only: the list, checks and messages are in account/friends.ts.

import type { FriendEntry, FriendsList, Person } from '../../../../shared/protocol';
import {
  addFriendProblem,
  addOutcome,
  answerFriend,
  blockPerson,
  connectFriends,
  friendsList,
  incomingCount,
  invitable,
  inviteFriend,
  inviteWaitMs,
  newsText,
  onFriendError,
  onFriends,
  onFriendsNews,
  onInviteSent,
  personLabel,
  PRESENCE_LABEL,
  removeFriend,
  requestFriend,
  sortFriends,
  sortPeople,
  unblockPerson,
} from '../../account/friends';
import { normaliseUsername } from '../../../../shared/accountApi';
import { accountsAvailable, currentAccount, onAccount } from '../../account/state';
import { $ } from '../../dom';
import { game, net } from '../../state';
import { initInviteToasts } from './invites';
import { initTabs, type Tabs } from '../tabs';
import { showToast } from '../toast';

/** How long a Remove / Block button waits for its second click. */
const CONFIRM_MS = 3000;
/** How long Add waits for the server before it can be pressed again. */
const ADD_WAIT_MS = 5000;

/** The screen underneath (made inert while Friends is up), or null when closed. */
let opener: 'menu' | 'lobby' | null = null;
let tabs: Tabs;
/** The username we just asked for, until the server's list (or error) answers. */
let pendingAdd: string | null = null;
let addTimer: ReturnType<typeof setTimeout> | undefined;
/** The Remove / Block button waiting for its second click (`remove:12`), if any. */
let armed: string | null = null;
let armTimer: ReturnType<typeof setTimeout> | undefined;
/** Redraws when the soonest Invite button that waits can be pressed again. */
let inviteTimer: ReturnType<typeof setTimeout> | undefined;

/** Friends can be invited while we are in a room's lobby (not its match, nor its results). */
const inLobby = () => !!net.room && !net.online && !game.active;

export const friendsShowing = () => opener !== null;

const addInput = () => $<HTMLInputElement>('friendsAddName');
const addButton = () => $('friendsAddForm').querySelector<HTMLButtonElement>('button')!;

function setAddError(text: string) {
  $('friendsAddError').textContent = text;
  if (text) addInput().setAttribute('aria-invalid', 'true');
  else addInput().removeAttribute('aria-invalid');
}

function openFriends(from: 'menu' | 'lobby') {
  if (!currentAccount()) return;
  opener = from;
  $(from).inert = true;
  setAddError('');
  disarm(false);
  if (!friendsList()) connectFriends();
  tabs.select(incomingCount() ? 'friendsPanelRequests' : 'friendsPanelFriends');
  render(friendsList());
  $('friendsScreen').hidden = false;
  addInput().focus({ focusVisible: false });
}

/** Closes the screen (Back, Esc, logged out, the lobby went away or a match started). */
export function closeFriends() {
  if (!opener) return;
  const from = opener;
  opener = null;
  disarm(false);
  clearTimeout(inviteTimer);
  $('friendsScreen').hidden = true;
  $('menu').inert = false;
  $('lobby').inert = false;
  const back = from === 'menu' ? $('friendsChip') : $('lobbyFriends');
  if (!back.hidden && back.offsetParent) back.focus({ focusVisible: false });
}

// ---- rows ----

/** A row button; `key` (`accept:12`) finds it again after the list is drawn anew. */
function button(key: string, text: string, colour: string, onClick: () => void, label?: string) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.key = key;
  b.className = `ui-btn ui-btn--secondary ${colour}`;
  b.textContent = text;
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

/** Remove / Block ask twice: the first click arms the button ("Sure? Block"), a second one acts. */
function confirmButton(key: string, text: string, who: Person, act: () => void) {
  const on = armed === key;
  return button(
    key,
    on ? `Sure? ${text}` : text,
    'is-red',
    () => {
      if (armed !== key) return arm(key);
      disarm(false);
      act();
    },
    on ? `Click again to ${text.toLowerCase()} ${personLabel(who)}` : `${text} ${personLabel(who)}`,
  );
}

function arm(key: string) {
  armed = key;
  clearTimeout(armTimer);
  armTimer = setTimeout(() => disarm(true), CONFIRM_MS);
  render(friendsList());
}

function disarm(redraw: boolean) {
  clearTimeout(armTimer);
  if (armed === null) return;
  armed = null;
  if (redraw) render(friendsList());
}

function row(person: Person, buttons: HTMLButtonElement[], presence?: FriendEntry['presence']) {
  const li = document.createElement('li');
  li.className = 'ui-list__item';
  const name = document.createElement('span');
  name.className = 'ui-list__grow';
  name.textContent = personLabel(person);
  if (presence) {
    const label = PRESENCE_LABEL[presence] ?? PRESENCE_LABEL.offline;
    const dot = document.createElement('span');
    dot.className = presence === 'offline' ? 'ui-dot' : `ui-dot is-${presence}`;
    dot.setAttribute('aria-hidden', 'true');
    dot.title = label;
    const meta = document.createElement('span');
    meta.className = 'ui-list__meta';
    meta.textContent = label;
    li.append(dot, name, meta, ...buttons);
  } else li.append(name, ...buttons);
  return li;
}

/** The Invite button (in a lobby, for a friend free to play); waits after an invite went out. */
function inviteButton(f: FriendEntry, now: number) {
  const b = button(
    `invite:${f.id}`,
    'Invite',
    'is-green',
    () => {
      if (inviteFriend(f.id, performance.now())) render(friendsList());
    },
    `Invite ${personLabel(f)} to this lobby`,
  );
  const wait = inviteWaitMs(f.id, now);
  if (wait > 0) {
    b.disabled = true;
    b.title = 'Invited. You can invite them again in a moment.';
  }
  return b;
}

/** Redraws when the soonest waiting Invite button can be pressed again. */
function scheduleInviteRedraw(friends: FriendEntry[], now: number) {
  clearTimeout(inviteTimer);
  const waits = friends.map((f) => inviteWaitMs(f.id, now)).filter((ms) => ms > 0);
  if (waits.length && opener)
    inviteTimer = setTimeout(() => opener && render(friendsList()), Math.min(...waits) + 50);
}

function fill(panelId: string, rows: HTMLLIElement[], loading: boolean) {
  const panel = $(panelId);
  panel.querySelector<HTMLElement>('[data-friends-empty]')!.hidden = loading || rows.length > 0;
  panel.querySelector('[data-friends-list]')!.replaceChildren(...rows);
}

/** A tab's name and its count (`Sent (2)`); Requests gets a badge instead, while any wait. */
function tabLabel(tabId: string, text: string, count: number, badge = false) {
  const tab = $(tabId);
  if (badge) {
    const b = document.createElement('span');
    b.className = 'ui-badge';
    b.textContent = count ? String(count) : '';
    tab.replaceChildren(`${text} `, b);
  } else tab.textContent = count ? `${text} (${count})` : text;
}

/** Draws the lists. The keyboard stays on the button it was on, if that is still there. */
function render(list: FriendsList | null) {
  const focusKey = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
    '#friendsScreen [data-key]',
  )?.dataset.key;
  const loading = !list;
  $('friendsLoading').hidden = !loading;
  const l = list ?? { friends: [], incoming: [], outgoing: [], blocked: [] };
  const now = performance.now();
  const lobby = inLobby();
  fill(
    'friendsPanelFriends',
    sortFriends(l.friends).map((f) => {
      const remove = confirmButton(`remove:${f.id}`, 'Remove', f, () => removeFriend(f.id));
      const block = confirmButton(`block:${f.id}`, 'Block', f, () => blockPerson(f.id));
      const invite = lobby && invitable(f.presence) ? [inviteButton(f, now)] : [];
      return row(f, [...invite, remove, block], f.presence);
    }),
    loading,
  );
  if (lobby) scheduleInviteRedraw(l.friends, now);
  fill(
    'friendsPanelRequests',
    sortPeople(l.incoming).map((p) =>
      row(p, [
        button(
          `accept:${p.id}`,
          'Accept',
          'is-green',
          () => answerFriend(p.id, true),
          `Accept ${personLabel(p)}`,
        ),
        button(
          `decline:${p.id}`,
          'Decline',
          'is-beige',
          () => answerFriend(p.id, false),
          `Decline ${personLabel(p)}`,
        ),
      ]),
    ),
    loading,
  );
  fill(
    'friendsPanelSent',
    sortPeople(l.outgoing).map((p) =>
      row(p, [
        button(
          `cancel:${p.id}`,
          'Cancel',
          'is-beige',
          () => removeFriend(p.id),
          `Cancel the request to ${personLabel(p)}`,
        ),
      ]),
    ),
    loading,
  );
  fill(
    'friendsPanelBlocked',
    sortPeople(l.blocked).map((p) =>
      row(p, [
        button(
          `unblock:${p.id}`,
          'Unblock',
          'is-beige',
          () => unblockPerson(p.id),
          `Unblock ${personLabel(p)}`,
        ),
      ]),
    ),
    loading,
  );
  tabLabel('friendsTabFriends', 'Friends', l.friends.length);
  tabLabel('friendsTabRequests', 'Requests', l.incoming.length, true);
  tabLabel('friendsTabSent', 'Sent', l.outgoing.length);
  tabLabel('friendsTabBlocked', 'Blocked', l.blocked.length);
  if (focusKey) {
    const screen = $('friendsScreen');
    // the row went (accepted, cancelled): the keyboard goes to the tab, not lost on the page; a button
    // that now waits (Invite just pressed) hands it to the next one in its row
    const same = screen.querySelector<HTMLButtonElement>(`[data-key="${focusKey}"]`);
    (
      (same && !same.disabled
        ? same
        : same?.parentElement?.querySelector<HTMLElement>('button:not(:disabled)')) ??
      screen.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    )?.focus();
  }
}

/** The request badges on the Friends chip and the lobby button. */
function showBadges() {
  const n = incomingCount();
  document
    .querySelectorAll<HTMLElement>('[data-friends-badge]')
    .forEach((b) => (b.textContent = n ? String(n) : ''));
  for (const id of ['friendsChip', 'lobbyFriends'])
    $(id).setAttribute(
      'aria-label',
      n ? `Friends, ${n} friend request${n === 1 ? '' : 's'}` : 'Friends',
    );
}

// ---- Add a friend ----

function endAdd() {
  pendingAdd = null;
  clearTimeout(addTimer);
  addButton().disabled = false;
}

function wireAddForm() {
  const form = $<HTMLFormElement>('friendsAddForm');
  const input = addInput();
  const check = () =>
    addFriendProblem(input.value, friendsList(), currentAccount()?.username ?? null);
  // as account.ts: a shown message follows the typing; leaving the field checks it
  input.addEventListener('input', () => {
    if ($('friendsAddError').textContent) setAddError(input.value ? (check() ?? '') : '');
  });
  input.addEventListener('change', () => input.value && setAddError(check() ?? ''));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (pendingAdd) return;
    const problem = check();
    setAddError(problem ?? '');
    if (problem) return input.focus();
    const username = normaliseUsername(input.value);
    if (!requestFriend(username)) return;
    pendingAdd = username;
    addButton().disabled = true;
    addTimer = setTimeout(endAdd, ADD_WAIT_MS);
  });
}

/** A new list may be the answer to Add: say so and empty the field. */
function answerAdd(list: FriendsList) {
  if (!pendingAdd) return;
  const outcome = addOutcome(list, pendingAdd);
  if (!outcome) return;
  const who =
    list.friends.find((p) => p.username === pendingAdd) ??
    list.outgoing.find((p) => p.username === pendingAdd);
  const label = who ? personLabel(who) : `@${pendingAdd}`;
  showToast(
    outcome === 'friends'
      ? `You and ${label} are now friends.`
      : `Friend request sent to ${label}.`,
  );
  addInput().value = '';
  setAddError('');
  endAdd();
  tabs.select(outcome === 'friends' ? 'friendsPanelFriends' : 'friendsPanelSent');
}

/**
 * Wires the Friends buttons and screen. Like the account screens, nothing shows on a plain-http page.
 */
export function initFriendsMenu() {
  if (!accountsAvailable()) return;
  tabs = initTabs($('friendsScreen').querySelector('.ui-tabs')!, () => disarm(false));
  wireAddForm();
  $('friendsChip').addEventListener('click', () => openFriends('menu'));
  $('lobbyFriends').addEventListener('click', () => openFriends('lobby'));
  $('friendsBack').addEventListener('click', closeFriends);
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Escape' && opener) closeFriends();
  });
  const showButtons = () => {
    const on = !!currentAccount();
    $('friendsChip').hidden = !on;
    $('lobbyFriends').hidden = !on;
  };
  onAccount(() => {
    showButtons();
    endAdd();
    if (!currentAccount()) closeFriends();
  });
  showButtons();
  onFriends((list) => {
    showBadges();
    if (list) answerAdd(list);
    if (opener) render(list);
  });
  onFriendsNews((news) => {
    const text = newsText(news);
    if (text) showToast(text, 4000);
  });
  onInviteSent((to) => {
    showToast(`Invited ${to.displayName}.`);
    if (opener) render(friendsList());
  });
  onFriendError((message, fromInvite) => {
    if (fromInvite) {
      // about an invite, not the Add field
      showToast(message, 4000);
      if (opener) render(friendsList());
      return;
    }
    endAdd();
    if (opener) {
      setAddError(message);
      addInput().focus();
    } else showToast(message, 4000);
  });
  showBadges();
  initInviteToasts();
}
