/** Presentation-only menu routing. Existing room and spellbook handlers remain authoritative. */
export function initIllustratedMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  // Approved button PNGs are referenced directly by CSS; no atlas fallback.
  const screen = (name: string) => { menu.dataset.screen = name; };
  const lobby = document.getElementById('lobby');
  const codeInput = document.getElementById('lobbyJoinCode') as HTMLInputElement | null;
  const joinStatus = document.getElementById('lobbyJoinStatus');
  document.getElementById('arcaneOpenDuel')?.addEventListener('click', () => {
    if (!lobby) return;
    menu.style.display = 'none';
    lobby.style.display = 'flex';
    // Enter the actual lobby immediately; create the default room automatically.
    document.getElementById('createRoom')?.click();
  });
  document.getElementById('lobbyCreateAction')?.addEventListener('click', () => {
    if (joinStatus) joinStatus.textContent = 'Creating room…';
    document.getElementById('createRoom')?.click();
  });
  const joinLobby = () => {
    const code = codeInput?.value.toUpperCase().trim() ?? '';
    if (!/^[A-Z]{6}$/.test(code)) {
      if (joinStatus) joinStatus.textContent = 'Enter a six-letter room code';
      return;
    }
    const roomCode = document.getElementById('roomCode') as HTMLInputElement | null;
    if (!roomCode) return;
    roomCode.value = code;
    if (joinStatus) joinStatus.textContent = 'Joining room…';
    document.getElementById('joinRoom')?.click();
  };
  document.getElementById('lobbyJoinAction')?.addEventListener('click', joinLobby);
  codeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') joinLobby(); });
  const status = document.getElementById('roomStatus');
  if (status && joinStatus) new MutationObserver(() => {
    if (status.textContent) joinStatus.textContent = status.textContent;
  }).observe(status, { childList:true, characterData:true, subtree:true });
  document.getElementById('arcaneOpenPractice')?.addEventListener('click', () => screen('practice'));
  document.querySelectorAll('[data-arcane-back]').forEach(b => b.addEventListener('click', () => screen('home')));
  document.getElementById('arcaneOpenSpellbook')?.addEventListener('click', () => document.getElementById('openSpellbook')?.click());
  document.getElementById('arcaneOpenSettings')?.addEventListener('click', () => document.getElementById('openSettings')?.click());
  document.getElementById('arcanePracticeAi')?.addEventListener('click', () => document.querySelector('[data-mode="duel"]')?.click());
  document.getElementById('arcanePracticeStill')?.addEventListener('click', () => document.querySelector('[data-mode="still"]')?.click());
  document.getElementById('arcanePracticeMoving')?.addEventListener('click', () => document.querySelector('[data-mode="moving"]')?.click());
}
