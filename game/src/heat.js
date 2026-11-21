// SOLMAR BAY — wanted behaviour: heat cools slowly on its own, and the
// pay-n-spray booth wipes heat clean for $150 when the player drives
// through it (once per entry, re-arms on leaving the radius).
export function init(ctx) {
  const { state: S, config, api } = ctx;
  ctx.updates.push((dt) => {
    if (S.heat > 0) S.heatDirector.cool(dt * 0.25);
    const booth = S.heatDirector.sprayBooth;
    const car = S.car;
    if (car) {
      const d = Math.hypot(car.pos.x - booth.x, car.pos.z - booth.z);
      if (d < booth.radius) {
        if (booth.armed && S.heat > 0 && S.cash >= booth.cost) {
          S.cash -= booth.cost;
          S.heat = 0;
          S.wanted = 0;
          booth.armed = false;
          api.toast(`Pay-n-spray: heat wiped clean, -$${booth.cost}.`);
        }
      } else {
        booth.armed = true;
      }
    } else {
      const d = Math.hypot(S.player.pos.x - booth.x, S.player.pos.z - booth.z);
      if (d >= booth.radius) booth.armed = true;
    }
  });
}

export default { init };
