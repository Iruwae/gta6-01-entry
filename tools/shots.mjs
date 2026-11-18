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
import { createRequire } from 'node:module';
// puppeteer-core lives in ~/workspace/makefun/qa-tools/node_modules (shared
// QA install), not in this repo — resolve it from there when present.
const qaToolsPkg = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)('puppeteer-core');

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

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
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
// Press a key repeatedly until a condition is true: at ~1 fps headless a
// single tap can fall between frames, and HOLDING the key only produces
// ONE press edge — if that edge fires before the target exists (the
// mission sport car spawns 1-2 frames after the mission starts), the
// enter never happens. Cycling down/up generates a fresh edge each time.
// The down-hold is long (2 s) so it covers a frame even at ~0.5 fps.
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
// Aim the camera at the SKY-7 news chopper so the heli reads in the chase
// frame: like aimAt, but the target is 17 m up — the in-game camera tilt
// (tiltBoost) lifts the pitch the rest of the way once we face its azimuth.
async function aimAtHeli() {
  const hp = await page.evaluate(() => {
    const S = window.__solmar.S;
    const h = S.skyWatch && S.skyWatch.mesh ? S.skyWatch.mesh.position : null;
    return h ? { x: h.x, y: h.y, z: h.z } : null;
  });
  if (!hp) { console.log('heli: SKY-7 not up'); return false; }
  await aimAt(hp.x, hp.z);
  console.log(`heli in frame at (${hp.x.toFixed(1)}, ${hp.y.toFixed(1)}, ${hp.z.toFixed(1)})`);
  return true;
}
// Tilt the camera up so the heli reads: a vertical drag raises camPitch
// (clamped 0.85 rad). ~200 px down ≈ +0.44 rad of upward tilt.
async function lookUp(px = 200) {
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.mouse.move(640, 360 + px, { steps: 8 });
  await page.mouse.up();
  await sleep(300);
}
// The m1 briefing dialogue auto-starts at the garage and eats the E key
// (E advances the dialogue, it does not enter the car) — clear it first.
async function clearDialogue() {
  await sleep(2500); // let the auto-starting briefing appear
  for (let i = 0; i < 10; i++) {
    const active = await page.evaluate(() => !!(window.__solmar.S.dialogue && window.__solmar.S.dialogue.active));
    if (!active) return true;
    await page.evaluate(() => { const d = window.__solmar.S.dialogue; if (d) d.advance(); });
    await sleep(1200);
  }
  return await page.evaluate(() => !(window.__solmar.S.dialogue && window.__solmar.S.dialogue.active));
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
  // networkidle0 times out on the reload (the module graph is large and
  // headless is slow) — load + 60 s is what the smoke test uses.
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(2000);
  await page.click('#btn-new');
  await sleep(1200);
  // Round 5 intro cutscene swallows the first keypress (any key skips
  // it) — end it explicitly before staging, or the E to enter the car
  // just skips the cutscene instead. Poll until it is up, then finish it.
  for (let i = 0; i < 10; i++) {
    const active = await page.evaluate(() => !!(window.__solmar.S.cutsceneDirector && window.__solmar.S.cutsceneDirector.active));
    if (active) { await page.evaluate(() => window.__solmar.S.cutsceneDirector.finish()); break; }
    await sleep(1000);
  }
  await sleep(1000);
}

await newGame();

// 1-chase (cover): driving with 4 stars, police on the tail, mission live.
await teleport(-76, -67.5);
await clearDialogue();
await holdKeyUntil('KeyE', async () => (await st()).inCar);
// Put the car on the z=-60 road heading east so the chase runs clean.
await page.evaluate(() => {
  const S = window.__solmar.S;
  if (S.car) {
    S.car.pos.set(-40, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 12;
    // Staging: the chase car must survive six police rams for the shot.
    S.car.health = 999; S.car.maxHealth = 999;
  }
});
await page.evaluate(() => { const S = window.__solmar.S; S.heat = 90; });
await page.keyboard.down('KeyW');
await waitGame(6); // police arrive and close in
await page.keyboard.up('KeyW');
// Refresh the heat so the police are still hunting (not searching) at
// shoot time, and put the car back up to speed for a dynamic frame.
await page.evaluate(() => {
  const S = window.__solmar.S;
  S.heat = 90;
  if (S.car) S.car.speed = 12;
});
await waitGame(1);
// Face the nearest police car so the chase is in frame (the chase cam
// looks forward, so police behind the car would otherwise be invisible).
// Do NOT aim at the heli here: it is still flying in from far away and
// aiming at it turns the camera away from the police. Its searchlight
// pool on the ground reads in frame regardless.
const pc = await page.evaluate(() => {
  const S = window.__solmar.S;
  let best = null, bd = 1e9;
  for (const c of S.cars) { if (!c.aiPolice) continue; const d = Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z); if (d < bd) { bd = d; best = c; } }
  return best ? { x: best.pos.x, z: best.pos.z } : null;
});
if (pc) await aimAt(pc.x, pc.z);
await lookUp(60); // a slight lift — the heli's pool and the sky read in
await waitGame(0.5);
await shoot('1-chase.jpg');

