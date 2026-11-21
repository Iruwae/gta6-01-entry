// SOLMAR BAY — screenshot shoot for gta6-01 round 14.
// Spawns the repo's own serve.ts on a scratch port (8911), drives the game
// in headless Chrome through window.__solmar, stages four scenes and
// screenshots each at 1280x720 JPEG, stepping quality down (72, 55, 40, 28)
// until the file is under 256 KiB. Run from anywhere — paths resolve from
// this file's own location.
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'game');
const SHOTS_DIR = join(ROOT, 'screenshots');
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
    await page.keyboard.down(code);
    await sleep(2000);
    await page.keyboard.up(code);
    await sleep(300);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

async function shoot(page, file, note) {
  for (const quality of [72, 55, 40, 28]) {
    const buf = await page.screenshot({ type: 'jpeg', quality });
    if (buf.length <= 262144 || quality === 28) {
      writeFileSync(join(SHOTS_DIR, file), buf);
      console.log(`shot ${file}: ${buf.length} bytes @ q${quality} — ${note}`);
      return buf.length;
    }
  }
  return 0;
}

async function main() {
  const server = spawn('node', ['serve.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await sleep(1500);
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
      defaultViewport: { width: 1280, height: 720 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2500);
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2000);

    // (1) Police chase downtown at 4-5 stars with the helicopter overhead.
    const chase = await stageChaseShot(page);
    console.log('chase staged:', JSON.stringify(chase));
    await sleep(1000);
    const b1 = await shoot(page, '17-sunset-chase.jpg', 'Police chase downtown at 4 stars, helicopter overhead, roster live');

    // Cool off and reset for the briefing.
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.heat = 0;
      S.missions.abandon();
      S.missionIndex = 0;
      S.player.pos.set(-90, 0, -66);
    });
    await sleep(3000);
    // (2) Mission 1 briefing at the garage — dialogue open, LENA CRUZ.
    for (let i = 0; i < 10; i++) {
      const ok = await page.evaluate(() => {
        const el = document.getElementById('dialogue');
        return el && !el.classList.contains('hidden') && (document.getElementById('dlg-name') || {}).textContent === 'LENA CRUZ';
      });
      if (ok) break;
      await sleep(2000);
    }
    const b2 = await shoot(page, '18-garage-briefing.jpg', 'Mission 1 briefing at the garage, Lena Cruz on the dialogue box');

    // Advance past the briefing, then take the sport car to the race pad.
    await page.click('#dialogue').catch(() => {});
    await sleep(800);
    await page.click('#dialogue').catch(() => {});
    await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(-60, 0, -60);
    });
    await holdKeyUntil(page, 'KeyT', async () => (await page.evaluate(() => window.__solmar.S.sideActivities.race.active)) === true, 30000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(30, 0, -60);
    });
    await sleep(2000);
    // (3) Street race, mid-race between the gates.
    const b3 = await shoot(page, '19-street-race.jpg', 'Street race mid-run in the sport car, gates ahead, sunset light');

    // (4) Night ride on the bike downtown.
    await holdKeyUntil(page, 'KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.sideActivities.race.active = false;
      S.player.pos.set(-88, 0, -64);
    });
    await holdKeyUntil(page, 'KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.time = 200; // 21:48, night
      if (S.car) S.car.pos.set(0, 0, 30);
    });
    for (let i = 0; i < 24; i++) {
      const night = await page.evaluate(() => window.__solmar.S.dayNight.night);
      if (night > 0.5) break;
      await sleep(5000);
    }
    await sleep(1500);
    const b4 = await shoot(page, '20-night-ride.jpg', 'Night ride on the bike downtown, neon streets, minimap live');

    if (errors.length) console.log('page errors during shoot:', errors.join(' | '));
    console.log(JSON.stringify({ b1, b2, b3, b4 }));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
