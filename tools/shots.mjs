// Screenshot shooter for SOLMAR BAY (run from anywhere — paths resolve
// from this file). Spawns the repo's own serve.ts on a scratch port (8911),
// drives the game in headless Chrome through window.__solmar, stages four
// scenes and screenshots each at 1280x720 JPEG, stepping quality down
// (72, 55, 40, 28) until the file is under 256 KiB.
// Usage: node tools/shots.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { stageChaseShot } from './chase-shot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const SHOTS_DIR = join(REPO, 'screenshots');
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

async function shootUnder(page, file, maxBytes = 262144) {
  mkdirSync(SHOTS_DIR, { recursive: true });
  for (const q of [72, 55, 40, 28]) {
    const buf = await page.screenshot({ type: 'jpeg', quality: q });
    if (buf.length <= maxBytes || q === 28) {
      writeFileSync(join(SHOTS_DIR, file), buf);
      console.log(`${file}: ${buf.length} bytes @ quality ${q}`);
      return buf.length;
    }
  }
  return 0;
}

async function main() {
  const server = spawn('node', ['serve.ts'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1500);
  await holdKey(page, 'KeyX');
  await sleep(1000);
  console.log('game started, page errors so far:', errors.length);

  // (1) Police chase downtown at 4-5 stars with the helicopter overhead.
  const chase = await stageChaseShot(page);
  console.log('chase staged:', JSON.stringify(chase));
  await sleep(1500);
  await shootUnder(page, '37-sunset-chase.jpg');

  // (2) Mission 1 briefing at the garage — dialogue box open, LENA CRUZ.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.heat = 0;
    S.player.pos.set(-90, 0, -66);
  });
  await sleep(4000);
  const dlg = await page.evaluate(() => ({
    name: (document.getElementById('dlg-name') || {}).textContent,
    visible: !(document.getElementById('dialogue') || {}).classList?.contains('hidden'),
  }));
  console.log('briefing dialogue:', JSON.stringify(dlg));
  await shootUnder(page, '38-garage-briefing.jpg');

  // (3) Street race — enter the parked sport car, roll to the start pad, T.
  await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
  await holdKey(page, 'KeyE');
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(-60, 0, -60);
  });
  await holdKey(page, 'KeyT');
  await sleep(2000);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(30, 0, -60);
  });
  await sleep(1500);
  const race = await page.evaluate(() => window.__solmar.S.sideActivities.race.active);
  console.log('race active:', race);
  await shootUnder(page, '39-street-race.jpg');

  // (4) Night ride on the bike — exit the car, take the parked bike, jump
  // the clock to night, frame it downtown.
  await holdKey(page, 'KeyE'); // exit the car
  await page.evaluate(() => { window.__solmar.S.player.pos.set(-88, 0, -64); });
  await holdKey(page, 'KeyE'); // enter the bike
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.time = 200;
    if (S.car) S.car.pos.set(0, 0, 0);
    S.player.pos.set(0, 0, 0);
  });
  let night = 0;
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    night = await page.evaluate(() => window.__solmar.S.dayNight.night);
    if (night > 0.5) break;
  }
  console.log('night level:', night);
  await shootUnder(page, '40-night-ride.jpg');

  console.log('page errors total:', errors.length, errors.join(' | '));
  await browser.close();
  server.kill();
  if (errors.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
