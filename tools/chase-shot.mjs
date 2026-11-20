// tools/chase-shot.mjs — SOLMAR BAY chase-shot helper (GTA6-01 round 7 rebuild).
//
// A focused, standalone variant of tools/shots.mjs that captures ONLY
// the hardest frame: the police chase with the helicopter in view, the
// wanted level visible, and the roster showing.
//
//   node tools/chase-shot.mjs     (run from the repo root)
//
// It serves game/ on its own port (8905, so it never clashes with the
// full studio run), starts a fresh game, skips the intro, stages the
// chase downtown at (0,0) — far from the pay-n-spray booth at (-90,-58)
// — with the booth disarmed, the wallet topped to $500, and the heat
// re-asserted every few seconds so the wanted level never decays while
// the helicopter lines up overhead. Output: screenshots/1-chase.jpg
// (1280x720 JPEG, quality 80, under 256 KiB).

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GAME = join(ROOT, "game");
const SHOT_DIR = join(ROOT, "screenshots");
const PORT = 8905;
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

async function holdKey(page, code, ms = 2000) {
  await page.keyboard.down(code);
  await sleep(ms);
  await page.keyboard.up(code);
  await sleep(400);
}

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

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.warn("PAGEERROR:", String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") console.warn("CONSOLE:", m.text());
  });

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
  await sleep(1500);

  // Stage the chase: booth disarmed, wallet topped, player downtown.
  await page.evaluate(() => {
    const S = window.__solmar.S;
    S.cash = 500;
    S.heat = 0;
    if (typeof S.wanted === "number") S.wanted = 0;
    const booth = S.heatDirector && S.heatDirector.sprayBooth;
    if (booth) booth.armed = false;
    S.player.pos.set(0, 0, 0);
    S.heat = 90;
  });

  // Pin the heat: re-assert it every few seconds so the wanted level
  // cannot decay while the helicopter lines up overhead.
  const keepHot = setInterval(() => {
    page
      .evaluate(() => {
        window.__solmar.S.heat = 90;
      })
      .catch(() => {});
  }, 2500);

  try {
    // Wait for the full chase picture: helicopter up, roster populated,
    // four or more wanted stars on the HUD.
    const t0 = Date.now();
    let ready = false;
    while (Date.now() - t0 < 90000) {
      ready = await page.evaluate(() => {
        const S = window.__solmar.S;
        const rows = document.querySelectorAll("#roster .roster-row").length;
        return !!S.heli && rows >= 4 && S.wanted >= 4;
      });
      if (ready) break;
      await sleep(1500);
    }
    if (!ready) throw new Error("chase did not stage: no heli/roster/4 stars in 90 s");
    await sleep(2500); // let the helicopter settle into frame

    const out = join(SHOT_DIR, "1-chase.jpg");
    await page.screenshot({ path: out, type: "jpeg", quality: 80 });
    let bytes = statSync(out).size;
    if (bytes >= MAX_BYTES) {
      console.log(`1-chase.jpg was ${bytes} bytes, retaking at quality 60`);
      await page.screenshot({ path: out, type: "jpeg", quality: 60 });
      bytes = statSync(out).size;
    }
    const cash = await page.evaluate(() => window.__solmar.S.cash);
    console.log(`1-chase.jpg: ${bytes} bytes, cash $${cash}`);
    if (bytes >= MAX_BYTES) {
      throw new Error(`1-chase.jpg still ${bytes} bytes (>= 256 KiB)`);
    }
  } finally {
    clearInterval(keepHot);
  }
} finally {
  await browser.close();
  server.close();
}
console.log("chase shot done");
