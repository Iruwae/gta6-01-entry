// heat.js — the wanted system of Solmar Bay.
//
// Heat runs 0-100 and the wanted stars are read off it: every full 20
// points is another star, up to five. It cools down slowly on its own,
// faster when Vic tucks into a lay-low spot or a hideout, and the
// pay-n-spray booth at (-90, -58) wipes it clean for $150 the moment a
// wanted car rolls through with the booth armed. The booth re-arms
// once the car has pulled clear of it.

const BOOTH = { x: -90, z: -58, radius: 9, price: 150 };
const LAY_LOW = [
  { x: -140, z: 140, r: 10, name: 'Alley hideout' },
  { x: 150, z: -30, r: 10, name: 'Underpass' },
  { x: 120, z: -120, r: 12, name: 'Safehouse' },
];
const DECAY_PER_SECOND = 0.6;
const LAY_LOW_DECAY = 5;

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const el = (ctx.dom && ctx.dom.toast) ||
    (typeof document !== 'undefined' ? document.getElementById('toast') : null);
  if (el) el.textContent = msg;
}

export function init(ctx) {
  const S = ctx.state;
  if (typeof S.heat !== 'number') S.heat = 0;
  if (typeof S.wanted !== 'number') S.wanted = 0;

  function syncWanted() {
    S.wanted = S.heat <= 0 ? 0 : Math.min(5, Math.ceil(S.heat / 20));
    return S.wanted;
  }
  syncWanted();

  const sprayBooth = {
    x: BOOTH.x,
    z: BOOTH.z,
    radius: BOOTH.radius,
    price: BOOTH.price,
    armed: true,
  };

  const director = {
    sprayBooth,
    layLow: LAY_LOW.map((s) => ({ x: s.x, z: s.z, r: s.r, name: s.name })),
    hideouts: [{ x: 120, z: -120, r: 12, name: 'Safehouse' }],
    add(n) {
      S.heat = Math.max(0, Math.min(100, (S.heat || 0) + n));
      return syncWanted();
    },
    clear() {
      S.heat = 0;
      return syncWanted();
    },
  };
  S.heatDirector = director;

  let wasInBooth = false;

  ctx.updates.push((dt, t) => {
    const step = dt || 0;
    const p = S.player.pos;

    // Cool off: slow in the open, fast tucked away somewhere quiet.
    const layingLow = LAY_LOW.some((s) => Math.hypot(p.x - s.x, p.z - s.z) < s.r);
    if (S.heat > 0) {
      const rate = layingLow ? LAY_LOW_DECAY : DECAY_PER_SECOND;
      S.heat = Math.max(0, S.heat - rate * step);
    }
    syncWanted();

    // Pay-n-spray: a wanted car rolling through the booth gets clean
    // plates for $150 and the heat drops to zero on the spot.
    const car = S.car;
    const inBooth = !!car && !!car.pos &&
      Math.hypot(car.pos.x - BOOTH.x, car.pos.z - BOOTH.z) < BOOTH.radius;
    if (inBooth && sprayBooth.armed && S.wanted > 0 && (S.cash || 0) >= BOOTH.price) {
      S.cash -= BOOTH.price;
      S.heat = 0;
      syncWanted();
      sprayBooth.armed = false;
      showToast(ctx, 'PAY-N-SPRAY — clean plates, heat gone. -$150');
    }
    if (!inBooth && wasInBooth) sprayBooth.armed = true;
    wasInBooth = inBooth;
  });

  ctx.api.heat = director;
}
