// SOLMAR BAY — post-processing grade (round 9 rebuild, builder B / world).
// Keeps the sunset look glued together as the day slides into night:
// filmic tone mapping whose exposure eases down after dark, the warm
// sunset band fading out once night lands, and the vignette deepening a
// little in the dark. No extra render passes — just the renderer and
// the two overlay divs. Written fresh from the build contract; no other
// game module is imported.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { renderer } = ctx;
  const S = ctx.state || ctx.S;

  if (renderer) {
    try {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    } catch (e) {
      // Older renderer without tone mapping — the overlays still grade.
    }
  }

  function domEl(id) {
    return (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  }

  ctx.updates.push(() => {
    const night = (S.dayNight && S.dayNight.night) || 0;
    if (renderer) {
      renderer.toneMappingExposure = 1.12 - 0.3 * night;
    }
    const band = domEl('sunset-band');
    if (band) band.style.opacity = String(0.5 * (1 - night) + 0.04);
    const vig = domEl('vignette');
    if (vig) vig.style.opacity = String(0.28 + 0.22 * night);
  });
}
