/**
 * Simulation trace: runs many scripted matches with the real simulation and records, for every
 * tick, a hash of each part of the SimState (wizards, shots, bombs, zones, traps, bubbles, events,
 * everything else incl. the rng's call count and output), plus the full state every SNAP_EVERY
 * ticks. Writes screenshots/simtrace-<TRACE_LABEL>.json.gz. Run before and after a sim refactor
 * and compare with `node scripts/sim-trace/compare.mjs <before> <after>`.
 *
 *   TRACE_LABEL=before npx vitest run --config scripts/sim-trace/vitest.config.mts
 *
 * Every input is scripted from small local generators (no Math.random); the sim's own randomness
 * comes from the match's seeded rng.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { it } from 'vitest';
import { names, pairs, styles } from '../../shared/constants';
import { DEFAULT_MAP, mapFor, type MapDef } from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths, update } from '../../shared/sim/update';
import { SPELL_VARIANTS, sanitizeLoadout } from '../../shared/sim/variants';
import { createSimState, type SimState } from '../../shared/simState';
import type { GameMode, MatchRules, SpellLoadout, SpellName } from '../../shared/types';

const SNAP_EVERY = 120;
const SPELLS: SpellName[] = [...names, ...Object.values(pairs)];
/** Digit keys that make each spell. */
const LOAD: Record<string, number[]> = {
  FIRE: [0],
  WATER: [1],
  LIGHTNING: [2],
  EARTH: [3],
  STEAM: [0, 1],
  PLASMA: [0, 2],
  MAGMA: [0, 3],
  STORM: [1, 2],
  ICE: [1, 3],
  MAGNETIC: [2, 3],
};
/** [spell, variant] for every spell and each of its variants ('default' = the original). */
const VARIANTS: [SpellName, string][] = SPELLS.flatMap((s) => {
  const v = SPELL_VARIANTS[s];
  return [[s, 'default'] as [SpellName, string]].concat(
    [v[1], v[3]].filter((x): x is NonNullable<typeof x> => !!x).map((x) => [s, x]),
  );
});

// ---- stable serialisation and hashing -------------------------------------------------------

function stable(v: unknown, wizards: Set<unknown>, depth = 0): unknown {
  if (typeof v === 'function' || v === undefined) return undefined;
  if (typeof v === 'number')
    return Number.isFinite(v) ? v : Number.isNaN(v) ? '$NaN' : v > 0 ? '$Inf' : '$-Inf';
  if (v === null || typeof v !== 'object') return v;
  if (wizards.has(v)) return { $w: (v as { seat: number }).seat };
  if (depth > 12) return '$deep';
  if (v instanceof Map)
    return { $map: [...v.entries()].sort().map(([k, x]) => [k, stable(x, wizards, depth + 1)]) };
  if (Array.isArray(v)) return v.map((x) => stable(x, wizards, depth + 1) ?? null);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v).sort()) {
    const s = stable((v as Record<string, unknown>)[k], wizards, depth + 1);
    if (s !== undefined) out[k] = s;
  }
  return out;
}

/** cyrb53-style hash of a string, as 8 hex chars (two 32-bit halves xor-folded). */
function hash(s: string): string {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
}

const SECTIONS = ['wizards', 'shots', 'bombs', 'zones', 'traps', 'bubbles', 'events', 'rest'];
type Meta = { calls: number; acc: number };

/** The whole state as sections of plain data. `p` and `e` are non-enumerable aliases: skipped. */
function sections(game: SimState, meta: Meta): Record<string, unknown> {
  const wizards = new Set<unknown>(game.wizards);
  const g = game as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of SECTIONS.slice(0, 7)) out[k] = stable(g[k], wizards);
  const rest: Record<string, unknown> = {};
  for (const k of Object.keys(g)) {
    if (SECTIONS.includes(k) || k === 'map' || k === 'rng') continue;
    rest[k] = g[k];
  }
  rest.map = game.map.id;
  rest.rngCalls = meta.calls;
  rest.rngAcc = meta.acc;
  out.rest = stable(rest, wizards);
  return out;
}

// ---- harness ---------------------------------------------------------------------------------

type Case = { ticks: string[]; snaps: Record<number, unknown> };
const results: Record<string, Case> = {};

interface Setup {
  mode?: GameMode;
  seed?: number;
  map?: MapDef;
  rules?: Partial<MatchRules>;
  loadouts?: SpellLoadout[];
  dummyHP?: number;
  dummyMoving?: boolean;
  /** Called once after the match is set up (move wizards, set statuses...). */
  init?: (g: SimState) => void;
}
type Script = (g: SimState, t: number) => void;

