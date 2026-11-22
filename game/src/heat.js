// Wanted behaviour: heat cools slowly on its own; the pay-n-spray booth
// at (-90,-58) wipes heat clean for $150 while the player drives through
// it (fires once per entry; re-arms when the player leaves the radius;
// can be disarmed via S.heatDirector.sprayBooth.armed = false).
export function init(ctx) {
  const { state: S } = ctx;
  const booth = S.heatDirector.sprayBooth;
  let inside = false;
  let firedByBooth = false;

  ctx.updates.push((dt) => {
    if (S.heat > 0) S.heat = Math.max(0, S.heat - dt * 0.5);
    const ref = S.car || S.player;
    const dx = ref.pos.x - booth.x;
    const dz = ref.pos.z - booth.z;
    const near = dx * dx + dz * dz < booth.radius * booth.radius;
    if (near && !inside && booth.armed && S.heat > 0 && S.car && S.cash >= booth.cost) {
      S.heat = 0;
      S.cash -= booth.cost;
      booth.armed = false;
      firedByBooth = true;
      ctx.api.toast('Pay-n-spray: heat wiped clean (-$150).');
    }
    if (!near) {
      inside = false;
      if (firedByBooth) { booth.armed = true; firedByBooth = false; }
    } else {
      inside = true;
    }
  });
}
