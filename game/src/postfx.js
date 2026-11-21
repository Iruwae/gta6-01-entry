// SOLMAR BAY — post-processing grade. Filmic tone mapping whose
// exposure eases down after dark, the warm sunset band fading out once
// night lands, the vignette deepening at night.
export function init(ctx) {
  const { renderer, state: S, dom } = ctx;
  ctx.updates.push(() => {
    const n = S.dayNight.night;
    renderer.toneMappingExposure = 1.1 - n * 0.35;
    if (dom['sunset-band']) dom['sunset-band'].style.opacity = String(1 - n * 0.9);
    if (dom.vignette) {
      dom.vignette.style.opacity = String(0.7 + n * 0.3);
    }
  });
}
