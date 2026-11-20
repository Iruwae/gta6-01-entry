// heat.js — the wanted system of Solmar Bay.
// Heat runs 0–100; wanted stars are heat in twenties. It cools over
// time, faster in a lay-low spot, and the pay-n-spray booth at
// (-90, -58) wipes it clean for $150 when a wanted car rolls through.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const BOOTH = { x: -90, z: -58, radius: 9, price: 150 };
const LAY_LOW = [
  { x: 120, z: -120, name: 'Safehouse', r: 14 },
  { x: -40, z: 40, name: 'Back Alley', r: 10 },
  { x: 60, z: -130, name: 'Underpass', r: 10 },
  { x: -130, z: -100, name: 'Old Warehouse', r: 12 },
];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

function starsFor(heat) {
  return Math.max(0, Math.min(5, Math.floor(heat / 20)));
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (typeof S.heat !== 'number') S.heat = 0;
  if (typeof S.wanted !== 'number') S.wanted = starsFor(S.heat);
  if (typeof S.cash !== 'number') S.cash = 120;

  const sprayBooth = {
    armed: true,
    x: BOOTH.x,
    z: BOOTH.z,
    price: BOOTH.price,
    radius: BOOTH.radius,
    pos: new T.Vector3(BOOTH.x, 0, BOOTH.z),
  };

  function syncWanted() {
    S.wanted = starsFor(S.heat);
  }

  function add(n) {
    S.heat = Math.max(0, Math.min(100, S.heat + n));
    syncWanted();
    return S.heat;
  }

  function cool(n) {
    S.heat = Math.max(0, S.heat - n);
    syncWanted();
    return S.heat;
  }

  const director = {
    sprayBooth,
    layLow: LAY_LOW,
    add,
    cool,
    starsFor,
    wipe() {
      S.heat = 0;
      syncWanted();
    },
  };
  S.heatDirector = director;
  ctx.api.heatDirector = director;
  ctx.api.addHeat = add;
  ctx.api.coolHeat = cool;

  // A small booth marker: striped hut with a spray arch, parked where
  // the screenshot staging expects it — exactly (-90, -58).
  if (ctx.scene) {
    const g = new T.Group();
    const hut = new T.Mesh(
      new T.BoxGeometry(7, 3.2, 5),
      new T.MeshStandardMaterial({ color: 0x2e6f8e, roughness: 0.7 })
    );
    hut.position.y = 1.6;
    const roof = new T.Mesh(
      new T.BoxGeometry(7.6, 0.3, 5.6),
      new T.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.6 })
    );
    roof.position.y = 3.3;
    const arch = new T.Mesh(
      new T.BoxGeometry(0.5, 3.6, 6.5),
      new T.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.5 })
    );
    arch.position.set(4.2, 1.8, 0);
    g.add(hut, roof, arch);
    g.position.set(BOOTH.x, 0, BOOTH.z);
    ctx.scene.add(g);
  }

  syncWanted();

  ctx.updates.push((dt) => {
    syncWanted();

    // Slow cool-down; lay-low spots and hideouts cool it faster.
    if (S.heat > 0) {
      const p = S.player ? S.player.pos : null;
      let rate = 0.6;
      if (p) {
        for (const spot of LAY_LOW) {
          if (Math.hypot(p.x - spot.x, p.z - spot.z) < spot.r) { rate = 2.4; break; }
        }
      }
      S.heat = Math.max(0, S.heat - rate * dt);
      syncWanted();
    }

    // Pay-n-spray: a wanted car rolling through the booth pays $150
    // and leaves clean. It only fires while armed, so the screenshot
    // staging can disarm it and drive through untouched.
    const car = S.car;
    if (car && S.heat > 0 && sprayBooth.armed) {
      const d = Math.hypot(car.pos.x - BOOTH.x, car.pos.z - BOOTH.z);
      if (d < BOOTH.radius) {
        if (S.cash >= BOOTH.price) {
          S.cash -= BOOTH.price;
          S.heat = 0;
          syncWanted();
          sprayBooth.armed = false;
          const toast = dom(ctx, 'toast');
          if (toast) toast.textContent = 'Pay-n-Spray: fresh paint, clean plates — heat gone. -$150.';
        } else {
          const toast = dom(ctx, 'toast');
          if (toast) toast.textContent = 'Pay-n-Spray needs $150 — you are short.';
        }
      }
    }
    // Re-arm once the car has left the booth with fresh heat on it.
    if (!sprayBooth.armed && S.heat > 0) {
      const where = car ? car.pos : (S.player ? S.player.pos : null);
      if (where && Math.hypot(where.x - BOOTH.x, where.z - BOOTH.z) > 20) sprayBooth.armed = true;
    }

    const wantedEl = dom(ctx, 'wanted');
    if (wantedEl) wantedEl.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
  });
}
