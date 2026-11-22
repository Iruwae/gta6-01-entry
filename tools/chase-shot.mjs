// SOLMAR BAY — screenshot staging for the police chase shot.
// Exports the staging constants and the staging routine used by
// tools/shots.mjs (and usable on its own): top the wallet to $500,
// disarm the pay-n-spray, put the player downtown at (0,0), hold the
// heat at 90 and re-assert it every 2 s until the helicopter is within
// 40 m with at least 3 cops on the roster, up to 90 s.
export const CHASE_STAGING = {
  walletTopUp: 500,
  downtown: { x: 0, y: 0, z: 0 },
  heat: 90,
  heliOverheadDistance: 40,
  minCops: 3,
  reassertEveryMs: 2000,
  settleTimeoutMs: 90000,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function stageChaseShot(page, options = {}) {
  const cfg = { ...CHASE_STAGING, ...options };
  await page.evaluate((c) => {
    const S = window.__solmar.S;
    S.cash = c.walletTopUp;
    if (S.heatDirector) S.heatDirector.sprayBooth.armed = false;
    S.player.pos.set(c.downtown.x, c.downtown.y, c.downtown.z);
    S.heat = c.heat;
  }, cfg);

  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    state = await page.evaluate(() => {
      const S = window.__solmar.S;
      const cops = S.cars.filter((c) => c.aiPolice);
      const heliDist = S.heli
        ? Math.hypot(S.heli.pos.x - S.player.pos.x, S.heli.pos.z - S.player.pos.z)
        : Infinity;
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist: Math.round(heliDist),
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    if (state.heli && state.heliDist <= cfg.heliOverheadDistance && state.cops >= cfg.minCops) {
      break;
    }
    await page.evaluate((h) => {
      window.__solmar.S.heat = h;
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
  }
  return state;
}
