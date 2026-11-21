// SOLMAR BAY — screenshot shoot. Run from anywhere (paths resolve from
// this file). Spawns the repo's own serve.ts on scratch port 8911, drives
// the game in headless Chrome through window.__solmar, stages four scenes
// and screenshots each at 1280x720 JPEG, stepping quality down
// (72, 55, 40, 28) until the file is under 256 KiB.
// Usage: node tools/shots.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
const PORT = 8911;
const HOME = process.env.HOME;
const qaToolsPkg = HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function poll(page, fn, timeoutMs = 60000, stepMs = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true;
    await sleep(stepMs);
  }
  return await fn();
}

async function shoot(page, file) {
  const tmp = join('/tmp', file);
  for (const q of [72, 55, 40, 28]) {
    await page.screenshot({ path: tmp, type: 'jpeg', quality: q });
    const bytes = statSync(tmp).size;
    if (bytes < 262144 || q === 28) {
      copyFileSync(tmp, join(shotsDir, file));
      console.log(`shot ${file}: ${bytes} bytes @ q${q}`);
      return bytes;
    }
  }
  return 0;
}

async function startGame(page) {
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1200);
  await holdKey(page, 'KeyX');
  await sleep(1200);
}

async function main() {
  const server = spawn('node', ['serve.ts'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    detached: true,
  });
  try {
    let up = false;
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/index.html`);
        if (r.ok) { up = true; break; }
      } catch (e) {}
      await sleep(500);
    }
    if (!up) throw new Error('serve.ts did not come up on ' + PORT);
    const browser = await puppeteer.launch({
      executablePath: HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
      defaultViewport: { width: 1280, height: 720 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    // 1 — police chase downtown at 4-5 stars with the helicopter overhead.
    await startGame(page);
    const chase = await stageChaseShot(page);
    console.log('chase staged:', JSON.stringify(chase));
    await sleep(1500);
    await shoot(page, '29-sunset-chase.jpg');

    // 2 — mission 1 briefing at the garage, dialogue open showing LENA CRUZ.
    await startGame(page);
    await page.evaluate(() => { window.__solmar.player.pos.set(-90, 0, -66); });
    await poll(page, async () => page.evaluate(() => {
      const el = document.getElementById('dialogue');
      return el && !el.classList.contains('hidden') && (document.getElementById('dlg-name') || {}).textContent === 'LENA CRUZ';
    }), 30000);
    await sleep(800);
    await shoot(page, '30-garage-briefing.jpg');

    // 3 — street race: enter the parked sport car, roll to the start pad, press T.
    await startGame(page);
    await page.evaluate(() => { window.__solmar.player.pos.set(-102, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => { const S = window.__solmar.S; if (S.car) S.car.pos.set(-60, 0, -60); });
    await holdKeyUntil(page, 'KeyT', async () => page.evaluate(() => window.__solmar.S.sideActivities.race.active), 30000);
    await page.evaluate(() => { const S = window.__solmar.S; if (S.car) S.car.pos.set(30, 0, -60); });
    await sleep(1500);
    await shoot(page, '31-street-race.jpg');

    // 4 — night ride on the bike downtown.
    await startGame(page);
    await page.evaluate(() => { window.__solmar.player.pos.set(-88, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(0, 0, 0);
      S.time = 200;
    });
    await poll(page, async () => page.evaluate(() => window.__solmar.S.dayNight.night > 0.5), 90000, 3000);
    await sleep(1000);
    await shoot(page, '32-night-ride.jpg');

    console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
    await browser.close();
  } finally {
    try { server.kill(); } catch (e) {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
