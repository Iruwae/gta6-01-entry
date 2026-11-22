// SOLMAR BAY — post-processing grade. Filmic tone mapping whose exposure
// eases down after dark, the warm sunset band fading out once night
// lands, the vignette deepening at night.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state;
  const { renderer, dom } = ctx;
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
  }
  ctx.updates.push((dt) => {
    const night = S.dayNight.night;
    if (renderer) {
      const target = 1.1 - night * 0.28;
      renderer.toneMappingExposure += (target - renderer.toneMappingExposure) * Math.min(1, 2 * dt);
    }
    if (dom['sunset-band']) {
      dom['sunset-band'].style.opacity = String(1 - night * 0.85);
    }
    if (dom.vignette) {
      dom.vignette.style.opacity = String(0.45 + night * 0.4);
    }
  });
  ctx.flags.postfx = true;
}
