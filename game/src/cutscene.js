// SOLMAR BAY — intro cutscene. The flyover + overlay behaviour lives in
// the boot hub (startCutscene / endCutscene, 3 sunset lines cycling
// every 4.5s over 14s, X skips); this module owns the line set so the
// words stay in one place.
export const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the whole city is about to light up.',
  'One hustler. One borrowed car. One shot at the crew that runs this town.',
  'Vic has work. Lena has the wheel. All you need is nerve.',
];

export function init(ctx) {
  ctx.cutsceneLines = CUTSCENE_LINES;
  ctx.flags.cutscene = true;
}