const CLEAR_MAP: MapDef = { ...DEFAULT_MAP, obstacles: [] };

function run(name: string, setup: Setup, script: Script, ticks: number) {
  const g = createSimState(setup.seed ?? 1);
  resetMatch(g, {
    mode: setup.mode ?? 'online',
    seed: setup.seed ?? 1,
    styles: [styles[0], styles[3]],
    dummyHP: setup.dummyHP ?? 160,
    dummyMoving: setup.dummyMoving ?? false,
    map: setup.map ?? CLEAR_MAP,
    rules: setup.rules,
    loadouts: setup.loadouts,
  });
  // count the rng's draws and fold in what it returned: the generator's closure can't be read
  const meta: Meta = { calls: 0, acc: 0 };
  const base = g.rng;
  g.rng = () => {
    const v = base();
    meta.calls++;
    meta.acc = (Math.imul(meta.acc, 31) + Math.floor(v * 4294967296)) >>> 0;
    return v;
  };
  setup.init?.(g);
  const c: Case = { ticks: [], snaps: {} };
  let after = 0;
  for (let t = 0; t < ticks; t++) {
    script(g, t);
    update(g, 1);
    resolveDeaths(g);
    const s = sections(g, meta);
    c.ticks.push(SECTIONS.map((k) => hash(JSON.stringify(s[k]))).join(''));
    if (t % SNAP_EVERY === 0 || t === ticks - 1) c.snaps[t] = s;
    g.events.length = 0;
    g.damageBatches.clear();
    if (g.ending && ++after > 250) break;
  }
  results[name] = c;
}

const key = (g: SimState, seat: number, code: string, down = true) =>
  applyInput(g, seat, { kind: 'key', code, down });
const equip = (g: SimState, seat: number, spell: string) => {
  for (const e of LOAD[spell]) key(g, seat, 'Digit' + (e + 1));
};
const loadoutFor = (spell: SpellName, variant: string): SpellLoadout =>
  sanitizeLoadout({ [spell]: variant });
const isCont = (variant: string) =>
  ['pebbles', 'plasma_beam', 'magnetic_pull'].includes(variant) || false;

/** Small deterministic generator for scripted inputs. */
const lcg = (seed: number) => {
  let x = seed >>> 0;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
};

/** Puts seat 0 at (250, 300) and seat 1 `d` to the right of it. */
const place = (d: number) => (g: SimState) => {
  g.wizards[0].x = 250;
  g.wizards[0].y = 300;
  g.wizards[1].x = 250 + d;
  g.wizards[1].y = 300;
  g.input[0].mouse = { x: 250 + d, y: 300 };
  g.input[1].mouse = { x: 250, y: 300 };
};

/** Seat 0 casts `spell` at seat 1: a long hold, then a tap, bomb or trap. */
function attackScript(spell: SpellName, kind: 'attack' | 'bomb' | 'trap'): Script {
  return (g, t) => {
    const f = g.wizards[1];
    if (t === 1) equip(g, 0, spell);
    if (kind === 'attack') {
      if (t === 2) applyInput(g, 0, { kind: 'pointerdown', x: f.x, y: f.y });
      if (t === 92) applyInput(g, 0, { kind: 'pointerup', x: f.x, y: f.y });
      if (t === 40) applyInput(g, 0, { kind: 'aim', x: f.x, y: f.y + 25 });
      if (t === 150) applyInput(g, 0, { kind: 'pointerdown', x: f.x, y: f.y });
      if (t === 156) applyInput(g, 0, { kind: 'pointerup', x: f.x, y: f.y });
      if (t === 200) applyInput(g, 0, { kind: 'pointerdown', x: f.x, y: f.y });
      if (t === 230) applyInput(g, 0, { kind: 'pointerup', x: f.x, y: f.y });
    } else if (kind === 'bomb') {
      if (t === 2) applyInput(g, 0, { kind: 'bomb', x: f.x, y: f.y });
      if (t === 100) key(g, 0, 'KeyB');
    } else {
      if (t === 2) applyInput(g, 0, { kind: 'trap', x: f.x, y: f.y });
      if (t === 90) {
        f.x += 5; // the trap is set under the foe: it springs once armed
      }
      if (t === 300) applyInput(g, 0, { kind: 'pointerdown', x: f.x, y: f.y });
    }
  };
}

