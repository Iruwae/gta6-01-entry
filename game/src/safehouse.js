// SOLMAR BAY — the safehouse (motel). H rests at the safehouse door:
// full health, and the heat cools down by 40 (floor 0). Only works
// when the player is actually at the safehouse door.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const dx = S.player.pos.x - CONFIG.safehouse.x;
    const dz = S.player.pos.z - CONFIG.safehouse.z;
    if (dx * dx + dz * dz <= CONFIG.safehouse.radius * CONFIG.safehouse.radius) {
      S.player.health = CONFIG.maxHealth;
      S.heat = Math.max(0, S.heat - 40);
      ctx.api.toast('Rested at the safehouse. Full health, cooler head.');
    }
  });
}
