// SOLMAR BAY — districts. The district is the nearest district centre
// to the player; the HUD label follows it. Pinned centres: HARBOR
// (120,120), BEACH (0,165), UPTOWN (120,-90), THE STRIP (0,135).
import { CONFIG } from './config.js';

export function nearestDistrict(x, z) {
  let best = CONFIG.districts[0];
  let bestDist = Infinity;
  for (const d of CONFIG.districts) {
    const dx = x - d.x;
    const dz = z - d.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) { bestDist = dist; best = d; }
  }
  return best;
}

export function districtName(id) {
  const d = CONFIG.districts.find((x) => x.id === id);
  return d ? d.name : id.toUpperCase();
}

export function init(ctx) {
  const { state: S } = ctx;
  ctx.api.districts = { nearestDistrict, districtName };
  ctx.updates.push(() => {
    const d = nearestDistrict(S.player.pos.x, S.player.pos.z);
    if (d) S.district = d.id;
  });
}
