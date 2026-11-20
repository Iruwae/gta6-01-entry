// SOLMAR BAY — chase-frame tool, round-5 rebuild.
//
// A focused, standalone variant of tools/shots.mjs that stages and
// captures ONLY the chase frame (screenshots/1-chase.jpg): heat the
// city up, wait for the helicopter plus a full police roster, and
// shoot once the heli swings close overhead so it is visible in
// the frame next to the roster.
//
//   node tools/chase-shot.mjs [gameDir] [outDir]
//
// Defaults match tools/shots.mjs: gameDir = <repo>/game, outDir =
// <repo>. Point both at the scratch copy for trial runs.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const gameDir = resolve(process.argv[2] || join(repoRoot, 'game'));
const outDir = resolve(process.argv[3] || repoRoot);
const shotDir = join(outDir, 'screenshots');

const PORT = 8903;
const WIDTH = 1280;
const HEIGHT = 720;
const MAX_BYTES = 256 * 1024;
const QUALITY_STEPS = [80, 65, 50, 35, 20];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const CHROMIUM =
  process.env.HOME +
  '/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const PUPPETEER_PKG =
  process.env.HOME + '/workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...args) => console.log('[chase-shot]', ...args);

// Headless crawls at ~1 fps, so every key press is a 2-second hold.
async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

async function holdKeyUntil(page, code, checkFn, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await holdKey(page, code);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

async function waitFor(page, checkFn, timeoutMs = 60000, stepMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await checkFn()) return true;
    await sleep(stepMs);
  }
  return await checkFn();
}

// A mission briefing blocks the action keys while it is open, so click
// it until it hides (two lines for the m1 briefing: Lena, then Marco).
async function dismissDialogue(page) {
  for (let i = 0; i < 5; i++) {
    const visible = await page.evaluate(() => {
      const el = document.getElementById('dialogue');
      return !!el && !el.classList.contains('hidden');
    });
    if (!visible) return true;
    await page.click('#dialogue');
    await sleep(700);
  }
  return await page.evaluate(() => {
    const el = document.getElementById('dialogue');
    return !el || el.classList.contains('hidden');
  });
}

// Project the helicopter into screen space: true only when the model
// itself is inside the frame (with a small margin), not merely nearby.
async function heliOnScreen(page) {
  return await page.evaluate(() => {
    const S = window.__solmar.S;
    if (!S.heli || !S.camera) return { onScreen: false };
    try {
      const v = S.heli.pos.clone().project(S.camera);
      return {
        onScreen: Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9 && v.z < 1,
        x: +v.x.toFixed(2),
        y: +v.y.toFixed(2),
        z: +v.z.toFixed(2),
      };
    } catch (e) {
      return { onScreen: false, error: String(e) };
    }
  });
}

async function captureUnderLimit(page, name) {
  mkdirSync(shotDir, { recursive: true });
  const target = join(shotDir, name);
  for (const quality of QUALITY_STEPS) {
    const shot = await page.screenshot({ type: 'jpeg', quality });
    if (shot.length <= MAX_BYTES) {
      writeFileSync(target, shot);
      log(`saved ${name} — ${(shot.length / 1024).toFixed(1)} KiB @ q${quality}`);
      return { file: `screenshots/${name}`, bytes: shot.length, quality };
    }
    log(`${name} @ q${quality} is ${(shot.length / 1024).toFixed(1)} KiB, stepping down`);
  }
  const last = await page.screenshot({ type: 'jpeg', quality: QUALITY_STEPS.at(-1) });
  writeFileSync(target, last);
  log(`WARNING ${name} still ${(last.length / 1024).toFixed(1)} KiB at lowest quality`);
  return { file: `screenshots/${name}`, bytes: last.length, quality: QUALITY_STEPS.at(-1) };
}

async function main() {
  const puppeteer = createRequire(existsSync(PUPPETEER_PKG) ? PUPPETEER_PKG : import.meta.url)(
    'puppeteer-core',
  );

  const server = createServer((req, res) => {
    const raw = decodeURIComponent(req.url.split('?')[0]);
    const file = join(gameDir, raw === '/' ? 'index.html' : raw);
    if (!file.startsWith(gameDir) || !existsSync(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(PORT, r));
  log(`serving ${gameDir} on :${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    defaultViewport: { width: WIDTH, height: HEIGHT },
  });

  const page = await browser.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('PAGEERROR: ' + String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push('CONSOLE: ' + m.text());
  });

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await sleep(2500);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2000);
    await page.click('#btn-new');
    await sleep(1500);
    await holdKey(page, 'KeyX'); // skip the intro flyover
    await sleep(1500);
    await dismissDialogue(page); // the m1 briefing opens at once and swallows keys

    // Get rolling first: the chase reads best from behind the wheel.
    await page.evaluate(() => {
      window.__solmar.S.player.pos.set(-102, 0, -66);
    });
    const inCar = await holdKeyUntil(
      page,
      'KeyE',
      async () => (await page.evaluate(() => !!window.__solmar.S.car)) === true,
      20000,
    );
    log(inCar ? 'rolling in the sport car' : 'WARNING no car — chase is on foot');

    // Light the city up: four-plus stars brings the roster and the heli.
    await page.evaluate(() => {
      window.__solmar.S.heat = 90;
    });
    const ready = await waitFor(
      page,
      async () =>
        (await page.evaluate(() => {
          const S = window.__solmar.S;
          const cops = S.cars.filter((c) => c.aiPolice).length;
          const rows = document.querySelectorAll('#roster .roster-row').length;
          return !!S.heli && cops >= 4 && rows >= 4;
        })) === true,
      120000,
    );
    if (!ready) log('WARNING roster/heli staging timed out');

    // Drive while the heli circles: shoot the moment its model projects
    // inside the frame, so the helicopter itself is visible — not just
    // its spotlight. The camera tilts up as the heli swings overhead.
    let framed = false;
    await page.keyboard.down('KeyW');
    try {
      const started = Date.now();
      while (Date.now() - started < 150000) {
        const shot = await heliOnScreen(page);
        if (shot.onScreen) {
          framed = true;
          log('heli in frame:', JSON.stringify(shot));
          break;
        }
        await sleep(2000);
      }
    } finally {
      await page.keyboard.up('KeyW');
    }
    if (!framed) log('WARNING heli never entered the frame, shooting best-effort');
    await sleep(1500); // let the camera settle

    const state = await page.evaluate(() => {
      const S = window.__solmar.S;
      return {
        wanted: S.wanted,
        cops: S.cars.filter((c) => c.aiPolice).length,
        heli: !!S.heli,
        rows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    log('chase state:', JSON.stringify(state));

    const result = await captureUnderLimit(page, '1-chase.jpg');
    if (problems.length > 0) {
      log('page problems seen during the run:');
      for (const p of problems) log(' ', p);
    }
    const ok = result.bytes <= MAX_BYTES;
    log(ok ? 'chase frame done' : 'chase frame oversize — see warning above');
    process.exit(ok ? 0 : 1);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('[chase-shot] fatal:', err);
  process.exit(1);
});
