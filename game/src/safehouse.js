// Safehouse: H rests at the motel — full health, heat cools down 40.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const sh = CONFIG.safehouse;
    const dx = S.player.pos.x - sh.x;
    const dz = S.player.pos.z - sh.z;
    if (Math.sqrt(dx * dx + dz * dz) >= sh.radius) return;
    S.player.health = CONFIG.maxHealth;
    S.heat = Math.max(0, S.heat - 40);
    if (ctx.api.toast) ctx.api.toast('Rested at the safehouse. Health restored, heat cooled.');
  });
}

export default init;
