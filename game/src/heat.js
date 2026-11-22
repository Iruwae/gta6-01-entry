// SOLMAR BAY — wanted level behaviour. Heat cools slowly on its own;
// the pay-n-spray booth wipes it clean for $150 while the player drives
// through it (fires once per entry, re-arms when the player leaves the
// radius, and can be disarmed via S.heatDirector.sprayBooth.armed).
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const booth = S.heatDirector.sprayBooth;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // Slow natural cooldown.
    if (S.heat > 0) S.heatDirector.cool(0.25 * dt);
    const loc = CONFIG.locations.spray;
    const ref = S.car ? S.car.pos : S.player.pos;
    const d = Math.hypot(ref.x - loc.x, ref.z - loc.z);
    if (d > loc.radius) {
      booth.armed = true;
      return;
    }
    // Inside the booth: only a driven car gets the spray.
    if (!S.car) return;
    if (!booth.armed) return;
    if (S.heat <= 0) return;
    if (S.cash < loc.cost) return;
    S.cash -= loc.cost;
    S.heat = 0;
    booth.armed = false;
    if (ctx.api.toast) ctx.api.toast(`Pay-n-spray: heat wiped clean -$${loc.cost}`);
  });

  ctx.flags.heat = true;
}