/** Seat 1 sidesteps up and down so projectiles miss and hit. */
const dance =
  (inner: Script): Script =>
  (g, t) => {
    if (t % 25 === 0) {
      key(g, 1, 'KeyW', (t / 25) % 2 === 0);
      key(g, 1, 'KeyS', (t / 25) % 2 === 1);
    }
    inner(g, t);
  };

// ---- random but deterministic scripts --------------------------------------------------------

/** Every seat does a random mix of everything the input layer offers. */
function crowd(seed: number, seats: number[]): Script {
  const rs = seats.map((_, i) => lcg(seed * 31 + i * 977 + 5));
  return (g, t) => {
    seats.forEach((seat, i) => {
      const r = rs[i];
      const me = g.wizards[seat];
      if (me.fallen) return;
      let foe = g.wizards.filter((w) => w.team !== me.team && !w.fallen)[0] ?? g.wizards[0];
      for (const w of g.wizards)
        if (
          w.team !== me.team &&
          !w.fallen &&
          Math.hypot(w.x - me.x, w.y - me.y) < Math.hypot(foe.x - me.x, foe.y - me.y)
        )
          foe = w;
      const jit = () => (r() - 0.5) * 60;
      if (t % 20 === (seat * 3) % 20)
        for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) if (r() < 0.4) key(g, seat, k, r() < 0.5);
      if (t % 7 === seat % 7)
        applyInput(g, seat, { kind: 'aim', x: foe.x + jit(), y: foe.y + jit() });
      if (t % 9 !== seat % 9) return;
      const x = foe.x + jit(),
        y = foe.y + jit();
      const a = r();
      if (a < 0.28) {
        if (g.input[seat].holding) applyInput(g, seat, { kind: 'pointerup', x, y });
        else applyInput(g, seat, { kind: 'pointerdown', x, y });
      } else if (a < 0.4) key(g, seat, 'Digit' + (1 + Math.floor(r() * 4)));
      else if (a < 0.5) {
        key(g, seat, 'Digit' + (1 + Math.floor(r() * 4)));
        key(g, seat, 'Digit' + (1 + Math.floor(r() * 4)));
      } else if (a < 0.56) applyInput(g, seat, { kind: 'bomb', x, y });
      else if (a < 0.6) applyInput(g, seat, { kind: 'trap', x, y });
      else if (a < 0.63) key(g, seat, 'KeyB');
      else if (a < 0.66) key(g, seat, 'KeyT');
      else if (a < 0.7) key(g, seat, 'KeyF');
      else if (a < 0.74) key(g, seat, 'KeyQ');
      else if (a < 0.78) {
        key(g, seat, 'KeyE');
        key(g, seat, r() < 0.5 ? 'Digit2' : 'Space');
      } else if (a < 0.86) key(g, seat, 'Space');
      else if (a < 0.9) {
        key(g, seat, 'Space');
        key(g, seat, 'Space');
      } else if (a < 0.92) applyInput(g, seat, { kind: 'clear' });
    });
  };
}

const randomLoadout = (seed: number): SpellLoadout => {
  const r = lcg(seed);
  const raw: Record<string, string> = {};
  for (const s of SPELLS) {
    const v = SPELL_VARIANTS[s];
    const opts = ['default', v[1], v[3]].filter(Boolean) as string[];
    raw[s] = opts[Math.floor(r() * opts.length)];
  }
  return sanitizeLoadout(raw);
};

// ---- the cases -------------------------------------------------------------------------------

