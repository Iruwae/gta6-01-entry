// SOLMAR BAY — wanted-level behaviour: slow heat cooldown + pay-n-spray.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const booth = S.heatDirector.sprayBooth;
  let inside = false;

  ctx.updates.push((dt) => {
    // Heat cools slowly on its own.
    if (S.heat > 0) {
      S.heat = Math.max(0, S.heat - 0.2 * dt);
    }
    // Pay-n-spray: drive through the booth, heat wiped for $150.
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    const d = Math.hypot(px - booth.x, pz - booth.z);
    const nowInside = d <= booth.radius;
    if (nowInside && !inside && S.car && booth.armed) {
      if (S.heat > 0 && S.cash >= booth.cost) {
        S.cash -= booth.cost;
        S.heat = 0;
        booth.armed = false;
        ctx.api.toast(`PAY-N-SPRAY: fresh paint, clean slate. -$${booth.cost}`);
      } else if (S.heat > 0) {
        ctx.api.toast('PAY-N-SPRAY: not enough cash for a respray.');
      }
    }
    if (!nowInside) {
      // Re-arm once the player leaves the booth radius.
      if (!booth.armed) booth.armed = true;
      inside = false;
    } else {
      inside = true;
    }
  });

  return { booth };
}

export default init;
