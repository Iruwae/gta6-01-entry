// shots.mjs — SOLMAR BAY showcase screenshot tool (GTA6-01 round 8).
//
// Drives headless Chrome through the game, stages four showcase moments,
// and captures them as 1280x720 JPEGs (each under 256 KiB) into
// screenshots/, writing a shots.json manifest with each shot's file,
// byte size, wallet cash at capture time, and a short note.
//
// The four shots:
//   1. shot-1-chase.jpg    — police chase downtown, helicopter overhead
//   2. shot-2-briefing.jpg — mission 1 briefing dialogue (Lena Cruz)
//   3. shot-3-race.jpg     — street race, mid-race near a checkpoint
//   4. shot-4-night-bike.jpg — night ride on the bike
//
// Staging rules (from the build contract): every staging pass starts
// with the pay-n-spray booth disarmed and the wallet topped back up to
// $500, so a stray booth drive-through never eats the wallet mid-shoot.
// The chase is staged downtown at (0, 0) with the heat re-asserted every
// couple of seconds so the wanted level never decays while the
// helicopter lines up overhead.
//
// Framing: the gameplay follow camera sits high above the player and
// looks down too steeply to show the helicopter (it hovers above the
// camera) or a street-level car large in frame, so the tool composes
// its own stills through window.__solmar.camera. The follow logic
// lerps the camera back every frame and the helicopter drifts on its
// orbit, so each framing is re-asserted on a short interval and
// released right after the capture. The briefing shot keeps the plain
// gameplay camera (wide city + dialogue reads well as-is).
//
// Usage: node tools/shots.mjs   (run from anywhere; paths resolve from
// this file's own location, never from the working directory)
// Node 22+ standard library only, plus puppeteer-core + the Playwright
// Chromium headless shell already on this machine.

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const GAME_DIR = join(REPO, 'game');
const SHOTS_DIR = join(REPO, 'screenshots');
const PORT = Number(process.env.SHOTS_PORT || 8906);
const MAX_BYTES = 256 * 1024; // 256 KiB cap per shot
const WIDTH = 1280;
const HEIGHT = 720;

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const QA_PKG = process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
const puppeteer = createRequire(existsSync(QA_PKG) ? QA_PKG : import.meta.url)('puppeteer-core');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Headless runs at roughly one frame per second, so a quick key tap can
// fall entirely between frames. Hold every key for a full two seconds.
async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

// Hold a key, re-pressing until a page-side condition holds.
async function holdKeyUntil(page, code, checkFn, timeoutMs = 60000) {
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

// Poll a page-side condition until it holds or the timeout expires.
async function waitFor(page, fn, timeoutMs, label) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(1000);
  }
  throw new Error('timed out waiting for: ' + label + ' (last=' + JSON.stringify(last) + ')');
}

// Every staging pass starts the same way: booth disarmed, wallet $500.
async function stageCommon(page) {
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.heatDirector && S.heatDirector.sprayBooth) {
      S.heatDirector.sprayBooth.armed = false;
    }
    S.cash = 500;
  });
}

async function gameState(page) {
  return page.evaluate(() => {
    const S = window.__solmar.S;
    return {
      cash: S.cash,
      mode: S.mode,
      heat: S.heat,
      wanted: S.wanted,
      inCar: !!S.car,
      kind: S.car ? S.car.kind : null,
    };
  });
}

// Capture a 1280x720 JPEG under the 256 KiB cap, stepping the quality
// down until it fits. Returns { bytes, quality }.
async function captureShot(page, outPath) {
  for (const quality of [82, 72, 60, 48, 36]) {
    const buf = await page.screenshot({ type: 'jpeg', quality });
    if (buf.length <= MAX_BYTES) {
      writeFileSync(outPath, buf);
      return { bytes: buf.length, quality };
    }
  }
  throw new Error('shot would not fit under 256 KiB even at quality 36: ' + outPath);
}

// Hold a camera/scene framing: re-assert it every 200 ms (the follow
// camera lerps back toward the player and the helicopter drifts on its
// orbit every frame), and release it when the caller is done.
// frameFn returns { cam: { pos, look }, heli: { x, y, z } | null }.
async function holdFraming(page, frameFn) {
  let stopped = false;
  const apply = async () => {
    if (stopped) return;
    try {
      const f = await frameFn();
      if (!f) return;
      if (f.cam) {
        await page.evaluate((p, l) => {
          const cam = window.__solmar && window.__solmar.camera;
          if (!cam) return;
          cam.position.set(p.x, p.y, p.z);
          cam.lookAt(l.x, l.y, l.z);
        }, f.cam.pos, f.cam.look);
      }
      if (f.heli) {
        await page.evaluate((h) => {
          const S = window.__solmar.S;
          if (S.heli && S.heli.pos) S.heli.pos.set(h.x, h.y, h.z);
        }, f.heli);
      }
    } catch (e) { /* framing is best-effort; the HUD still tells the story */ }
  };
  await apply();
  const timer = setInterval(apply, 200);
  return () => { stopped = true; clearInterval(timer); };
}

