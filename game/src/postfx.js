// SOLMAR BAY — post-processing grade: filmic tone mapping whose exposure
// eases down after dark, the warm sunset band fading out once night lands,
// the vignette deepening at night.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, renderer, state: S, dom } = ctx;
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  }
  ctx.updates.push(() => {
    const night = S.dayNight.night;
    if (renderer) renderer.toneMappingExposure = 1.15 - night * 0.35;
    if (dom.sunsetBand) dom.sunsetBand.style.opacity = String(1 - night);
    if (dom.vignette) dom.vignette.style.opacity = String(0.35 + night * 0.45);
  });
  ctx.api.postfxLoaded = true;
}

export default { init };
