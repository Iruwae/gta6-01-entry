// Nearest-centre district matching. The state tick owns S.district; this
// module exposes the same matcher for anything that needs it.
import { CONFIG } from './config.js';

export function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dd = (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best;
}

export function init(ctx) {
  ctx.districts = { nearest: nearestDistrict };
}
