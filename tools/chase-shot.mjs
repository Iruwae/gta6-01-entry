// chase-shot.mjs — chase-shot staging helper for the SOLMAR BAY
// screenshot tool (GTA6-01 round 8 rebuild).
//
// Stages the downtown police chase used for showcase shot 1: the player
// on foot at the city centre, wanted level cranked up, police closing in
// and the helicopter circling overhead. The wanted level decays on its
// own while the helicopter is still lining up, so this helper keeps
// re-asserting the heat from the Node side every couple of seconds until
// the shot is taken. The caller stops the re-assertion when it is done.
//
// Only the public debug handle (window.__solmar) is used here, so this
// helper never depends on the game's internals.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Downtown staging spot: the middle of the city, far from the
// pay-n-spray booth so the booth never fires mid-chase.
const CHASE_SPOT = { x: 0, z: 0 };
// Heat value that reads as four to five wanted stars.
const CHASE_HEAT = 90;
// Re-assert the heat this often so it never decays away.
const REASSERT_MS = 2000;
// Close enough to count as "overhead" for the photo.
const OVERHEAD_DIST = 45;

/**
 * Stage the downtown chase and wait until the helicopter is overhead.
 *
 * @param {object} page - a puppeteer page with the game loaded and
 *   playing (new game started, cutscene skipped).
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=150000] - how long to wait for the heli.
 * @returns {Promise<object>} { stop, heli, wanted } — call stop() to end
 *   the heat re-assertion loop, heli is the helicopter position snapshot
 *   ({x, y, z}) at capture time, wanted is the star count.
 */
export async function stageChaseShot(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 150000;

  // Park the player downtown, on foot, and light the heat up.
  await page.evaluate((spot, heat) => {
    const S = window.__solmar.S;
    if (S.car) {
      // On foot for this shot: the chase reads better with the player
      // running downtown than sitting in a car.
      S.car = null;
    }
    S.player.pos.set(spot.x, 0, spot.z);
    S.heat = heat;
  }, CHASE_SPOT, CHASE_HEAT);

  // Keep the wanted level pinned while the helicopter lines up.
  // The game's heat decays over time; without this the stars fade
  // before the heli arrives.
  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    page.evaluate((heat) => {
      const S = window.__solmar.S;
      if (S.heat < heat - 10) S.heat = heat;
    }, CHASE_HEAT).catch(() => {});
  }, REASSERT_MS);
  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };

  // Poll until the helicopter exists and is hovering over the player.
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(() => {
      const S = window.__solmar.S;
      const p = S.player.pos;
      const heli = S.heli;
      if (!heli || !heli.pos) return { hasHeli: false };
      const dx = heli.pos.x - p.x;
      const dz = heli.pos.z - p.z;
      return {
        hasHeli: true,
        dist: Math.hypot(dx, dz),
        heli: { x: +heli.pos.x.toFixed(1), y: +heli.pos.y.toFixed(1), z: +heli.pos.z.toFixed(1) },
        wanted: S.wanted,
        cops: S.cars.filter((c) => c.aiPolice).length,
      };
    });
    if (last.hasHeli && last.dist < OVERHEAD_DIST && last.cops >= 2) break;
    await sleep(1000);
  }

  if (!last || !last.hasHeli) {
    stop();
    throw new Error('chase staging timed out: no helicopter appeared within ' + timeoutMs + ' ms');
  }
  if (last.dist >= OVERHEAD_DIST) {
    stop();
    throw new Error('chase staging timed out: helicopter never came overhead (closest ' + last.dist.toFixed(0) + ' m)');
  }

  return { stop, heli: last.heli, wanted: last.wanted };
}
