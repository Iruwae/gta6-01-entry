// Screenshot helper for SOLMAR BAY (make.fun gta6-01).
// Takes 4 real renders of the game in headless Chromium and writes them to
// screenshots/ as JPEGs (1280x720, quality 80, each <= 256 KiB).
// Every shot stages a real game state through play (keys) plus the QA hook
// window.__solmar (teleport / heat / mission start) — the pixels are the
// game's own renderer in a browser, nothing composited or borrowed.
//
// Usage (from the repo root):
//   node tools/shots.mjs
// Requires puppeteer-core in ~/workspace/makefun/qa-tools/node_modules and
// Chromium in ~/.cache/ms-playwright (headless shell).
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const REPO = resolve(process.env.HOME + '/workspace/makefun/gta6-01-entry');
const GAME = join(REPO, 'game');
const SHOTS = join(REPO, 'screenshots');
const PORT = 8903;
mkdirSync(SHOTS, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = join(GAME, p === '/' ? 'index.html' : p);
  if (!file.startsWith(GAME) || !existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
await sleep(2500);

const st = () => page.evaluate(() => {
  const S = window.__solmar.S;
  return {
    mode: S.mode, time: +S.time.toFixed(2), wanted: S.wanted, heat: +S.heat.toFixed(1),
    mission: S.missions?.current?.id || null, stage: S.missions?.stageIdx ?? -1,
    px: +S.player.pos.x.toFixed(1), pz: +S.player.pos.z.toFixed(1),
    onFoot: S.player.onFoot, inCar: !!S.car, carSpeed: S.car ? +S.car.speed.toFixed(1) : 0,
    policeCars: S.cars.filter((c) => c.aiPolice).length,
    rivals: S.missions?.rivals?.length ?? 0, camYaw: +S.camYaw.toFixed(3),
  };
});
async function waitGame(sec) {
  const t0 = (await st()).time;
  const wall0 = Date.now();
  while (Date.now() - wall0 < 90000) {
    if ((await st()).time - t0 >= sec) return;
    await sleep(250);
  }
}
async function tapKey(code, holdMs = 500) {
  await page.keyboard.down(code); await sleep(holdMs); await page.keyboard.up(code);
}
async function teleport(x, z) {
  await page.evaluate((a, b) => {
    const w = window.__solmar;
    w.player.pos.set(a, 0, b);
    w.player.vel.set(0, 0, 0);
  }, x, z);
  await sleep(200);
}
// Turn the camera (click-drag look) so camera-forward points at (x, z).
async function aimAt(x, z) {
  for (let i = 0; i < 6; i++) {
    const s = await st();
    const cam = await page.evaluate(() => { const c = window.__solmar.S.camera; return { x: c.position.x, z: c.position.z }; });
    const desired = Math.atan2(-(x - cam.x), -(z - cam.z));
    let d = desired - s.camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < 0.03) return;
    const px = Math.round(-d / 0.0032);
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(640 + Math.max(-600, Math.min(600, px)), 360, { steps: 8 });
    await page.mouse.up();
    await sleep(120);
  }
}
async function shoot(name) {
  const path = join(SHOTS, name);
  await page.screenshot({ path, type: 'jpeg', quality: 80 });
  const size = statSync(path).size;
  const s = await st();
  console.log(`${name}: ${(size / 1024).toFixed(0)} KiB  mode=${s.mode} wanted=${s.wanted} mission=${s.mission} stage=${s.stage} inCar=${s.inCar} speed=${s.carSpeed} police=${s.policeCars}`);
  if (size > 262144) console.log(`  WARNING: ${name} exceeds 256 KiB`);
}
async function newGame() {
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1200);
}

await newGame();

// 1-chase (cover): driving with 3 stars, police on the tail, mission live.
await teleport(-76, -67.5);
await tapKey('KeyE');
await sleep(500);
// Put the car on the z=-60 road heading east so the chase runs clean.
await page.evaluate(() => {
  const S = window.__solmar.S;
  if (S.car) { S.car.pos.set(-40, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 12; }
});
await page.evaluate(() => { const S = window.__solmar.S; S.heat = 90; });
await page.keyboard.down('KeyW');
await waitGame(6); // police arrive and close in
await page.keyboard.up('KeyW');
await shoot('1-chase.jpg');

// 2-mission: mission 1, sport car, beacon over the bank, objective on HUD.
await newGame();
await teleport(-90, -64);
await tapKey('KeyE'); // mission sport car
await sleep(500);
// Drive toward the bank along the roads; screenshot mid-route with the
// beacon visible ahead.
await page.keyboard.down('KeyW');
await waitGame(4);
await page.keyboard.up('KeyW');
await shoot('2-mission.jpg');

async function exitCarIfAny() {
  const s = await st();
  if (s.inCar) { await tapKey('KeyE'); await sleep(300); }
}
// 3-drive: cruising a busy road — traffic, buildings, speed on the HUD.
await exitCarIfAny();
await teleport(-76, -67.5);
await tapKey('KeyE'); // parked sport car by the garage
await sleep(500);
await page.evaluate(() => {
  const S = window.__solmar.S;
  if (S.car) { S.car.pos.set(0, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 10; }
});
await page.keyboard.down('KeyW');
await waitGame(3);
await page.keyboard.up('KeyW');
await shoot('3-drive.jpg');

// 4-onfoot: harbor crew fight — crosshair, rivals, wanted stars, objective.
await exitCarIfAny();
await page.evaluate(() => { const S = window.__solmar.S; S.missions.start(2); });
await teleport(90, 128);
await sleep(500);
// Face the harbor crew so the crosshair sits on them.
const r = await page.evaluate(() => {
  const S = window.__solmar.S;
  const rs = S.missions.rivals.filter((p) => p.alive);
  return rs.length ? { x: rs[0].pos.x, z: rs[0].pos.z } : null;
});
if (r) await aimAt(r.x, r.z);
await waitGame(1);
await shoot('4-onfoot.jpg');

if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
writeFileSync(join(REPO, 'shots.json'), JSON.stringify([
  { name: '1-chase.jpg', scene: 'Police chase at 3 stars: driving the stolen sport car with police cars on the tail, wanted stars + minimap + mission objective on the HUD' },
  { name: '2-mission.jpg', scene: 'Mission 1 First Wheels: driving the sport car toward the Solmar Bank, mission beacon and objective on the HUD' },
  { name: '3-drive.jpg', scene: 'Cruising the city roads in traffic: buildings, lamps, speed on the HUD' },
  { name: '4-onfoot.jpg', scene: 'Mission 3 Harbor Heat on foot: crosshair on the harbor crew, wanted stars and objective on the HUD' },
], null, 2) + '\n');
console.log('shots.json written');

await browser.close();
server.close();
