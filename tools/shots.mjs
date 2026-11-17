// SOLMAR BAY — QA screenshot staging (written fresh for this QA run).
// Takes the 4 required JPEGs into <repo>/screenshots/:
//   1-chase.jpg   police chase (wanted stars, minimap, objective, police behind)
//   2-mission.jpg mission in progress (beacon + objective + rivals)
//   3-drive.jpg   driving through the city (traffic + peds + buildings)
//   4-onfoot.jpg  on foot in the city (HUD + minimap)
// Usage: node tools/shots.mjs   (run from ~/workspace/makefun/gta6-01-entry)
import puppeteer from '/home/hatch/workspace/qa/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'http://127.0.0.1:8091/';
const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const OUT = path.resolve('screenshots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
const errors = [];
const log = (...a) => console.log(...a);

async function snap(page) {
  return await page.evaluate(() => {
    const w = window.__solmar;
    if (!w) return { noHook: true };
    const { S, player } = w;
    const m = S.missions;
    return {
      mode: S.mode, cash: S.cash, missionIndex: S.missionIndex,
      health: S.health, wanted: S.wanted, heat: +S.heat.toFixed(1),
      px: +player.pos.x.toFixed(1), pz: +player.pos.z.toFixed(1),
      heading: +player.heading.toFixed(2), onFoot: player.onFoot,
      camYaw: +(S.camYaw ?? 0).toFixed(3),
      car: S.car ? { kind: S.car.kind, x: +S.car.pos.x.toFixed(1), z: +S.car.pos.z.toFixed(1), speed: +S.car.speed.toFixed(1), heading: +S.car.heading.toFixed(2) } : null,
      police: S.cars.filter((c) => c.kind === 'police' && c.aiPolice).map((c) => ({ x: +c.pos.x.toFixed(1), z: +c.pos.z.toFixed(1) })),
      cars: S.cars.length, peds: S.peds.length,
      kills: S.stats.kills,
      mission: m.current ? { id: m.current.id, stageIdx: m.stageIdx, text: m.current.stages[m.stageIdx]?.text } : null,
      rivals: m.rivals ? m.rivals.map((r) => ({ alive: r.alive, x: +r.pos.x.toFixed(1), z: +r.pos.z.toFixed(1) })) : [],
      objective: m.objectiveText(),
      hudStars: document.getElementById('stars')?.textContent || '',
      cam: (() => { const c = S.camera; return { x: +c.position.x.toFixed(1), y: +c.position.y.toFixed(1), z: +c.position.z.toFixed(1) }; })(),
    };
  });
}

// Rotate camera by dYaw radians via real mouse drag, verified; falls back to
// synthetic mousemove events if the drag did not move the camera.
async function rotateCam(page, dYaw, label) {
  const before = (await snap(page)).camYaw;
  const dxTotal = -dYaw / 0.0032;
  await page.mouse.move(640, 400);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(640 + (dxTotal * i) / 12, 400);
    await sleep(30);
  }
  await page.mouse.up();
  await sleep(300);
  let after = (await snap(page)).camYaw;
  let moved = wrapAngle(after - before);
  if (Math.abs(moved) < Math.abs(dYaw) * 0.5) {
    await page.evaluate((dx) => {
      const c = document.getElementById('game-canvas');
      c.dispatchEvent(new MouseEvent('mousedown', { clientX: 640, clientY: 400, bubbles: true }));
      for (let i = 1; i <= 12; i++) {
        window.dispatchEvent(new MouseEvent('mousemove', {
          clientX: 640 + (dx * i) / 12, clientY: 400, movementX: dx / 12, movementY: 0, bubbles: true,
        }));
      }
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    }, dxTotal);
    await sleep(300);
    after = (await snap(page)).camYaw;
    moved = wrapAngle(after - before);
  }
  log(`  cam [${label}]: want ${dYaw.toFixed(2)} got ${moved.toFixed(2)}`);
  return moved;
}

