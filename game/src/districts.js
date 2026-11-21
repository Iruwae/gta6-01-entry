// SOLMAR BAY — districts: nearest-centre matching. The HUD district label
// and S.district both follow the player.
import { CONFIG } from './config.js';

export function districtAt(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}

export function init(ctx) {
  ctx.districtAt = districtAt;
  ctx.updates.push(() => {
    const S = ctx.state;
    S.district = districtAt(S.player.pos.x, S.player.pos.z).id;
  });
  ctx.districtsReady = true;
}
