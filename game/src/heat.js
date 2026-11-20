// heat.js — the heat director. Owns S.heat and derives S.wanted from it
// every frame, drains heat slowly while the player is clean, and runs
// the pay-n-spray booth: $150 wipes the heat, then the booth re-arms
// once the heat climbs back above 40.
const BOOTH_PRICE = 150;
const BOOTH_REARM_HEAT = 40;
const CLEAN_DRAIN = 1.2;

const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function hookIntoLoop(S, fn) {
  const wrapped = (dt) => { S.__b1External = _now(); fn(dt); };
  S.__b1Fns = S.__b1Fns || [];
  S.__b1Fns.push(fn);
  if (typeof S.addUpdater === 'function') { try { S.addUpdater(wrapped); } catch (e) { /* main owns the loop */ } }
  else if (Array.isArray(S.updaters)) S.updaters.push(wrapped);
  else if (Array.isArray(S.systems)) S.systems.push(wrapped);
  else if (Array.isArray(S.tickFns)) S.tickFns.push(wrapped);
  else if (Array.isArray(S.updateFns)) S.updateFns.push(wrapped);
  else if (Array.isArray(S.onUpdate)) S.onUpdate.push(wrapped);
  else S.updaters = [wrapped];
  if (!S.__b1DriverOn && typeof requestAnimationFrame !== 'undefined') {
    S.__b1DriverOn = true;
    let last = _now();
    const step = () => {
      const now = _now();
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      if (!S.__b1External || now - S.__b1External > 3000) {
        for (const f of (S.__b1Fns || [])) { try { f(dt); } catch (e) { /* keep the loop alive */ } }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  return wrapped;
}

export function wantedFor(heat) {
  const h = heat || 0;
  if (h >= 80) return 4;
  if (h >= 60) return 3;
  if (h >= 40) return 2;
  if (h >= 20) return 1;
  return 0;
}

export function init(S) {
  if (S.__b1HeatInit) return S.heatUpdate || null;
  S.__b1HeatInit = true;
  if (typeof S.heat !== 'number') S.heat = 0;
  if (typeof S.wanted !== 'number') S.wanted = 0;
  if (typeof S.cash !== 'number') S.cash = 0;

  S.heatDirector = {
    sprayBooth: { armed: true, pos: { x: -90, z: -58 }, r: 9 },
    // Crimes and near-misses call this; other systems add heat by
    // writing S.heat directly too, and both paths stay consistent.
    add(n) {
      S.heat = Math.max(0, Math.min(100, (S.heat || 0) + n));
      if (S.heat > BOOTH_REARM_HEAT) this.sprayBooth.armed = true;
      S.wanted = wantedFor(S.heat);
      return S.heat;
    },
    // Slow bleed while nobody is looking for the player.
    decay(dt) {
      if ((S.wanted || 0) === 0 && (S.heat || 0) > 0) {
        S.heat = Math.max(0, S.heat - CLEAN_DRAIN * dt);
        S.wanted = wantedFor(S.heat);
      }
      return S.heat;
    },
  };

  function update(rawDt) {
    const dt = Math.min(Math.max(rawDt || 0.016, 0), 0.05);
    S.heat = Math.max(0, Math.min(100, S.heat || 0));
    // S.wanted is always derived from S.heat, in this module, every frame.
    S.wanted = wantedFor(S.heat);

    const live = (S.mode === undefined || S.mode === 'playing') && !S.cutscene;
    if (!live) return;

    S.heatDirector.decay(dt);

    // A hot player who climbs back above the re-arm line re-opens the
    // booth for the next spray.
    if (S.heat > BOOTH_REARM_HEAT) S.heatDirector.sprayBooth.armed = true;

    // Pay-n-spray: drive into the booth while wanted and the booth is
    // armed — $150, heat wiped, booth spent until the heat returns.
    const booth = S.heatDirector.sprayBooth;
    if (S.car && S.wanted > 0 && booth.armed) {
      const dx = S.car.pos.x - booth.pos.x;
      const dz = S.car.pos.z - booth.pos.z;
      if (dx * dx + dz * dz < booth.r * booth.r) {
        S.cash = (S.cash || 0) - BOOTH_PRICE;
        S.heat = 0;
        S.wanted = 0;
        booth.armed = false;
      }
    }
  }

  const wrapped = hookIntoLoop(S, update);
  S.heatUpdate = wrapped;
  return wrapped;
}
