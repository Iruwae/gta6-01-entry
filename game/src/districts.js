// SOLMAR BAY — districts: nearest-centre matching, HUD follows the player.
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
  ctx.nearestDistrict = nearestDistrict;
  ctx.updates.push(() => {
    S.district = nearestDistrict(S.player.pos.x, S.player.pos.z).id;
  });
  // Recompute on a timer too: at headless speed rAF can stall for
  // seconds, and the HUD district must follow a teleport promptly.
  setInterval(() => {
    S.district = nearestDistrict(S.player.pos.x, S.player.pos.z).id;
  }, 500);
  return { nearestDistrict };
}

export default init;
