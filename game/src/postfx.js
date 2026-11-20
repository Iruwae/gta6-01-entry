// SOLMAR BAY — post effects (round 8, written fresh from the spec).
// A cheap sunset colour grade on the renderer: filmic tone mapping and
// an exposure that eases down as night falls, plus a gentle push on the
// sunset band overlay. Everything is guarded — if the renderer or a
// WebGL feature is missing, this module silently does nothing and the
// game keeps rendering.
export function init(ctx) {
  const S = ctx.state;
  let applied = false;
  let lastNight = -1;

  function grade(night) {
    try {
      const renderer = ctx.renderer;
      if (!renderer) return;
      const T = ctx.THREE;
      // Filmic tone mapping for the warm sunset look, set once.
      if (T && T.ACESFilmicToneMapping !== undefined && !applied) {
        try { renderer.toneMapping = T.ACESFilmicToneMapping; } catch (e) { /* unsupported: skip */ }
        applied = true;
      }
      // Exposure eases from golden hour down to night.
      try {
        const target = 1.06 - night * 0.18;
        if (typeof renderer.toneMappingExposure === 'number') {
          renderer.toneMappingExposure += (target - renderer.toneMappingExposure) * 0.2;
        }
      } catch (e) { /* exposure control unsupported: skip */ }
    } catch (e) { /* renderer unavailable: nothing to grade */ }

    try {
      const band = (ctx.dom && ctx.dom['sunset-band']) || document.getElementById('sunset-band');
      if (band) band.style.opacity = String(0.9 - night * 0.45);
    } catch (e) { /* overlay missing: skip */ }
  }

  ctx.api.postfx = {
    grade,
    apply(night) { grade(typeof night === 'number' ? night : 0); },
  };

  ctx.updates.push(function postfxUpdate() {
    let night = 0;
    try {
      night = (S && S.dayNight && S.dayNight.night) || 0;
    } catch (e) { night = 0; }
    night = Math.max(0, Math.min(1, night));
    // Re-grade only when the night value has moved enough to matter,
    // plus once at startup; the work itself is just a few assignments.
    if (Math.abs(night - lastNight) > 0.01 || lastNight < 0) {
      lastNight = night;
      grade(night);
    }
  });
}
