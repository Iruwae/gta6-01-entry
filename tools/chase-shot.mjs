// Chase-shot staging for SOLMAR BAY screenshots.
// Top the wallet, disarm the pay-n-spray, put the player downtown at 4-5
// stars, and re-assert the heat every 2 s until the heli is overhead with
// at least 3 cops — up to 90 s.
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
      let heliDist = null;
      if (S.heli) {
        const dx = S.heli.pos.x - S.player.pos.x;
        const dy = S.heli.pos.y - S.player.pos.y;
        const dz = S.heli.pos.z - S.player.pos.z;
        heliDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist,
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    if (
      state.heli &&
      state.heliDist !== null &&
      state.heliDist <= cfg.heliOverheadDistance &&
      state.cops >= cfg.minCops
    ) {
      break;
    }
    await page.evaluate((heat) => {
      window.__solmar.S.heat = heat;
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
  }
  return state;
}

export default { CHASE_STAGING, stageChaseShot };
