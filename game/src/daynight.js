// Owns the day/night progression the boot hub uses: phase + night ramp
// targets. The boot hub applies them each frame (see main.js).
export function init(ctx) {
  const { config } = ctx;
  ctx.daynight = {
    phaseFor(time) {
      if (time >= config.nightAtMinutes) return 'NIGHT';
      if (time >= config.duskAtMinutes) return 'DUSK';
      return 'SUNSET';
    },
    targetFor(time) {
      if (time >= config.nightAtMinutes) return 1;
      if (time >= config.duskAtMinutes) {
        return (time - config.duskAtMinutes) / (config.nightAtMinutes - config.duskAtMinutes);
      }
      return 0;
    },
  };
}
