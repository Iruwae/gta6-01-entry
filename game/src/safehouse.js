// SOLMAR BAY — safehouse: H rests at the motel, full health, heat cools.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const input = ctx.input;

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyH')) return;
    const d = Math.hypot(S.player.pos.x - CONFIG.safehouse.x, S.player.pos.z - CONFIG.safehouse.z);
    if (d > CONFIG.safehouse.radius + 2) return;
    S.player.health = CONFIG.player.maxHealth;
    S.heat = Math.max(0, S.heat - CONFIG.safehouse.heatCool);
    ctx.api.toast('SAFEHOUSE: slept it off. Full health, heat cooling down.');
  });

  return {};
}

export default init;
