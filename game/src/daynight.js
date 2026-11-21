// SOLMAR BAY — day/night progression. The boot hub runs the same
// computation every frame; this module exposes it as a helper so other
// modules can ask for the current phase without duplicating the math.
import { CONFIG } from './config.js';

export function phaseAt(time) {
  if (time >= CONFIG.nightAt) return { phase: 'NIGHT', target: 1 };
  if (time >= CONFIG.duskAt) {
    return { phase: 'DUSK', target: (time - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt) };
  }
  return { phase: 'SUNSET', target: 0 };
}

export function updateDayNight(ctx, dt) {
  const S = ctx.state;
  const { phase, target } = phaseAt(S.time);
  S.dayNight.phase = phase;
  const n = S.dayNight.night;
  const step = 0.6 * dt;
  S.dayNight.night = target > n ? Math.min(target, n + step) : Math.max(target, n - step);
  return S.dayNight.night;
}

export function init(ctx) {
  ctx.api.dayNight = { phaseAt, update: (dt) => updateDayNight(ctx, dt) };
}
