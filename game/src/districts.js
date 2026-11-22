// Districts: nearest-centre matching. S.district follows the player.
import { CONFIG } from './config.js';

export function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestD = Infinity;
  for (const d of CONFIG.districts) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function districtName(id) {
  const d = CONFIG.districts.find((x) => x.id === id);
  return d ? d.name : 'DOWNTOWN';
}

export function init(ctx) {
  const { state: S } = ctx;
  ctx.updates.push(() => {
    S.district = nearestDistrict(S.player.pos.x, S.player.pos.z).id;
  });
}

export default init;
