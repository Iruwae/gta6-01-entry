// SOLMAR BAY — the on-screen readouts. The boot hub refreshes the HUD
// (cash, district, clock, respect, health, radio, wanted stars, weapon
// slots, speedometer, objective), the police roster and the minimap every
// frame; this module owns the HUD's visibility contract (hidden on the
// menu, live everywhere else) and the money formatter the readouts use.
export function formatCash(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function init(ctx) {
  const { state: S, dom } = ctx;
  ctx.api.formatCash = formatCash;
  ctx.updates.push(() => {
    if (!dom.hud) return;
    if (S.mode === 'menu') dom.hud.classList.add('hidden');
    else dom.hud.classList.remove('hidden');
  });
}
