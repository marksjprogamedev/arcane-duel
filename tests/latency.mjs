// Compares input/spell confirmation latency of the two netcodes under simulated network delay.
// Start the server with e.g. ARCANE_LATENCY_MS=75 ARCANE_JITTER_MS=10, then: node tests/latency.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3036';
const browser = await chromium.launch();

async function measure(serverNetcode) {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  await host.goto(base);
  await guest.goto(base);
  await host.setChecked('#serverNetcode', serverNetcode);
  await host.click('#createRoom');
  await host.waitForFunction(() => /^[A-Z]{6}$/.test(document.getElementById('roomCode').value));
  await guest.fill('#roomCode', await host.inputValue('#roomCode'));
  await guest.click('#joinRoom');
  const hidden = () => getComputedStyle(document.getElementById('menu')).display === 'none';
  await host.waitForFunction(hidden);
  await guest.waitForFunction(hidden);
  // the guest presses keys and clicks for a while; ack times show up in the diagnostics line
  for (let i = 0; i < 12; i++) {
    await guest.keyboard.press('1');
    await guest.mouse.move(300, 300);
    await guest.mouse.down();
    await guest.waitForTimeout(150);
    await guest.mouse.up();
    await guest.waitForTimeout(150);
  }
  await guest.waitForTimeout(2500); // allow a ping so RTT shows
  const diag = await guest.textContent('#netdiag');
  const host_diag = await host.textContent('#netdiag');
  await host.close();
  await guest.close();
  return { guest: diag, host: host_diag };
}

for (const [label, server] of [
  ['legacy host netcode', false],
  ['server-authoritative', true],
]) {
  const r = await measure(server);
  console.log(`${label.padEnd(22)} guest: ${r.guest}`);
  console.log(`${''.padEnd(22)} host : ${r.host}`);
}
await browser.close();
