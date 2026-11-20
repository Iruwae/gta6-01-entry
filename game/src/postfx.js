// Solmar Bay — post effects (round 7 rebuild).
// A cheap sunset colour grade done entirely through the renderer:
// filmic tone mapping with an exposure that eases down as night
// falls. No composer, no extra passes, no new render targets —
// and every step is guarded, so a missing WebGL feature can only
// ever leave the grade off, never break the frame.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const renderer = ctx.renderer;
  const T = ctx.THREE;

  let exposure = 1.12;
  let active = false;

  function applyGrade(night) {
    if (!renderer) return;
    try {
      // Filmic tone mapping gives the sunset its warm roll-off.
      const filmic = T && typeof T.ACESFilmicToneMapping !== 'undefined'
        ? T.ACESFilmicToneMapping : 4;
      if (renderer.toneMapping !== filmic) renderer.toneMapping = filmic;
      const target = 1.12 - 0.3 * Math.max(0, Math.min(1, night));
      exposure += (target - exposure) * 0.08;
      renderer.toneMappingExposure = exposure;
      active = true;
    } catch (err) {
      // A renderer that refuses the grade still renders the scene.
      active = false;
    }
  }

  // Try once up front so the very first frame is already graded.
  try {
    applyGrade(S.dayNight && typeof S.dayNight.night === 'number' ? S.dayNight.night : 0);
  } catch (err) {
    active = false;
  }

  const postfx = {
    setGrade(night) {
      try { applyGrade(night); } catch (err) { /* grade is optional */ }
    },
    get exposure() { return exposure; },
    get active() { return active; },
  };
  ctx.api.postfx = postfx;
  S.postfx = postfx;

  ctx.updates.push(() => {
    if (!renderer) return;
    const night = S.dayNight && typeof S.dayNight.night === 'number' ? S.dayNight.night : 0;
    try { applyGrade(night); } catch (err) { /* never break rendering */ }
  });
}
