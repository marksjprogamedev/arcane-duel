/** Presentation-only menu routing. Existing room and spellbook handlers remain authoritative. */
export function initIllustratedMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  // Approved button PNGs are referenced directly by CSS; no atlas fallback.
  const screen = (name: string) => { menu.dataset.screen = name; };
  document.getElementById('arcaneOpenDuel')?.addEventListener('click', () => screen('duel'));
  document.getElementById('arcaneOpenPractice')?.addEventListener('click', () => screen('practice'));
  document.querySelectorAll('[data-arcane-back]').forEach(b => b.addEventListener('click', () => screen('home')));
  document.getElementById('arcaneOpenSpellbook')?.addEventListener('click', () => document.getElementById('openSpellbook')?.click());
  document.getElementById('arcaneOpenSettings')?.addEventListener('click', () => document.getElementById('openSettings')?.click());
  document.getElementById('arcaneCreateRoom')?.addEventListener('click', () => document.getElementById('createRoom')?.click());
  document.getElementById('arcaneJoinRoom')?.addEventListener('click', () => {
    const code = (document.getElementById('arcaneRoomCode') as HTMLInputElement | null)?.value || '';
    (document.getElementById('roomCode') as HTMLInputElement).value = code;
    document.getElementById('joinRoom')?.click();
  });
  document.getElementById('arcaneRoomCode')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('arcaneJoinRoom')?.click();
  });
  const status = document.getElementById('roomStatus');
  const mirror = document.getElementById('arcaneDuelStatus');
  if (status && mirror) new MutationObserver(() => { mirror.textContent = status.textContent; }).observe(status, { childList:true, characterData:true, subtree:true });
  document.getElementById('arcanePracticeAi')?.addEventListener('click', () => document.querySelector('[data-mode="duel"]')?.click());
  document.getElementById('arcanePracticeStill')?.addEventListener('click', () => document.querySelector('[data-mode="still"]')?.click());
  document.getElementById('arcanePracticeMoving')?.addEventListener('click', () => document.querySelector('[data-mode="moving"]')?.click());
}
