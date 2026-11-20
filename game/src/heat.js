// SOLMAR BAY — heat.js (round 8 rebuild, written blind from the spec)
// The wanted system: heat (0-100) sets the wanted stars (20 heat per
// star, max 5), heat cools slowly on the street and fast in a lay-low
// spot, and the pay-n-spray booth wipes it clean for $150.
// Talks to the game only through ctx.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  const BOOTH = { x: -90, z: -58, r: 9, cost: 150, armed: true };
  const LAY_LOW = [
    { x: -140, z: 140, r: 9 },
    { x: 140, z: -140, r: 9 },
    { x: -160, z: -40, r: 9 },
  ];

  if (typeof S.heat !== 'number') S.heat = 0;

  const director = {
    sprayBooth: BOOTH,
    add(n) {
      S.heat = Math.max(0, Math.min(100, (S.heat || 0) + n));
    },
    cool(amount) {
      S.heat = Math.max(0, (S.heat || 0) - (amount || 10));
    },
  };
  S.heatDirector = director;

  function toast(msg) {
    const el = $('toast');
    if (el) el.textContent = msg;
  }

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;

    const heat = S.heat || 0;
    S.wanted = Math.max(0, Math.min(5, Math.floor(heat / 20)));

    // Cool-down: a slow bleed on the street, fast in a lay-low spot.
    if (heat > 0) {
      let rate = 0.2;
      const pp = S.player.pos;
      for (const spot of LAY_LOW) {
        if (Math.hypot(pp.x - spot.x, pp.z - spot.z) < spot.r) {
          rate = 3;
          break;
        }
      }
      S.heat = Math.max(0, heat - rate * dt);
    }

    // Pay-n-spray: drive a wanted car through the booth, $150, heat gone.
    const booth = director.sprayBooth;
    if (S.car && (S.wanted || 0) > 0 && booth.armed) {
      const d = Math.hypot(S.car.pos.x - booth.x, S.car.pos.z - booth.z);
      if (d < booth.r && S.cash >= booth.cost) {
        S.cash -= booth.cost;
        S.heat = 0;
        S.wanted = 0;
        booth.armed = false;
        toast('Pay-n-spray: fresh paint, clean plates. Heat gone — $' + booth.cost + '.');
      }
    }
    // Re-arm once the player is clear of the booth and heat is back.
    if (!booth.armed && (S.heat || 0) > 0 && S.car) {
      const d = Math.hypot(S.car.pos.x - booth.x, S.car.pos.z - booth.z);
      if (d > 25) booth.armed = true;
    }
  });
}
