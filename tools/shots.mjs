// Final four screenshots for the GTA6-01 round-5 rebuild.
//
// Serves game/ on :8903, drives one headless Chrome session through four
// staged scenes, and writes screenshots/{1-chase,2-mission,3-drive,4-onfoot}.jpg
// (1280x720, JPEG q80, each under 256 KiB) plus shots.json at the repo root.
//
// Two staging rules learned the hard way (verified live, 2026-11-20):
//  - the pay-n-spray booth at (-90,-58) fires the instant a wanted car
//    rolls through it: -$150 and heat wiped to zero. Every shot therefore
//    starts with the booth disarmed and the wallet topped back to $500.
//  - the chase is staged downtown at (0,0), far from the booth, and the
//    heat is re-asserted every few seconds so the wanted level never
//    decays away while the helicopter is lining up overhead.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const HOME = process.env.HOME;
const ROOT = resolve(HOME + '/workspace/makefun/gta6-01-entry');
const GAME = join(ROOT, 'game');
const SHOTS_DIR = join(ROOT, 'screenshots');
const PORT = 8903;
const WIDTH = 1280;
const HEIGHT = 720;
const MAX_BYTES = 256 * 1024;
const DOWNTOWN = { x: 0, z: 0 };

const qaToolsPkg = HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)('puppeteer-core');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
};

mkdirSync(SHOTS_DIR, { recursive: true });
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = join(GAME, p === '/' ? 'index.html' : p);
  if (!file.startsWith(GAME) || !existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));
