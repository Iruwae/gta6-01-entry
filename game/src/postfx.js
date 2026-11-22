// Post-processing grade: filmic tone mapping whose exposure eases down
// after dark, the warm sunset band fading out once night lands, the
// vignette deepening at night.
export function init(ctx) {
  const { state: S, renderer, dom } = ctx;
  ctx.updates.push(() => {
    const night = S.dayNight.night;
    renderer.toneMappingExposure = 1.1 - night * 0.35;
    if (dom['sunset-band']) dom['sunset-band'].style.opacity = String(1 - night);
    if (dom.vignette) dom.vignette.style.opacity = String(0.35 + night * 0.4);
  });
}
