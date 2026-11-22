// SOLMAR BAY — screenshot tool (round 18). Run from anywhere — paths
// resolve from this file. Spawns the repo's own serve.ts on a scratch
// port (8911), drives the game in headless Chrome through
// window.__solmar, stages four scenes and screenshots each at 1280x720
// JPEG, stepping quality down (72, 55, 40, 28) until the file is under
// 256 KiB:
//   33-sunset-chase.jpg    police chase downtown, 4-5 stars, heli overhead
//   34-garage-briefing.jpg mission 1 briefing at the garage (LENA CRUZ)
//   35-street-race.jpg     mid-race after pressing T at the start pad
//   36-night-ride.jpg      night ride on the bike downtown
// Headless Chrome runs ~1 fps, so keys are held a full 2 s and conditions
// are polled instead of trusting fixed sleeps.
import { spawn } from 'node:child_process';
import { writeFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const shotsDir = join(repo, 'screenshots');
const PORT = 8911;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const qaToolsPkg = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)('puppeteer-core');

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

async function shoot(page, file, label) {
  const path = join(shotsDir, file);
  for (const quality of [72, 55, 40, 28]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    const bytes = statSync(path).size;
    console.log(`${label}: ${file} ${bytes} bytes @ q${quality}`);
    if (bytes < 262144) return bytes;
  }
  return statSync(path).size;
}

async function startFresh(page) {
  // Navigate first: localStorage is denied on about:blank before any page loads.
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1500);
  await holdKey(page, 'KeyX');
  await sleep(1200);
}

async function main() {
  const server = spawn(process.execPath, [join(repo, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await sleep(1500);
  const browser = await puppeteer.launch({
    executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  try {
    // (1) Police chase downtown at 4-5 stars with the helicopter overhead.
    await startFresh(page);
    const chase = await stageChaseShot(page);
    console.log('chase staged:', JSON.stringify(chase));
    await sleep(1500);
    const b1 = await shoot(page, '33-sunset-chase.jpg', 'chase');

    // (2) Mission 1 briefing at the garage — dialogue open, LENA CRUZ.
    await startFresh(page);
    await page.evaluate(() => {
      window.__solmar.player.pos.set(-90, 0, -66);
    });
    await sleep(4000);
    const dlg = await page.evaluate(() => ({
      name: (document.getElementById('dlg-name') || {}).textContent,
      visible: !(document.getElementById('dialogue') || {}).classList?.contains('hidden'),
    }));
    console.log('briefing dialogue:', JSON.stringify(dlg));
    const b2 = await shoot(page, '34-garage-briefing.jpg', 'briefing');

    // (3) Street race — enter the parked sport car, roll to the start
    // pad, press T, frame it mid-race.
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-102, 0, -64);
    });
    await holdKeyUntil(page, 'KeyE', async () => await page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(-60, 0, -60);
    });
    await holdKeyUntil(page, 'KeyT', async () => await page.evaluate(() => window.__solmar.S.sideActivities.race.active), 30000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(30, 0, -60);
      S.player.pos.set(30, 0, -60);
    });
    await sleep(2500);
    const b3 = await shoot(page, '35-street-race.jpg', 'race');

    // (4) Night ride on the bike — exit the car, take the parked bike,
    // jump the clock to night, frame it downtown.
    await holdKeyUntil(page, 'KeyE', async () => await page.evaluate(() => !window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-88, 0, -64);
    });
    await holdKeyUntil(page, 'KeyE', async () => await page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.time = 200;
      if (S.car) S.car.pos.set(0, 0, 20);
    });
    for (let i = 0; i < 24; i++) {
      await sleep(4000);
      const night = await page.evaluate(() => window.__solmar.S.dayNight.night);
      if (night > 0.5) break;
    }
    await sleep(1500);
    const b4 = await shoot(page, '36-night-ride.jpg', 'night');

    console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
    console.log(`shots done: 33=${b1} 34=${b2} 35=${b3} 36=${b4}`);
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
