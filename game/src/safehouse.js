// SOLMAR BAY — the safehouse. H rests at the motel: full health, and
// the heat cools down (reduce heat by 40, floor 0). Only works when the
// player is actually at the safehouse door.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const { input } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  ctx.updates.push(() => {
    if (S.mode !== 'playing' || S.cutscene) return;
    if (!input.justPressed('KeyH')) return;
    const loc = CONFIG.locations.safehouse;
    const d = Math.hypot(S.player.pos.x - loc.x, S.player.pos.z - loc.z);
    if (d >= loc.radius) return;
    S.player.health = CONFIG.maxHealth;
    S.heat = Math.max(0, S.heat - 40);
    toast('Rested at the safehouse. Health restored, heat cooled.');
  });

  ctx.flags.safehouse = true;
}
