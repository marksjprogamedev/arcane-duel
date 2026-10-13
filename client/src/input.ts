import { names } from '../../shared/constants';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { home, pause, start } from './flow';
import { commit, load } from './loadout';
import { send, sendInput, spellAction } from './net/client';
import { guestCommit, guestFXAt, guestSelect } from './net/prediction';
import { bomb, cast, force, heal, shield, sword } from './sim/combat';
import { game, localInput, net } from './state';
import { hud, uiLoad } from './ui/hud';

export function aim(ev) {
  let r = cv.getBoundingClientRect();
  if (r.width && r.height) {
    localInput().mouse.x = ((ev.clientX - r.left) * 800) / r.width;
    localInput().mouse.y = ((ev.clientY - r.top) * 600) / r.height;
  }
}

export function release() {
  if (!localInput().holding || !game.active || game.paused || game.ending) return;
  localInput().holding = false;
  if (!['FIRE', 'WATER', 'LIGHTNING'].includes(localInput().attack)) {
    let power = localInput().charge >= 20 ? 1.5 + (localInput().charge / 90) * 1.5 : 1;
    if (game.p.cast <= 0 && cast(game.p, localInput().mouse.x, localInput().mouse.y, power))
      game.p.cast = 20;
  }
  localInput().charge = 0;
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
  if (net.mpRole === 'guest') {
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
  if (k === 'KeyE' && !ev.repeat) {
    localInput().healArmed = true;
    localInput().loaded = [];
    $('hint').textContent = 'Healing loaded · Press 2 for Greater Heal or Space for Healing Shield';
    uiLoad();
    return;
  }
  if (k === 'Digit2' && localInput().healArmed && !ev.repeat) {
    localInput().healArmed = false;
    localInput().loaded = [];
    $('hint').textContent = heal(game.p)
      ? 'Greater Healing cast!'
      : 'Greater Healing unavailable or cooling down';
    hud();
    return;
  }
  if (k === 'Space' && !ev.repeat) {
    if (localInput().healArmed) {
      shield(game.p, 4);
      localInput().healArmed = false;
      localInput().loaded = [];
      $('hint').textContent = 'Healing Shield cast · Attack remains ' + localInput().attack;
    } else if (localInput().loaded.length) {
      let sh = localInput().loaded[localInput().loaded.length - 1];
      shield(game.p, sh);
      localInput().loaded = [];
      $('hint').textContent = names[sh] + ' Shield cast · Attack remains ' + localInput().attack;
    } else $('hint').textContent = 'Load an element with 1–4 before pressing Space';
    hud();
    return;
  }
  if (k.startsWith('Digit') && !ev.repeat) {
    load(Number(k.slice(-1)) - 1);
    return;
  }
  if (k === 'KeyF' && !ev.repeat) {
    localInput().healArmed = false;
    sword(game.p, game.e);
  }
  if (k === 'KeyQ' && !ev.repeat) {
    localInput().healArmed = false;
    force(game.p, game.e);
  }
  if (k === 'KeyB' && !ev.repeat) {
    commit();
    bomb(game.p, localInput().mouse.x, localInput().mouse.y, localInput().attack);
  }
  localInput().keys[k] = true;
}

export function initInput() {
  cv.addEventListener('pointermove', (ev) => {
    if (net.mpRole === 'guest') {
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
    if (net.mpRole === 'guest') {
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
    if (ev.button === 0) {
      if (game.p.swing > 0 || game.p.silence > 0 || game.p.freeze > 0) return;
      commit();
      localInput().holding = true;
      localInput().charge = 0;
      try {
        cv.setPointerCapture(ev.pointerId);
      } catch (err) {}
    } else if (ev.button === 2) {
      commit();
      bomb(game.p, localInput().mouse.x, localInput().mouse.y, localInput().attack);
    }
  });
  cv.addEventListener('pointerup', (ev) => {
    if (ev.button === 0) {
      aim(ev);
      if (net.mpRole === 'guest') {
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
      } else release();
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
      if (net.mpRole === 'guest') sendInput('key', { key: ev.code, down: false });
      localInput().keys[ev.code] = false;
    },
    true,
  );
  window.addEventListener('blur', () => {
    if (net.mpRole === 'guest') sendInput('clear');
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
    if (net.mpRole) {
      send({ type: 'rematch_ready' });
      $('detail').textContent = 'Waiting for the other player to accept the rematch…';
      $<HTMLButtonElement>('rematch').disabled = true;
    } else start(game.mode);
  });
}
