// tools/shots.mjs — SOLMAR BAY screenshot studio (GTA6-01 round 7 rebuild).
//
// Regenerates the four showcase screenshots for the entry, straight from
// the live game, and writes the shots.json manifest at the repo root.
//
//   node tools/shots.mjs            (run from the repo root)
//
// What it does, in order:
//   1. Serves game/ on http://127.0.0.1:8903.
//   2. Opens one headless Chrome session (puppeteer-core) at 1280x720,
//      starts a fresh game, skips the intro cutscene.
//   3. Stages and captures four scenes:
//        1-chase.jpg   police chase downtown, helicopter overhead
//        2-mission.jpg mission briefing dialogue at the garage
//        3-drive.jpg   street race from the start pad
//        4-onfoot.jpg  night ride on the bike
//   4. Writes screenshots/*.jpg (JPEG quality 80, each under 256 KiB)
//      and shots.json with the real byte sizes.
//
// Staging rules that matter (the pay-n-spray booth at (-90,-58) fires
// the instant a wanted car rolls through it: -$150, heat wiped). So
// every shot begins with the booth disarmed and the wallet topped back
// to $500, and the chase is staged downtown at (0,0) — far from the
// booth — with heat re-asserted every few seconds so the wanted level
// never decays while the helicopter lines up overhead.
//
// The game is driven through window.__solmar and the DOM, the same way
// the acceptance smoke test drives it. Headless Chrome renders at
// roughly one frame per second, so every key press is held for two
// full seconds and every wait polls instead of trusting a fixed sleep.

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAME = join(ROOT, "game");
const SHOT_DIR = join(ROOT, "screenshots");
const PORT = 8903;
const MAX_BYTES = 256 * 1024;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- puppeteer -----------------------------------------------------------
const qaPkg = join(
  process.env.HOME,
  "workspace/makefun/qa-tools/node_modules/puppeteer-core/package.json",
);
const puppeteer = createRequire(existsSync(qaPkg) ? qaPkg : import.meta.url)(
  "puppeteer-core",
);
const CHROME =
  process.env.HOME +
  "/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell";

// --- static server -------------------------------------------------------
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const file = join(GAME, p === "/" ? "index.html" : p);
  if (!file.startsWith(GAME) || !existsSync(file)) {
    res.writeHead(404);
    res.end("nf");
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] || "application/octet-stream",
  });
  res.end(readFileSync(file));
});

// --- keyboard helpers (headless runs ~1 fps: hold, don't tap) ------------
async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

async function holdKeyUntil(page, code, checkFn, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await holdKey(page, code);
    if (await checkFn()) return true;
  }
  return await checkFn();
}

// Poll an in-page predicate until it turns true (or time runs out).
async function waitFor(page, fn, timeoutMs = 60000, label = "condition") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(fn)) return true;
    await sleep(1500);
  }
  console.warn(`  [wait] timed out: ${label}`);
  return false;
}

// Step out of any car the previous shot left the player in. The car is
// parked far away first so a later E press can't re-enter it by mistake.
async function exitCarIfAny(page) {
  const inCar = await page.evaluate(() => !!window.__solmar.S.car);
  if (!inCar) return;
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(150, 0, 150);
  });
  await sleep(500);
  await holdKeyUntil(
    page,
    "KeyE",
    async () => !(await page.evaluate(() => !!window.__solmar.S.car)),
    20000,
  );
}

// --- shared staging ------------------------------------------------------
// Disarm the pay-n-spray booth, cool the heat, top the wallet to $500.
// Runs before EVERY shot so no earlier scene can leak into the next one.
async function resetStage(page) {
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.cash = 500;
    S.heat = 0;
    if (typeof S.wanted === "number") S.wanted = 0;
    const booth = S.heatDirector && S.heatDirector.sprayBooth;
    if (booth) booth.armed = false;
  });
  await exitCarIfAny(page);
  await sleep(3000); // let any pursuing police peel off
}

// Click through an open dialogue box until it closes (max 4 lines).
async function dismissDialogue(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() => {
      const el = document.getElementById("dialogue");
      return el && !el.classList.contains("hidden");
    });
    if (!open) return;
    await page.click("#dialogue");
    await sleep(700);
  }
}

// Capture one frame; if it lands over the 256 KiB cap, retake it softer.
async function takeShot(page, name, note) {
  const path = join(SHOT_DIR, name);
  await page.screenshot({ path, type: "jpeg", quality: 80 });
  let bytes = statSync(path).size;
  if (bytes >= MAX_BYTES) {
    console.log(`  ${name} was ${bytes} bytes, retaking at quality 60`);
    await page.screenshot({ path, type: "jpeg", quality: 60 });
    bytes = statSync(path).size;
  }
  const cash = await page.evaluate(() => window.__solmar.S.cash);
  console.log(`  ${name}: ${bytes} bytes, cash $${cash}`);
  return { file: name, bytes, cash, note };
}

// --- the four scenes -----------------------------------------------------

