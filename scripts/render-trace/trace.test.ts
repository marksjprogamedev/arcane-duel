/**
 * Draw-call trace: draws many wizards and whole scenes onto a recording canvas and writes every
 * canvas call to screenshots/trace-<TRACE_LABEL>.json. Run it before and after a render refactor
 * and compare with `node scripts/render-trace/compare.mjs <before> <after>`.
 *
 *   TRACE_LABEL=before npx vitest run --config scripts/render-trace/vitest.config.mts
 *
 * Cases run in two passes: with the sprite atlases loaded (Workshop look for the local player, atlas
 * drawers traced) and not loaded (the drawn art only). Case names start with `loaded:` / `plain:`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

type Trace = { begin(): void; end(): unknown[][]; imagesLoaded: boolean };
const T = (globalThis as unknown as { __trace: Trace }).__trace;
const seedRandom = (globalThis as unknown as { __seedRandom: (s: number) => void }).__seedRandom;

// The wizard drawer moves between files in refactors: find whichever module exists.
const wizardModules = import.meta.glob<Record<string, unknown>>(
  '../../client/src/render/world/{actor,wizard/index}.ts',
);

type Cases = Record<string, unknown[][]>;

async function pass(prefix: string, loaded: boolean, out: Cases) {
  vi.resetModules();
  T.imagesLoaded = loaded;
  const { styles } = await import('../../shared/constants');
  const { createWizard } = await import('../../shared/sim/wizard');
  const { CHARGE_SPELLS, CHARGE_TICKS } = await import('../../shared/charge');
  const { mapFor } = await import('../../shared/maps');
  const { game, net } = await import('../../client/src/state');
  const { selectMap } = await import('../../client/src/render/arena/maps');
  const { draw } = await import('../../client/src/render/scene');
  const { camera, updateCamera, withCamera } = await import('../../client/src/render/camera');
  const key = Object.keys(wizardModules)[0];
  const mod = await wizardModules[key]();
  const drawActor = (mod.drawWizard ?? mod.actor) as (w: unknown) => void;
  type W = ReturnType<typeof createWizard>;

  const run = (name: string, fn: () => void) => {
    seedRandom(12345);
    T.begin();
    fn();
    out[`${prefix}:${name}`] = T.end();
  };

  /** Resets the shared client state to a fresh 1v1 on `mapId`, wizards 0 (local) and 1. */
  function reset(mapId = 'enchanted', mode: typeof game.mode = 'online', t = 100) {
    selectMap(mapId);
    game.map = mapFor(mapId);
    game.mode = mode;
    game.t = t;
    game.shots = [];
    game.bombs = [];
    game.zones = [];
    game.bubbles = [];
    game.traps = [];
    game.particles = [];
    game.labels = [];
    game.arcs = [];
    game.waves = [];
    game.death = null;
    game.active = false;
    net.online = false;
    game.wizards = [
      createWizard(200, 300, 200, styles[0], 0, 0),
      createWizard(800, 300, 200, styles[3], 1, 1),
    ];
    for (const i of game.input) i.mouse = { x: 500, y: 250 };
  }

  const spots = { x: 300, y: 320 };
  const mk = (style: number, team: 0 | 1 = 1, seat = 1): W => {
    const w = createWizard(spots.x, spots.y, 200, styles[style], seat, team);
    w.face = 0.7;
    return w;
  };
  /** Draws wizard `w` (as the other player, so the Workshop look does not apply) at game time `t`. */
  const other = (w: W, t = 100) => {
    game.wizards[1] = w;
    game.t = t;
    drawActor(w);
  };
  const local = (w: W, t = 100) => {
    w.seat = 0;
    w.team = 0;
    game.wizards[0] = w;
    game.t = t;
    drawActor(w);
  };

  reset();
  const names = styles.map((s) => s.name);
  names.forEach((n, v) => {
    run(`style ${v} ${n} other t=100`, () => other(mk(v)));
    run(`style ${v} ${n} other t=377`, () => other(mk(v), 377));
    run(`style ${v} ${n} local`, () => local(mk(v, 0, 0)));
    run(`style ${v} ${n} swinging`, () => other(Object.assign(mk(v), { swing: 11 })));
    run(`style ${v} ${n} swinging local`, () => local(Object.assign(mk(v, 0, 0), { swing: 3 })));
    run(`style ${v} ${n} shield+burn+wet`, () =>
      other(Object.assign(mk(v), { shield: { type: v % 5, life: 100 }, burn: 60, wet: 40 })),
    );
  });
  for (const spell of CHARGE_SPELLS) {
    for (const ticks of [5, 13, 70, CHARGE_TICKS]) {
      run(`charge ${spell} ${ticks}`, () =>
        other(Object.assign(mk(spell.length % 8), { chargeSpell: spell, chargeTicks: ticks })),
      );
    }
    run(`charge ${spell} local`, () =>
      local(Object.assign(mk(2, 0, 0), { chargeSpell: spell, chargeTicks: CHARGE_TICKS })),
    );
  }
  for (let type = 0; type < 5; type++)
    run(`shield type ${type}`, () => other(Object.assign(mk(1), { shield: { type, life: 80 } })));
  for (const burn of [10, 25, 30, 55, 100])
    for (const t of [10, 211])
      run(`burn ${burn} t=${t}`, () => other(Object.assign(mk(burn % 8), { burn }), t));
  run('burn particles pushed', () => {
    game.particles = [];
    for (let i = 0; i < 6; i++) other(Object.assign(mk(0), { burn: 100 }), 50 + i);
    drawActor(Object.assign(mk(0), { burn: 100 }));
    game.particles = [];
  });
  for (const [freeze, freezeMax, chill] of [
    [120, 180, 100],
    [5, 180, 100],
    [60, 0, 100],
    [100, 180, 50],
    [0, 0, 100],
  ])
    for (const style of [0, 1, 4])
      run(`freeze ${freeze}/${freezeMax} chill ${chill} style ${style}`, () =>
        other(Object.assign(mk(style), { freeze, freezeMax, chill })),
      );
  run('frozen local', () =>
    local(Object.assign(mk(0, 0, 0), { freeze: 90, freezeMax: 120, chill: 100 })),
  );
  run('wet', () => other(Object.assign(mk(2), { wet: 20 })));
  run('silenced', () => other(Object.assign(mk(6), { silence: 120 })));
  run('flurry', () => other(Object.assign(mk(5), { flurryTime: 45 })));
  run('flurry full', () => other(Object.assign(mk(5), { flurryTime: 90 })));
  run('all status buildups', () =>
    other(
      Object.assign(mk(3), {
        burn: 40,
        wet: 30,
        chill: 60,
        scald: 20,
        magnetized: 50,
        overload: 10,
        static: 70,
      }),
    ),
  );
  run('status buildups tiny (filtered out)', () =>
    other(Object.assign(mk(3), { burn: 0.4, wet: 0.2, chill: 0.5, scald: 0.1 })),
  );
  run('low health', () => other(Object.assign(mk(7), { hp: 5 })));
  run('zero health', () => other(Object.assign(mk(7), { hp: 0 })));
  run('half health', () => other(Object.assign(mk(4), { hp: 100 })));
  run('team same side as local', () => other(mk(1, 0, 1)));
  run('team other side', () => other(mk(1, 1, 1)));
  run('local team 1 vs wizard team 0', () => {
    game.wizards[0] = createWizard(100, 100, 200, styles[0], 0, 1);
    other(mk(2, 0, 1));
    game.wizards[0].team = 0;
  });
  for (const mode of ['still', 'moving', 'mortal'] as const)
    for (const hp of [200, 60])
      run(`dummy ${mode} hp ${hp}`, () => {
        game.mode = mode;
        other(Object.assign(mk(3), { hp }));
        game.mode = 'online';
      });
  run('dummy with statuses', () => {
    game.mode = 'moving';
    other(Object.assign(mk(0), { burn: 70, chill: 100, freeze: 50, freezeMax: 100, wet: 10 }));
    game.mode = 'online';
  });
  run('kitchen sink', () =>
    other(
      Object.assign(mk(0), {
        swing: 8,
        chargeSpell: 'MAGMA',
        chargeTicks: 80,
        shield: { type: 2, life: 50 },
        burn: 80,
        freeze: 70,
        freezeMax: 100,
        chill: 100,
        wet: 50,
        silence: 30,
        flurryTime: 20,
        scald: 33,
        magnetized: 44,
        overload: 55,
        static: 66,
      }),
    ),
  );
  run('kitchen sink local', () =>
    local(
      Object.assign(mk(5, 0, 0), {
        chargeSpell: 'STORM',
        chargeTicks: 40,
        shield: { type: 4, life: 50 },
        burn: 30,
        silence: 30,
        flurryTime: 20,
        wet: 10,
      }),
    ),
  );
  run('under a transform (airborne/death style)', () => {
    const w = mk(1);
    game.wizards[1] = w;
    const gg = (
      globalThis as unknown as {
        document: {
          getElementById(
            i: string,
          ): CanvasRenderingContext2D & { getContext(t: string): CanvasRenderingContext2D };
        };
      }
    ).document;
    const ctx = gg.getElementById('game').getContext('2d');
    ctx.save();
    ctx.translate(0, -20);
    ctx.globalAlpha = 0.5;
    drawActor(w);
    ctx.restore();
  });
  for (const t of [0, 31, 62, 125, 250, 999])
    run(`idle animation t=${t}`, () => other(mk(t % 8), t));

  // ---- whole scenes through draw() ----
  const spells = [
    'FIRE',
    'WATER',
    'LIGHTNING',
    'EARTH',
    'STEAM',
    'PLASMA',
    'MAGMA',
    'STORM',
    'ICE',
    'MAGNETIC',
  ] as const;
  const variants = [undefined, 'default', 'pebbles', 'fireball', 'pyro_disc', 'shards'] as const;
  const bombSpells = [...spells];

  function populate(mapId: string, battleground: boolean) {
    reset(mapId, 'online', 140);
    const [p, e] = game.wizards;
    p.x = battleground ? 900 : 250;
    p.y = battleground ? 700 : 300;
    e.x = battleground ? 1150 : 800;
    e.y = battleground ? 760 : 330;
    Object.assign(e, { burn: 50, wet: 20, hp: 120 });
    Object.assign(p, { chargeSpell: 'ICE', chargeTicks: 50 });
    const owner = p;
    const ox = p.x;
    const oy = p.y;
    let id = 1;
    spells.forEach((k, i) => {
      for (const variant of variants) {
        const j = id++;
        const base = {
          id: j,
          x: ox + 60 + (j % 12) * 38,
          y: oy - 120 + Math.floor(j / 12) * 48 + (j % 5) * 7,
          vx: 4 + (j % 3),
          vy: ((j % 7) - 3) * 0.8,
          spell: k,
          owner,
          r: 8 + (j % 4),
          life: 120,
          damage: 10,
          trail: j % 6,
          variant,
          discHits: {},
          discInside: [],
          originX: ox,
          originY: oy,
        };
        if (k === 'MAGMA')
          game.shots.push({
            ...base,
            magma: true,
            tx: base.x + 90,
            ty: base.y + 30,
            hitTargets: new Set(),
          } as never);
        else
          game.shots.push({
            ...base,
            travel: 40 * (i % 3),
            maxTravel: 400,
            charged: j % 2 === 0,
            power: 1 + (j % 3),
            reflected: j % 11 === 0,
            returning: variant === 'pyro_disc' && j % 2 === 0,
          } as never);
      }
    });
    bombSpells.forEach((k, i) => {
      for (const landed of [false, true])
        game.bombs.push({
          id: 500 + i * 2 + Number(landed),
          sx: ox,
          sy: oy,
          tx: ox + 100 + i * 25,
          ty: oy + 60 + (landed ? 50 : 0),
          x: ox + 100 + i * 25,
          y: oy + 60 + (landed ? 50 : 0),
          flightProgress: landed ? 1 : 0.2 + i * 0.07,
          flight: 60,
          fuse: landed ? 30 + i * 12 : 180,
          spell: k,
          owner,
          landed,
          dead: false,
        } as never);
    });
    for (const k of ['MAGMA', 'STORM', 'WATER'] as const)
      game.zones.push({
        spell: k,
        x: ox + 200,
        y: oy - 60 + (k === 'STORM' ? 100 : 0) + (k === 'WATER' ? 200 : 0),
        r: 70,
        owner,
        life: 100,
        tick: 0,
        follow: k === 'STORM',
      } as never);
    spells.forEach((k, i) =>
      game.traps.push({
        id: 700 + i,
        spell: k,
        owner,
        x: ox - 150 + i * 36,
        y: oy + 130,
        life: 300,
        arm: i % 2 ? 0 : 40,
      } as never),
    );
    game.bubbles.push(
      { x: e.x, y: e.y, r: 90, owner: e, life: 200 },
      { x: ox, y: oy, r: 90, owner, life: 20 },
    );
    game.particles.push(
      { x: ox + 20, y: oy - 20, vx: 1, vy: -1, color: '#f97316', life: 14, r: 3 },
      {
        x: ox + 40,
        y: oy - 40,
        vx: 1,
        vy: -1,
        color: '#38bdf8',
        life: 9,
        r: 4,
        shape: 'tongue',
      } as never,
      {
        x: ox + 60,
        y: oy - 10,
        vx: 1,
        vy: -1,
        color: '#a78bfa',
        life: 20,
        r: 5,
        shape: 'oval',
      } as never,
      {
        x: ox + 80,
        y: oy - 30,
        vx: 1,
        vy: -1,
        color: '#4ade80',
        life: 12,
        r: 2,
        shape: 'circle',
      } as never,
    );
    game.labels.push(
      { x: ox + 20, y: oy - 90, text: '-24', color: '#fff', life: 10 },
      { x: e.x, y: e.y - 100, text: 'CRIT', color: '#facc15', life: 30 },
    );
    game.waves.push(
      { x: ox + 10, y: oy, r: 40, life: 20, color: '#4ade80' },
      { x: e.x, y: e.y, r: 90, life: 8, color: '#f97316' },
    );
    for (const [i, variant] of [
      undefined,
      'plasma_beam',
      'magnetic_pull',
      'thundercloud',
    ].entries()) {
      game.arcs.push({
        variant: variant as never,
        points: [
          { x: ox + 30, y: oy - 10 },
          { x: ox + 120 + i * 20, y: oy - 60 - i * 10 },
          { x: e.x - 40, y: e.y - 20 + i * 15 },
        ],
        life: 8,
        castOwner: i % 2,
        hit: i % 2 === 0,
        reach: 200,
        reflected: i === 3,
      });
    }
    // the beams are only drawn solo while their caster holds the button
    Object.assign(game.input[0], {
      holding: true,
      attack: 'PLASMA',
      loadout: { PLASMA: 'plasma_beam' },
    });
    Object.assign(game.input[1], {
      holding: true,
      attack: 'MAGNETIC',
      loadout: { MAGNETIC: 'magnetic_pull' },
    });
    game.input[0].mouse = { x: ox + 120 - camera.x, y: oy - 30 - camera.y };
  }

  const scene = (name: string, mapId: string, active: boolean, tweak?: () => void) =>
    run(name, () => {
      const battleground =
        game.map?.kind === 'battleground' || mapId === 'devbattle' || mapId === 'ruins';
      populate(mapId, battleground);
      game.active = active;
      tweak?.();
      updateCamera(game.map, game.wizards[0]);
      withCamera(draw);
    });
  const arenas = [
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
  ];
  for (const m of arenas) scene(`scene arena ${m}`, m, false);
  for (const m of ['enchanted', 'volcano']) scene(`scene arena ${m} active`, m, true);
  for (const m of ['devbattle', 'ruins']) {
    scene(`scene battleground ${m} no fog layer`, m, false);
    scene(`scene battleground ${m} fog`, m, true);
  }
  scene('scene enchanted with death', 'enchanted', false, () => {
    const w = game.wizards[1];
    game.death = { x: w.x, y: w.y, wizard: w, age: 40, mortal: false };
  });
  scene('scene enchanted airborne and prison', 'enchanted', false, () => {
    Object.assign(game.wizards[1], { airborne: 40, prison: 80 });
    Object.assign(game.wizards[0], { prison: 30 });
  });
  scene('scene enchanted online team view', 'enchanted', true, () => {
    net.online = true;
    net.seat = 0;
    net.hiddenSeats.add(1);
  });
  scene('scene enchanted online unseen', 'enchanted', true, () => {
    net.online = true;
    net.seat = 0;
    net.seenSeats.clear();
    net.seenSeats.add(0);
  });
  scene('scene enchanted online predicted shots', 'enchanted', false, () => {
    net.online = true;
    net.seat = 0;
  });
  scene('scene enchanted empty', 'enchanted', false, () => {
    game.shots = [];
    game.bombs = [];
    game.zones = [];
    game.bubbles = [];
    game.traps = [];
    game.particles = [];
    game.labels = [];
    game.arcs = [];
    game.waves = [];
  });
  // predicted own shots: net/prediction.ts draws them with projectile() (no variant, no flags)
  const { drawCastPreviews } = await import('../../client/src/net/prediction');
  run('prediction guest shots', () => {
    reset('enchanted', 'online', 140);
    net.online = true;
    net.seat = 0;
    net.castPreviews = spells
      .filter((k) => k !== 'FIRE' && k !== 'WATER')
      .map((kind, i) => ({
        castId: i,
        kind,
        x: 200,
        y: 300 + i * 20,
        dx: 1,
        dy: (i % 3) * 0.1,
        age: 12 + i * 3,
        life: kind === 'MAGMA' ? 115 : 70,
        continuous: false,
        seed: 1,
        parts: [],
        hitSomething: false,
        tx: 330,
        ty: 300 + i * 20,
        shieldType: null,
      })) as never;
    drawCastPreviews(1);
    net.castPreviews = [];
    net.online = false;
  });
  net.online = false;
  net.hiddenSeats.clear();
}

describe('render trace', () => {
  it('records the draw calls of every case', async () => {
    const label = process.env.TRACE_LABEL ?? 'trace';
    const out: Cases = {};
    await pass('loaded', true, out);
    await pass('plain', false, out);
    mkdirSync('screenshots', { recursive: true });
    writeFileSync(`screenshots/trace-${label}.json`, JSON.stringify(out));
    const names = Object.keys(out);
    const empty = names.filter((n) => out[n].length === 0);
    console.log(
      `${names.length} cases, ${names.reduce((a, n) => a + out[n].length, 0)} calls -> screenshots/trace-${label}.json`,
    );
    expect(empty).toEqual([]);
  });
});
