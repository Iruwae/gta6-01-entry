// SOLMAR BAY — chase-shot staging for tools/shots.mjs.
// Tops the wallet to $500, disarms the pay-n-spray, puts the player
// downtown at (0,0), and holds heat at 90 until the helicopter is
// overhead (within 40 m) with at least 3 cops on the roster.
export const CHASE_STAGING = {
  walletTopUp: 500,
  downtown: [0, 0, 0],
  heat: 90,
  heliOverheadDistance: 40,
  minCops: 3,
  reassertEveryMs: 2000,
  settleTimeoutMs: 90000,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function stageChaseShot(page, options = {}) {
  const cfg = { ...CHASE_STAGING, ...options };
  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    state = await page.evaluate((c) => {
      const S = window.__solmar.S;
      S.cash = c.walletTopUp;
      if (S.heatDirector) S.heatDirector.sprayBooth.armed = false;
      S.player.pos.set(c.downtown[0], c.downtown[1], c.downtown[2]);
      S.heat = c.heat;
      const cops = (S.cars || []).filter((car) => car.aiPolice);
      let heliDist = null;
      if (S.heli) {
        const dx = S.heli.pos.x - S.player.pos.x;
        const dz = S.heli.pos.z - S.player.pos.z;
        heliDist = Math.hypot(dx, dz);
      }
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist,
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    }, cfg);
    if (
      state.heli &&
      state.heliDist !== null &&
      state.heliDist <= cfg.heliOverheadDistance &&
      state.cops >= cfg.minCops &&
      state.rosterRows >= cfg.minCops
    ) {
      break;
    }
    await sleep(cfg.reassertEveryMs);
  }
  return state;
}
