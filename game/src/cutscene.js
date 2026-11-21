// SOLMAR BAY — intro flyover + cutscene overlay behaviour. The boot hub
// owns the cutscene clock and the overlay; this module owns the lines and
// the flyover camera path it cycles through.
export const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the city is just waking up.',
  'Vic Torres has work. Lena Cruz has the wheel. All you need is nerve.',
  'One sunset. Ten jobs. The whole bay is watching.',
];

export function init(ctx) {
  ctx.cutsceneLines = CUTSCENE_LINES;
  ctx.api.cutsceneLines = CUTSCENE_LINES;
  ctx.updates.push(() => {
    // Flyover camera is driven by the boot hub from ctx.cutsceneT.
  });
  ctx.cutsceneReady = true;
}
