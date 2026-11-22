// Wanted behaviour: heat cools slowly on its own; the pay-n-spray booth
// wipes heat clean for $150 while the player drives through it.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;
  const booth = S.heatDirector.sprayBooth;
  ctx.updates.push((dt) => {
    // Slow natural cooldown.
    if (S.heat > 0) S.heat = Math.max(0, S.heat - dt * 0.2);
    // Pay-n-spray: only while driving through, once per entry.
    const car = S.car;
    const px = car ? car.pos.x : S.player.pos.x;
    const pz = car ? car.pos.z : S.player.pos.z;
    const dx = px - booth.x;
    const dz = pz - booth.z;
    const inside = Math.sqrt(dx * dx + dz * dz) < booth.radius;
    if (inside && booth.armed && car && Math.abs(car.speed) > 3 && S.heat > 0 && S.cash >= booth.cost) {
      S.cash -= booth.cost;
      S.heat = 0;
      booth.armed = false;
      if (ctx.api.toast) ctx.api.toast(`Pay-n-spray: heat wiped clean. -$${booth.cost}`);
    }
    if (!inside && !booth.armed) booth.armed = true;
  });
}

export default init;
