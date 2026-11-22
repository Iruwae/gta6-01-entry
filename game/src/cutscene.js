// Intro cutscene: flyover + overlay behaviour (owned by the boot hub).
export const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the whole city is about to light up.',
  'You came here with $120 and a name nobody knows. Tonight, that changes.',
  'Vic Torres has work. Lena Cruz has the wheel. All you need is nerve.',
];

export function init(ctx) {
  ctx.cutsceneLines = CUTSCENE_LINES;
}

export default init;
