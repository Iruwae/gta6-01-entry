// HUD module. The on-screen readouts (cash, district, clock, respect,
// health, radio, wanted stars, police roster, minimap, weapon slots,
// speedometer, objective) are implemented in the boot hub (main.js), which
// owns the frame loop — this module just marks itself loaded.
export function init(ctx) {
  ctx.hud = { loaded: true };
}
