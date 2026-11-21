// SOLMAR BAY — day/night progression: phase, night ramp, sun and sky.
export function init(ctx) {
  const { THREE, state: S } = ctx;
  const amber = new THREE.Color(0xffb347);
  const cool = new THREE.Color(0x8fb4ff);
  ctx.updates.push((dt) => {
    const t = S.time;
    let target = 0;
    if (t >= ctx.config.nightAt) target = 1;
    else if (t >= ctx.config.duskAt) target = (t - ctx.config.duskAt) / (ctx.config.nightAt - ctx.config.duskAt);
    S.dayNight.night += (target - S.dayNight.night) * Math.min(1, 0.6 * dt);
    if (S.dayNight.night < 0) S.dayNight.night = 0;
    if (S.dayNight.night > 1) S.dayNight.night = 1;
    if (S.sunLight) {
      S.sunLight.intensity = 2.2 - S.dayNight.night * 1.85;
      S.sunLight.color.copy(S.dayNight.night > 0.6 ? cool : amber);
    }
    if (S.skyDome && S.skyDome.material && S.skyDome.material.uniforms) {
      S.skyDome.material.uniforms.uNight.value = S.dayNight.night;
    }
  });
}

export default { init };
