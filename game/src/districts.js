// SOLMAR BAY — districts: nearest-centre matching. S.district and the
// HUD district label follow the player.
import { CONFIG } from './config.js';

export function nearestDistrictId(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dx = d.x - x;
    const dz = d.z - z;
    const dd = dx * dx + dz * dz;
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.id;
}

export function init(ctx) {
  const { state: S } = ctx;
  ctx.updates.push(() => {
    S.district = nearestDistrictId(S.player.pos.x, S.player.pos.z);
  });
}
