// SOLMAR BAY — screenshot tool. Run from anywhere; paths resolve from
// this file's own location. Spawns the repo's own serve.ts on a scratch
// port (8911), drives the game in headless Chrome through window.__solmar,
// stages four scenes and screenshots each at 1280x720 JPEG, stepping the
// quality down (72, 55, 40, 28) until the file is under 256 KiB.
// Headless Chrome runs ~1 fps, so keys are held a full 2 s and conditions
// are polled instead of trusting fixed sleeps.
import { spawn } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const thisDir = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(thisDir, '..');
const SHOTS_DIR = join(REPO, 'screenshots');
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
    await holdKey(page, code);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

async function waitFor(page, fn, timeoutMs = 30000, stepMs = 1000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(fn)) return true;
    await sleep(stepMs);
  }
  return await page.evaluate(fn);
}

async function shoot(page, file) {
  const path = join(SHOTS_DIR, file);
  for (const quality of [72, 55, 40, 28]) {
    await page.screenshot({ path, type: 'jpeg', quality });
    if (statSync(path).size < MAX_BYTES) {
      console.log(`shot ${file}: ${statSync(path).size} bytes @ q${quality}`);
      return statSync(path).size;
    }
  }
  console.log(`shot ${file}: ${statSync(path).size} bytes @ q28 (still over cap!)`);
  return statSync(path).size;
}

async function main() {
  // Spawn the repo's own serve.ts on the scratch port.
  const server = spawn('node', [join(REPO, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const up = async () => {
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
        if (res.ok) return true;
      } catch (e) { /* not up yet */ }
      await sleep(500);
    }
    return false;
  };
  if (!(await up())) {
    console.error('serve.ts did not come up on port ' + PORT);
    server.kill();
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1500);
  await holdKey(page, 'KeyX');
  await sleep(1500);

  const sizes = {};

  // Scene 1 — police chase downtown, 4-5 stars, heli overhead.
  console.log('scene 1: chase...');
  const chase = await stageChaseShot(page);
  console.log('chase staged:', JSON.stringify(chase));
  await sleep(1500);
  sizes['13-sunset-chase.jpg'] = await shoot(page, '13-sunset-chase.jpg');

  // Cool off and reset the clock for the sunset scenes.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    S.time = 10;
  });
  await sleep(3000);

  // Scene 2 — mission 1 briefing at the garage, dialogue open, LENA CRUZ.
  console.log('scene 2: garage briefing...');
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(-90, 0, -66);
  });
  await waitFor(page, () => {
    const el = document.getElementById('dialogue');
    return el && !el.classList.contains('hidden')
      && document.getElementById('dlg-name').textContent === 'LENA CRUZ';
  }, 30000, 1000);
  await sleep(1200);
  sizes['14-garage-briefing.jpg'] = await shoot(page, '14-garage-briefing.jpg');

  // Scene 3 — street race: in the parked sport car, to the pad, press T.
  console.log('scene 3: street race...');
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    S.time = 20;
    S.player.pos.set(-102, 0, -64);
  });
  await holdKeyUntil(page, 'KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(-60, 0, -60);
  });
  await holdKeyUntil(page, 'KeyT', async () => (await page.evaluate(() => window.__solmar.S.sideActivities.race.active)), 30000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(30, 0, -60);
    if (S.car) S.car.heading = Math.PI / 2;
  });
  await sleep(2000);
  sizes['15-street-race.jpg'] = await shoot(page, '15-street-race.jpg');

  // Scene 4 — night ride on the bike downtown.
  console.log('scene 4: night ride...');
  await holdKeyUntil(page, 'KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    S.player.pos.set(-88, 0, -64);
  });
  await holdKeyUntil(page, 'KeyE', async () => {
    const S = await page.evaluate(() => ({ car: !!window.__solmar.S.car, kind: window.__solmar.S.car && window.__solmar.S.car.kind }));
    return S.car && S.kind === 'bike';
  }, 30000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.time = 200;
    if (S.car) S.car.pos.set(0, 0, 0);
  });
  await waitFor(page, () => window.__solmar.S.dayNight.night > 0.5, 60000, 2000);
  await sleep(1500);
  sizes['16-night-ride.jpg'] = await shoot(page, '16-night-ride.jpg');

  if (errors.length > 0) console.log('PAGE ERRORS during shoot:', errors.join(' | '));

  // shots.json (repo root): real byte sizes.
  const shotsJson = {
    entry: 'GTA6-01 round 13',
    game: 'SOLMAR BAY',
    width: 1280,
    height: 720,
    maxBytes: MAX_BYTES,
    shots: [
      { file: '13-sunset-chase.jpg', bytes: sizes['13-sunset-chase.jpg'], cash: 500, note: 'Police chase downtown at 4 stars with the helicopter overhead.' },
      { file: '14-garage-briefing.jpg', bytes: sizes['14-garage-briefing.jpg'], cash: 500, note: 'Mission 1 briefing at the garage — Lena Cruz lays out the first job.' },
      { file: '15-street-race.jpg', bytes: sizes['15-street-race.jpg'], cash: 500, note: 'Street race from the start pad in the sport car, chasing gate one.' },
      { file: '16-night-ride.jpg', bytes: sizes['16-night-ride.jpg'], cash: 500, note: 'Night ride downtown on the bike under neon and stars.' },
    ],
  };
  writeFileSync(join(REPO, 'shots.json'), JSON.stringify(shotsJson, null, 2) + '\n', 'utf8');
  console.log('shots.json written');

  await browser.close();
  server.kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
