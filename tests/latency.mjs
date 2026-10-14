// Measures input/spell confirmation latency under simulated network delay.
// Start the server with e.g. ARCANE_LATENCY_MS=75 ARCANE_JITTER_MS=10, then: node tests/latency.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3036';
const browser = await chromium.launch();

async function measure() {
  const creator = await browser.newPage();
  const joiner = await browser.newPage();
  await creator.goto(base);
  await joiner.goto(base);
  await creator.click('#createRoom');
  await creator.waitForFunction(() =>
    /^[A-Z]{6}$/.test(document.getElementById('lobbyCode').value),
  );
  await joiner.fill('#roomCode', await creator.inputValue('#lobbyCode'));
  await joiner.click('#joinRoom');
  await creator.click('#startMatch:not([disabled])');
  const hidden = () => getComputedStyle(document.getElementById('menu')).display === 'none';
  await creator.waitForFunction(hidden);
  await joiner.waitForFunction(hidden);
  // the joiner presses keys and clicks for a while; ack times show up in the diagnostics line
  for (let i = 0; i < 12; i++) {
    await joiner.keyboard.press('1');
    await joiner.mouse.move(300, 300);
    await joiner.mouse.down();
    await joiner.waitForTimeout(150);
    await joiner.mouse.up();
    await joiner.waitForTimeout(150);
  }
  await joiner.waitForTimeout(2500); // allow a ping so RTT shows
  const diag = await joiner.textContent('#netdiag');
  const creatorDiag = await creator.textContent('#netdiag');
  await creator.close();
  await joiner.close();
  return { joiner: diag, creator: creatorDiag };
}

const r = await measure();
console.log(`joiner : ${r.joiner}`);
console.log(`creator: ${r.creator}`);
await browser.close();
