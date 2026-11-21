// Day/night progression for SOLMAR BAY. The clock opens at 18:28; dusk
// starts at +62 minutes, night at +150. The night factor eases toward
// its target and drives the sun, the sky dome and the phase label.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S } = ctx;

  function updateDayNight(dt) {
    const t = S.time;
    let target = 0;
    let phase = 'SUNSET';
    if (t >= CONFIG.nightAt) {
      phase = 'NIGHT';
      target = 1;
    } else if (t >= CONFIG.duskAt) {
      phase = 'DUSK';
      target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
    }
    S.dayNight.phase = phase;
    const night = S.dayNight.night;
    const step = 0.6 * dt;
    if (night < target) S.dayNight.night = Math.min(target, night + step);
    else if (night > target) S.dayNight.night = Math.max(target, night - step);

    const n = S.dayNight.night;
    if (S.sunLight) {
      S.sunLight.intensity = 2.2 - n * 1.85;
      S.sunLight.color.setHex(n > 0.6 ? 0x8fb4ff : 0xffb347);
    }
    if (S.skyDome && S.skyDome.material.uniforms) {
      S.skyDome.material.uniforms.uNight.value = n;
    }
  }

  ctx.updates.push(updateDayNight);
  ctx.api.updateDayNight = updateDayNight;
}
