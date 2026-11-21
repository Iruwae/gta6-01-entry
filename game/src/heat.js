// SOLMAR BAY — wanted level behaviour: heat cools slowly on its own, and
// the pay-n-spray booth wipes heat clean for $150 while the player drives
// through it (fires once per entry; re-arms when the player leaves).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, api } = ctx;
  const booth = S.heatDirector.sprayBooth;

  ctx.updates.push((dt) => {
    // Slow passive cooldown.
    if (S.heat > 0) S.heatDirector.cool(dt * 0.3);

    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const d = Math.hypot(px - booth.x, pz - booth.z);
    if (d <= booth.radius) {
      if (booth.armed && S.car && S.heat > 0 && S.cash >= booth.cost) {
        S.cash -= booth.cost;
        S.heat = 0;
        S.wanted = 0;
        booth.armed = false;
        api.toast(`Pay-n-spray: heat wiped clean (-$${booth.cost}).`);
      }
    } else {
      booth.armed = true;
    }
  });
}
