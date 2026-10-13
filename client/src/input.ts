import { names } from '../../shared/constants';
import { $, cv } from './dom';
import { home, pause, start } from './flow';
import { send, sendInput, spellAction } from './net/client';
import { guestCommit, guestFXAt, guestSelect } from './net/prediction';
import { bomb, cast, force, heal, shield, sword } from './sim/combat';
import { commit, load } from './sim/loadout';
import { game, net } from './state';
import { hud, uiLoad } from './ui/hud';

export function aim(ev) {
  let r = cv.getBoundingClientRect();
  if (r.width && r.height) {
    game.mouse.x = ((ev.clientX - r.left) * 800) / r.width;
    game.mouse.y = ((ev.clientY - r.top) * 600) / r.height;
  }
}

export function release() {
  if (!game.holding || !game.active || game.paused || game.ending) return;
  game.holding = false;
  if (!['FIRE', 'WATER', 'LIGHTNING'].includes(game.attack)) {
    let power = game.charge >= 20 ? 1.5 + (game.charge / 90) * 1.5 : 1;
    if (game.p.cast <= 0 && cast(game.p, game.mouse.x, game.mouse.y, power)) game.p.cast = 20;
  }
  game.charge = 0;
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
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) game.keys[k] = true;
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
    game.healArmed = true;
    game.loaded = [];
    $('hint').textContent = 'Healing loaded · Press 2 for Greater Heal or Space for Healing Shield';
    uiLoad();
    return;
  }
  if (k === 'Digit2' && game.healArmed && !ev.repeat) {
    game.healArmed = false;
    game.loaded = [];
    $('hint').textContent = heal(game.p)
      ? 'Greater Healing cast!'
      : 'Greater Healing unavailable or cooling down';
    hud();
    return;
  }
  if (k === 'Space' && !ev.repeat) {
    if (game.healArmed) {
      shield(game.p, 4);
      game.healArmed = false;
      game.loaded = [];
      $('hint').textContent = 'Healing Shield cast · Attack remains ' + game.attack;
    } else if (game.loaded.length) {
      let sh = game.loaded[game.loaded.length - 1];
      shield(game.p, sh);
      game.loaded = [];
      $('hint').textContent = names[sh] + ' Shield cast · Attack remains ' + game.attack;
    } else $('hint').textContent = 'Load an element with 1–4 before pressing Space';
    hud();
    return;
  }
  if (k.startsWith('Digit') && !ev.repeat) {
    load(Number(k.slice(-1)) - 1);
    return;
  }
  if (k === 'KeyF' && !ev.repeat) {
    game.healArmed = false;
    sword(game.p, game.e);
  }
  if (k === 'KeyQ' && !ev.repeat) {
    game.healArmed = false;
    force(game.p, game.e);
  }
  if (k === 'KeyB' && !ev.repeat) {
    commit();
    bomb(game.p, game.mouse.x, game.mouse.y, game.attack);
  }
  game.keys[k] = true;
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
          x: game.mouse.x,
          y: game.mouse.y,
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
      sendInput(ev.button === 0 ? 'down' : 'bomb', { x: game.mouse.x, y: game.mouse.y, castId });
      return;
    }
    if (ev.button === 0) {
      if (game.p.swing > 0 || game.p.silence > 0 || game.p.freeze > 0) return;
      commit();
      game.holding = true;
      game.charge = 0;
      try {
        cv.setPointerCapture(ev.pointerId);
      } catch (err) {}
    } else if (ev.button === 2) {
      commit();
      bomb(game.p, game.mouse.x, game.mouse.y, game.attack);
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
        sendInput('up', { x: game.mouse.x, y: game.mouse.y, castId: spellAction(net.guestSpell) });
      } else release();
    }
  });
  cv.addEventListener('pointercancel', () => {
    game.holding = false;
    net.guestFiring = false;
    game.charge = 0;
  });
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  window.addEventListener('keydown', keydown, true);
  window.addEventListener(
    'keyup',
    (ev) => {
      if (net.mpRole === 'guest') sendInput('key', { key: ev.code, down: false });
      game.keys[ev.code] = false;
    },
    true,
  );
  window.addEventListener('blur', () => {
    if (net.mpRole === 'guest') sendInput('clear');
    game.keys = {};
    game.holding = false;
    game.charge = 0;
  });
  document
    .querySelectorAll<HTMLElement>('[data-mode]')
    .forEach((b) => b.addEventListener('click', () => start(b.dataset.mode)));
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
