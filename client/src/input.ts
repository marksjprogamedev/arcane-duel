import { COOLDOWN_TICKS, PART } from '../../shared/constants';
import { isContinuousSpell } from '../../shared/charge';
import { applyInput, MOVE_KEYS } from '../../shared/sim/input';
import type { GameMode, SpellName } from '../../shared/types';
import { $, cv } from './dom';
import { home, openGameSettings, pause, releaseHeldInputs, sendMoveKeysNow, start } from './flow';
import { send, sendInput, spellAction } from './net/client';
import { guestCommit, guestFXAt, guestRelease, guestSelect } from './net/prediction';
import { game, localInput, me, net } from './state';
import { hud, showElementTiles, stepsBackToElements, uiLoad } from './ui/hud';
import { followMouse, setScreenMouse, VIEW_H, VIEW_W } from './render/camera';

export function aim(ev) {
  let r = cv.getBoundingClientRect();
  if (r.width && r.height) {
    setScreenMouse(
      ((ev.clientX - r.left) * VIEW_W) / r.width,
      ((ev.clientY - r.top) * VIEW_H) / r.height,
    );
    followMouse();
  }
}

export const controls = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyQ',
  'KeyE',
  'KeyB',
  'KeyT',
  'KeyP',
  'Escape',
  'Space',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
]);

export function keydown(ev) {
  if (!game.active) return;
  let k = ev.code;
  // the settings page has the keyboard (Esc closes it there)
  if (game.settingsOpen) return;
  // online there is no pause: Esc, or P (a browser keeps Esc to leave fullscreen), opens settings over the live match
  if (net.online && (k === 'Escape' || k === 'KeyP')) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!ev.repeat) openGameSettings();
    return;
  }
  if (net.online) {
    if (controls.has(k)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (net.countdown > 0) return;
    // frozen: no loading, shields or spells (the server ignores them too); movement keys still travel
    if (!MOVE_KEYS.includes(k) && (me()?.freeze ?? 0) > 0) return;
    if (!ev.repeat) {
      guestSelect(k);
      const spellKey =
        k === 'KeyF' ||
        k === 'KeyQ' ||
        k === 'KeyB' ||
        k === 'KeyT' ||
        k === 'Space' ||
        (k === 'Digit2' && net.guestHeal);
      // movement keys travel in the per-tick move commands (see sendMoveCommand)
      if (!MOVE_KEYS.includes(k))
        sendInput('key', { key: k, down: true, ...(spellKey ? { castId: spellAction(k) } : {}) });
    }
    if (MOVE_KEYS.includes(k) && !localInput().keys[k]) {
      localInput().keys[k] = true;
      sendMoveKeysNow();
    }
    return;
  }
  if (controls.has(k)) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if ((k === 'KeyP' || k === 'Escape') && !ev.repeat) {
    pause();
    return;
  }
  if (game.paused || game.ending) return;
  if (ev.repeat) return;
  applyInput(game, 0, { kind: 'key', code: k, down: true });
  uiLoad();
  hud();
}

/** Clicking a spell loads its elements through the same path as number keys. */
function selectActionBarSpell(spell: SpellName) {
  if (
    !game.active ||
    game.paused ||
    game.settingsOpen ||
    game.ending ||
    (net.online && net.countdown > 0)
  )
    return;
  if ((me()?.freeze ?? 0) > 0) return;
  const parts = PART[spell];
  // Two presses of the first element guarantee a fresh queue, even if a shield was armed.
  const keys = [parts[0], parts[0], ...parts.slice(1)].map((part) => 'Digit' + (part + 1));
  for (const key of keys) {
    if (net.online) {
      guestSelect(key);
      sendInput('key', { key, down: true });
    } else {
      applyInput(game, 0, { kind: 'key', code: key, down: true });
    }
  }
  uiLoad();
  hud();
  cv.focus();
}