async function shotChase(page) {
  console.log("shot 1-chase.jpg — police chase downtown");
  await resetStage(page);
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(0, 0, 0);
  });
  await page.evaluate(() => {
    window.__solmar.S.heat = 90;
  });
  // Keep the heat pinned: without this the wanted level decays before
  // the helicopter has time to line up overhead.
  const keepHot = setInterval(() => {
    page
      .evaluate(() => {
        window.__solmar.S.heat = 90;
      })
      .catch(() => {});
  }, 2500);
  try {
    await waitFor(
      page,
      () => {
        const S = window.__solmar.S;
        const rows = document.querySelectorAll("#roster .roster-row").length;
        return !!S.heli && rows >= 4 && S.wanted >= 4;
      },
      90000,
      "heli + roster + 4 stars",
    );
    await sleep(2500); // let the helicopter settle into frame
    return await takeShot(
      page,
      "1-chase.jpg",
      "Police chase downtown at golden hour — four wanted stars, patrol cars closing in, helicopter overhead, roster on screen.",
    );
  } finally {
    clearInterval(keepHot);
  }
}

async function shotMission(page) {
  console.log("shot 2-mission.jpg — mission briefing at the garage");
  await resetStage(page);
  await dismissDialogue(page);
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(-90, 0, -66);
  });
  await waitFor(
    page,
    () => {
      const S = window.__solmar.S;
      const el = document.getElementById("dialogue");
      return (
        S.missions.current &&
        S.missions.current.id === "m1" &&
        el &&
        !el.classList.contains("hidden") &&
        (document.getElementById("dlg-name") || {}).textContent === "LENA CRUZ"
      );
    },
    60000,
    "mission 1 briefing dialogue",
  );
  await sleep(1200);
  return await takeShot(
    page,
    "2-mission.jpg",
    "Mission briefing at the garage — Lena Cruz opens the first job in the dialogue box.",
  );
}

async function shotDrive(page) {
  console.log("shot 3-drive.jpg — street race from the start pad");
  await resetStage(page);
  await dismissDialogue(page);
  // Step to the parked sport car and get in.
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(-102, 0, -64);
  });
  const inCar = await holdKeyUntil(
    page,
    "KeyE",
    async () => (await page.evaluate(() => !!window.__solmar.S.car)) === true,
    30000,
  );
  if (!inCar) throw new Error("could not enter the sport car for the race shot");
  // Roll to the start pad and fire the race.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    if (S.car) S.car.pos.set(-60, 0, -60);
  });
  const racing = await holdKeyUntil(
    page,
    "KeyT",
    async () =>
      (await page.evaluate(
        () => window.__solmar.S.sideActivities.race.active,
      )) === true,
    30000,
  );
  if (!racing) throw new Error("street race did not start for the race shot");
  await holdKey(page, "KeyW", 2000); // pull away so the speedo climbs
  await sleep(1000);
  return await takeShot(
    page,
    "3-drive.jpg",
    "Street race from the start pad — race HUD live, speedometer climbing, city streets ahead.",
  );
}

async function shotNight(page) {
  console.log("shot 4-onfoot.jpg — night ride on the bike");
  await resetStage(page);
  await dismissDialogue(page);
  // Jump the clock to night, then step to the parked bike and mount it.
  await page.evaluate(() => {
    window.__solmar.S.time = 200;
  });
  await page.evaluate(() => {
    window.__solmar.S.player.pos.set(-88, 0, -64);
  });
  const onBike = await holdKeyUntil(
    page,
    "KeyE",
    async () =>
      (await page.evaluate(
        () => window.__solmar.S.car && window.__solmar.S.car.kind,
      )) === "bike",
    30000,
  );
  if (!onBike) throw new Error("could not mount the bike for the night shot");
  await waitFor(
    page,
    () => window.__solmar.S.dayNight.night > 0.5,
    120000,
    "night to engage",
  );
  await sleep(1500);
  return await takeShot(
    page,
    "4-onfoot.jpg",
    "Night ride on the bike — lit-up streets after dark, city lights on, HUD glowing.",
  );
}

// --- main ----------------------------------------------------------------
mkdirSync(SHOT_DIR, { recursive: true });
await new Promise((r) => server.listen(PORT, r));
console.log(`serving game/ on http://127.0.0.1:${PORT}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
    "--window-size=1280,720",
  ],
  defaultViewport: { width: 1280, height: 720 },
});

const failed = [];
const errors = [];
const shots = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.warn("PAGEERROR:", String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") console.warn("CONSOLE:", m.text());
  });

  // Fresh game, intro cutscene skipped.
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });
  await sleep(2500);
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "load", timeout: 60000 });
  await sleep(2000);
  await page.click("#btn-new");
  await sleep(1500);
  await holdKey(page, "KeyX");
  await waitFor(
    page,
    () => window.__solmar.S.mode === "playing" && !window.__solmar.S.cutscene,
    30000,
    "cutscene skip",
  );

  const scenes = [shotChase, shotMission, shotDrive, shotNight];
  for (const scene of scenes) {
    try {
      shots.push(await scene(page));
    } catch (err) {
      const name = scene.name.replace("shot", "").toLowerCase();
      console.error(`FAILED ${name}:`, err.message);
      failed.push(name);
      errors.push(`${name}: ${err.message}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

const manifest = { shots, failed, errors };
writeFileSync(join(ROOT, "shots.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote shots.json: ${shots.length} shots, ${failed.length} failed`);
for (const s of shots) {
  if (s.bytes >= MAX_BYTES) {
    console.warn(`WARNING: ${s.file} is ${s.bytes} bytes (>= 256 KiB)`);
  }
}
process.exit(failed.length > 0 ? 1 : 0);
