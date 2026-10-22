// Deterministic screenshots of the main screens, to prove a refactor changes nothing visible.
// Usage:
//   node scripts/screenshots.mjs <label> [--no-build]     capture into screenshots/<label>/
//   node scripts/screenshots.mjs --compare <labelA> <labelB>   pixel-compare two captures
// Two captures of the same code can differ in a handful of pixels (the cooldown sweep's edge
// depends on frame timing), so up to NOISE_PIXELS differing pixels per file count as "same".
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const outRoot = path.join(root, 'screenshots');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const names = args.filter((a) => !a.startsWith('--'));

const NOISE_PIXELS = 30;
const VIEWPORT = { width: 1280, height: 800 };
const FIXED_TIME = new Date('2026-01-01T12:00:00Z');
const PAUSE_CSS =
  '*,*::before,*::after{animation-play-state:paused!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}';

// ---------- compare ----------

async function compare(a, b) {
  const dirA = path.join(outRoot, a);
  const dirB = path.join(outRoot, b);
  const files = [...new Set([...fs.readdirSync(dirA), ...fs.readdirSync(dirB)])]
    .filter((f) => f.endsWith('.png'))
    .sort();
  const diffDir = path.join(outRoot, `diff-${a}-${b}`);
  fs.rmSync(diffDir, { recursive: true, force: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let differing = 0;
  for (const f of files) {
    const pa = path.join(dirA, f);
    const pb = path.join(dirB, f);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) {
      console.log(`${f}: DIFF (only in ${fs.existsSync(pa) ? a : b})`);
      differing++;
      continue;
    }
    // Decode both images in the browser and compare their pixels on a canvas.
    const result = await page.evaluate(
      async ([x, y]) => {
        const load = (b64) =>
          new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = 'data:image/png;base64,' + b64;
          });
        const pixels = (img) => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, c.width, c.height);
        };
        const [ia, ib] = [pixels(await load(x)), pixels(await load(y))];
        if (ia.width !== ib.width || ia.height !== ib.height)
          return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
        const out = new ImageData(ia.width, ia.height);
        let n = 0;
        for (let i = 0; i < ia.data.length; i += 4) {
          const same =
            ia.data[i] === ib.data[i] &&
            ia.data[i + 1] === ib.data[i + 1] &&
            ia.data[i + 2] === ib.data[i + 2] &&
            ia.data[i + 3] === ib.data[i + 3];
          if (same) {
            // faded copy of the unchanged pixel
            out.data[i] = out.data[i + 1] = out.data[i + 2] = ia.data[i] * 0.3 + 140;
            out.data[i + 3] = 255;
          } else {
            n++;
            out.data[i] = 255;
            out.data[i + 3] = 255;
          }
        }
        let png = null;
        if (n) {
          const c = document.createElement('canvas');
          c.width = out.width;
          c.height = out.height;
          c.getContext('2d').putImageData(out, 0, 0);
          png = c.toDataURL('image/png').split(',')[1];
        }
        return { n, png };
      },
      [fs.readFileSync(pa).toString('base64'), fs.readFileSync(pb).toString('base64')],
    );
    if (result.size) {
      console.log(`${f}: DIFF (sizes ${result.size})`);
      differing++;
    } else if (result.n > NOISE_PIXELS) {
      fs.mkdirSync(diffDir, { recursive: true });
      fs.writeFileSync(path.join(diffDir, f), Buffer.from(result.png, 'base64'));
      console.log(`${f}: DIFF ${result.n} pixels`);
      differing++;
    } else {
      console.log(result.n ? `${f}: same (${result.n} px noise)` : `${f}: same`);
    }
  }
  await browser.close();
  console.log(differing ? `${differing} of ${files.length} files differ` : 'all same');
  return differing ? 1 : 0;
}

// ---------- capture ----------

const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function startServer() {
  const port = await freePort();
  const child = spawn('node', ['dist/server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    child.on('exit', () => reject(new Error('server exited')));
    child.stdout.on('data', (d) => /listening/.test(d.toString()) && resolve());
  });
  return { child, base: `http://127.0.0.1:${port}` };
}

/** Same seed every page: mulberry32. */
const seedScript = `
  (() => {
    let a = 123456789;
    Math.random = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  })();
`;

