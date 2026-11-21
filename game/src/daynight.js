// SOLMAR BAY — day/night progression. The boot hub applies the phase,
// night ramp, sun and sky uniform every frame; this module owns the
// helpers that describe that progression so every other module reads
// the same numbers.
export function phaseFor(timeMinutes, config) {
  if (timeMinutes >= config.nightStart) return 'NIGHT';
  if (timeMinutes >= config.duskStart) return 'DUSK';
  return 'SUNSET';
}

export function nightTargetFor(timeMinutes, config) {
  if (timeMinutes >= config.nightStart) return 1;
  if (timeMinutes >= config.duskStart) {
    return (timeMinutes - config.duskStart) / (config.nightStart - config.duskStart);
  }
  return 0;
}

export function sunIntensityFor(night) {
  return 2.2 - night * 1.85;
}

export function init(ctx) {
  ctx.api.daynight = { phaseFor, nightTargetFor, sunIntensityFor };
}
