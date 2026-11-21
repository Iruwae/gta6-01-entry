// SOLMAR BAY — post-processing grade: filmic tone mapping whose exposure
// eases down after dark, the warm sunset band fading out once night lands,
// the vignette deepening at night.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { renderer, dom } = ctx;
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  ctx.updates.push((dt) => {
    const n = ctx.state.dayNight.night;
    if (renderer) {
      const target = 1.05 - n * 0.35;
      renderer.toneMappingExposure += (target - renderer.toneMappingExposure) * Math.min(1, dt * 2);
    }
    const band = dom['sunset-band'];
    if (band) band.style.opacity = String(Math.max(0, 0.85 - n));
    const vig = dom.vignette;
    if (vig) vig.style.opacity = String(0.55 + n * 0.45);
  });
  ctx.postfxReady = true;
}