async function capture(label) {
  if (!flags.has('--no-build')) execSync('npm run build', { cwd: root, stdio: 'inherit' });
  const outDir = path.join(outRoot, label);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const { child, base } = await startServer();
  const browser = await chromium.launch({ args: ['--mute-audio'] });
  const errors = [];

  /** A fresh page with a paused fake clock, seeded randomness and no saved state. */
  async function open(name, url = '/', { pauseCss = true } = {}) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
    await page.addInitScript(seedScript);
    await page.clock.install({ time: FIXED_TIME });
    await page.goto(base + url);
    await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1000));
    if (pauseCss) await page.addStyleTag({ content: PAUSE_CSS });
    await settle(page);
    return page;
  }
  /** Waits (in real time; the page clock is paused) for fonts and images, then lets a frame draw. */
  async function settle(page) {
    for (let i = 0; i < 200; i++) {
      const ready = await page.evaluate(
        async () =>
          (await document.fonts.ready) &&
          [...document.images].every((img) => img.complete) &&
          (!document.getElementById('menu') ||
            document.getElementById('menu').classList.contains('menu-ready') ||
            location.pathname.endsWith('.html')),
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    // images that decode lazily
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    await page.clock.runFor(100);
  }
  const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  const shot = async (page, name) => {
    await settle(page);
    // the version label changes with every bump; hide it so captures of two versions compare
    await page.evaluate(() => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());)
        if (/v\d+\.\d+\.\d+-\d+ ·/.test(n.nodeValue)) n.nodeValue = 'v0.0.0-0 · version';
    });
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log('captured', name);
  };
  const closeCtx = (page) => page.context().close();

  // menu, settings, spellbook, workshop
  let page = await open('menu');
  await shot(page, 'menu');
  await closeCtx(page);

  page = await open('settings');
  await click(page, '#arcaneOpenSettings');
  await page.clock.runFor(300);
  await shot(page, 'settings');
  await closeCtx(page);

  page = await open('spellbook');
  await click(page, '#arcaneOpenSpellbook');
  await page.clock.runFor(1000);
  await shot(page, 'spellbook');
  await closeCtx(page);

  page = await open('workshop');
  await click(page, '#arcaneOpenWorkshop');
  await page.clock.runFor(500);
  await shot(page, 'workshop');
  await closeCtx(page);

  // lobby: needs the server; the room code is random, so it is replaced before the screenshot
  page = await open('lobby');
  await click(page, '#arcaneOpenDuel');
  let code = '';
  for (let i = 0; i < 100 && !code; i++) {
    await new Promise((r) => setTimeout(r, 50));
    await page.clock.runFor(50);
    code = await page.evaluate(() => {
      const v = document.getElementById('lobbyCode').value;
      return /^[A-Z]{6}$/.test(v) ? v : '';
    });
  }
  if (!code) throw new Error('lobby: no room code');
  await page.clock.runFor(500);
  await page.evaluate((c) => {
    for (const el of document.querySelectorAll('input,textarea'))
      if (el.value.includes(c)) el.value = el.value.replaceAll(c, 'ABCDEF');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode())
      if (n.nodeValue.includes(c)) n.nodeValue = n.nodeValue.replaceAll(c, 'ABCDEF');
  }, code);
  await shot(page, 'lobby');
  await closeCtx(page);

  // solo practice against the still dummy
  page = await open('match');
  await click(page, '[data-mode="still"]');
  await page.mouse.move(900, 400);
  await page.clock.runFor(6000); // past the start countdown
  await shot(page, 'match-hud');
  // fire: element keys, then a click at a fixed spot, then let the shot fly
  await page.keyboard.press('1');
  await page.mouse.move(900, 400);
  await page.clock.runFor(100);
  await page.mouse.down();
  await page.clock.runFor(150);
  await page.mouse.up();
  await page.clock.runFor(60);
  await shot(page, 'match-cast');
  await page.keyboard.press('Escape');
  await page.clock.runFor(200);
  await shot(page, 'pause');
  await closeCtx(page);

  // results: the game's finish() is not reachable from window, so show #end as finish() does
  page = await open('results');
  await page.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    $('menu').style.display = 'none';
    $('end').dataset.outcome = 'victory';
    $('end').style.display = 'flex';
    $('toLobby').style.display = 'none';
    $('result').textContent = '🏆 VICTORY';
    $('result').style.color = '#fde68a';
    $('detail').textContent = 'You defeated the rival! Remaining health: 200/200';
  });
  await page.clock.runFor(500);
  await shot(page, 'results');
  await closeCtx(page);

  page = await open('styleguide', '/styleguide.html');
  await shot(page, 'styleguide');
  await closeCtx(page);

  await browser.close();
  child.kill();
  if (errors.length) console.log('page errors seen:\n' + errors.join('\n'));
}

if (flags.has('--compare')) {
  if (names.length !== 2) {
    console.error('usage: node scripts/screenshots.mjs --compare <labelA> <labelB>');
    process.exit(2);
  }
  process.exit(await compare(names[0], names[1]));
} else {
  if (names.length !== 1) {
    console.error('usage: node scripts/screenshots.mjs <label> [--no-build]');
    process.exit(2);
  }
  await capture(names[0]);
}
