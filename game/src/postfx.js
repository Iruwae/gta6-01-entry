// SOLMAR BAY — post-processing grade: filmic tone mapping that eases down
// after dark, the sunset band fading out at night, the vignette deepening.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state;
  const dom = ctx.dom;
  const renderer = ctx.renderer;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  ctx.updates.push(() => {
    const night = S.dayNight.night;
    renderer.toneMappingExposure = 1.15 - night * 0.35;
    if (dom['sunset-band']) {
      dom['sunset-band'].style.opacity = String(1 - night);
    }
    if (dom.vignette) {
      dom.vignette.style.opacity = String(0.55 + night * 0.45);
    }
  });

  return {};
}

export default init;
