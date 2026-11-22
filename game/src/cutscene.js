// Intro cutscene module. The flyover + overlay behaviour lives in the
// boot hub (main.js) — this module just records the lines it plays.
export const CUTSCENE_LINES = [
  'The sun hangs low over Solmar Bay, and the whole city is gold for one more hour.',
  "Vic Torres has work. Lena Cruz has the wheel. All you have is $120 and a name nobody knows.",
  'By midnight the bay will know it. If you make it that far.',
];

export function init(ctx) {
  ctx.cutscene = { lines: CUTSCENE_LINES };
}
