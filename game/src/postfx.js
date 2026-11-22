// Post-processing grade: filmic tone mapping whose exposure eases down
// after dark, the warm sunset band fading out once night lands, the
// vignette deepening at night.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, renderer, state: S, dom } = ctx;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  ctx.updates.push(() => {
    const night = S.dayNight.night;
    renderer.toneMappingExposure = 1.1 - night * 0.35;
    if (dom['sunset-band']) dom['sunset-band'].style.opacity = String(1 - night);
    if (dom.vignette) dom.vignette.style.opacity = String(0.45 + night * 0.5);
  });
}

export default init;
