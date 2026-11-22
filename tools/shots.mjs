// Screenshot shoot for SOLMAR BAY (round 19).
// Spawns the repo's own serve.ts on a scratch port (8911), drives the
// game in headless Chrome through window.__solmar, stages four scenes
// and screenshots each at 1280x720 JPEG, stepping quality down
// (72, 55, 40, 28) until the file is under 256 KiB.
// Run from anywhere — paths resolve from this file's own location.
//   node tools/shots.mjs
import { spawn } from 'node:child_process';
import { statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const shotsDir = join(repoRoot, 'screenshots');
const PORT = 8911;
const MAX_BYTES = 262144;
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
    await page.keyboard.down(code);
    await sleep(2000);
    await page.keyboard.up(code);
    await sleep(300);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

async function waitFor(page, fn, timeoutMs = 60000, pollMs = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(fn)) return true;
    await sleep(pollMs);
  }
  return await page.evaluate(fn);
}

async function shoot(page, file) {
  const path = join(shotsDir, file);
  for (const quality of [72, 55, 40, 28]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    const bytes = statSync(path).size;
    console.log(`shot ${file}: quality ${quality}, ${bytes} bytes`);
    if (bytes < MAX_BYTES) return { file, bytes };
  }
  const bytes = statSync(path).size;
  console.log(`shot ${file}: still ${bytes} bytes at quality 28`);
  return { file, bytes };
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  const server = spawn('node', ['serve.ts'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await sleep(2000);
  const browser = await puppeteer.launch({
    executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
    defaultViewport: { width: 1280, height: 720 },
  });
  const results = [];
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2500);
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2000);
    await page.click('#btn-new');
    await sleep(1500);
    await holdKey(page, 'KeyX');
    await sleep(1500);

    // (1) Police chase downtown at 4-5 stars with the helicopter overhead.
    console.log('staging chase...');
    const chase = await stageChaseShot(page);
    console.log('chase staged:', JSON.stringify(chase));
    await page.evaluate(() => { window.__solmar.S.cash = 500; });
    await sleep(1500);
    results.push(await shoot(page, '37-sunset-chase.jpg'));

    // (2) Mission 1 briefing at the garage — dialogue open, LENA CRUZ.
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.heat = 0;
      S.player.pos.set(-90, 0, -66);
    });
    const briefed = await waitFor(page, () => {
      const el = document.getElementById('dialogue');
      return el && !el.classList.contains('hidden')
        && document.getElementById('dlg-name').textContent === 'LENA CRUZ'
        && window.__solmar.S.missions.current && window.__solmar.S.missions.current.id === 'm1';
    }, 60000);
    console.log('briefing visible:', briefed);
    await page.evaluate(() => { window.__solmar.S.cash = 500; });
    await sleep(1200);
    results.push(await shoot(page, '38-garage-briefing.jpg'));

    // (3) Street race — enter the parked sport car, roll to the pad, press T.
    await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => await page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(-60, 0, -60);
    });
    await holdKeyUntil(page, 'KeyT', async () => await page.evaluate(() => window.__solmar.S.sideActivities.race.active), 30000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(40, 0, -60);
    });
    await sleep(2000);
    await page.evaluate(() => { window.__solmar.S.cash = 500; });
    results.push(await shoot(page, '39-street-race.jpg'));

    // (4) Night ride on the bike — exit the car, take the bike, jump to night.
    await holdKeyUntil(page, 'KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
    await page.evaluate(() => { window.__solmar.S.player.pos.set(-88, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => await page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.time = 200;
      if (S.car) S.car.pos.set(0, 0, 0);
    });
    const night = await waitFor(page, () => window.__solmar.S.dayNight.night > 0.5, 120000, 5000);
    console.log('night landed:', night);
    await sleep(2000);
    await page.evaluate(() => { window.__solmar.S.cash = 500; });
    results.push(await shoot(page, '40-night-ride.jpg'));

    console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('shots done:', JSON.stringify(results));
  const bad = results.filter((r) => r.bytes >= MAX_BYTES);
  if (bad.length > 0) {
    console.error('shots over 256 KiB:', JSON.stringify(bad));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