// Click the dialogue box (if it is showing) to advance it; two clicks
// walk past the two briefing lines and close the box.
async function dismissDialogue(page) {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const box = document.getElementById('dialogue');
      if (box && !box.classList.contains('hidden')) box.click();
    });
    await sleep(600);
  }
}

function serveGame() {
  const server = createServer((req, res) => {
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = join(GAME_DIR, p === '/' ? 'index.html' : p);
    if (!file.startsWith(GAME_DIR) || !existsSync(file)) {
      res.writeHead(404);
      res.end('nf');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolveServer) => server.listen(PORT, () => resolveServer(server)));
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const server = await serveGame();
  console.log('shots: serving game/ on port ' + PORT);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720'],
    defaultViewport: { width: WIDTH, height: HEIGHT },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const shots = [];

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2500);
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2000);
    await page.click('#btn-new');
    await sleep(1500);

    // The intro flyover plays on a new game; X skips it.
    await holdKey(page, 'KeyX');
    await waitFor(page, () => page.evaluate(() => window.__solmar.S.mode === 'playing' && !window.__solmar.S.cutscene), 30000, 'game playing after cutscene skip');

    // ---- Shot 2 first: mission 1 briefing (Lena) at the garage. ----
    // It has to come before anything that advances the job board.
    // No camera framing here: the plain gameplay camera (wide city at
    // sunset behind the dialogue box) reads well as-is.
    await stageCommon(page);
    await page.evaluate(() => { window.__solmar.S.player.pos.set(-90, 0, -66); });
    await waitFor(page, () => page.evaluate(() => {
      const S = window.__solmar.S;
      const el = document.getElementById('dialogue');
      return S.missions.current && S.missions.current.id === 'm1'
        && el && !el.classList.contains('hidden')
        && (document.getElementById('dlg-name') || {}).textContent === 'LENA CRUZ';
    }), 60000, 'mission 1 briefing dialogue (Lena)');
    await sleep(1500);
    {
      const file = 'shot-2-briefing.jpg';
      const out = join(SHOTS_DIR, file);
      const cap = await captureShot(page, out);
      const st = await gameState(page);
      shots.push({ file, bytes: cap.bytes, cash: st.cash, note: 'Mission 1 briefing at the garage — Lena Cruz lays out the first job.' });
      console.log('shot 2 briefing: ' + cap.bytes + ' bytes (quality ' + cap.quality + '), cash $' + st.cash);
    }
    // Clear the briefing box so it does not sit over the later shots.
    await dismissDialogue(page);

    // ---- Shot 1: police chase downtown with the helicopter. ----
    await stageCommon(page);
    const chase = await stageChaseShot(page);
    // Frame it from far down the south street, low: the shallow pitch
    // keeps the helicopter — pinned at its natural 38 m hover over the
    // north street — inside the top of the frame, silhouetted against
    // the sunset sky. The player reads small in the heli's spotlight
    // pool; the roster and the patrol cars tell the chase.
    const releaseChaseCam = await holdFraming(page, async () => page.evaluate(() => {
      const S = window.__solmar.S;
      const p = S.player.pos;
      return {
        cam: {
          pos: { x: p.x, y: 8, z: p.z + 70 },
          look: { x: p.x, y: 0, z: p.z },
        },
        heli: { x: p.x, y: 38, z: p.z - 26 },
      };
    }));
    await sleep(1500);
    {
      const file = 'shot-1-chase.jpg';
      const out = join(SHOTS_DIR, file);
      const cap = await captureShot(page, out);
      const st = await gameState(page);
      shots.push({ file, bytes: cap.bytes, cash: st.cash, note: 'Police chase downtown — ' + chase.wanted + ' stars, helicopter overhead, patrol cars closing in.' });
      console.log('shot 1 chase: ' + cap.bytes + ' bytes (quality ' + cap.quality + '), cash $' + st.cash + ', heli at ' + JSON.stringify(chase.heli));
    }
    releaseChaseCam();
    chase.stop();
    // Cool the heat off so the cops leave before the next staging pass.
    await page.evaluate(() => { window.__solmar.S.heat = 0; });
    await sleep(5000);

    // ---- Shot 3: street race, mid-race near a checkpoint gate. ----
    await stageCommon(page);
    await page.evaluate(() => { window.__solmar.S.player.pos.set(-102, 0, -64); });
    await holdKeyUntil(page, 'KeyE', async () => (await gameState(page)).kind === 'sport', 30000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(-60, 0, -60);
    });
    await holdKeyUntil(page, 'KeyT', async () => page.evaluate(() => window.__solmar.S.sideActivities.race.active), 60000);
    await sleep(1500);
    // Roll up toward the first gate so the checkpoint is in frame.
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(30, 0, -60);
    });
    await sleep(2000);
    // Frame it from behind the car toward the gate: car large in the
    // foreground, the glowing gate ring ahead of it.
    const releaseRaceCam = await holdFraming(page, async () => page.evaluate(() => {
      const S = window.__solmar.S;
      if (!S.car) return null;
      const c = S.car.pos;
      const g = { x: 60, z: -60 };
      let dx = g.x - c.x, dz = g.z - c.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      return {
        cam: {
          pos: { x: c.x - dx * 18, y: 6, z: c.z - dz * 18 },
          look: { x: (c.x + g.x) / 2, y: 3, z: (c.z + g.z) / 2 },
        },
        heli: null,
      };
    }));
    await sleep(1500);
    {
      const file = 'shot-3-race.jpg';
      const out = join(SHOTS_DIR, file);
      const cap = await captureShot(page, out);
      const st = await gameState(page);
      shots.push({ file, bytes: cap.bytes, cash: st.cash, note: 'Street race in the sport car — charging toward the first checkpoint gate.' });
      console.log('shot 3 race: ' + cap.bytes + ' bytes (quality ' + cap.quality + '), cash $' + st.cash);
    }
    releaseRaceCam();
    // Finish the race cleanly by driving the car through all four gates,
    // so no race state leaks into the night shot.
    for (const [gx, gz] of [[60, -60], [60, 60], [-60, 60], [-60, -60]]) {
      await page.evaluate((x, z) => {
        const S = window.__solmar.S;
        if (S.car) S.car.pos.set(x, 0, z);
      }, gx, gz);
      await sleep(2500);
    }
    await sleep(1500);

    // ---- Shot 4: night scene on the bike. ----
    await stageCommon(page);
    // Step out of the race car first, then cool off and disarm the booth
    // (the bike parks inside the booth radius — with stars up, the booth
    // would fire on entry and eat $150).
    await holdKeyUntil(page, 'KeyE', async () => !(await gameState(page)).inCar, 30000);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      S.heat = 0;
      S.wanted = 0;
      if (S.heatDirector && S.heatDirector.sprayBooth) S.heatDirector.sprayBooth.armed = false;
      S.player.pos.set(-88, 0, -64);
    });
    await holdKeyUntil(page, 'KeyE', async () => (await gameState(page)).kind === 'bike', 30000);
    // Jump the clock to 21:48 and wait for the night ramp to land.
    await page.evaluate(() => { window.__solmar.S.time = 200; });
    await waitFor(page, () => page.evaluate(() => {
      const S = window.__solmar.S;
      return S.dayNight && S.dayNight.phase === 'NIGHT' && S.dayNight.night > 0.5;
    }), 240000, 'night to engage (time 200)');
    await sleep(1500);
    // Roll the bike downtown to the lit intersection: the garage street
    // is pitch black, the downtown lane markings and streetlights give
    // the bike something to read against. Face it north up the street.
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) { S.car.pos.set(0, 0, 0); S.car.heading = 0; }
      S.player.pos.set(0, 0, 0);
    });
    await sleep(1000);
    // Frame it front three-quarter from the south-west, close enough
    // that the bike and its headlight read against the street.
    const releaseBikeCam = await holdFraming(page, async () => page.evaluate(() => {
      const S = window.__solmar.S;
      if (!S.car) return null;
      const c = S.car.pos;
      const h = S.car.heading || 0;
      const fx = Math.sin(h), fz = Math.cos(h);
      const rx = -fz, rz = fx;
      return {
        cam: {
          pos: { x: c.x + fx * 6 + rx * 4, y: 4, z: c.z + fz * 6 + rz * 4 },
          look: { x: c.x, y: 1, z: c.z },
        },
        heli: null,
      };
    }));
    await sleep(1500);
    {
      const file = 'shot-4-night-bike.jpg';
      const out = join(SHOTS_DIR, file);
      const cap = await captureShot(page, out);
      const st = await gameState(page);
      shots.push({ file, bytes: cap.bytes, cash: st.cash, note: 'Night ride on the bike — the bay lit up after dark.' });
      console.log('shot 4 night bike: ' + cap.bytes + ' bytes (quality ' + cap.quality + '), cash $' + st.cash);
    }
    releaseBikeCam();
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length > 0) {
    console.log('WARNING — page errors during the shoot:');
    for (const e of errors) console.log('  ' + e);
  }

  // Manifest, in shoot order. Cash is the wallet at capture time.
  const manifest = {
    game: 'SOLMAR BAY',
    entry: 'GTA6-01 round 8',
    width: WIDTH,
    height: HEIGHT,
    maxBytes: MAX_BYTES,
    shots: shots.sort((a, b) => a.file.localeCompare(b.file)),
  };
  // Manifest lives at the repo root only: screenshots/ must hold just the
  // four JPEGs — the dossier builder reads every file in screenshots/
  // as an image, and a JSON copy there breaks the build.
  writeFileSync(join(REPO, 'shots.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('shots.json written (repo root) with ' + shots.length + ' shots');
  for (const s of manifest.shots) {
    console.log('  ' + s.file + ' — ' + s.bytes + ' bytes, cash $' + s.cash + ' — ' + s.note);
  }
}

main().catch((err) => {
  console.error('shots FAILED: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