export function initInput() {
  $('legendgrid').addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const tile = target.closest<HTMLElement>('.legendtile');
    if (!tile?.dataset.spell) return;
    const spell = tile.dataset.spell as SpellName;
    // clicking the element the combinations are shown for goes back to the four elements
    const stepBack = stepsBackToElements(spell);
    selectActionBarSpell(spell);
    if (stepBack) showElementTiles();
  });
  // online, the aim position travels in the per-tick move commands
  cv.addEventListener('pointermove', aim);
  cv.addEventListener('pointerdown', (ev) => {
    if (!game.active || game.paused || game.settingsOpen || game.ending || net.countdown > 0)
      return;
    if (ev.button > 2) return;
    aim(ev);
    ev.preventDefault();
    cv.focus();
    if (ev.button === 0) {
      // keep the release coming to us even when the pointer is let go outside the canvas
      try {
        cv.setPointerCapture(ev.pointerId);
      } catch (err) {}
    }
    if (net.online) {
      guestCommit();
      if (ev.button === 0) localInput().holding = true;
      net.guestPressAt = performance.now();
      if (ev.button === 0 && isContinuousSpell(net.guestSpell)) {
        net.guestFiring = true;
        net.guestBeamAim = null;
        guestFXAt(net.guestSpell);
        net.guestFireClock = COOLDOWN_TICKS[net.guestSpell];
      }
      if (ev.button === 1) guestFXAt('TRAP');
      const kind = ev.button === 2 ? 'BOMB' : ev.button === 1 ? 'TRAP' : net.guestSpell;
      const castId = spellAction(kind);
      sendInput(ev.button === 0 ? 'down' : ev.button === 2 ? 'bomb' : 'trap', {
        x: localInput().mouse.x,
        y: localInput().mouse.y,
        castId,
      });
      return;
    }
    const { x, y } = game.input[0].mouse;
    if (ev.button === 0) {
      applyInput(game, 0, { kind: 'pointerdown', x, y });
    } else if (ev.button === 2) {
      applyInput(game, 0, { kind: 'bomb', x, y });
    } else if (ev.button === 1) {
      applyInput(game, 0, { kind: 'trap', x, y });
    }
    uiLoad();
    hud();
  });
  // on the window, as a last resort for a release the canvas never hears about
  window.addEventListener('pointerup', (ev) => {
    if (ev.button === 0 && game.active) {
      aim(ev);
      if (net.online && net.countdown > 0) return;
      if (net.online) {
        guestRelease();
        sendInput('up', {
          x: localInput().mouse.x,
          y: localInput().mouse.y,
          castId: spellAction(net.guestSpell),
        });
      } else if (game.active && !game.paused) {
        applyInput(game, 0, {
          kind: 'pointerup',
          x: game.input[0].mouse.x,
          y: game.input[0].mouse.y,
        });
      }
    }
  });
  cv.addEventListener('pointercancel', () => {
    localInput().holding = false;
    net.guestFiring = false;
    localInput().charge = 0;
  });
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  // middle click would otherwise start the browser's auto-scroll
  cv.addEventListener('mousedown', (ev) => ev.button === 1 && ev.preventDefault());
  cv.addEventListener('auxclick', (ev) => ev.preventDefault());
  window.addEventListener('keydown', keydown, true);
  window.addEventListener(
    'keyup',
    (ev) => {
      // online, releasing a key only matters for movement, which the move commands carry
      if (net.online) {
        const wasHeld = localInput().keys[ev.code];
        localInput().keys[ev.code] = false;
        if (wasHeld && MOVE_KEYS.includes(ev.code)) sendMoveKeysNow();
      } else applyInput(game, 0, { kind: 'key', code: ev.code, down: false });
    },
    true,
  );
  const releaseEverything = releaseHeldInputs;
  window.addEventListener('blur', releaseEverything);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseEverything();
  });
  document
    .querySelectorAll<HTMLElement>('[data-mode]')
    .forEach((b) => b.addEventListener('click', () => start(b.dataset.mode as GameMode)));
  $('resume').addEventListener('click', pause);
  $('pauseSettings').addEventListener('click', openGameSettings);
  document.querySelectorAll('.home').forEach((b) => b.addEventListener('click', home));
  $('rematch').addEventListener('click', () => {
    if (net.online) {
      send({ type: 'rematch_ready' });
      $('detail').textContent = 'Waiting for the other player to accept the rematch…';
      $<HTMLButtonElement>('rematch').disabled = true;
    } else start(game.mode);
  });
}
