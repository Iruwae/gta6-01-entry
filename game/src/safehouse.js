// SOLMAR BAY — safehouse. H rests at the motel: full health, and the
// heat cools down (reduce heat by 40, floor 0). Only works when the
// player is actually at the safehouse door.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api } = ctx;
  ctx.updates.push(() => {
    if (!input.wasPressed('KeyH') || S.mode !== 'playing') return;
    const d = Math.hypot(S.player.pos.x - CONFIG.safehouse.x, S.player.pos.z - CONFIG.safehouse.z);
    if (d > CONFIG.safehouse.radius) return;
    S.player.health = CONFIG.maxHealth;
    S.heat = Math.max(0, S.heat - 40);
    api.toast('Rested at the safehouse — health full, heat cooling down.');
  });
}
