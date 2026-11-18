// One-off re-shoot of 1-chase.jpg only (round 4).
// The full shots.mjs chase staging ends BUSTED: 6 police cars ram the
// player car to death in ~6 game-seconds, the player is ejected on foot
// and arrested. This script stages the same chase but pins the player
// car's and the player's health at 100 on a 400 ms wall-clock interval
// (QA-hook staging only — no game code changed), so the chase stays live
// for the cover shot. Retries once with a shorter drive if it still ends
// non-playing.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const qaToolsPkg = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)('puppeteer-core');

const REPO = resolve(process.env.HOME + '/workspace/makefun/gta6-01-entry');
const GAME = join(REPO, 'game');
const SHOTS = join(REPO, 'screenshots');
const PORT = 8904;
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
    camYaw: +S.camYaw.toFixed(3),
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
async function holdKeyUntil(code, checkFn, timeoutMs = 20000) {
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
async function teleport(x, z) {
  await page.evaluate((a, b) => {
    const w = window.__solmar;
    w.player.pos.set(a, 0, b);
    w.player.vel.set(0, 0, 0);
  }, x, z);
  await sleep(200);
}
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
  return s;
}
async function newGame() {
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1200);
}

async function stageChase(driveSec) {
  await newGame();
  await teleport(-76, -67.5);
  await holdKeyUntil('KeyE', async () => (await st()).inCar);
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) { S.car.pos.set(-40, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 12; }
  });
  await page.evaluate(() => { const S = window.__solmar.S; S.heat = 90; });
  // Pin health at 100 while the chase runs: 6 ramming police cars would
  // otherwise explode the player car and get Marco arrested mid-shot.
  const topUp = setInterval(() => {
    page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.health = 100;
      if (S.player) { S.player.health = 100; S.health = 100; }
    }).catch(() => {});
  }, 400);
  await page.keyboard.down('KeyW');
  await waitGame(driveSec);
  await page.keyboard.up('KeyW');
  clearInterval(topUp);
  const pc = await page.evaluate(() => {
    const S = window.__solmar.S;
    let best = null, bd = 1e9;
    for (const c of S.cars) { if (!c.aiPolice) continue; const d = Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z); if (d < bd) { bd = d; best = c; } }
    return best ? { x: best.pos.x, z: best.pos.z } : null;
  });
  if (pc) await aimAt(pc.x, pc.z);
  await waitGame(0.5);
  return shoot('1-chase.jpg');
}

let s = await stageChase(6);
if (s.mode !== 'playing') {
  console.log(`chase ended ${s.mode} — retrying with a ${4}s drive`);
  s = await stageChase(4);
}
console.log(`FINAL mode=${s.mode} wanted=${s.wanted} inCar=${s.inCar} police=${s.policeCars}`);
if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));

await browser.close();
server.close();
