// The spellbook's preview screen: your wizard, standing still, and a training dummy with a real
// wizard's health, on a small patch of the Enchanted Arena with two pillars to shoot at. It borrows the menu's
// idle `game` (no match runs while the spellbook is open) and draws with the match renderer onto its
// own canvas, then puts everything back when the preview closes.
import { styles } from '../../../../shared/constants';
import { advanceCosmetics, spawnFx } from '../../fx/cosmetics';
import { newSeed } from '../../../../shared/random';
import { DEFAULT_RULES } from '../../../../shared/simState';
import { applyInput } from '../../../../shared/sim/input';
import { resetMatch } from '../../../../shared/sim/match';
import { resolveDeaths } from '../../../../shared/sim/update/deaths';
import { update } from '../../../../shared/sim/update';
import type { SpellLoadout, SpellName } from '../../../../shared/types';
import { $, drawOn } from '../../dom';
import { FixedStepper } from '../../loop/fixedStep';
import { TICK_MS } from '../../net/clock';
import { resetCamera } from '../../render/camera';
import { RenderInterpolator } from '../../render/interpolate';
import { currentMap, selectMap } from '../../render/arena/maps';
import { draw } from '../../render/scene';
import { game } from '../../state';
import { cooldownSeconds } from '../hud/cooldownText';
import { cooldownDisplay } from '../hud/hud';
import { DEMO_MAP, demoHint, demoWorldPoint, DEMO_VIEW } from './spellDemoMath';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let frame = 0;
let last = 0;
let running = false;
/** The menu's `game` fields and picked map from before the demo, restored when it stops. */
let saved: [string, unknown][] = [];
let savedMap = currentMap();
const stepper = new FixedStepper(TICK_MS);
const interpolator = new RenderInterpolator();

function playerStyle() {
  const chosen = $<HTMLSelectElement>('wizardStyle')?.value;
  return chosen && chosen !== 'random' ? styles[Number(chosen)] : styles[0];
}

function fitCanvas() {
  if (!canvas || !ctx || !canvas.clientWidth) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * scale);
  canvas.height = Math.round(canvas.clientHeight * scale);
}

function pointer(ev: PointerEvent) {
  const box = canvas!.getBoundingClientRect();
  return demoWorldPoint(ev.clientX - box.left, ev.clientY - box.top, box.width, box.height);
}

/** Hooks the demo up to its canvas; call once. */
export function initSpellDemo(target: HTMLCanvasElement) {
  canvas = target;
  ctx = target.getContext('2d')!;
  new ResizeObserver(fitCanvas).observe(target);
  target.addEventListener('pointermove', (ev) => {
    if (running) applyInput(game, 0, { kind: 'aim', ...pointer(ev) });
  });
  target.addEventListener('pointerdown', (ev) => {
    if (!running || ev.button !== 0) return;
    target.setPointerCapture(ev.pointerId);
    applyInput(game, 0, { kind: 'pointerdown', ...pointer(ev) });
  });
  const release = (ev: PointerEvent) => {
    if (running && ev.button === 0) applyInput(game, 0, { kind: 'pointerup', ...pointer(ev) });
  };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', () => running && applyInput(game, 0, { kind: 'clear' }));
  target.addEventListener('contextmenu', (ev) => ev.preventDefault());
}

/** Starts (or restarts) the demo with `spell` loaded, using the spellbook's current picks. */
export function showSpellDemo(spell: SpellName, loadout: SpellLoadout) {
  if (!canvas || game.active) return;
  if (!running) {
    saved = Object.entries(Object.getOwnPropertyDescriptors(game))
      .filter(([, d]) => 'value' in d)
      .map(([key, d]) => [key, d.value]);
    savedMap = currentMap();
    running = true;
    last = 0;
    frame = requestAnimationFrame(loop);
  }
  selectMap(DEMO_MAP.id);
  resetCamera();
  resetMatch(game, {
    mode: 'mortal',
    seed: newSeed(),
    styles: [playerStyle(), styles[3]],
    dummyHP: DEFAULT_RULES.wizardHp,
    dummyMoving: false,
    map: DEMO_MAP,
    loadout,
  });
  const input = game.input[0];
  input.attack = spell;
  input.mouse = { ...DEMO_MAP.teamSpawns[1][0] };
  stepper.reset();
  interpolator.reset();
  showCooldown();
  $('spellDemoHint').textContent = demoHint(spell, loadout);
}

/** Stops the demo and gives the menu back its own state. Safe to call when it isn't running. */
export function stopSpellDemo() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(frame);
  showCooldown();
  for (const [key, value] of saved) (game as unknown as Record<string, unknown>)[key] = value;
  saved = [];
  selectMap(savedMap);
}

/** Shows the loaded spell's cooldown under the arena, as the match's bar does on its icon. */
function showCooldown() {
  const input = game.input[0];
  const { left, cooling } = running
    ? cooldownDisplay(input.attack, game.wizards[0], input.loadout)
    : { left: 0, cooling: false };
  $('spellDemoCooldown').textContent = running
    ? cooling
      ? 'Cooldown: ' + cooldownSeconds(left)
      : 'Ready'
    : '';
}

function loop(now: number) {
  if (!running || !canvas || !ctx) return;
  const elapsedMs = Math.min(100, now - (last || now));
  last = now;
  const { steps, alpha } = stepper.advance(elapsedMs);
  for (let i = 0; i < steps; i++) {
    interpolator.capture(game);
    game.wizards[0].hp = game.wizards[0].max; // your wizard is only here to cast; nothing should end the demo
    if (update(game, 1)) resolveDeaths(game);
    for (const ev of game.events.splice(0))
      if (
        ev.type !== 'hint' &&
        ev.type !== 'death' &&
        ev.type !== 'fall' &&
        ev.type !== 'round_over'
      )
        spawnFx(game, ev);
  }
  advanceCosmetics(game, Math.min(2, elapsedMs / TICK_MS));
  showCooldown();

  const scale = canvas.width / DEMO_VIEW.w;
  ctx.setTransform(scale, 0, 0, scale, -DEMO_VIEW.x * scale, -DEMO_VIEW.y * scale);
  const restore = interpolator.apply(game, alpha);
  const matchContext = drawOn(ctx);
  try {
    draw();
  } finally {
    drawOn(matchContext);
    restore();
  }
  frame = requestAnimationFrame(loop);
}
