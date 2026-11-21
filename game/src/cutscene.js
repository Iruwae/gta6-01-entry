// SOLMAR BAY — the intro cutscene. The flyover, the overlay and the
// skip live in the boot hub (startCutscene / endCutscene, X skips by
// keydown and by held key); this module owns the three sunset lines the
// flyover cycles through, one every 4.5 seconds over 14 seconds.
export const CUTSCENE_LINES = [
  'The sun is going down on Solmar Bay, and the city is waking up.',
  'One hustler. One car. One last chance to make a name.',
  'Vic Torres has work. Lena Cruz has the wheel. The bay is yours.',
];

export function init(ctx) {
  ctx.api.cutsceneLines = CUTSCENE_LINES;
}
