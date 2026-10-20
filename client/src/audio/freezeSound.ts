/**
 * Winter Breath — a short frosty tingle with a lingering cold-air hiss.
 * Played only when a wizard first becomes frozen, never once per frozen frame.
 * Purely client-side; no gameplay or network changes.
 */
import type { Wizard } from '../../../shared/types';

let context: AudioContext | null = null;
const lastFrozen = new Map<number, boolean>();
let primed = false;

function playWinterBreath() {
  try {
    context ??= new AudioContext();
    if (context.state !== 'running') return;

    const ctx = context;
    const start = ctx.currentTime;
    const output = ctx.createGain();
    output.gain.value = 0.52;
    output.connect(ctx.destination);

    // Fine, irregular icy tingles — not a melody.
    for (let i = 0; i < 7; i++) {
      const at = start + i * 0.035;
      const frequency = 1500 + ((i * 223) % 900);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, at + 0.065);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.026 * (1 - i / 10), at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.065);
      oscillator.connect(gain).connect(output);
      oscillator.start(at);
      oscillator.stop(at + 0.07);
    }

    // Airy hiss blooms after the tingle and fades gradually.
    const duration = 0.64;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.5;
    filter.frequency.setValueAtTime(2600, start + 0.02);
    filter.frequency.exponentialRampToValueAtTime(650, start + 0.66);
    const air = ctx.createGain();
    air.gain.setValueAtTime(0.0001, start + 0.02);
    air.gain.linearRampToValueAtTime(0.12, start + 0.11);
    air.gain.exponentialRampToValueAtTime(0.0001, start + 0.66);
    noise.connect(filter).connect(air).connect(output);
    noise.start(start + 0.02);
    noise.stop(start + 0.66);

    // A faint higher frost texture follows the initial crystal grains.
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1880;
    shimmerGain.gain.setValueAtTime(0.0001, start + 0.1);
    shimmerGain.gain.exponentialRampToValueAtTime(0.032, start + 0.11);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    shimmer.connect(shimmerGain).connect(output);
    shimmer.start(start + 0.1);
    shimmer.stop(start + 0.35);
  } catch {
    // Browsers without Web Audio can still play normally.
  }
}

export function initFreezeSound() {
  const unlock = () => {
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch {
      // Optional audio.
    }
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
}

export function resetFreezeSound() {
  lastFrozen.clear();
  primed = false;
}

export function updateFreezeSound(wizards: readonly Wizard[], active: boolean, paused: boolean, canHear: (wizard: Wizard) => boolean) {
  if (!active) {
    resetFreezeSound();
    return;
  }
  const current = new Set<number>();
  for (const wizard of wizards) {
    if (wizard.absent) continue;
    current.add(wizard.seat);
    const frozen = wizard.freeze > 0;
    if (primed && !paused && frozen && !lastFrozen.get(wizard.seat) && canHear(wizard)) playWinterBreath();
    lastFrozen.set(wizard.seat, frozen);
  }
  for (const seat of lastFrozen.keys()) if (!current.has(seat)) lastFrozen.delete(seat);
  primed = true;
}
