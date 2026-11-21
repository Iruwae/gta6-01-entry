// SOLMAR BAY — chase-shot staging for tools/shots.mjs.
// Stages a police chase downtown at 4-5 stars with the helicopter
// overhead: wallet topped up, pay-n-spray disarmed, player downtown,
// heat 90 re-asserted until the heli is close with >= 3 cops.
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
    S.heatDirector.sprayBooth.armed = false;
    S.player.pos.set(c.downtown.x, c.downtown.y, c.downtown.z);
    S.heat = c.heat;
  }, cfg);

  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    await page.evaluate((heat) => {
      window.__solmar.S.heat = heat;
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
    state = await page.evaluate(() => {
      const S = window.__solmar.S;
      const cops = S.cars.filter((c) => c.aiPolice);
      let heliDist = null;
      if (S.heli) {
        heliDist = Math.hypot(
          S.heli.pos.x - S.player.pos.x,
          S.heli.pos.y - S.player.pos.y,
          S.heli.pos.z - S.player.pos.z,
        );
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
    if (state.heli && state.heliDist !== null && state.heliDist <= cfg.heliOverheadDistance
      && state.cops >= cfg.minCops && state.wanted >= 4) {
      break;
    }
  }
  return state;
}

export default stageChaseShot;
