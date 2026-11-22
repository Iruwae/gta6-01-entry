// Chase-shot staging for SOLMAR BAY screenshots.
// Exports CHASE_STAGING + stageChaseShot(page, options).
// Staging: wallet topped to $500, pay-n-spray disarmed, player downtown
// (0,0), heat 90 re-asserted every 2 s until the heli is within 40 m with
// >= 3 cops, up to 90 s.
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
  let last = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    await sleep(cfg.reassertEveryMs);
    last = await page.evaluate((c) => {
      const S = window.__solmar.S;
      S.heat = c.heat; // re-assert: heat cools on its own
      const cops = S.cars.filter((x) => x.aiPolice);
      let heliDist = null;
      if (S.heli) {
        heliDist = Math.hypot(S.heli.pos.x - S.player.pos.x, S.heli.pos.z - S.player.pos.z);
      }
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist: heliDist === null ? null : Math.round(heliDist),
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    }, cfg);
    if (last.heli && last.heliDist !== null && last.heliDist <= cfg.heliOverheadDistance && last.cops >= cfg.minCops) {
      break;
    }
  }
  return last || { wanted: 0, heat: 0, cops: 0, heli: false, heliDist: null, rosterRows: 0 };
}
