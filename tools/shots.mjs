// Screenshot driver for SOLMAR BAY. Spawns the repo's own serve.ts on
// a scratch port (8911), drives the game in headless Chrome through
// window.__solmar, stages four scenes and screenshots each at 1280x720
// JPEG, stepping quality down (72, 55, 40, 28) until the file is under
// 256 KiB. Run from anywhere — paths resolve from this file.
// Run as: node tools/shots.mjs
import { spawn } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageChaseShot } from './chase-shot.mjs';

const hereDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(hereDir, '..');
const GAME = join(repoRoot, 'game');
const SHOTS_DIR = join(repoRoot, 'screenshots');
const PORT = 8911;

const qaToolsPkg = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
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

async function shoot(page, file, qualities = [72, 55, 40, 28]) {
  const path = join(SHOTS_DIR, file);
  for (const q of qualities) {
    await page.screenshot({ path, type: 'jpeg', quality: q });
    const size = statSync(path).size;
    if (size < 262144) return { file, bytes: size, quality: q };
  }
  const size = statSync(path).size;
  return { file, bytes: size, quality: qualities[qualities.length - 1] };
}

async function waitFor(page, fn, timeoutMs = 60000, pollMs = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return true;
    await sleep(pollMs);
  }
  return await fn();
}

// The follow camera eases toward the player and needs ~20 s to converge
// after a long teleport at headless frame rates. Wait until it stops
// moving (two polls 3 s apart, <0.5 m drift, within 16 m of the player)
// so no shot is taken mid-flight inside a building face.
async function waitCameraSettled(page, timeoutMs = 90000) {
  const t0 = Date.now();
  let prev = null;
  while (Date.now() - t0 < timeoutMs) {
    const cur = await page.evaluate(() => {
      const c = window.__solmar.camera;
      const p = window.__solmar.S.player.pos;
      return [c.position.x, c.position.y, c.position.z, p.x, p.y, p.z];
    });
    if (prev) {
      const moved = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      const dist = Math.hypot(cur[0] - cur[3], cur[1] - cur[4], cur[2] - cur[5]);
      if (moved < 0.5 && dist < 16) return true;
    }
    prev = cur;
    await sleep(3000);
  }
  return false;
}

async function main() {
  const server = spawn('node', [join(repoRoot, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await sleep(1500);

  const browser = await puppeteer.launch({
    executablePath: process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
    defaultViewport: { width: 1280, height: 720 },
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1500);
  await holdKey(page, 'KeyX');
  await sleep(1200);
  await page.evaluate(() => {
    window.__solmar.S.cash = 500;
  });

  // (1) Police chase downtown at 4-5 stars with the helicopter overhead.
  const chase = await stageChaseShot(page);
  console.log('chase staged:', JSON.stringify(chase));
  await waitCameraSettled(page);
  const shot1 = await shoot(page, '05-sunset-chase.jpg');
  console.log('shot 1:', JSON.stringify(shot1));

  // (2) Mission 1 briefing at the garage — dialogue open, LENA CRUZ.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    S.player.pos.set(-90, 0, -66);
  });
  await waitFor(page, async () => page.evaluate(() => {
    const el = document.getElementById('dialogue');
    return el && !el.classList.contains('hidden')
      && document.getElementById('dlg-name').textContent === 'LENA CRUZ';
  }), 60000);
  // The garage door itself faces a walled-in pocket: every follow-camera
  // heading there stares into a flat building face. Step out to the open
  // street corner at (-96,-72), facing west, for a clear sunset street
  // view; the briefing dialogue stays open while the player moves.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.player.pos.set(-96, 0, -72);
    S.player.heading = -Math.PI / 2;
  });
  await waitCameraSettled(page);
  const shot2 = await shoot(page, '06-garage-briefing.jpg');
  console.log('shot 2:', JSON.stringify(shot2));

  // (3) Street race — enter the parked sport car, roll to the start pad,
  // press T, frame it mid-race.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.player.pos.set(-102, 0, -64);
  });
  await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 30000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(-60, 0, -60);
  });
  await holdKeyUntil(page, 'KeyT', async () => page.evaluate(() => window.__solmar.S.sideActivities.race.active), 30000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(30, 0, -60);
    if (S.car) S.car.heading = Math.PI / 2;
  });
  await waitCameraSettled(page);
  const shot3 = await shoot(page, '07-street-race.jpg');
  console.log('shot 3:', JSON.stringify(shot3));

  // (4) Night ride on the bike — exit the car, take the parked bike,
  // jump the clock to night, frame it downtown.
  await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !window.__solmar.S.car), 30000);
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(-88, 0, -64);
  });
  await holdKeyUntil(page, 'KeyE', async () => page.evaluate(() => !!window.__solmar.S.car), 30000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    if (S.car) S.car.pos.set(0, 0, 0);
    S.time = 200;
  });
  await waitFor(page, async () => page.evaluate(() => window.__solmar.S.dayNight.night > 0.5), 120000, 5000);
  await waitCameraSettled(page);
  const shot4 = await shoot(page, '08-night-ride.jpg');
  console.log('shot 4:', JSON.stringify(shot4));

  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  server.kill();
  console.log('shots done:', JSON.stringify([shot1, shot2, shot3, shot4]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
