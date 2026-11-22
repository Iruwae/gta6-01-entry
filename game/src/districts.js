// SOLMAR BAY — districts. The player's district is the nearest district
// centre; the HUD label follows it. Pinned centres: HARBOR (120,120),
// BEACH (0,165), UPTOWN (120,-90), THE STRIP (0,135).
import { CONFIG } from './config.js';

export function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

export function init(ctx) {
  const S = ctx.state;
  ctx.updates.push(() => {
    S.district = nearestDistrict(S.player.pos.x, S.player.pos.z).id;
  });
  ctx.flags.districts = true;
}
