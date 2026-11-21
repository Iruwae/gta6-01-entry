// SOLMAR BAY — wanted-level behaviour. Heat cools slowly on its own;
// the pay-n-spray booth wipes heat clean for $150 while the player
// drives through it. The booth fires once per entry and re-arms when
// the player leaves the radius; it can be disarmed outright via
// S.heatDirector.sprayBooth.armed = false.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    if (S.heat > 0) S.heat = Math.max(0, S.heat - dt * 0.5);

    const booth = S.heatDirector.sprayBooth;
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const dx = px - booth.x;
    const dz = pz - booth.z;
    const inside = dx * dx + dz * dz <= booth.radius * booth.radius;
    if (inside && booth.armed && S.car && S.heat > 0 && S.cash >= booth.cost) {
      S.cash -= booth.cost;
      S.heat = 0;
      S.wanted = 0;
      booth.armed = false;
      ctx.api.toast(`Pay-n-spray — heat wiped clean (-$${booth.cost}).`);
    }
    if (!inside) booth.armed = true;
  });
}