// 2-mission: mission 5 Payday at the Pier — Vic's briefing + Lena crew.
await newGame();
await page.evaluate(() => { const S = window.__solmar.S; S.missions.start(4); });
await sleep(1500); // briefing dialogue up (Vic Torres, portrait on screen)
await teleport(95, 152); // the open pier end — water behind the crew, no wall
await waitGame(1);
const crew = await page.evaluate(() => {
  const S = window.__solmar.S;
  const c = S.crew && S.crew.mesh ? S.crew.mesh.position : null;
  return c ? { x: c.x, z: c.z } : null;
});
if (crew) await aimAt(crew.x, crew.z);
else await aimAt(90, 150);
await waitGame(0.5);
await shoot('2-mission.jpg');

async function exitCarIfAny() {
  const s = await st();
  if (s.inCar) { await tapKey('KeyE'); await sleep(300); }
}
// 3-drive: street race — gold checkpoint gates, timer and prize on HUD.
await newGame();
await teleport(-76, -67.5);
await clearDialogue();
await holdKeyUntil('KeyE', async () => (await st()).inCar); // parked sport car by the garage
await sleep(500);
await page.evaluate(() => {
  const S = window.__solmar.S;
  if (S.car) { S.car.pos.set(-60, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 10; }
});
await holdKeyUntil('KeyT', async () => await page.evaluate(() => { const S = window.__solmar.S; return !!(S.sideActivities && S.sideActivities.race.active); }));
await page.keyboard.down('KeyW');
await waitGame(3);
await page.keyboard.up('KeyW');
// Face the next gold gate so the race line reads in frame.
// RACE_GATES lives in side.js as a module const (not on the instance) —
// mirror its four corners here for the aim.
const gate = await page.evaluate(() => {
  const S = window.__solmar.S;
  const GATES = [{ x: 60, z: -60 }, { x: 60, z: 60 }, { x: -60, z: 60 }, { x: -60, z: -60 }];
  const g = GATES[S.sideActivities.race.gate];
  return g ? { x: g.x, z: g.z } : null;
});
if (gate) await aimAt(gate.x, gate.z);
await waitGame(0.5);
await shoot('3-drive.jpg');

// 4-onfoot: night ride on the street bike — day/night cycle, lit windows,
// headlights, district name on the HUD. The night ramp is per-frame, so
// hold W for a long wall stretch while the sky darkens.
await newGame();
await teleport(-88, -66); // right on the parked bike
await clearDialogue();
await holdKeyUntil('KeyE', async () => (await st()).inCar); // the bike
await sleep(500);
await page.evaluate(() => {
  const S = window.__solmar.S;
  S.time = 200; // 21:48 — night
  if (S.car) { S.car.pos.set(0, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 12; }
});
await page.keyboard.down('KeyW');
await sleep(45000); // ride while the night ramp lands
await page.keyboard.up('KeyW');
// Re-stage the bike onto an open stretch for the frame: the 45 s ride
// can end wedged against traffic (a van), which reads as a crash, not a
// ride. The night ramp is already landed by now.
await page.evaluate(() => {
  const S = window.__solmar.S;
  if (S.car) { S.car.pos.set(0, 0, -60); S.car.heading = Math.PI / 2; S.car.speed = 25; }
});
await sleep(800);
await shoot('4-onfoot.jpg');

if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
writeFileSync(join(REPO, 'shots.json'), JSON.stringify([
  { name: '1-chase.jpg', scene: 'Police chase at 3 stars: driving the stolen sport car with police cars on the tail, wanted stars + minimap + mission objective on the HUD' },
  { name: '2-mission.jpg', scene: 'Mission 5 Payday at the Pier: Vic Torres briefing with portrait, crew member Lena following on foot at the harbor' },
  { name: '3-drive.jpg', scene: 'Street race side activity: driving the ring road toward a gold checkpoint gate, race timer and $300 prize on the HUD' },
  { name: '4-onfoot.jpg', scene: 'Night ride on the street bike: day/night cycle at 21:48, lit windows, headlights and district name on the HUD' },
], null, 2) + '\n');
console.log('shots.json written');

await browser.close();
server.close();