it('records the simulation trace', () => {
  // 1. every spell and variant: attack / bomb / trap at three distances
  for (const [spell, variant] of VARIANTS)
    for (const d of [80, 200, 380])
      for (const kind of ['attack', 'bomb', 'trap'] as const)
        run(
          `spell:${spell}:${variant}:${d}:${kind}`,
          { loadouts: [loadoutFor(spell, variant)], init: place(d) },
          attackScript(spell, kind),
          kind === 'trap' ? 420 : 300,
        );

  // 2. with the foe moving, primed with statuses, or an immortal dummy
  for (const [spell, variant] of VARIANTS) {
    const lo = [loadoutFor(spell, variant)];
    run(
      `dance:${spell}:${variant}`,
      { loadouts: lo, init: place(200) },
      dance(attackScript(spell, 'attack')),
      300,
    );
    run(
      `still:${spell}:${variant}`,
      { mode: 'still', loadouts: lo, init: place(200) },
      attackScript(spell, 'attack'),
      300,
    );
    run(
      `moving:${spell}:${variant}`,
      { mode: 'moving', loadouts: lo, init: place(200) },
      attackScript(spell, 'bomb'),
      300,
    );
    const primes: [string, Record<string, number>][] = [
      ['wet', { wet: 90, stat: 50 }],
      ['cold', { chill: 70, wet: 40, over: 60, mag: 50 }],
      ['hot', { burn: 200, burnTime: 200, scald: 50, stat: 80 }],
    ];
    for (const [pn, st] of primes)
      run(
        `prime:${pn}:${spell}:${variant}`,
        { loadouts: lo, init: (g) => (place(160)(g), Object.assign(g.wizards[1], st)) },
        attackScript(spell, 'attack'),
        300,
      );
  }

  // 3. shields on the foe against every spell, then bubbles, with reflections
  for (const sh of [0, 1, 2, 3, 4])
    for (const [spell, variant] of VARIANTS) {
      const inner = attackScript(spell, 'attack');
      run(
        `shield:${sh}:${spell}:${variant}`,
        { loadouts: [loadoutFor(spell, variant)], init: place(150) },
        (g, t) => {
          if (t === 0) {
            if (sh === 4) key(g, 1, 'KeyE');
            else key(g, 1, 'Digit' + (sh + 1));
            key(g, 1, 'Space');
          }
          inner(g, t);
        },
        300,
      );
    }
  for (const [spell, variant] of VARIANTS)
    for (const kind of ['attack', 'bomb'] as const)
      for (const d of [70, 200]) {
        const inner = attackScript(spell, kind);
        run(
          `bubble:${spell}:${variant}:${kind}:${d}`,
          { loadouts: [loadoutFor(spell, variant)], init: place(d) },
          (g, t) => {
            if (t === 0) {
              key(g, 1, 'Space');
              key(g, 1, 'Space');
            }
            inner(g, t);
          },
          300,
        );
      }
  // both wizards bubbled and shooting each other: reflections back and forth
  for (const [spell, variant] of VARIANTS) {
    const inner = attackScript(spell, 'attack');
    run(
      `bubbles2:${spell}:${variant}`,
      { loadouts: [loadoutFor(spell, variant), loadoutFor(spell, variant)], init: place(120) },
      (g, t) => {
        if (t === 0)
          for (const s of [0, 1]) {
            key(g, s, 'Space');
            key(g, s, 'Space');
          }
        if (t === 1) equip(g, 1, spell);
        if (t === 3) applyInput(g, 1, { kind: 'pointerdown', x: 250, y: 300 });
        if (t === 60) applyInput(g, 1, { kind: 'pointerup', x: 250, y: 300 });
        inner(g, t);
      },
      300,
    );
  }

  // 4. sword, force, heal, bubble on its own, against shields and bubbles
  for (const d of [30, 60, 100, 160])
    for (const cover of ['none', 'shield', 'bubble', 'trap'])
      for (const act of ['KeyF', 'KeyQ'])
        run(
          `melee:${act}:${d}:${cover}`,
          { init: place(d) },
          (g, t) => {
            if (t === 0 && cover === 'shield') {
              key(g, 1, 'Digit1');
              key(g, 1, 'Space');
            }
            if (t === 0 && cover === 'bubble') {
              key(g, 1, 'Space');
              key(g, 1, 'Space');
            }
            if (t === 0 && cover === 'trap') applyInput(g, 1, { kind: 'trap', x: 250, y: 300 });
            if (t === 5 || t === 80) key(g, 0, act);
            if (t === 20) {
              equip(g, 0, 'EARTH');
              applyInput(g, 0, { kind: 'bomb', x: g.wizards[1].x, y: g.wizards[1].y });
            }
          },
          200,
        );
  for (const hp of [30, 120, 190])
    for (const how of ['Digit2', 'Space', 'heal-twice', 'silenced', 'frozen'])
      run(
        `heal:${hp}:${how}`,
        {
          init: (g) => {
            place(200)(g);
            g.wizards[0].hp = hp;
            if (how === 'silenced') g.wizards[0].silence = 80;
            if (how === 'frozen') g.wizards[0].freeze = 60;
          },
        },
        (g, t) => {
          if (t === 3) {
            key(g, 0, 'KeyE');
            key(g, 0, how === 'Space' ? 'Space' : 'Digit2');
          }
          if (t === 30 && how === 'heal-twice') {
            key(g, 0, 'KeyE');
            key(g, 0, 'Digit2');
          }
          if (t === 60) {
            key(g, 0, 'Space');
            key(g, 0, 'Space');
          }
          if (t === 100) {
            key(g, 0, 'Digit3');
            key(g, 0, 'Space');
          }
        },
        400,
      );

  // 5. whole matches: modes, teams, maps, rules, random scripts
  const mapIds = [
    'enchanted',
    'temple',
    'volcano',
    'frozen',
    'colosseum',
    'astral',
    'graveyard',
    'grove',
    'tower',
    'darkcircle',
    'devbattle',
    'ruins',
  ];
  const duelAi = (seed: number, map: string, ticks: number, mode: GameMode = 'duel') =>
    run(
      `ai:${mode}:${map}:${seed}`,
      {
        mode,
        seed,
        map: mapFor(map),
        loadouts: [randomLoadout(seed)],
        dummyHP: 90,
        dummyMoving: seed % 2 === 0,
      },
      crowd(seed, [0]),
      ticks,
    );
  for (const [i, map] of mapIds.entries()) duelAi(100 + i, map, 3600);
  for (const mode of ['still', 'moving', 'mortal'] as GameMode[])
    for (let s = 0; s < 4; s++) duelAi(200 + s, mapIds[(s * 3) % mapIds.length], 2400, mode);
  for (let s = 0; s < 3; s++)
    run(
      `online:duel:${s}`,
      {
        seed: 300 + s,
        map: mapFor(mapIds[s]),
        loadouts: [randomLoadout(s), randomLoadout(s + 9)],
        rules: { wizardHp: 90 },
      },
      crowd(300 + s, [0, 1]),
      3600,
    );
  // mortal dummy killed and respawning
  run(
    'mortal:kill',
    { mode: 'mortal', dummyHP: 20, loadouts: [randomLoadout(5)], init: place(120) },
    crowd(77, [0]),
    1800,
  );
  run(
    'mortal:moving',
    { mode: 'mortal', dummyHP: 40, dummyMoving: true, init: place(150) },
    crowd(78, [0]),
    1800,
  );

  const teamCase = (
    name: string,
    seed: number,
    teamSize: number,
    map: string,
    rules: Partial<MatchRules>,
    ticks = 2400,
  ) => {
    const seats = Array.from({ length: teamSize * 2 }, (_, i) => i);
    run(
      name,
      {
        seed,
        map: mapFor(map),
        loadouts: seats.map((i) => randomLoadout(seed + i)),
        rules: { teamSize, wizardHp: 70, ...rules },
      },
      crowd(seed, seats),
      ticks,
    );
  };
  for (const map of ['enchanted', 'colosseum', 'devbattle', 'ruins']) {
    teamCase(`team2:elim:${map}`, 400, 2, map, {});
    teamCase(`team2:elim-ff:${map}`, 401, 2, map, { friendlyFire: true });
    teamCase(`team2:respawn:${map}`, 402, 2, map, { deathRule: 'respawn', killTarget: 3 });
    teamCase(`team2:respawn-ff:${map}`, 403, 2, map, {
      deathRule: 'respawn',
      killTarget: 3,
      friendlyFire: true,
    });
    teamCase(`team4:elim:${map}`, 410, 4, map, {});
    teamCase(`team4:elim-ff:${map}`, 411, 4, map, { friendlyFire: true });
    teamCase(`team4:respawn:${map}`, 412, 4, map, { deathRule: 'respawn', killTarget: 4 }, 3600);
    teamCase(
      `team4:respawn-ff:${map}`,
      413,
      4,
      map,
      { deathRule: 'respawn', killTarget: 4, friendlyFire: true },
      3600,
    );
  }
  // uneven teams (empty seats) and tougher wizards
  teamCase('team3:empty-seat', 420, 3, 'enchanted', { emptySeats: [5] });
  teamCase('team4:empty-seats', 421, 4, 'devbattle', {
    emptySeats: [2, 6, 7],
    deathRule: 'respawn',
    killTarget: 2,
  });
  teamCase('team2:tough', 422, 2, 'ruins', { wizardHp: 250, friendlyFire: true }, 3600);

  mkdirSync('screenshots', { recursive: true });
  const label = process.env.TRACE_LABEL || 'trace';
  writeFileSync(`screenshots/simtrace-${label}.json.gz`, gzipSync(JSON.stringify(results)));
  void isCont;
});
