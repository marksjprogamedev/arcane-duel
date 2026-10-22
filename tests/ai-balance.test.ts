import { test } from 'vitest';
import { createSimState } from '../shared/simState';
import { createWizard } from '../shared/sim/wizard';
import { resolveDeaths } from '../shared/sim/update/deaths';
import { update } from '../shared/sim/update';
import { applyInput } from '../shared/sim/input';
import { mapFor, spawnsFor } from '../shared/maps';
import { styles, ELEMENT_NAMES, COMBO_OF } from '../shared/constants';
import type { SpellName, Wizard } from '../shared/types';
import { sanitizeLoadout } from '../shared/sim/variants';
import { writeFileSync, mkdirSync } from 'node:fs';

const SPELLS: SpellName[] = [...ELEMENT_NAMES, ...Object.values(COMBO_OF)];
const LOAD: Record<SpellName, number[]> = {
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
const MAPS = ['enchanted', 'darkcircle', 'ruins'];
const PROFILES = ['aggressive', 'defensive', 'combo', 'ranged', 'adaptive'] as const;
type Profile = (typeof PROFILES)[number];
type Bot = {
  profile: Profile;
  focus: SpellName;
  next: number;
  release: number;
  movement: number;
  side: number;
  casts: Record<string, number>;
  heals: number;
  bubbles: number;
  shields: number;
  damage: number;
  lastShield: number;
  shieldTypes: Record<string, number>;
  switches: number;
  lastAttack: SpellName | null;
  waterSurgeEquipped: boolean;
};
const rand = (seed: number) => {
  let x = seed >>> 0;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
};
/** Every bot evaluates the current opponent, not a preselected favourite.
 * Focus is retained only as a benchmark label; it does not influence decisions.
 */
function choose(
  bot: Bot,
  me: Wizard,
  foe: Wizard,
  rng: () => number,
  incoming: SpellName,
): SpellName {
  const viable = SPELLS.filter((s) => !foe.shield || !LOAD[s].includes(foe.shield.type));
  const candidates = viable.length ? viable : SPELLS;
  const scored = candidates.map((spell) => {
    // Tactical variety: situational utility matters, but combo bonuses must not overwhelm all other choices.
    let score = rng() * 3.5;
    if (spell === 'LIGHTNING') score += Math.min(4.5, foe.wet * 0.045);
    if (spell === 'EARTH') score += foe.freeze > 0 ? 5.5 : foe.chill > 55 ? 1.4 : 0;
    if (spell === 'WATER') {
      score += foe.wet < 20 ? 1.6 : foe.wet < 60 ? 0.6 : -1.5;
      const distance = Math.hypot(me.x - foe.x, me.y - foe.y);
      const closeRangeThreat = ['FIRE', 'WATER', 'EARTH', 'MAGNETIC'].includes(incoming);
      if (
        bot.waterSurgeEquipped &&
        me.waterCD === 0 &&
        distance < 205 &&
        (closeRangeThreat || distance < 125)
      )
        score += 7.5;
    }
    if (spell === 'ICE') score += foe.chill > 45 && foe.freeze <= 0 ? 2.2 : 0;
    if (spell === 'PLASMA') score += foe.overload > 45 ? 2 : 0;
    if (spell === 'STORM') score += foe.static > 45 ? 2 : 0;
    if (spell === 'FIRE') score += foe.wet < 20 ? 1.2 : 0;
    // Do not penalize entire elements by default: every spell remains a viable choice.
    if (spell === incoming) score -= 1.0;
    if (spell === bot.lastAttack) score -= 0.9;
    const distance = Math.hypot(me.x - foe.x, me.y - foe.y);
    if (distance > 330 && ['FIRE', 'WATER', 'LIGHTNING'].includes(spell)) score -= 3;
    if (distance < 180 && ['FIRE', 'WATER', 'LIGHTNING'].includes(spell)) score += 1;
    return { spell, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Occasionally choose the second-best viable counter to avoid a deterministic loop.
  return (rng() < 0.3 && scored.length > 1 ? scored[1] : scored[0]).spell;
}
function move(game: ReturnType<typeof createSimState>, seat: number, bot: Bot, rng: () => number) {
  const me = game.wizards[seat],
    foe = game.wizards[1 - seat],
    input = game.input[seat];
  const dx = foe.x - me.x,
    dy = foe.y - me.y,
    d = Math.hypot(dx, dy) || 1;
  const desired =
    bot.profile === 'aggressive'
      ? 155
      : bot.profile === 'ranged'
        ? 360
        : bot.profile === 'defensive'
          ? 310
          : 245;
  const danger = me.hp < me.max * 0.3 || (me.healCD === 0 && me.hp < me.max * 0.5);
  const radial = danger ? -1 : d > desired + 55 ? 1 : d < desired - 55 ? -1 : 0;
  if (game.t >= bot.movement) {
    bot.side = rng() < 0.5 ? -1 : 1;
    bot.movement = game.t + 35 + Math.floor(rng() * 65);
  }
  const sx = (dx / d) * radial + (-dy / d) * bot.side * 0.9;
  const sy = (dy / d) * radial + (dx / d) * bot.side * 0.9;
  // Probe future steps against the game's actual movement/collision geometry.
  // Choose a tangential escape when a direct route is obstructed.
  const keys = { KeyW: sy < -0.25, KeyS: sy > 0.25, KeyA: sx < -0.25, KeyD: sx > 0.25 };
  const beforeX = me.x,
    beforeY = me.y;
  input.keys = keys;
  // Stuck detection changes strafe direction; map collision remains authoritative.
  if (
    (bot as any).lastX !== undefined &&
    Math.hypot(me.x - (bot as any).lastX, me.y - (bot as any).lastY) < 2 &&
    game.t % 16 === 0
  )
    bot.side *= -1;
  (bot as any).lastX = beforeX;
  (bot as any).lastY = beforeY;
  applyInput(game, seat, {
    kind: 'aim',
    x: foe.x + (rng() - 0.5) * 22,
    y: foe.y + (rng() - 0.5) * 22,
  });
}
function equip(game: ReturnType<typeof createSimState>, seat: number, spell: SpellName) {
  for (const e of LOAD[spell])
    applyInput(game, seat, { kind: 'key', code: 'Digit' + (e + 1), down: true });
}
function action(
  game: ReturnType<typeof createSimState>,
  seat: number,
  bot: Bot,
  rng: () => number,
) {
  const me = game.wizards[seat],
    foe = game.wizards[1 - seat],
    d = Math.hypot(me.x - foe.x, me.y - foe.y);
  if (me.hp < me.max * 0.67 && me.healCD === 0 && me.freeze === 0 && me.silence === 0) {
    applyInput(game, seat, { kind: 'key', code: 'KeyE', down: true });
    applyInput(game, seat, { kind: 'key', code: 'Digit2', down: true });
    bot.heals++;
    return;
  }
  if (me.hp < me.max * 0.6 && (!me.shield || me.shield.life < 50) && me.silence === 0) {
    applyInput(game, seat, { kind: 'key', code: 'KeyE', down: true });
    applyInput(game, seat, { kind: 'key', code: 'Space', down: true });
    bot.shields++;
    return;
  }
  if (d < 180 && me.bubbleCD === 0 && me.freeze === 0 && me.silence === 0) {
    applyInput(game, seat, { kind: 'key', code: 'Space', down: true });
    applyInput(game, seat, { kind: 'key', code: 'Space', down: true });
    bot.bubbles++;
    return;
  }
  if (foe.chargeTicks > 35 && me.silence === 0 && (!me.shield || me.shield.life < 45)) {
    const spell = game.input[1 - seat].attack;
    const elem = LOAD[spell][0];
    applyInput(game, seat, { kind: 'key', code: 'Digit' + (elem + 1), down: true });
    applyInput(game, seat, { kind: 'key', code: 'Space', down: true });
    bot.shields++;
    return;
  }
  if (game.t < bot.release) return;
  const attack = choose(bot, me, foe, rng, game.input[1 - seat].attack);
  if (bot.lastAttack !== null && bot.lastAttack !== attack) bot.switches++;
  bot.lastAttack = attack;
  equip(game, seat, attack);
  const x = foe.x,
    y = foe.y;
  applyInput(game, seat, { kind: 'pointerdown', x, y });
  bot.casts[attack] = (bot.casts[attack] || 0) + 1;
  // Charge attacks release later; continuous attacks sustain for a short burst.
  bot.release =
    game.t + (['FIRE', 'WATER', 'LIGHTNING'].includes(attack) ? 18 : attack === 'MAGMA' ? 75 : 30);
}
function stepBot(
  game: ReturnType<typeof createSimState>,
  seat: number,
  bot: Bot,
  rng: () => number,
) {
  const me = game.wizards[seat],
    foe = game.wizards[1 - seat];
  if (me.hp <= 0 || me.fallen) return;
  move(game, seat, bot, rng);
  if (game.input[seat].holding && game.t >= bot.release) {
    applyInput(game, seat, { kind: 'pointerup', x: foe.x, y: foe.y });
    bot.next = game.t + 8;
    return;
  }
  if (!game.input[seat].holding && game.t >= bot.next) {
    action(game, seat, bot, rng);
    bot.next = game.t + 20;
  }
}
function duel(seed: number, a: SpellName, b: SpellName, pa: Profile, pb: Profile, mapId: string) {
  const rng = rand(seed),
    g = createSimState(seed);
  g.map = mapFor(mapId);
  g.mode = 'online';
  const swap = seed % 2 === 0;
  const starts = swap
    ? [spawnsFor(g.map)[1], spawnsFor(g.map)[0]]
    : [spawnsFor(g.map)[0], spawnsFor(g.map)[1]];
  g.starts = starts.map((p) => ({ ...p }));
  g.wizards = [
    createWizard(starts[0].x, starts[0].y, 200, styles[0], 0, 0),
    createWizard(starts[1].x, starts[1].y, 200, styles[1], 1, 1),
  ];
  g.input[0].mouse = { ...starts[1] };
  g.input[1].mouse = { ...starts[0] };
  const bots: [Bot, Bot] = [a, b].map((focus, i) => ({
    profile: i ? pb : pa,
    focus,
    next: 0,
    release: 0,
    movement: 0,
    side: i ? -1 : 1,
    casts: {},
    heals: 0,
    bubbles: 0,
    shields: 0,
    damage: 0,
    lastShield: -1000,
    shieldTypes: {},
    switches: 0,
    lastAttack: null,
    waterSurgeEquipped: false,
  })) as [Bot, Bot];
  // Fix each wizard's Water variant for the full duel.
  for (let seat = 0; seat < 2; seat++) {
    const surge = rng() < 0.5;
    g.input[seat].loadout = sanitizeLoadout({ WATER: surge ? 'water_surge' : 'default' });
    bots[seat].waterSurgeEquipped = surge;
  }
  const maxTicks = 60 * 120;
  for (let tick = 0; tick < maxTicks && !g.ending; tick++) {
    for (let seat = 0; seat < 2; seat++) stepBot(g, seat, bots[seat], rng);
    update(g, 1);
    resolveDeaths(g);
    g.events.length = 0;
    g.damageBatches.clear();
  }
  return {
    seed,
    map: mapId,
    spellA: a,
    spellB: b,
    profileA: pa,
    profileB: pb,
    winner: g.wizards[0].hp <= 0 ? 1 : g.wizards[1].hp <= 0 ? 0 : -1,
    ticks: g.t,
    hpA: g.wizards[0].hp,
    hpB: g.wizards[1].hp,
    castsA: bots[0].casts,
    castsB: bots[1].casts,
    healsA: bots[0].heals,
    healsB: bots[1].heals,
    bubblesA: bots[0].bubbles,
    bubblesB: bots[1].bubbles,
    shieldsA: bots[0].shields,
    shieldsB: bots[1].shields,
    shieldTypesA: bots[0].shieldTypes,
    shieldTypesB: bots[1].shieldTypes,
    switchesA: bots[0].switches,
    switchesB: bots[1].switches,
  };
}
test('AI spell balance benchmark (real test-branch simulation)', { timeout: 900000 }, () => {
  const count = Math.max(1, Number(process.env.BALANCE_DUELS || 24));
  const rows = [] as ReturnType<typeof duel>[];
  for (let i = 0; i < count; i++) {
    const a = SPELLS[i % SPELLS.length],
      b = SPELLS[Math.floor(i / SPELLS.length) % SPELLS.length];
    rows.push(
      duel(
        10001 + i,
        a,
        b,
        PROFILES[i % 5],
        PROFILES[Math.floor(i / 5) % 5],
        MAPS[i % MAPS.length],
      ),
    );
  }
  const summary = SPELLS.map((s) => {
    const matches = rows
      .flatMap((r) => [
        { spell: r.spellA, won: r.winner === 0, lost: r.winner === 1, draw: r.winner < 0 },
        { spell: r.spellB, won: r.winner === 1, lost: r.winner === 0, draw: r.winner < 0 },
      ])
      .filter((x) => x.spell === s);
    return {
      spell: s,
      matches: matches.length,
      wins: matches.filter((x) => x.won).length,
      losses: matches.filter((x) => x.lost).length,
      draws: matches.filter((x) => x.draw).length,
      winRate: matches.length ? matches.filter((x) => x.won).length / matches.length : 0,
    };
  });
  mkdirSync('balance-results', { recursive: true });
  writeFileSync('balance-results/duels.json', JSON.stringify(rows, null, 2));
  writeFileSync('balance-results/summary.json', JSON.stringify(summary, null, 2));
  const telemetry = {
    totalDuels: rows.length,
    attackSwitches: rows.reduce((n, r) => n + r.switchesA + r.switchesB, 0),
    shieldCasts: rows.reduce((n, r) => n + r.shieldsA + r.shieldsB, 0),
    elementShields: Object.fromEntries(
      [0, 1, 2, 3].map((e) => [
        e,
        rows.reduce(
          (n, r) => n + (r.shieldTypesA[String(e)] || 0) + (r.shieldTypesB[String(e)] || 0),
          0,
        ),
      ]),
    ),
    spellCasts: Object.fromEntries(
      SPELLS.map((sp) => [
        sp,
        rows.reduce((n, r) => n + (r.castsA[sp] || 0) + (r.castsB[sp] || 0), 0),
      ]),
    ),
  };
  writeFileSync('balance-results/tactical-telemetry.json', JSON.stringify(telemetry, null, 2));
  console.log('TACTICAL TELEMETRY ' + JSON.stringify(telemetry));
  console.log('BALANCE RESULTS ' + JSON.stringify(summary));
});
