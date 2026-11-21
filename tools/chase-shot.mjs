// Chase-shot staging for the SOLMAR BAY screenshot run.
//
// The police-chase screenshot needs a very specific live moment: the
// player wanted at 4-5 stars, downtown, with the police helicopter
// already overhead. Wanted level decays on its own, so this helper
// keeps re-asserting the heat every couple of seconds until the
// helicopter has actually lined up above the player — otherwise the
// shot can come out with the heli still miles away or the stars gone.
//
// Used by tools/shots.mjs. It only drives the game through the public
// debug handle (window.__solmar) and plain DOM reads; it never touches
// the game source.
export const CHASE_STAGING = {
  // Wallet topped back up before the shot, matching the staging brief.
  walletTopUp: 500,
  // Chase is staged downtown, at the map origin.
  downtown: { x: 0, y: 0, z: 0 },
  // Heat 90 reads as 4-5 wanted stars (heli spawns at 3+).
  heat: 90,
  // Close enough that the helicopter reads as "overhead" in frame.
  heliOverheadDistance: 40,
  // At least this many police cars should be in the chase.
  minCops: 3,
  // Re-assert heat this often so the wanted level never decays away
  // while the helicopter is still positioning itself.
  reassertEveryMs: 2000,
  // Give up waiting after this long and let the caller shoot anyway.
  settleTimeoutMs: 90000,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stage the chase in the live game page and wait until the helicopter
// is overhead. Returns a snapshot of the final staged state
// ({ wanted, heat, cops, heli, heliDist, rosterRows }) so the caller
// can log what the shot actually captured.
export async function stageChaseShot(page, options = {}) {
  const cfg = { ...CHASE_STAGING, ...options };

  // 1. Safe starting point: disarm the pay-n-spray booth so it cannot
  //    fire mid-staging, top the wallet back to $500, clear any old
  //    heat, and put the player downtown at (0, 0).
  await page.evaluate((cfg) => {
    const S = window.__solmar.S;
    if (S.heatDirector && S.heatDirector.sprayBooth) {
      S.heatDirector.sprayBooth.armed = false;
    }
    S.cash = cfg.walletTopUp;
    S.heat = 0;
    S.player.pos.set(cfg.downtown.x, cfg.downtown.y, cfg.downtown.z);
  }, cfg);
  await sleep(500);

  // 2. Light the wanted level and keep re-asserting it until the
  //    helicopter is overhead with police in pursuit.
  const started = Date.now();
  let snapshot = null;
  while (Date.now() - started < cfg.settleTimeoutMs) {
    snapshot = await page.evaluate((cfg) => {
      const S = window.__solmar.S;
      S.heat = cfg.heat;
      const heli = S.heli;
      let heliDist = null;
      if (heli && heli.pos) {
        const dx = heli.pos.x - S.player.pos.x;
        const dz = heli.pos.z - S.player.pos.z;
        heliDist = Math.hypot(dx, dz);
      }
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: (S.cars || []).filter((c) => c.aiPolice).length,
        heli: !!heli,
        heliDist,
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    }, cfg);
    if (
      snapshot.heli &&
      snapshot.heliDist !== null &&
      snapshot.heliDist <= cfg.heliOverheadDistance &&
      snapshot.cops >= cfg.minCops
    ) {
      return snapshot;
    }
    await sleep(cfg.reassertEveryMs);
  }
  // Timed out: hand back the last observed state so the caller can
  // log it and still take the shot rather than failing the whole run.
  return snapshot;
}
