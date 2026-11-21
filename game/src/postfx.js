// Post-processing grade for SOLMAR BAY: filmic tone mapping whose
// exposure eases down after dark, the warm sunset band fading out once
// night lands, and the vignette deepening at night.
export function init(ctx) {
  const { THREE, state: S, renderer, dom } = ctx;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  ctx.updates.push((dt) => {
    const n = S.dayNight.night;
    const targetExposure = 1.1 - n * 0.35;
    renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * Math.min(1, dt * 2);
    if (dom.sunsetBand) dom.sunsetBand.style.opacity = String(1 - n * 0.85);
    if (dom.vignette) dom.vignette.style.opacity = String(0.55 + n * 0.45);
  });
}
