// The safehouse motel. Press H at the safehouse door to rest: full
// health, and the heat cools down by 40. Only works when the player is
// actually at the door.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api } = ctx;

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const dx = S.player.pos.x - CONFIG.safehouse.x;
    const dz = S.player.pos.z - CONFIG.safehouse.z;
    if (dx * dx + dz * dz > CONFIG.safehouse.radius * CONFIG.safehouse.radius) return;
    S.player.health = CONFIG.maxHealth;
    S.heatDirector.cool(40);
    api.toast('Rested at the safehouse. Health restored, heat cooled down.');
  });
}
