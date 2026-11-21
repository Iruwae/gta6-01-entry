// SOLMAR BAY — day/night progression: phase, night ramp, sun, sky, lights.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;

  function update(dt) {
    // Phase from the clock: 18:28 + S.time minutes.
    let target = 0;
    let phase = 'SUNSET';
    if (S.time >= CONFIG.nightAt) {
      target = 1;
      phase = 'NIGHT';
    } else if (S.time >= CONFIG.duskAt) {
      target = (S.time - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
      phase = 'DUSK';
    }
    S.dayNight.phase = phase;
    const night = S.dayNight.night;
    // Ease toward the target at 0.6 per game-second, never overshooting.
    S.dayNight.night = target > night
      ? Math.min(target, night + 0.6 * dt)
      : Math.max(target, night - 0.6 * dt);

    const n = S.dayNight.night;
    if (S.sunLight) {
      S.sunLight.intensity = 2.2 - n * 1.85;
      S.sunLight.color.set(n > 0.6 ? 0x8fb4ff : 0xffb347);
    }
    if (S.skyDome) {
      S.skyDome.material.uniforms.uNight.value = n;
    }
    if (ctx.windowMats) {
      for (const m of ctx.windowMats) m.emissiveIntensity = n * 0.95;
    }
    if (ctx.streetlightMats) {
      for (const m of ctx.streetlightMats) m.emissiveIntensity = n * 1.6;
    }
  }

  ctx.daynightUpdate = update;
  return { update };
}

export default init;
