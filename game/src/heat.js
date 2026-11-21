// heat.js — the wanted level. S.heat runs 0-100; S.wanted is the star
// count derived from it (20 heat per star, max 5). Heat cools slowly on
// its own, and the pay-n-spray booth at (-90, -58) wipes it clean for
// $150 while the player is driving through it.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const BOOTH = { x: -90, z: -58, r: 9, cost: 150 };
  let insideBooth = false;

  function clampHeat(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }

  function syncWanted() {
    S.heat = clampHeat(S.heat || 0);
    S.wanted = Math.max(0, Math.min(5, Math.floor(S.heat / 20)));
  }

  function toast(msg) {
    const el = dom.toast || document.getElementById('toast');
    if (el) el.textContent = msg;
  }

  const director = {
    sprayBooth: { armed: true, x: BOOTH.x, z: BOOTH.z, r: BOOTH.r, cost: BOOTH.cost },
    add(n) {
      S.heat = clampHeat((S.heat || 0) + n);
      syncWanted();
    },
    cool(n) {
      S.heat = clampHeat((S.heat || 0) - n);
      syncWanted();
    },
    clear() {
      S.heat = 0;
      syncWanted();
    },
  };
  S.heatDirector = director;
  if (ctx.api) ctx.api.heatDirector = director;
  syncWanted();

  (ctx.updates || []).push((dt) => {
    if (!S) return;
    syncWanted();
    if (S.mode !== 'playing' || S.cutscene) return;
    // Slow cool-down while laying low.
    if (S.heat > 0) {
      S.heat = clampHeat(S.heat - dt * 0.3);
      syncWanted();
    }
    // Pay-n-spray: only while driving a wanted car through the booth,
    // only when the booth is armed, and only once per pass.
    const booth = director.sprayBooth;
    const car = S.car;
    if (car && car.pos && S.heat > 0 && booth.armed) {
      const d = Math.hypot(car.pos.x - booth.x, car.pos.z - booth.z);
      if (d < booth.r) {
        if (!insideBooth) {
          insideBooth = true;
          if ((S.cash || 0) >= booth.cost) {
            S.cash -= booth.cost;
            S.heat = 0;
            syncWanted();
            toast('Pay-n-spray: heat wiped clean (-$150).');
          } else {
            toast('Pay-n-spray needs $150.');
          }
        }
      } else {
        insideBooth = false;
      }
    } else if (!car) {
      insideBooth = false;
    }
  });
}
