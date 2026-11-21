// SOLMAR BAY — heat: wanted behaviour, slow cooldown, and the pay-n-spray
// booth that wipes heat clean for $150 (fires once per entry, re-arms
// when the player leaves the radius).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;
  const booth = S.heatDirector.sprayBooth;
  let inside = false;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // Heat cools slowly on its own.
    if (S.heat > 0) S.heatDirector.cool(dt * 0.2);
    const ref = S.car ? S.car.pos : S.player.pos;
    const d = Math.hypot(ref.x - booth.x, ref.z - booth.z);
    const nowInside = d <= booth.radius;
    if (nowInside && !inside) {
      inside = true;
      if (booth.armed && S.car && S.heat > 0 && S.cash >= booth.cost) {
        S.cash -= booth.cost;
        S.heat = 0;
        booth.armed = false;
        ctx.api.toast(`Pay-n-spray: heat wiped clean. -$${booth.cost}`);
      }
    } else if (!nowInside && inside) {
      inside = false;
      booth.armed = true; // re-arms when the player leaves the radius
    }
  });
  ctx.heatReady = true;
}
