// Chase-shot staging for SOLMAR BAY. Tops the wallet to $500, disarms
// the pay-n-spray, puts the player downtown, and holds the heat at 90
// until the helicopter is overhead with at least 3 cops on the roster.
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
  let last = { wanted: 0, heat: 0, cops: 0, heli: false, heliDist: -1, rosterRows: 0 };
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    // Re-assert the heat: the booth and the natural cooldown fight it.
    await page.evaluate((h) => {
      window.__solmar.S.heat = h;
    }, cfg.heat);
    await sleep(cfg.reassertEveryMs);
    last = await page.evaluate(() => {
      const S = window.__solmar.S;
      const cops = S.cars.filter((c) => c.aiPolice);
      let heliDist = -1;
      if (S.heli) {
        heliDist = Math.hypot(S.heli.pos.x - S.player.pos.x, S.heli.pos.z - S.player.pos.z);
      }
      return {
        wanted: S.wanted,
        heat: S.heat,
        cops: cops.length,
        heli: !!S.heli,
        heliDist: heliDist < 0 ? -1 : Math.round(heliDist),
        rosterRows: document.querySelectorAll('#roster .roster-row').length,
      };
    });
    if (last.heli && last.heliDist >= 0 && last.heliDist <= cfg.heliOverheadDistance && last.cops >= cfg.minCops) {
      return last;
    }
  }
  return last;
}
