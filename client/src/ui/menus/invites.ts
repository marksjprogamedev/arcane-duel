// Invite toasts (docs/ACCOUNTS-PLAN.md section 8 item 7): each invite to a friend's lobby shows as a toast
// with Join / Dismiss until it runs out. During a match they wait, and show once it is over. Thin DOM
// wiring only: the queue is account/invites.ts.

import { initInvites, invites, inviteText, onInvites, type Invite } from '../../account/invites';
import { personLabel } from '../../account/friends';
import { game, net } from '../../state';
import { $ } from '../../dom';
import { showActionToasts } from '../toast';
import { closeFriends } from './friends';

/** How often the queue is looked at while it holds any: expiry, and a match ending. */
const TICK_MS = 1000;
let ticker: ReturnType<typeof setInterval> | undefined;

const showingNow = () =>
  invites.showing(performance.now(), { inMatch: game.active, room: net.room });

/** Joins `code` as typing it into "Join a lobby" does (leaving the room we are in, if any). */
function joinByCode(code: string) {
  closeFriends();
  const field = $<HTMLInputElement>('roomCode');
  field.value = code;
  const lobbyStatus = document.getElementById('lobbyJoinStatus');
  if (net.room && lobbyStatus) lobbyStatus.textContent = 'Joining room…';
  $('joinRoom').click();
}

function draw() {
  invites.prune(performance.now());
  showActionToasts(
    showingNow().map((invite: Invite) => ({
      key: String(invite.key),
      text: inviteText(invite),
      actions: [
        {
          label: 'Join',
          colour: 'is-green',
          ariaLabel: `Join the lobby of ${personLabel(invite.from)}`,
          onClick: () => {
            invites.remove(invite.key);
            draw();
            joinByCode(invite.code);
          },
        },
        {
          label: 'Dismiss',
          colour: 'is-beige',
          ariaLabel: `Dismiss the invite from ${personLabel(invite.from)}`,
          onClick: () => {
            invites.remove(invite.key);
            draw();
          },
        },
      ],
    })),
  );
  if (invites.size && !ticker) ticker = setInterval(draw, TICK_MS);
  else if (!invites.size && ticker) {
    clearInterval(ticker);
    ticker = undefined;
  }
}

/** Wires the invite toasts; called by initFriendsMenu (logged-in pages only). */
export function initInviteToasts() {
  initInvites();
  onInvites(draw);
}
