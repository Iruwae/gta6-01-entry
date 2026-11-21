// SOLMAR BAY — chase-shot staging for tools/shots.mjs. Tops the wallet to
// $500, disarms the pay-n-spray, puts the player downtown, and holds heat
// at 90 until the helicopter is overhead with at least 3 cops on the scene.
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
    S.heat = c.heat;
  }, cfg);
  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    state = await page.evaluate(() => {
      const S = window.__solmar.S;
      const heliDist = S.heli
        ? Math.hypot(S.heli.pos.x - S.player.pos.x, S.heli.pos.z - S.player.pos.z)
        : Infinity;
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: (S.cars || []).filter((c) => c.aiPolice).length,
        heli: !!S.heli,
        heliDist: Math.round(heliDist * 10) / 10,
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    if (state.heli && state.heliDist <= cfg.heliOverheadDistance && state.cops >= cfg.minCops) break;
    await page.evaluate((h) => {
      window.__solmar.S.heat = h;
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
  }
  return state;
}

export default { CHASE_STAGING, stageChaseShot };
