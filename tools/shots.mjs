// SOLMAR BAY — screenshot shooter. Runs from anywhere (paths resolve
// from this file). Spawns the repo's own serve.ts on a scratch port
// (8911), drives the game in headless Chrome through window.__solmar,
// stages four scenes and screenshots each at 1280x720 JPEG, stepping
// quality down (72, 55, 40, 28) until the file is under 256 KiB.
//
//   (1) 09-sunset-chase.jpg    police chase downtown, 4-5 stars, heli up
//   (2) 10-garage-briefing.jpg mission 1 briefing at the garage (LENA CRUZ)
//   (3) 11-street-race.jpg     street race, mid-race from the sport car
//   (4) 12-night-ride.jpg      night ride on the bike downtown
//
// Headless Chrome runs ~1 fps, so keys are held a full 2 s and conditions
// are polled instead of trusting fixed sleeps.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHASE_STAGING, stageChaseShot } from './chase-shot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const PORT = 8911;
const HOME = process.env.HOME;
const PUPPETEER_PKG = HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(PUPPETEER_PKG) ? PUPPETEER_PKG : import.meta.url)('puppeteer-core');
const CHROME = HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = [
  { file: '09-sunset-chase.jpg', note: 'Police chase downtown at 4 stars with the helicopter overhead.' },
  { file: '10-garage-briefing.jpg', note: 'Mission 1 briefing at the garage — Lena Cruz lays out the first job.' },
  { file: '11-street-race.jpg', note: 'Street race from the start pad, gates ahead, sunset on the bay.' },
  { file: '12-night-ride.jpg', note: 'Night ride on the bike downtown under neon and stars.' },
];

async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

async function holdKeyUntil(page, code, checkFn, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await holdKey(page, code);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

async function waitFor(page, checkFn, timeoutMs = 60000, stepMs = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await checkFn()) return true;
    await sleep(stepMs);
  }
  return await checkFn();
}

async function shoot(page, file) {
  const path = join(REPO, 'screenshots', file);
  for (const quality of [72, 55, 40, 28]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    const bytes = statSync(path).size;
    console.log(`shot ${file}: quality ${quality}, ${bytes} bytes`);
    if (bytes < 262144) return bytes;
  }
  return statSync(path).size;
}

async function startGame(page) {
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1500);
  await holdKey(page, 'KeyX');
  await waitFor(page, async () => (await page.evaluate(() => window.__solmar.S.mode)) === 'playing', 30000);
}

async function main() {
  const server = spawn('node', [join(REPO, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });
  try {
    // Wait for the server to answer.
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
        if (res.ok) break;
      } catch (e) { /* not up yet */ }
      await sleep(500);
    }
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
      defaultViewport: { width: 1280, height: 720 },
    });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
      await sleep(2500);

      const results = [];

      // (1) Police chase downtown.
      await startGame(page);
      const chase = await stageChaseShot(page);
      console.log('chase staged:', JSON.stringify(chase));
      await sleep(2000);
      results.push({ ...SHOTS[0], bytes: await shoot(page, SHOTS[0].file), cash: 500 });

      // (2) Mission 1 briefing at the garage.
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-90, 0, -66); });
      await waitFor(page, async () => page.evaluate(() => {
        const el = document.getElementById('dialogue');
        return el && !el.classList.contains('hidden')
          && (document.getElementById('dlg-name') || {}).textContent === 'LENA CRUZ';
      }), 60000);
      await sleep(1000);
      results.push({ ...SHOTS[1], bytes: await shoot(page, SHOTS[1].file), cash: 500 });

      // (3) Street race: take the sport car, roll to the pad, press T.
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
      await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 20000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        if (S.car) S.car.pos.set(-60, 0, -60);
      });
      await holdKeyUntil(page, 'KeyT', async () => page.evaluate(() => window.__solmar.S.sideActivities.race.active), 30000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        if (S.car) S.car.pos.set(30, 0, -60);
      });
      await sleep(2000);
      results.push({ ...SHOTS[2], bytes: await shoot(page, SHOTS[2].file), cash: 500 });

      // (4) Night ride on the bike downtown.
      await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !window.__solmar.S.car), 20000);
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-88, 0, -64); });
      await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 20000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        S.time = 200;
        if (S.car) S.car.pos.set(0, 0, 0);
      });
      await waitFor(page, async () => page.evaluate(() => window.__solmar.S.dayNight.night) > 0.5, 120000, 5000);
      await sleep(1500);
      results.push({ ...SHOTS[3], bytes: await shoot(page, SHOTS[3].file), cash: 500 });

      console.log('shots done:', JSON.stringify(results, null, 2));
      console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
      if (errors.length) process.exitCode = 1;
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
