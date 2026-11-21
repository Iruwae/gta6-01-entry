// Wanted-level behaviour: heat cools slowly on its own, and the
// pay-n-spray booth wipes it clean for $150 while the player drives
// through it. The booth fires once per entry and re-arms when the
// player leaves its radius.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, api } = ctx;
  const booth = S.heatDirector.sprayBooth;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // Slow natural cooldown.
    if (S.heat > 0) S.heatDirector.cool(dt * 0.4);

    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const dx = px - booth.x;
    const dz = pz - booth.z;
    const inside = dx * dx + dz * dz < booth.radius * booth.radius;
    if (!inside) {
      booth.armed = true;
      return;
    }
    // Only a drive-through counts: the player must be in a car.
    if (!S.car) return;
    if (booth.armed && S.heat > 0 && S.cash >= booth.cost) {
      booth.armed = false;
      S.cash -= booth.cost;
      S.heat = 0;
      api.toast(`Pay-n-spray: heat wiped clean -$${booth.cost}`);
    }
  });
}
