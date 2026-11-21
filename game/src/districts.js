// SOLMAR BAY — districts: nearest-centre matching drives S.district.
export function nearestDistrict(config, x, z) {
  let best = config.districts[0];
  let bd = Infinity;
  for (const d of config.districts) {
    const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}

export function init(ctx) {
  const { state: S, config } = ctx;
  ctx.updates.push(() => {
    S.district = nearestDistrict(config, S.player.pos.x, S.player.pos.z).id;
  });
  ctx.api.districtAt = (x, z) => nearestDistrict(config, x, z);
}

export default { init };
