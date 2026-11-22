// Day/night progression: phase + night ramp + sun + sky uniform.
// The boot hub owns the per-frame application; this module exposes the
// same math as helpers so the hub and the module never drift apart.
import { CONFIG } from './config.js';

export function phaseFor(timeMinutes) {
  if (timeMinutes >= CONFIG.nightAt) return 'NIGHT';
  if (timeMinutes >= CONFIG.duskAt) return 'DUSK';
  return 'SUNSET';
}

export function targetNightFor(timeMinutes) {
  if (timeMinutes >= CONFIG.nightAt) return 1;
  if (timeMinutes >= CONFIG.duskAt) {
    return (timeMinutes - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
  }
  return 0;
}

export function sunIntensityFor(night) {
  return 2.2 - night * 1.85;
}

export function updateDayNight(S, dt) {
  const phase = phaseFor(S.time);
  const target = targetNightFor(S.time);
  S.dayNight.phase = phase;
  const step = 0.6 * dt;
  if (S.dayNight.night < target) S.dayNight.night = Math.min(target, S.dayNight.night + step);
  else if (S.dayNight.night > target) S.dayNight.night = Math.max(target, S.dayNight.night - step);
  const night = S.dayNight.night;
  if (S.sunLight) {
    S.sunLight.intensity = sunIntensityFor(night);
    S.sunLight.color.setHex(night > 0.6 ? 0x8fb4ff : 0xffb347);
  }
  if (S.skyDome) {
    S.skyDome.material.uniforms.uNight.value = night;
  }
}

export function init(ctx) {
  ctx.daynight = { phaseFor, targetNightFor, sunIntensityFor, update: (dt) => updateDayNight(ctx.state, dt) };
}

export default init;
