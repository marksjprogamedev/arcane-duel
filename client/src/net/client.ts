import { names, styles } from '../../../shared/constants';
import { clamp } from '../../../shared/math';
import type { ClientMessage, ServerMessage } from '../../../shared/protocol';
import { $ } from '../dom';
import { start } from '../flow';
import { bomb, burst, cast, force, heal, shield, sword } from '../sim/combat';
import { comb } from '../sim/wizard';
import { game, net } from '../state';

export function send(v: ClientMessage) {
  if (net.socket && net.socket.readyState === 1) net.socket.send(JSON.stringify(v));
}

export function spellAction(kind) {
  const id = ++net.spellActionSequence;
  net.spellActions.set(id, { kind, at: performance.now() });
  if (net.spellActions.size > 100) net.spellActions.delete(net.spellActions.keys().next().value);
  return id;
}

export function interpolatedOpponent(now) {
  if (!net.opponentSamples.length) return null;
  const target = now - Math.max(65, Math.min(135, net.netRTT * 0.5 + 45));
  while (net.opponentSamples.length > 2 && net.opponentSamples[1].at <= target)
    net.opponentSamples.shift();
  const a = net.opponentSamples[0],
    b = net.opponentSamples[1];
  if (!b) return { x: a.x, y: a.y };
  const f = clamp((target - a.at) / Math.max(1, b.at - a.at), 0, 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function sendInput(action, extras = {}) {
  const id = ++net.inputSequence;
  net.inputPending.set(id, performance.now());
  if (net.inputPending.size > 120) net.inputPending.delete(net.inputPending.keys().next().value);
  send({ type: 'input', action, inputId: id, roundId: net.roundId, ...extras });
  return id;
}

export function ackInput(m, accepted = true) {
  if (Number.isSafeInteger(m.inputId))
    send({ type: 'input_ack', inputId: m.inputId, accepted: !!accepted });
}

export function netState() {
  let own = (o) => (o === game.p ? 'p' : 'e'),
    plain = (w) => ({ ...w, style: styles.indexOf(w.style) });
  return {
    roundId: net.roundId,
    seq: ++net.netSnapshotSeq,
    p: plain(game.p),
    e: plain(game.e),
    shots: game.shots.map((s) => ({ ...s, owner: own(s.owner), hitTargets: undefined })),
    bombs: game.bombs.map((b) => ({ ...b, owner: own(b.owner) })),
    zones: game.zones.map((z) => ({ ...z, owner: own(z.owner) })),
    particles: game.particles.slice(-35),
    labels: game.labels.slice(-16),
    arcs: game.arcs.slice(-10),
    waves: game.waves.slice(-14),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}

export function applyState(s) {
  if (!s || !s.p || !s.e || s.roundId !== net.roundId) return;
  if (Number.isSafeInteger(s.seq)) {
    if (s.seq <= net.receivedSnapshotSeq) return;
    net.receivedSnapshotSeq = s.seq;
  }
  const now = performance.now();
  net.opponentSamples.push({ x: s.p.x, y: s.p.y, at: now });
  if (net.opponentSamples.length > 20) net.opponentSamples.shift();
  // Compare consecutive authoritative positions to detect true discontinuities.
  // Ordinary motion should never reset the guest's locally predicted position.
  if (net.visualE) {
    const delta = net.guestLastAuth
      ? Math.hypot(s.e.x - net.guestLastAuth.x, s.e.y - net.guestLastAuth.y)
      : 0;
    if (delta > 115) {
      net.guestTeleport = true;
    } else {
      // Corrections are deliberately capped and applied only once per snapshot.
      // Ignore the small normal network lead while the player is moving.
      const moving = game.keys.KeyW || game.keys.KeyA || game.keys.KeyS || game.keys.KeyD;
      const dx = s.e.x - net.visualE.x,
        dy = s.e.y - net.visualE.y;
      const error = Math.hypot(dx, dy);
      if (error > 170) net.guestTeleport = true;
      else if (error > (moving ? Math.max(22, net.netRTT * 0.24) : 5)) {
        const factor = moving ? 0.22 : 0.65;
        net.guestCorrection = {
          x: Math.max(-28, Math.min(28, dx * factor)),
          y: Math.max(-28, Math.min(28, dy * factor)),
        };
      }
    }
  }
  // Snapshot cooldowns are authoritative. Local cooldowns prevent phantom
  // casts between snapshots, while the host can extend a cooldown if needed.
  for (const [spell, field] of Object.entries({
    EARTH: 'earthCD',
    MAGMA: 'magmaCD',
    FIRE: 'fireCD',
    WATER: 'waterCD',
    LIGHTNING: 'lightCD',
    SWORD: 'swordCD',
    FORCE: 'forceCD',
    BOMB: 'bombCD',
    HEAL: 'healCD',
  })) {
    const remote = Number(s.e[field]) || 0;
    if (remote > 0 && !['FIRE', 'WATER', 'LIGHTNING'].includes(spell))
      net.guestCooldowns[spell] = Math.max(net.guestCooldowns[spell] || 0, remote);
  }
  net.guestLastAuth = { x: s.e.x, y: s.e.y };
  net.lastNetAt = performance.now();
  let unpack = (w) => ({ ...w, style: styles[w.style] || styles[0] });
  game.p = unpack(s.p);
  game.e = unpack(s.e);
  game.shots = s.shots.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.bombs = s.bombs.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.zones = s.zones.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.particles = s.particles;
  game.labels = s.labels;
  game.arcs = s.arcs;
  game.waves = s.waves;
  game.t = s.t;
  if (!net.guestFinished) game.ending = !!s.ending;
  game.death = s.death ? { ...s.death, w: s.death.w === 'p' ? game.p : game.e } : game.death;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.e.hp)));
  $('enemy').textContent = 'HOST ' + Math.ceil(Math.max(0, game.p.hp)) + '/200';
  $('styles').textContent = '🟢 Host ' + game.p.style.name + ' · 🔴 You ' + game.e.style.name;
  $('shield').textContent = game.e.shield
    ? game.e.shield.type === 4
      ? 'HEALING'
      : names[game.e.shield.type]
    : 'NONE';
  for (let k of ['earth', 'sword', 'force'])
    $(k).textContent = game.e[k + 'CD'] > 0 ? (game.e[k + 'CD'] / 60).toFixed(1) + 's' : 'READY';
  for (let a of [
    { key: 'heal', v: game.e.healCD, max: 600 },
    { key: 'magma', v: game.e.magmaCD, max: 195 },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}

export function remoteInput(m) {
  if (net.mpRole !== 'host' || !game.e || game.ending || m.roundId !== net.roundId) {
    ackInput(m, false);
    if (Number.isSafeInteger(m.castId))
      send({ type: 'cast_ack', castId: m.castId, roundId: net.roundId, accepted: false });
    return;
  }
  try {
    let action = m.action,
      x = clamp(Number(m.x) || 0, 0, 800),
      y = clamp(Number(m.y) || 0, 0, 600);
    if (action === 'aim') {
      net.remoteMouse = { x, y };
      return;
    }
    if (action === 'clear') {
      net.remoteKeys = {};
      net.remoteHolding = false;
      return;
    }
    if (action === 'down') {
      net.remoteMouse = { x, y };
      if (net.remoteLoaded.length) {
        net.remoteAttack = comb(net.remoteLoaded);
        net.remoteLoaded = [];
      }
      net.remoteHolding = true;
      net.remoteCharge = 0;
      return;
    }
    if (action === 'up') {
      net.remoteMouse = { x, y };
      if (net.remoteHolding && !['FIRE', 'WATER', 'LIGHTNING'].includes(net.remoteAttack)) {
        let power = net.remoteCharge >= 20 ? 1.5 + (net.remoteCharge / 90) * 1.5 : 1;
        if (game.e.cast <= 0 && cast(game.e, x, y, power, net.remoteAttack)) game.e.cast = 20;
      }
      net.remoteHolding = false;
      net.remoteCharge = 0;
      return;
    }
    if (action === 'bomb') {
      net.remoteMouse = { x, y };
      if (net.remoteLoaded.length) {
        net.remoteAttack = comb(net.remoteLoaded);
        net.remoteLoaded = [];
      }
      bomb(game.e, x, y, net.remoteAttack);
      return;
    }
    if (action !== 'key') return;
    let k = m.key;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) {
      net.remoteKeys[k] = !!m.down;
      return;
    }
    if (!m.down) return;
    if (k === 'KeyE') {
      net.remoteHealArmed = true;
      net.remoteLoaded = [];
      return;
    }
    if (k === 'Digit2' && net.remoteHealArmed) {
      net.remoteHealArmed = false;
      heal(game.e);
      return;
    }
    if (k === 'Space') {
      if (net.remoteHealArmed) {
        shield(game.e, 4);
        net.remoteHealArmed = false;
      } else if (net.remoteLoaded.length) {
        shield(game.e, net.remoteLoaded.at(-1));
        net.remoteLoaded = [];
      }
      return;
    }
    if (/^Digit[1-4]$/.test(k)) {
      let i = Number(k.slice(-1)) - 1;
      net.remoteHealArmed = false;
      net.remoteLoaded =
        net.remoteLoaded.length >= 2 || net.remoteLoaded.includes(i)
          ? [i]
          : [...net.remoteLoaded, i];
      return;
    }
    if (k === 'KeyF') sword(game.e, game.p);
    if (k === 'KeyQ') force(game.e, game.p);
    if (k === 'KeyB') bomb(game.e, net.remoteMouse.x, net.remoteMouse.y, net.remoteAttack);
  } finally {
    ackInput(m, true);
    if (Number.isSafeInteger(m.castId))
      send({ type: 'cast_ack', castId: m.castId, roundId: net.roundId, accepted: true });
  }
}

export function connect() {
  if (net.socket && net.socket.readyState === 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let url =
      location.protocol === 'file:'
        ? 'ws://localhost:3000/ws'
        : proto + '://' + location.host + '/ws';
    net.socket = new WebSocket(url);
    net.socket.onopen = () => {
      resolve();
      setInterval(() => {
        if (net.socket && net.socket.readyState === 1) send({ type: 'ping', stamp: Date.now() });
      }, 2000);
    };
    net.socket.onerror = () =>
      reject(
        new Error(
          'Cannot connect to multiplayer server. Start it using npm start, then open http://localhost:3000',
        ),
      );
    net.socket.onclose = () => {
      if (net.mpRole) {
        game.active = false;
        net.mpRole = null;
        $('menu').style.display = 'flex';
        $('roomStatus').textContent = 'Disconnected from server.';
      }
    };
    net.socket.onmessage = (ev) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === 'pong') {
        net.netRTT = net.netRTT * 0.75 + Math.max(1, Date.now() - m.stamp) * 0.25;
        $('netdiag').textContent =
          'MULTIPLAYER · ' +
          Math.round(net.netRTT) +
          ' ms RTT · input ' +
          (net.lastAckMs || '—') +
          ' ms · spell ' +
          (net.spellAckMs || '—') +
          ' ms · ' +
          (net.mpRole || 'not connected');
        return;
      }
      if (m.type === 'created') {
        net.room = m.code;
        net.mpRole = 'host';
        $('roomStatus').textContent =
          'Room ' + net.room + ' created. Share the code and wait for your opponent…';
        $<HTMLInputElement>('roomCode').value = net.room;
      }
      if (m.type === 'joined') {
        net.room = m.code;
        net.mpRole = 'guest';
        $('roomStatus').textContent = 'Joined ' + net.room + '. Waiting for host…';
      }
      if (m.type === 'start') {
        net.roundId = m.roundId || 1;
        if (m.role === 'host') {
          net.mpRole = 'host';
          start('online');
          net.remoteKeys = {};
          net.remoteAttack = 'FIRE';
          net.remoteLoaded = [];
          net.remoteHolding = false;
          send({ type: 'state', state: netState() });
        } else {
          net.mpRole = 'guest';
          start('online');
          $('hint').textContent = 'Online duel · You control the RED wizard';
          $('hp').textContent = '200';
          $('spell').textContent = 'ONLINE';
        }
      }
      if (m.type === 'rematch_start') {
        net.roundId = m.roundId;
        net.mpRole = m.role;
        net.guestFinished = false;
        start('online');
        if (net.mpRole === 'host') {
          net.remoteKeys = {};
          net.remoteAttack = 'FIRE';
          net.remoteLoaded = [];
          net.remoteHolding = false;
          send({ type: 'state', state: netState() });
        } else $('hint').textContent = 'Online rematch · You control the RED wizard';
      }
      if (m.type === 'input_ack' && net.mpRole === 'guest') {
        const at = net.inputPending.get(m.inputId);
        if (at !== undefined) {
          net.lastAckMs = Math.round(performance.now() - at);
          net.inputPending.delete(m.inputId);
        }
      }
      if (m.type === 'cast_ack' && net.mpRole === 'guest' && m.roundId === net.roundId) {
        const a = net.spellActions.get(m.castId);
        if (a) {
          net.spellAckMs = Math.round(performance.now() - a.at);
          net.spellActions.delete(m.castId);
        }
      }
      if (m.type === 'input') remoteInput(m);
      if (m.type === 'state' && net.mpRole === 'guest' && game.active) applyState(m.state);
      if (
        (m.type === 'death_start' || m.type === 'finished') &&
        net.mpRole === 'guest' &&
        !net.guestFinished
      ) {
        game.ending = true;
        game.winner = !m.winner;
        net.guestFinished = true;
        game.endClock = 0;
        {
          // `finished` carries no loser; fall back to the winner flag.
          const loser = 'loser' in m ? m.loser : null;
          const fallen = loser === 'p' || (loser == null && !m.winner) ? game.p : game.e;
          game.death = { w: fallen, x: fallen.x, y: fallen.y, age: 0, mortal: false };
          burst(fallen.x, fallen.y - 20, fallen === game.p ? '#a78bfa' : '#fb7185', 65, 9);
        }
        // Keep the render loop alive for the same death animation used by the host.
      }
      if (m.type === 'error') $('roomStatus').textContent = m.message;
      if (m.type === 'peer_left') {
        game.active = false;
        net.mpRole = null;
        $('menu').style.display = 'flex';
        $('roomStatus').textContent = 'Opponent disconnected. Create a new room to play again.';
      }
    };
  });
}

export function initLobby() {
  $('createRoom').onclick = async () => {
    try {
      await connect();
      send({ type: 'create' });
    } catch (e) {
      $('roomStatus').textContent = e.message;
    }
  };
  $('joinRoom').onclick = async () => {
    let code = $<HTMLInputElement>('roomCode').value.toUpperCase().trim();
    if (!/^[A-Z]{6}$/.test(code)) {
      $('roomStatus').textContent = 'Enter a six-letter room code';
      return;
    }
    try {
      await connect();
      send({ type: 'join', code });
    } catch (e) {
      $('roomStatus').textContent = e.message;
    }
  };
}