// Point the camera at world point (tx,tz).
async function aimAt(page, tx, tz, label) {
  const s = await snap(page);
  const cam = s.cam;
  const desiredYaw = Math.atan2(-(tx - cam.x), -(tz - cam.z));
  await rotateCam(page, wrapAngle(desiredYaw - s.camYaw), label || `aim(${tx},${tz})`);
}

// Set camera directly behind the driven car (camera looks along car heading).
async function camBehindCar(page, label) {
  const s = await snap(page);
  if (!s.car) return;
  await rotateCam(page, wrapAngle((s.car.heading + Math.PI) - s.camYaw), label || 'behind-car');
}

async function takeShot(page, name, quality = 80) {
  const file = path.join(OUT, name);
  await sleep(700); // let the frame settle
  await page.screenshot({ type: 'jpeg', quality, path: file });
  const st = fs.statSync(file);
  log(`  shot ${name}: ${st.size} bytes (quality ${quality})`);
  return { file, size: st.size };
}

// Fresh page load + new game; returns after the world is up.
async function freshGame(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  await page.click('#btn-new');
  await sleep(1200);
}

async function enterNearestParkedCar(page) {
  const spot = await page.evaluate(() => {
    const w = window.__solmar;
    const p = w.S.player.pos;
    let best = null, bd = 1e9;
    for (const c of w.S.cars) {
      if (c.dead || c.kind === 'police' || c.stolen) continue;
      const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
      if (d < bd) { bd = d; best = { x: c.pos.x, z: c.pos.z, kind: c.kind }; }
    }
    return best;
  });
  if (!spot) throw new Error('no parked car found');
  // At 1280x800 headless the game runs ~2fps, so a quick key tap can fall
  // between frames and never register: hold E for most of a frame.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate((sp) => {
      const w = window.__solmar;
      w.player.pos.set(sp.x + 2.2, 0, sp.z);
      w.player.vel.set(0, 0, 0);
    }, spot);
    await sleep(400);
    await page.keyboard.down('KeyE');
    await sleep(700);
    await page.keyboard.up('KeyE');
    await sleep(800);
    const s = await snap(page);
    if (s.car) return s;
    log(`  enter attempt ${attempt} failed, retrying`);
  }
  throw new Error('failed to enter car at ' + JSON.stringify(spot));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));

  // ---- 1-chase.jpg: police chase ----
  log('SHOT 1 chase');
  await freshGame(page);
  await enterNearestParkedCar(page);
  // Put the car on the open x=0 road heading south, camera behind it, so
  // the chase reads on a clean street (not wedged against a building).
  await page.evaluate(() => {
    const w = window.__solmar;
    w.S.car.pos.set(0, 0, -100); w.S.car.heading = 0; w.S.car.speed = 0;
    w.S.car.mesh.rotation.y = 0;
    w.player.pos.copy(w.S.car.pos);
  });
  await sleep(400);
  await camBehindCar(page, 'chase-cam');
  // Wanted 3 stars; top heat up repeatedly (it decays 2.5/s).
  await page.keyboard.down('KeyW');
  let framed = null;
  const chaseT0 = Date.now();
  while (Date.now() - chaseT0 < 60000) {
    await page.evaluate(() => { const w = window.__solmar; w.S.heat = 55; });
    await sleep(500);
    const s = await snap(page);
    if (!s.car) break;
    // A police car inside the camera's forward cone, close and central.
    const cam = s.cam;
    const fx = -Math.sin(s.camYaw), fz = -Math.cos(s.camYaw);
    for (const pc of s.police) {
      const dx = pc.x - cam.x, dz = pc.z - cam.z;
      const d = Math.hypot(dx, dz);
      if (d < 20 && d > 5) {
        const dot = (dx * fx + dz * fz) / d; // 1 = dead ahead
        if (dot > 0.7) { framed = { policeDist: +d.toFixed(1), dot: +dot.toFixed(2), wanted: s.wanted, speed: s.car.speed }; break; }
      }
    }
    if (framed) break;
    // Keep the car on the road grid if it drifts off.
    if (Math.abs(s.car.x) > 120 || Math.abs(s.car.z) > 120) {
      await page.keyboard.up('KeyW');
      await page.evaluate(() => {
        const w = window.__solmar;
        w.S.car.pos.set(0, 0, -60); w.S.car.heading = 0; w.S.car.speed = 0;
        w.player.pos.copy(w.S.car.pos);
      });
      await sleep(300);
      await page.keyboard.down('KeyW');
    }
  }
  await page.keyboard.up('KeyW');
  const s1 = await snap(page);
  log(`  chase staged: wanted=${s1.wanted} heat=${s1.heat} police=${s1.police.length} framed=${JSON.stringify(framed)} car=${JSON.stringify(s1.car)} stars='${s1.hudStars}'`);
  await takeShot(page, '1-chase.jpg');

  // ---- 2-mission.jpg: Harbor Heat in progress ----
  log('SHOT 2 mission');
  await freshGame(page);
  await page.evaluate(() => window.__solmar.S.missions.start(2));
  await sleep(800);
  // Stand INSIDE the goto radius (90,138 r=10) so the stage advances to the
  // kill stage and the 4 rivals spawn; then step back to frame them.
  await page.evaluate(() => {
    const w = window.__solmar;
    w.player.pos.set(90, 0, 130);
    w.player.vel.set(0, 0, 0);
  });
  await sleep(2500);
  let s2pre = await snap(page);
  log(`  mission stage after harbor approach: ${JSON.stringify(s2pre.mission)} rivals=${s2pre.rivals.length}`);
  await page.evaluate(() => {
    const w = window.__solmar;
    w.player.pos.set(90, 0, 122);
    w.player.vel.set(0, 0, 0);
  });
  await sleep(500);
  await aimAt(page, 90, 138, 'mission-harbor');
  const s2 = await snap(page);
  log(`  mission staged: objective='${s2.objective}' rivals=${JSON.stringify(s2.rivals)} player=(${s2.px},${s2.pz})`);
  await takeShot(page, '2-mission.jpg');

  // ---- 3-drive.jpg: driving through the city ----
  log('SHOT 3 drive');
  await freshGame(page);
  await enterNearestParkedCar(page);
  // Put the car on the x=0 road heading south, camera behind it.
  await page.evaluate(() => {
    const w = window.__solmar;
    w.S.car.pos.set(0, 0, -100); w.S.car.heading = 0; w.S.car.speed = 0;
    w.S.car.mesh.rotation.y = 0;
    w.player.pos.copy(w.S.car.pos);
  });
  await sleep(400);
  await camBehindCar(page, 'drive-cam');
  await page.keyboard.down('KeyW');
  await sleep(3500); // roll south past traffic/peds/buildings
  const s3 = await snap(page);
  log(`  drive staged: car=${JSON.stringify(s3.car)} cars=${s3.cars} peds=${s3.peds} objective='${s3.objective}'`);
  await takeShot(page, '3-drive.jpg');
  await page.keyboard.up('KeyW');

  // ---- 4-onfoot.jpg: on foot in the city ----
  log('SHOT 4 onfoot');
  await freshGame(page);
  await page.evaluate(() => {
    const w = window.__solmar;
    w.player.pos.set(-6, 0, -54);
    w.player.vel.set(0, 0, 0);
  });
  await sleep(500);
  await aimAt(page, 30, 30, 'onfoot-bank');
  const s4 = await snap(page);
  log(`  onfoot staged: player=(${s4.px},${s4.pz}) onFoot=${s4.onFoot} objective='${s4.objective}'`);
  await takeShot(page, '4-onfoot.jpg');

  log('ERRORS during shots: ' + errors.length);
  for (const e of errors) log('  ' + e);
  await browser.close();
  process.exit(errors.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('SHOTS CRASH:', e);
  process.exit(2);
});
