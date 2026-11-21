// SOLMAR BAY — intro flyover + cutscene overlay behaviour. The boot hub
// owns start/end of the cutscene; this module owns the line cycling over
// the 14-second flyover.
export function init(ctx) {
  const { state: S, dom } = ctx;
  const lines = [
    'The sun is going down over Solmar Bay — and the city is just waking up.',
    'You came here with $120 and a name nobody knows. Tonight, that changes.',
    'Vic has work. Lena has the wheel. All you need is nerve.',
  ];
  ctx.api.cutsceneTick = (dt) => {
    if (!S.cutscene) return;
    S._cutT = (S._cutT || 0) + dt;
    const idx = Math.min(lines.length - 1, Math.floor(S._cutT / 4.5));
    if (dom.cutsceneText) dom.cutsceneText.textContent = lines[idx];
    if (S._cutT >= 14) ctx.api.endCutscene();
  };
  ctx.api.cutsceneLines = lines;
  ctx.api.cutsceneLoaded = true;
}

export default { init };
