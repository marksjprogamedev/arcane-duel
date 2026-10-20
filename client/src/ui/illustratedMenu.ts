/** Presentation-only menu routing. Existing room and spellbook handlers remain authoritative. */
export function initIllustratedMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  // Approved button PNGs are referenced directly by CSS; no atlas fallback.
  const screen = (name: string) => { menu.dataset.screen = name; };
  const lobby = document.getElementById('lobby');
  const lobbyEntry = document.getElementById('lobbyEntry');
  const codeInput = document.getElementById('lobbyEntryCode') as HTMLInputElement | null;
  const entryStatus = document.getElementById('lobbyEntryStatus');
  document.getElementById('arcaneOpenDuel')?.addEventListener('click', () => {
    if (!lobby) return;
    menu.style.display = 'none';
    lobby.classList.add('lobby-awaiting-room');
    lobby.style.display = 'flex';
    if (entryStatus) entryStatus.textContent = '';
  });
  document.getElementById('lobbyEntryBack')?.addEventListener('click', () => {
    if (!lobby) return;
    lobby.style.display = 'none';
    lobby.classList.remove('lobby-awaiting-room');
    menu.style.display = 'flex';
    screen('home');
  });
  document.getElementById('lobbyEntryCreate')?.addEventListener('click', () => {
    if (entryStatus) entryStatus.textContent = 'Connecting…';
    document.getElementById('createRoom')?.click();
  });
  const joinLobby = () => {
    const code = codeInput?.value.toUpperCase().trim() ?? '';
    if (!/^[A-Z]{6}$/.test(code)) {
      if (entryStatus) entryStatus.textContent = 'Enter a six-letter room code';
      return;
    }
    const hiddenCode = document.getElementById('roomCode') as HTMLInputElement | null;
    if (!hiddenCode) return;
    hiddenCode.value = code;
    if (entryStatus) entryStatus.textContent = 'Connecting…';
    document.getElementById('joinRoom')?.click();
  };
  document.getElementById('lobbyEntryJoin')?.addEventListener('click', joinLobby);
  codeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') joinLobby(); });
  const status = document.getElementById('roomStatus');
  if (status && entryStatus) new MutationObserver(() => {
    if (lobby?.classList.contains('lobby-awaiting-room')) entryStatus.textContent = status.textContent;
  }).observe(status, { childList:true, characterData:true, subtree:true });
  document.getElementById('arcaneOpenPractice')?.addEventListener('click', () => screen('practice'));
  document.querySelectorAll('[data-arcane-back]').forEach(b => b.addEventListener('click', () => screen('home')));
  document.getElementById('arcaneOpenSpellbook')?.addEventListener('click', () => document.getElementById('openSpellbook')?.click());
  document.getElementById('arcaneOpenSettings')?.addEventListener('click', () => document.getElementById('openSettings')?.click());
  document.getElementById('arcanePracticeAi')?.addEventListener('click', () => document.querySelector('[data-mode="duel"]')?.click());
  document.getElementById('arcanePracticeStill')?.addEventListener('click', () => document.querySelector('[data-mode="still"]')?.click());
  document.getElementById('arcanePracticeMoving')?.addEventListener('click', () => document.querySelector('[data-mode="moving"]')?.click());
}
