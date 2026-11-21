// SOLMAR BAY — day/night progression helpers. The boot hub runs the
// per-frame step; this module owns the phase math and the sun/sky tuning.
import { CONFIG } from './config.js';

export function phaseFor(timeMinutes) {
  if (timeMinutes >= CONFIG.nightAt) return { phase: 'NIGHT', target: 1 };
  if (timeMinutes >= CONFIG.duskAt) {
    return { phase: 'DUSK', target: (timeMinutes - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt) };
  }
  return { phase: 'SUNSET', target: 0 };
}

export function sunIntensity(night) {
  return 2.2 - night * 1.85;
}

export function init(ctx) {
  ctx.daynight = { phaseFor, sunIntensity };
  ctx.updates.push(() => {
    // Mirror of the boot hub's step (idempotent): keep phase + night in
    // sync even if the hub's copy is ever skipped for a frame.
    const S = ctx.state;
    const { phase, target } = phaseFor(S.time);
    S.dayNight.phase = phase;
    const step = 0.6 * 0.016;
    if (S.dayNight.night < target) S.dayNight.night = Math.min(target, S.dayNight.night + step);
    else if (S.dayNight.night > target) S.dayNight.night = Math.max(target, S.dayNight.night - step);
  });
  ctx.daynightReady = true;
}
