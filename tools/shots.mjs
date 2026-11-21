// SOLMAR BAY — screenshot shoot. Run from anywhere (paths resolve from
// this file). Spawns the repo's own serve.ts on scratch port 8911, drives
// the game in headless Chrome through window.__solmar, stages four scenes
// and screenshots each at 1280x720 JPEG, stepping quality down
// (72, 55, 40, 28) until the file is under 256 KiB.
//   21-sunset-chase.jpg    police chase downtown, 4-5 stars, heli overhead
//   22-garage-briefing.jpg mission 1 briefing at the garage (LENA CRUZ)
//   23-street-race.jpg     mid-race at the gates
//   24-night-ride.jpg      night ride on the bike downtown
import { spawn } from 'node:child_process';
import { statSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_DIR = join(ROOT, 'screenshots');
const PORT = 8911;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const qaToolsPkg = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(qaToolsPkg)('puppeteer-core');
const { stageChaseShot } = await import('./chase-shot.mjs');

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

async function closeDialogue(page) {
  // The m1 briefing auto-starts at spawn; click through it until the box
  // hides so it does not sit over every other scene.
  for (let i = 0; i < 3; i++) {
    const visible = await page.evaluate(() => {
      const el = document.getElementById('dialogue');
      return el && !el.classList.contains('hidden');
    });
    if (!visible) return;
    await page.click('#dialogue');
    await sleep(800);
  }
}

async function shoot(page, file) {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const path = join(SHOTS_DIR, file);
  for (const q of [72, 55, 40, 28]) {
    await page.screenshot({ path, type: 'jpeg', quality: q });
    const size = statSync(path).size;
    console.log(`${file}: quality ${q} -> ${size} bytes`);
    if (size < 262144) return { file, bytes: size };
  }
  return { file, bytes: statSync(path).size };
}

async function main() {
  const server = spawn('node', ['serve.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
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
      executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
      defaultViewport: { width: 1280, height: 720 },
    });
    try {
      const page = await browser.newPage();
      page.on('pageerror', (e) => console.log('PAGEERROR: ' + String(e)));
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
      await sleep(2000);
      await page.evaluate(() => { localStorage.clear(); });
      await page.reload({ waitUntil: 'load', timeout: 60000 });
      await sleep(2000);
      await page.click('#btn-new');
      await sleep(1500);
      await holdKey(page, 'KeyX'); // skip the intro cutscene
      await sleep(1000);
      await closeDialogue(page); // m1 auto-started at spawn; hide it

      // (1) Police chase downtown, 4-5 stars, heli overhead.
      const chase = await stageChaseShot(page);
      console.log('chase staged:', JSON.stringify(chase));
      await sleep(3000);
      const s1 = await shoot(page, '21-sunset-chase.jpg');

      // (2) Mission 1 briefing at the garage — dialogue open, LENA CRUZ.
      await page.evaluate(() => { window.__solmar.S.heat = 0; });
      await waitFor(page, () => window.__solmar.S.cops.length === 0 && window.__solmar.S.cars.filter((c) => c.aiPolice).length === 0, 60000);
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-90, 0, -66); });
      // Re-show the briefing (it was closed for the chase shot).
      await page.evaluate(() => { window.__solmar.S.missions.start(0); });
      await waitFor(page, () => {
        const el = document.getElementById('dialogue');
        return el && !el.classList.contains('hidden') && document.getElementById('dlg-name').textContent === 'LENA CRUZ';
      }, 60000);
      // Step out from the garage wall so the building reads in frame:
      // stand south-east of the garage, facing back toward it.
      await page.evaluate(() => {
        const S = window.__solmar.S;
        S.player.pos.set(-78, 0, -48);
        S.player.heading = -2.36;
      });
      await sleep(4000);
      const s2 = await shoot(page, '22-garage-briefing.jpg');
      await closeDialogue(page);

      // (3) Street race — enter the parked sport car, roll to the pad, T.
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
      await holdKeyUntil(page, 'KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        if (S.car) S.car.pos.set(-60, 0, -60);
      });
      await holdKeyUntil(page, 'KeyT', async () => (await page.evaluate(() => window.__solmar.S.sideActivities.race.active)) === true, 30000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        if (S.car) { S.car.pos.set(20, 0, -60); S.car.heading = Math.PI / 2; }
      });
      await sleep(3000);
      const s3 = await shoot(page, '23-street-race.jpg');

      // (4) Night ride on the bike downtown.
      await holdKeyUntil(page, 'KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
      await page.evaluate(() => { window.__solmar.S.player.pos.set(-88, 0, -64); });
      await holdKeyUntil(page, 'KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
      await page.evaluate(() => {
        const S = window.__solmar.S;
        S.time = 200;
        if (S.car) S.car.pos.set(0, 0, 0);
      });
      await waitFor(page, () => window.__solmar.S.dayNight.night > 0.5, 90000, 5000);
      await sleep(3000);
      const s4 = await shoot(page, '24-night-ride.jpg');

      console.log(JSON.stringify([s1, s2, s3, s4], null, 2));
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
