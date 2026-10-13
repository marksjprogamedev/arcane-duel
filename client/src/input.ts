import { applyInput } from '../../shared/sim/input';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { home, pause, start } from './flow';
import { send, sendInput, spellAction } from './net/client';
import { guestCommit, guestFXAt, guestSelect } from './net/prediction';
import { game, localInput, net } from './state';
import { hud, uiLoad } from './ui/hud';

export function aim(ev) {
  let r = cv.getBoundingClientRect();
  if (r.width && r.height) {
    localInput().mouse.x = ((ev.clientX - r.left) * 800) / r.width;
    localInput().mouse.y = ((ev.clientY - r.top) * 600) / r.height;
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
  if (net.online) {
    if (controls.has(k)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (!ev.repeat) {
      guestSelect(k);
      const spellKey =
        k === 'KeyF' ||
        k === 'KeyQ' ||
        k === 'KeyB' ||
        k === 'Space' ||
        (k === 'Digit2' && net.guestHeal);
      sendInput('key', { key: k, down: true, ...(spellKey ? { castId: spellAction(k) } : {}) });
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) localInput().keys[k] = true;
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
  applyInput(game, 'p', { kind: 'key', code: k, down: true });
  uiLoad();
  hud();
}

export function initInput() {
  cv.addEventListener('pointermove', (ev) => {
    if (net.online) {
      aim(ev);
      let now = performance.now();
      if (now - net.lastAimSent >= 33) {
        net.lastAimSent = now;
        send({
          type: 'input',
          action: 'aim',
          roundId: net.roundId,
          x: localInput().mouse.x,
          y: localInput().mouse.y,
        });
      }
    }
  });
  cv.addEventListener('pointermove', aim);
  cv.addEventListener('pointerdown', (ev) => {
    if (!game.active || game.paused || game.ending) return;
    aim(ev);
    ev.preventDefault();
    cv.focus();
    if (net.online) {
      guestCommit();
      net.guestPressAt = performance.now();
      if (ev.button === 0 && ['FIRE', 'WATER', 'LIGHTNING'].includes(net.guestSpell)) {
        net.guestFiring = true;
        guestFXAt(net.guestSpell);
        net.guestFireClock =
          net.guestSpell === 'LIGHTNING' ? 19 : net.guestSpell === 'WATER' ? 6 : 5;
      }
      if (ev.button === 2) guestFXAt('BOMB');
      const kind = ev.button === 2 ? 'BOMB' : net.guestSpell;
      const castId = spellAction(kind);
      sendInput(ev.button === 0 ? 'down' : 'bomb', {
        x: localInput().mouse.x,
        y: localInput().mouse.y,
        castId,
      });
      return;
    }
    const { x, y } = game.input.p.mouse;
    if (ev.button === 0) {
      applyInput(game, 'p', { kind: 'pointerdown', x, y });
      if (game.input.p.holding) {
        try {
          cv.setPointerCapture(ev.pointerId);
        } catch (err) {}
      }
    } else if (ev.button === 2) {
      applyInput(game, 'p', { kind: 'bomb', x, y });
    }
    uiLoad();
    hud();
  });
  cv.addEventListener('pointerup', (ev) => {
    if (ev.button === 0) {
      aim(ev);
      if (net.online) {
        net.guestFiring = false;
        if (!['FIRE', 'WATER', 'LIGHTNING'].includes(net.guestSpell)) {
          if (guestFXAt(net.guestSpell))
            net.guestCooldowns[net.guestSpell] = Math.max(
              net.guestCooldowns[net.guestSpell] || 0,
              net.guestSpell === 'EARTH' ? 39 : net.guestSpell === 'MAGMA' ? 195 : 20,
            );
        }
        sendInput('up', {
          x: localInput().mouse.x,
          y: localInput().mouse.y,
          castId: spellAction(net.guestSpell),
        });
      } else if (game.active && !game.paused) {
        applyInput(game, 'p', {
          kind: 'pointerup',
          x: game.input.p.mouse.x,
          y: game.input.p.mouse.y,
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
  window.addEventListener('keydown', keydown, true);
  window.addEventListener(
    'keyup',
    (ev) => {
      if (net.online) sendInput('key', { key: ev.code, down: false });
      if (net.online) localInput().keys[ev.code] = false;
      else applyInput(game, 'p', { kind: 'key', code: ev.code, down: false });
    },
    true,
  );
  window.addEventListener('blur', () => {
    if (net.online) sendInput('clear');
    localInput().keys = {};
    localInput().holding = false;
    localInput().charge = 0;
  });
  document
    .querySelectorAll<HTMLElement>('[data-mode]')
    .forEach((b) => b.addEventListener('click', () => start(b.dataset.mode as GameMode)));
  $('resume').addEventListener('click', pause);
  document.querySelectorAll('.home').forEach((b) => b.addEventListener('click', home));
  $('rematch').addEventListener('click', () => {
    if (net.online) {
      send({ type: 'rematch_ready' });
      $('detail').textContent = 'Waiting for the other player to accept the rematch…';
      $<HTMLButtonElement>('rematch').disabled = true;
    } else start(game.mode);
  });
}
