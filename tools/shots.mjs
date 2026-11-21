// SOLMAR BAY — screenshot generator for the make.fun gta6-01 entry.
//
// Produces the four dossier images in screenshots/, each 1280x720
// JPEG and each under 256 KiB:
//   01-chase.jpg       police chase with the helicopter overhead
//   02-briefing.jpg    mission briefing with the dialogue box open
//   03-race.jpg        street race running at the start pad
//   04-night-bike.jpg  night ride on the bike
//
// How it works: it spawns the repo's own serve.ts on a scratch port,
// drives the game in headless Chrome through the debug handle
// (window.__solmar), stages each scene, and screenshots it. The
// chase staging lives in ./chase-shot.mjs.
//
// Usage:  node tools/shots.mjs        (from the repo root, or anywhere —
//                                      paths resolve from this file)
// Requires the QA puppeteer-core install and the headless-shell
// Chromium under ~/.cache/ms-playwright (same setup as the smoke test).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { stageChaseShot } from './chase-shot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SHOTS_DIR = join(ROOT, 'screenshots');
const PORT = 8911;
const MAX_BYTES = 256 * 1024;
const VIEWPORT = { width: 1280, height: 720 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Headless Chrome runs at roughly half a frame per second, so a quick
// key tap can fall entirely between frames. Hold keys down for a full
// two seconds, then give the game a beat to react.
async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

// Keep holding a key until a live check turns true (or time runs out).
async function holdKeyUntil(page, code, checkFn, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await page.keyboard.down(code);
    await sleep(2000);
    await page.keyboard.up(code);
    await sleep(300);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

// Poll a live check until it turns true (or time runs out).
async function waitFor(page, checkFn, timeoutMs = 60000, stepMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await checkFn()) return true;
    await sleep(stepMs);
  }
  return await checkFn();
}

// Screenshot to screenshots/<name>.jpg, stepping the JPEG quality
// down until the file fits under the 256 KiB dossier cap.
async function shoot(page, name) {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const out = join(SHOTS_DIR, `${name}.jpg`);
  for (const quality of [72, 55, 40, 28]) {
    await page.screenshot({ path: out, type: 'jpeg', quality });
    const size = statSync(out).size;
    console.log(`shot ${name}.jpg quality=${quality} size=${size} bytes`);
    if (size < MAX_BYTES) return { file: out, size, quality };
  }
  throw new Error(`${name}.jpg still over 256 KiB at quality 28`);
}

async function waitForServer(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Not up yet — keep waiting.
    }
    await sleep(500);
  }
  throw new Error(`server did not come up at ${url}`);
}

async function main() {
  const qaToolsPkg =
    process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';
  const puppeteer = createRequire(existsSync(qaToolsPkg) ? qaToolsPkg : import.meta.url)(
    'puppeteer-core',
  );

  // Serve the game with the repo's own server on a scratch port.
  const server = spawn('node', [join(ROOT, 'serve.ts')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });
  const stopServer = () => {
    try {
      server.kill();
    } catch {
      // Already gone.
    }
  };
  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });

  let browser = null;
  try {
    await waitForServer(`http://127.0.0.1:${PORT}/index.html`);
    browser = await puppeteer.launch({
      executablePath:
        process.env.HOME +
        '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--window-size=1280,720',
      ],
      defaultViewport: VIEWPORT,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
    });

    // Fresh save, new game, skip the intro flyover.
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    await sleep(2500);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2000);
    await page.click('#btn-new');
    await sleep(1500);
    await holdKey(page, 'KeyX');
    await sleep(1500);

    // --- Shot 1: police chase with the helicopter overhead. ---
    const chase = await stageChaseShot(page);
    console.log('chase staged:', JSON.stringify(chase));
    await shoot(page, '01-chase');

    // Cool off so no foot cop busts the rest of the run, then head to
    // the garage: mission 1 auto-starts there with Lena's briefing.
    await page.evaluate(() => {
      window.__solmar.S.heat = 0;
    });
    await sleep(3000);
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-90, 0, -66);
    });
    const briefingReady = await waitFor(
      page,
      async () =>
        await page.evaluate(() => {
          const S = window.__solmar.S;
          const el = document.getElementById('dialogue');
          return (
            S.missions.current &&
            S.missions.current.id === 'm1' &&
            el &&
            !el.classList.contains('hidden') &&
            document.getElementById('dlg-name').textContent === 'LENA CRUZ'
          );
        }),
      30000,
      1500,
    );
    console.log('briefing ready:', briefingReady);
    await shoot(page, '02-briefing');

    // --- Shot 3: street race. Enter the parked sport car, roll to
    // the start pad, press T, then nudge onto the road mid-race. ---
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-102, 0, -64);
    });
    await holdKeyUntil(
      page,
      'KeyE',
      async () => await page.evaluate(() => !!window.__solmar.S.car),
      20000,
    );
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(-60, 0, -60);
    });
    await holdKeyUntil(
      page,
      'KeyT',
      async () => await page.evaluate(() => window.__solmar.S.sideActivities.race.active),
      30000,
    );
    await sleep(1200);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(0, 0, -60);
    });
    await sleep(1500);
    await shoot(page, '03-race');

    // --- Shot 4: night scene on the bike. Exit the car, take the
    // parked bike, jump the clock to night, then frame it downtown. ---
    const inCar = await page.evaluate(() => !!window.__solmar.S.car);
    if (inCar) {
      await holdKeyUntil(
        page,
        'KeyE',
        async () => await page.evaluate(() => !window.__solmar.S.car),
        20000,
      );
    }
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-88, 0, -64);
    });
    await holdKeyUntil(
      page,
      'KeyE',
      async () =>
        await page.evaluate(
          () => !!window.__solmar.S.car && window.__solmar.S.car.kind === 'bike',
        ),
      30000,
    );
    await page.evaluate(() => {
      window.__solmar.S.time = 200;
    });
    const nightReady = await waitFor(
      page,
      async () => await page.evaluate(() => window.__solmar.S.dayNight.night > 0.5),
      120000,
      5000,
    );
    console.log('night ready:', nightReady);
    await page.evaluate(() => {
      const S = window.__solmar.S;
      if (S.car) S.car.pos.set(0, 0, 40);
    });
    await sleep(1500);
    await shoot(page, '04-night-bike');

    if (errors.length > 0) {
      console.log('page errors during shoot:', errors.join(' | '));
    }
    console.log('all four screenshots written to', SHOTS_DIR);
  } finally {
    if (browser) await browser.close();
    stopServer();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