console.log(`[shots] serving ${GAME} on :${PORT}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', `--window-size=${WIDTH},${HEIGHT}`],
  defaultViewport: { width: WIDTH, height: HEIGHT },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

async function holdKey(code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}
async function holdKeyUntil(code, checkFn, timeoutMs = 30000) {
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

// Disarm the pay-n-spray booth and restore the wallet. Called once at the
// start of the run and again right before every single shot, because the
// same browser session is reused for all four frames.
async function safeStage() {
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.heatDirector && S.heatDirector.sprayBooth) S.heatDirector.sprayBooth.armed = false;
    S.cash = 500;
  });
}

async function readState() {
  return page.evaluate(() => {
    const S = window.__solmar.S;
    const project = (x, y, z) => {
      const v = S.player.pos.clone().set(x, y, z).project(S.camera);
      return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2) };
    };
    const heliProj = S.heli ? project(S.heli.pos.x, S.heli.pos.y, S.heli.pos.z) : null;
    const crewProj = S.crew && S.crew.mesh
      ? project(S.crew.mesh.position.x, S.crew.mesh.position.y, S.crew.mesh.position.z)
      : null;
    const carProj = S.car ? project(S.car.pos.x, S.car.pos.y, S.car.pos.z) : null;
    return {
      cash: S.cash,
      heat: S.heat,
      wanted: S.wanted,
      mode: S.mode,
      inCar: !!S.car,
      carKind: S.car && S.car.kind,
      carKeys: S.car ? Object.keys(S.car) : null,
      heli: !!S.heli,
      heliOverhead: !!S.heliOverhead,
      heliProj,
      crewProj,
      carProj,
      cops: S.cars.filter((c) => c.aiPolice).length,
      rosterRows: document.querySelectorAll('#roster .roster-row').length,
      dlgName: (document.getElementById('dlg-name') || {}).textContent || '',
      dlgVisible: !(document.getElementById('dialogue') || {}).classList?.contains('hidden'),
      cashText: (document.getElementById('cash') || {}).textContent || '',
      night: S.dayNight ? +S.dayNight.night.toFixed(2) : null,
      phase: S.dayNight ? S.dayNight.phase : null,
      raceActive: !!(S.sideActivities && S.sideActivities.race && S.sideActivities.race.active),
    };
  });
}

function inFrame(p, margin = 0.9) {
  return !!p && Math.abs(p.x) < margin && Math.abs(p.y) < margin && p.z < 1;
}

// Gates sit ~90 m out, right at the far plane, so their projected z hovers
// around 1.0 even while x/y sit nicely on screen — judge them on x/y only.
// A gate behind the camera still fails: its x/y explode to huge values.
function gateInFrame(p) {
  return !!p && Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.9;
}

async function saveShot(name, note) {
  const path = join(SHOTS_DIR, name);
  await page.screenshot({ path, type: 'jpeg', quality: 80 });
  let size = statSync(path).size;
  if (size >= MAX_BYTES) {
    await page.screenshot({ path, type: 'jpeg', quality: 60 });
    size = statSync(path).size;
    console.log(`[shots] ${name} needed q60 fallback — ${(size / 1024).toFixed(1)} KiB`);
  }
  const st = await readState();
  console.log(`[shots] saved ${name} — ${(size / 1024).toFixed(1)} KiB @ q80 — ${note} — cash=$${st.cash} (${st.cashText})`);
  if (st.cash < 0) console.log(`[shots] WARNING negative cash in ${name}: $${st.cash}`);
  return { file: name, bytes: size, cash: st.cash, note };
}

const results = { shots: [], failed: [] };

// ---------- boot a fresh game ----------
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
await sleep(2500);
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(2000);
await page.click('#btn-new');
await sleep(1500);
await holdKey('KeyX');
await sleep(1500);
for (let i = 0; i < 4; i++) { await page.click('#dialogue').catch(() => {}); await sleep(600); }
await safeStage();
console.log('[shots] new game started, cutscene skipped, briefing dismissed');

// ---------- shot 1: police chase, heli in frame ----------
{
  await safeStage();
  await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
  const gotCar = await holdKeyUntil('KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
  console.log(`[shots] in the sport car for the chase: ${gotCar}`);
  await page.evaluate((d) => {
    const S = window.__solmar.S;
    S.cash = 500;
    S.heat = 90;
    if (S.car) S.car.pos.set(d.x, 0, d.z);
    S.player.pos.set(d.x, 0, d.z);
  }, DOWNTOWN);
  let ready = 0;
  let shot1 = null;
  for (let poll = 0; poll < 50; poll++) {
    await sleep(3000);
    // Keep the heat pinned and the car downtown: if the cops shove it
    // more than 15 m off the intersection, haul it back.
    await page.evaluate((d) => {
      const S = window.__solmar.S;
      S.heat = 90;
      const dx = (S.car ? S.car.pos.x : S.player.pos.x) - d.x;
      const dz = (S.car ? S.car.pos.z : S.player.pos.z) - d.z;
      if (Math.hypot(dx, dz) > 15) {
        if (S.car) S.car.pos.set(d.x, 0, d.z);
        S.player.pos.set(d.x, 0, d.z);
      }
    }, DOWNTOWN);
    const st = await readState();
    const ok = st.mode === 'playing' && st.inCar && st.wanted >= 3 &&
      st.rosterRows >= 4 && inFrame(st.heliProj, 0.9);
    console.log(`[shots] chase poll ${poll + 1}: wanted=${st.wanted} cops=${st.cops} roster=${st.rosterRows} heli=${st.heli} overhead=${st.heliOverhead} proj=${JSON.stringify(st.heliProj)} cash=$${st.cash} mode=${st.mode}`);
    if (ok) {
      ready++;
      if (ready >= 2) {
        console.log(`[shots] heli in frame: ${JSON.stringify(st.heliProj)} wanted=${st.wanted} cops=${st.cops} roster=${st.rosterRows}`);
        shot1 = await saveShot('1-chase.jpg', `heli in frame ${JSON.stringify(st.heliProj)}, wanted ${st.wanted}, ${st.cops} cops, roster ${st.rosterRows}`);
        break;
      }
    } else {
      ready = 0;
    }
    if (st.mode !== 'playing' || !st.inCar) {
      console.log(`[shots] chase aborted: mode=${st.mode} inCar=${st.inCar}`);
      break;
    }
  }
  if (!shot1) {
    console.log('[shots] SHOT 1 FAILED — heli never held the frame with roster >= 4 and wanted >= 3; no fake frame written');
    results.failed.push('1-chase');
  } else {
    results.shots.push(shot1);
  }
}

// ---------- shot 2: mission 5 dialogue with Lena, downtown ----------
{
  await safeStage();
  await page.evaluate((d) => {
    const S = window.__solmar.S;
    S.heat = 0;
    if (S.car) { /* leave the car where it is; the briefing is on foot */ }
    S.player.pos.set(d.x, 0, d.z);
  }, DOWNTOWN);
  // Step out of the car if we are still in it.
  if ((await readState()).inCar) {
    await holdKeyUntil('KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
  }
  await page.evaluate(() => { window.__solmar.S.missions.start(4); });
  await sleep(2500);
  // Advance the briefing until Lena is the one talking (max 4 clicks).
  for (let i = 0; i < 4; i++) {
    const st = await readState();
    if (st.dlgName === 'LENA CRUZ') break;
    await page.click('#dialogue');
    await sleep(900);
  }
  // Give Lena time to walk into the frame beside the player.
  let crewIn = false;
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const st = await readState();
    console.log(`[shots] mission poll ${i + 1}: dlg=${st.dlgName} visible=${st.dlgVisible} crewProj=${JSON.stringify(st.crewProj)} cash=$${st.cash}`);
    if (inFrame(st.crewProj, 0.8)) { crewIn = true; break; }
  }
  const st = await readState();
  console.log(`[shots] mission dialogue: ${JSON.stringify({ name: st.dlgName, mission: 'm5', crewInFrame: crewIn })}`);
  results.shots.push(await saveShot('2-mission.jpg', `dialogue ${st.dlgName}, Lena in frame: ${crewIn}`));
}

// ---------- shot 3: street race, car + road + gate in frame ----------
{
  await safeStage();
  // Shot 2 leaves the mission dialogue open, and an open dialogue swallows
  // the E/T keys — click through until the box is gone before driving.
  for (let i = 0; i < 6; i++) {
    const st = await readState();
    if (!st.dlgVisible) break;
    await page.click('#dialogue');
    await sleep(900);
  }
  console.log(`[shots] dialogue dismissed for the race: ${!(await readState()).dlgVisible}`);
  // The sport car is NOT at the garage any more — shot 1 drove it downtown
  // and shot 2 parked it there. Find where it actually sits and walk to it;
  // teleporting to the empty garage spot is why the last take failed.
  const carSpot = await page.evaluate(() => {
    const S = window.__solmar.S;
    const sport = (S.cars || []).find((c) => c.kind === 'sport');
    return sport ? { x: +sport.pos.x.toFixed(1), z: +sport.pos.z.toFixed(1) } : null;
  });
  console.log(`[shots] sport car parked at: ${JSON.stringify(carSpot)}`);
  await page.evaluate((spot) => {
    const S = window.__solmar.S;
    const p = spot || { x: -102, z: -64 };
    S.player.pos.set(p.x, 0, p.z);
  }, carSpot);
  const gotCar3 = await holdKeyUntil('KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 30000);
  console.log(`[shots] in the sport car for the race: ${gotCar3}`);
  if (!gotCar3) {
    console.log('[shots] SHOT 3 FAILED — could not enter the car; no fake frame written');
    results.failed.push('3-drive');
  } else {
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.heat = 0;
      if (S.car) S.car.pos.set(-60, 0, -60);
      S.player.pos.set(-60, 0, -60);
    });
    const raceOn = await holdKeyUntil('KeyT', async () => (await page.evaluate(() => window.__solmar.S.sideActivities.race.active)), 30000);
    console.log(`[shots] street race active: ${raceOn}`);
    if (!raceOn) {
      console.log('[shots] SHOT 3 FAILED — race did not start; no fake frame written');
      results.failed.push('3-drive');
    } else {
      // Move to mid-road between the pad and gate 1 so the car sits on open
      // asphalt instead of hugging the pad corner, then try facing angles
      // until the car is centred and gate 1 is ahead in the frame.
      await page.evaluate(() => {
        const S = window.__solmar.S;
        if (S.car) S.car.pos.set(-30, 0, -60);
        S.player.pos.set(-30, 0, -60);
      });
      // Teleporting can drop the player out of the car — climb back in.
      if (!(await readState()).inCar) {
        const backIn = await holdKeyUntil('KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 20000);
        console.log(`[shots] climbed back into the car after the move: ${backIn}`);
      }
      const GATE1 = { x: 60, z: -60 };
      let best = null;
      for (const heading of [1.57, 0, -1.57, Math.PI]) {
        await page.evaluate((h) => {
          const S = window.__solmar.S;
          S.player.heading = h;
          if (S.car && typeof S.car.heading === 'number') S.car.heading = h;
        }, heading);
        await sleep(3000);
        const st = await readState();
        const gateProj = await page.evaluate((g) => {
          const S = window.__solmar.S;
          const v = S.player.pos.clone().set(g.x, 2, g.z).project(S.camera);
          return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2) };
        }, GATE1);
        console.log(`[shots] race angle ${heading}: carProj=${JSON.stringify(st.carProj)} gate1Proj=${JSON.stringify(gateProj)} race=${st.raceActive}`);
        const score = Math.abs(st.carProj ? st.carProj.x : 9) + (gateInFrame(gateProj) ? 0 : 5);
        if (!best || score < best.score) best = { heading, score, carProj: st.carProj, gateProj };
        if (st.carProj && Math.abs(st.carProj.x) < 0.4 && gateInFrame(gateProj)) break;
      }
      console.log(`[shots] race angle chosen: ${JSON.stringify(best)}`);
      results.shots.push(await saveShot('3-drive.jpg', `race active, car ${JSON.stringify(best.carProj)}, gate1 ${JSON.stringify(best.gateProj)}`));
    }
  }
}

// ---------- shot 4: night bike downtown (the staging that already worked) ----------
{
  await safeStage();
  if ((await readState()).inCar) {
    await holdKeyUntil('KeyE', async () => !(await page.evaluate(() => !!window.__solmar.S.car)), 20000);
  }
  await page.evaluate(() => { window.__solmar.S.player.pos.set(-88, 0, -64); });
  const gotBike = await holdKeyUntil('KeyE', async () => (await page.evaluate(() => !!window.__solmar.S.car)), 30000);
  const bikeState = await readState();
  console.log(`[shots] on the bike for the night shot: ${gotBike} kind=${bikeState.carKind}`);
  await page.evaluate((d) => {
    const S = window.__solmar.S;
    S.heat = 0;
    if (S.car) S.car.pos.set(d.x, 0, d.z);
    S.player.pos.set(d.x, 0, d.z);
    S.time = 200;
  }, DOWNTOWN);
  let night = null;
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    night = await readState();
    if (night.night > 0.5) break;
  }
  console.log(`[shots] night state: ${JSON.stringify({ phase: night.phase, night: night.night, kind: night.carKind })}`);
  results.shots.push(await saveShot('4-onfoot.jpg', `night ${night.phase} ${night.night}, bike downtown`));
}

results.errors = errors;
writeFileSync(join(ROOT, 'shots.json'), JSON.stringify(results, null, 2));
console.log('[shots] wrote shots.json');
console.log(`[shots] done — ${results.shots.length} frames, failed: ${results.failed.join(', ') || 'none'}, page errors: ${errors.length}`);
await browser.close();
server.close();
process.exit(results.failed.length > 0 || errors.length > 0 ? 1 : 0);
