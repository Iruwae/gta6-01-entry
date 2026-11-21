// SOLMAR BAY — intro cutscene. The flyover and the overlay behaviour
// (3 sunset lines cycling every 4.5s over 14s, X skips) live in the boot
// hub; this module is the cutscene's home and exposes the same surface.
export const CUTSCENE_LINES = [
  'The sun hangs low over Solmar Bay, and the whole city is turning gold.',
  'Somewhere below, Vic Torres is waiting — and Lena Cruz is already behind the wheel.',
  'One hundred and twenty dollars. One long sunset. Make it count.',
];

export function init(ctx) {
  ctx.api.cutscene = { lines: CUTSCENE_LINES };
}
