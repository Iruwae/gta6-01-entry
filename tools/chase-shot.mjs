// SOLMAR BAY — chase-shot staging for tools/shots.mjs (scene 1).
// Tops the wallet to $500, disarms the pay-n-spray, puts the player
// downtown (0,0), sets heat 90 and re-asserts it every 2 s until the
// helicopter is within 40 m with at least 3 cops, up to 90 s.
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
  await page.evaluate((c) => {
    const S = window.__solmar.S;
    S.cash = c.walletTopUp;
    if (S.heatDirector) S.heatDirector.sprayBooth.armed = false;
    S.player.pos.set(c.downtown[0], c.downtown[1], c.downtown[2]);
    if (S.car) { S.car = null; }
    S.heat = c.heat;
  }, cfg);

  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    await page.evaluate((heat) => {
      const S = window.__solmar.S;
      if (S.heat < heat) S.heat = heat; // re-assert: heat cools slowly
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
    state = await page.evaluate(() => {
      const S = window.__solmar.S;
      const cops = S.cars.filter((c) => c.aiPolice);
      const heliDist = S.heli
        ? Math.hypot(S.heli.pos.x - S.player.pos.x, S.heli.pos.y - S.player.pos.y, S.heli.pos.z - S.player.pos.z)
        : null;
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist: heliDist === null ? null : Math.round(heliDist),
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    if (state.heli && state.heliDist !== null && state.heliDist <= cfg.heliOverheadDistance && state.cops >= cfg.minCops) {
      break;
    }
  }
  return state;
}
