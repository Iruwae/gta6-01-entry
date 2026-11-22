// SOLMAR BAY — day/night progression. The clock opens at 18:28; dusk
// starts at +62 minutes (19:30), night lands at +150 (21:00). The night
// value eases toward its target so the sunset slides into neon, the sun
// dims and cools, and the sky dome follows.
import { CONFIG } from './config.js';
import { clamp } from './random.js';

export function computeDayNight(S) {
  const t = S.time;
  let target = 0;
  let phase = 'SUNSET';
  if (t >= CONFIG.nightAt) {
    target = 1;
    phase = 'NIGHT';
  } else if (t >= CONFIG.duskAt) {
    target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
    phase = 'DUSK';
  }
  return { target, phase };
}

export function init(ctx) {
  const S = ctx.state;
  ctx.updates.push((dt) => {
    const { target, phase } = computeDayNight(S);
    S.dayNight.phase = phase;
    S.dayNight.night += (target - S.dayNight.night) * Math.min(1, 0.6 * dt);
    S.dayNight.night = clamp(S.dayNight.night, 0, 1);
    if (S.sunLight) {
      S.sunLight.intensity = 2.2 - S.dayNight.night * 1.85;
      S.sunLight.color.set(S.dayNight.night > 0.6 ? 0x8fb4ff : 0xffb347);
    }
    if (S.skyDome) {
      S.skyDome.material.uniforms.uNight.value = S.dayNight.night;
    }
  });
  ctx.flags.daynight = true;
}
