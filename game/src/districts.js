// District matching for SOLMAR BAY. The district is the nearest centre
// to the player; the state tick already recomputes it every frame, and
// this module exposes the same lookup for anything else that needs it.
import { CONFIG } from './config.js';

export function districtAt(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dd = dx * dx + dz * dz;
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

export function init(ctx) {
  ctx.api.districtAt = districtAt;
  ctx.updates.push(() => {
    const S = ctx.state;
    const d = districtAt(S.player.pos.x, S.player.pos.z);
    S.district = d.id;
  });
}
