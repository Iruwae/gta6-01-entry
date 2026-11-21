// SOLMAR BAY — the safehouse (motel). H rests there: full health, and
// the heat cools down by 40. Only works at the safehouse door.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const d = Math.hypot(S.player.pos.x - CONFIG.safehouse.x, S.player.pos.z - CONFIG.safehouse.z);
    if (d <= CONFIG.safehouse.radius) {
      S.player.health = 100;
      S.heatDirector.cool(40);
      ctx.api.toast('Rested at the safehouse. Health full, heat cooling off.');
    }
  });
  ctx.safehouseReady = true;
}
