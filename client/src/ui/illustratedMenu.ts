import { onSettings, sfxGain } from '../settings';

const effectsOut = new WeakMap<AudioContext, GainNode>();
/** One gain node per audio context that every interface sound goes through, so the effects volume setting reaches them all. */
function effectsBus(ctx: AudioContext): GainNode {
  let bus = effectsOut.get(ctx);
  if (!bus) {
    bus = ctx.createGain();
    bus.connect(ctx.destination);
    const node = bus;
    onSettings((s) => node.gain.setTargetAtTime(sfxGain(s), ctx.currentTime, 0.02));
    effectsOut.set(ctx, bus);
  }
  return bus;
}

/** Wait for the illustrated menu's layers before revealing them together. */
export function preloadIllustratedMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  const urls = [
    '/ui/arcane_duel_battle_above_the_clouds.png',
    '/ui/illustrated/arcane_duel_title_no_blue_dot.png',
    '/ui/illustrated/duel.png',
    '/ui/illustrated/practice.png',
    '/ui/illustrated/spellbook.png',
    '/ui/illustrated/settings.png',
  ];
  const load = (url: string) =>
    new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => {
        if (image.decode)
          void image
            .decode()
            .catch(() => {})
            .then(() => resolve());
        else resolve();
      };
      image.onerror = () => resolve(); // An unavailable asset must not trap the user on loading.
      image.src = url;
      if (image.complete && image.naturalWidth) resolve();
    });
  // The loading overlay remains visible until all six artwork layers have settled.
  void Promise.all(urls.map(load)).then(() => menu.classList.add('menu-ready'));
}

/** Scale the approved staff PNG into a browser-safe menu cursor at runtime. */
function initArcaneMenuCursor() {
  const image = new Image();
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 46;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.imageSmoothingEnabled = false; // Keep the pixel-art edges crisp.
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      // Orb centre is the interaction hotspot, not the end of the staff handle.
      document.documentElement.style.setProperty(
        '--arcane-menu-cursor',
        `url("${canvas.toDataURL('image/png')}") 20 9, pointer`,
      );
    } catch {
      // Fall back to the standard pointer if canvas/cursor creation is blocked.
    }
  };
  image.src = '/ui/illustrated/cursor_arcane_blue_orb_staff_transparent.png';
}

/** Tiny three-harmonic crystalline chime; no external sound file needed. */
function initMagicalHoverSound() {
  let context: AudioContext | null = null;
  let lastPlayed = -Infinity;
  const play = () => {
    // Avoid a burst of overlapping notes when the pointer crosses adjacent buttons.
    const now = performance.now();
    if (now - lastPlayed < 65) return;
    const AudioContextType = window.AudioContext;
    if (!AudioContextType) return;
    try {
      context ??= new AudioContextType();
      if (context.state !== 'running') {
        void context.resume().catch(() => {});
        return; // Browser may require a prior click or key press to unlock audio.
      }
      lastPlayed = now;
      const start = context.currentTime;
      for (const [frequency, duration, volume] of [
        [880, 0.11, 0.09],
        [1320, 0.08, 0.045],
        [1760, 0.06, 0.018],
      ]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.97, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(effectsBus(context));
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      }
    } catch {
      // Browsers without permitted audio still have fully functional menus.
    }
  };
  /** Rune Press: brief wooden attack followed by a faint enchanted tone. */
  const playRunePress = () => {
    if (!window.AudioContext) return;
    try {
      context ??= new AudioContext();
      const ctx = context;
      const sound = () => {
        const start = ctx.currentTime;
        // Short filtered noise gives the wooden button a physical click.
        const length = Math.ceil(ctx.sampleRate * 0.065);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        const noise = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();
        noise.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 850;
        filter.Q.value = 0.8;
        noiseGain.gain.setValueAtTime(0.14, start);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.065);
        noise.connect(filter).connect(noiseGain).connect(effectsBus(ctx));
        noise.start(start);
        noise.stop(start + 0.065);

        for (const [frequency, duration, volume, type, endFrequency, delay] of [
          [190, 0.12, 0.12, 'triangle', 125, 0],
          [880, 0.14, 0.042, 'sine', 880, 0.012],
        ] as const) {
          const t = start + delay;
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(frequency, t);
          oscillator.frequency.exponentialRampToValueAtTime(endFrequency, t + duration);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
          oscillator.connect(gain).connect(effectsBus(ctx));
          oscillator.start(t);
          oscillator.stop(t + duration + 0.01);
        }
      };
      if (ctx.state === 'running') sound();
      else
        void ctx
          .resume()
          .then(sound)
          .catch(() => {});
    } catch {
      // Sound is optional; a browser audio restriction must never block a click.
    }
  };
  document.addEventListener('click', (event) => {
    // The menu forwards clicks to hidden legacy buttons. Sound only for real
    // user actions, not the programmatic click that completes the same action.
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || button.disabled || !button.closest('.ui-screen, #spellbook')) return;
    playRunePress();
  });
  // Delegate so lobby, practice, spellbook and settings buttons are included,
  // even if their panels are created or updated after initialization.
  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || button.disabled || !button.closest('.ui-screen, #spellbook')) return;
    if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) return;
    play();
  });
  // An explicit click/key press unlocks sound for later hovers on restrictive browsers.
  const unlock = () => {
    try {
      context ??= new AudioContext();
      if (context.state !== 'running') void context.resume().catch(() => {});
    } catch {
      /* Audio is optional. */
    }
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

/** Presentation-only menu routing. Existing room and spellbook handlers remain authoritative. */
export function initIllustratedMenu() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  initMagicalHoverSound();
  initArcaneMenuCursor();
  // Approved button PNGs are referenced directly by CSS; no atlas fallback.
  const screen = (name: string) => {
    menu.dataset.screen = name;
  };
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
    if (joinStatus) joinStatus.textContent = 'Getting a new code…';
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
  codeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinLobby();
  });
  const status = document.getElementById('roomStatus');
  if (status && joinStatus)
    new MutationObserver(() => {
      if (status.textContent) joinStatus.textContent = status.textContent;
    }).observe(status, { childList: true, characterData: true, subtree: true });
  document
    .getElementById('arcaneOpenPractice')
    ?.addEventListener('click', () => screen('practice'));
  document
    .querySelectorAll('[data-arcane-back]')
    .forEach((b) => b.addEventListener('click', () => screen('home')));
  document
    .getElementById('arcaneOpenSpellbook')
    ?.addEventListener('click', () => document.getElementById('openSpellbook')?.click());
  document
    .getElementById('arcaneOpenSettings')
    ?.addEventListener('click', () => document.getElementById('openSettings')?.click());
  document
    .getElementById('arcanePracticeAi')
    ?.addEventListener('click', () =>
      document.querySelector<HTMLElement>('[data-mode="duel"]')?.click(),
    );
  document
    .getElementById('arcanePracticeStill')
    ?.addEventListener('click', () =>
      document.querySelector<HTMLElement>('[data-mode="still"]')?.click(),
    );
  document
    .getElementById('arcanePracticeMoving')
    ?.addEventListener('click', () =>
      document.querySelector<HTMLElement>('[data-mode="moving"]')?.click(),
    );
}
