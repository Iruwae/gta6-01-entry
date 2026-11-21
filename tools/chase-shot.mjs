// SOLMAR BAY — chase-shot staging for tools/shots.mjs.
// Tops the wallet to $500, disarms the pay-n-spray, puts the player
// downtown at (0,0), and re-asserts heat 90 every 2 s until the helicopter
// is overhead (within 40 m) with at least 3 cops, up to 90 s.
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
  // Make sure a game is actually playing (menu -> new game -> skip cutscene).
  const mode = await page.evaluate(() => window.__solmar && window.__solmar.S.mode);
  if (mode === 'menu') {
    await page.click('#btn-new');
    await sleep(1500);
    await page.keyboard.down('KeyX');
    await sleep(1200);
    await page.keyboard.up('KeyX');
    await sleep(1000);
  } else {
    await page.keyboard.down('KeyX');
    await sleep(800);
    await page.keyboard.up('KeyX');
    await sleep(500);
  }
  await page.evaluate((cfg) => {
    const S = window.__solmar.S;
    S.cash = cfg.walletTopUp;
    if (S.heatDirector) S.heatDirector.sprayBooth.armed = false;
    S.player.pos.set(cfg.downtown.x, cfg.downtown.y, cfg.downtown.z);
    S.heat = cfg.heat;
  }, cfg);

  const t0 = Date.now();
  let state = null;
  while (Date.now() - t0 < cfg.settleTimeoutMs) {
    state = await page.evaluate((cfg) => {
      const S = window.__solmar.S;
      S.heat = cfg.heat; // re-assert: heat cools slowly on its own
      const cops = S.cars.filter((c) => c.aiPolice);
      let heliDist = null;
      if (S.heli) {
        const dx = S.heli.pos.x - S.player.pos.x;
        const dy = S.heli.pos.y - S.player.pos.y;
        const dz = S.heli.pos.z - S.player.pos.z;
        heliDist = Math.round(Math.hypot(dx, dy, dz));
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
    if (state.heli && state.heliDist !== null && state.heliDist <= cfg.heliOverheadDistance && state.cops >= cfg.minCops) {
      break;
    }
    await sleep(cfg.reassertEveryMs);
  }
  await sleep(1500);
  const final = await page.evaluate(() => {
    const S = window.__solmar.S;
    const cops = S.cars.filter((c) => c.aiPolice);
    let heliDist = null;
    if (S.heli) {
      heliDist = Math.round(Math.hypot(
        S.heli.pos.x - S.player.pos.x,
        S.heli.pos.y - S.player.pos.y,
        S.heli.pos.z - S.player.pos.z,
      ));
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
  return final;
}
