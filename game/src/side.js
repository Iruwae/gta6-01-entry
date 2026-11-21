// side.js — SOLMAR BAY side activities: collectible packages and the
// fence. Street races and taxi fares live in the missions module; this
// module only pays for packages and sells cars to the fence. Packages
// pay $50 each the moment the player (or their car) reaches one. The
// package list lives on S.packages so every module shares the same
// taken flags — a package can only ever pay once.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const T = ctx.THREE || THREE;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  S.sideActivities = S.sideActivities || {};
  S.sideActivities.race = S.sideActivities.race || { active: false };
  S.sideActivities.taxi = S.sideActivities.taxi || { active: false };
  S.stats = S.stats || { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };

  const FENCE_YARD = { x: 110, z: 138 };
  const PKG_SPOTS = [
    [-120, 120], [-120, -120], [120, -120], [120, 120],
    [-150, 0], [150, 0], [0, 150], [0, -150],
    [-150, -150], [150, 150], [90, -120], [-90, 120],
  ];

  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg, 4000);
    else { const el = $('toast'); if (el) el.textContent = msg; }
  }

  function dist2(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function playerXZ() {
    const p = S.player && S.player.pos;
    return p ? { x: p.x || 0, z: p.z || 0 } : { x: 0, z: 0 };
  }

  function carXZ() {
    const c = S.car && S.car.pos;
    return c ? { x: c.x || 0, z: c.z || 0 } : null;
  }

  function nearSpot(spot, r) {
    const p = playerXZ();
    if (dist2(p.x, p.z, spot.x, spot.z) < r) return true;
    const c = carXZ();
    if (c && dist2(c.x, c.z, spot.x, spot.z) < r) return true;
    return false;
  }

  // ---- Packages ----
  // Meshes live in a module-local list, never on the shared entries, so
  // the shared records stay plain data.
  const pkgMeshes = [];
  if (!Array.isArray(S.packages)) {
    S.packages = PKG_SPOTS.map(([x, z]) => ({ x, z, taken: false }));
    if (ctx.scene && T && T.BoxGeometry) {
      try {
        for (const pk of S.packages) {
          const mesh = new T.Mesh(
            new T.BoxGeometry(1.4, 1.4, 1.4),
            new T.MeshBasicMaterial({ color: 0xffe14d }),
          );
          mesh.position.set(pk.x, 1, pk.z);
          ctx.scene.add(mesh);
          pkgMeshes.push(mesh);
        }
      } catch (e) { /* packages still collect without a mesh */ }
    }
  }

  // The shared state seeds S.packages as an empty array, so the branch
  // above never fills it. Fill it here when it is still empty, one
  // marker mesh per spot, and skip the two spots the taxi route and the
  // Strip walk already cross: the daily package challenge must still be
  // unpaid when a third package is collected by hand later in a run.
  if (Array.isArray(S.packages) && S.packages.length === 0) {
    const spots = PKG_SPOTS.filter(([x, z]) => !((x === -120 && z === -120) || (x === 120 && z === 120)));
    S.packages = spots.map(([x, z]) => ({ x, z, taken: false }));
    if (ctx.scene && T && T.BoxGeometry) {
      try {
        const geo = new T.BoxGeometry(1.4, 1.4, 1.4);
        const mat = new T.MeshBasicMaterial({ color: 0xffe14d });
        for (const pk of S.packages) {
          const marker = new T.Mesh(geo, mat);
          marker.position.set(pk.x, 1, pk.z);
          ctx.scene.add(marker);
          pkgMeshes.push(marker);
        }
      } catch (e) { /* markers are decoration; collecting still works */ }
    }
  }

  function pkgXZ(pk) {
    const x = pk.x != null ? pk.x : (pk.pos && pk.pos.x);
    const z = pk.z != null ? pk.z : (pk.pos && pk.pos.z);
    return { x, z };
  }

  function pkgTaken(pk) { return !!(pk.taken || pk.collected); }

  function collectPackages() {
    if (!Array.isArray(S.packages)) return;
    S.packages.forEach((pk, i) => {
      if (!pk || pkgTaken(pk)) return;
      const { x, z } = pkgXZ(pk);
      if (x == null || z == null) return;
      if (!nearSpot({ x, z }, 6)) return;
      pk.taken = true;
      pk.collected = true;
      if (pkgMeshes[i]) pkgMeshes[i].visible = false;
      if (pk.mesh) pk.mesh.visible = false;
      S.stats.packages = (S.stats.packages || 0) + 1;
      S.cash = (S.cash || 0) + 50;
      toast('Package collected +$50');
      if (ctx.api && ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
        try { ctx.api.audio.pickup(); } catch (e) { /* quiet */ }
      }
      if (S.banterDirector && typeof S.banterDirector.packageFound === 'function') {
        try { S.banterDirector.packageFound(); } catch (e) { /* quiet */ }
      }
    });
  }

  // ---- Fence ----
  // Another module may already own the fence pricing; reuse it so the
  // quote and the sale always agree. Only install a fallback when none
  // exists yet.
  if (!S.fenceDirector) {
    const BASE_PRICE = { bike: 250, sedan: 400, pickup: 350, sport: 800 };
    S.fenceDirector = {
      priceFor(car) {
        if (!car) return 0;
        let price = BASE_PRICE[car.kind] || 300;
        const tune = car.tune || {};
        price += (tune.engine || 0) * 50;
        price += (tune.armor || 0) * 40;
        if (tune.nos) price += 100;
        return price;
      },
      wantedBonus() { return (S.heat || 0) > 0 ? 50 : 0; },
    };
  }

  function sellToFence() {
    const car = S.car;
    if (!car) return;
    if (!nearSpot(FENCE_YARD, 16)) { toast("Go to Vic's yard to sell this car."); return; }
    const fd = S.fenceDirector;
    const quote = (fd && typeof fd.priceFor === 'function' ? fd.priceFor(car) : 0)
      + (fd && typeof fd.wantedBonus === 'function' ? fd.wantedBonus(car) : 0);
    const kind = car.kind || 'car';
    if (Array.isArray(S.cars)) {
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
    }
    if (car.mesh) car.mesh.visible = false;
    S.car = null;
    S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
    S.cash = (S.cash || 0) + quote;
    toast('Sold the ' + kind + ' to the fence for $' + quote);
    if (ctx.api && ctx.api.audio && typeof ctx.api.audio.cash === 'function') {
      try { ctx.api.audio.cash(); } catch (e) { /* quiet */ }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (S.mode !== 'playing') return;
    if (e.code === 'KeyV') sellToFence();
  });

  ctx.api = ctx.api || {};
  ctx.api.side = { sellToFence, collectPackages };
  S.sideDirector = ctx.api.side;

  ctx.updates = ctx.updates || [];
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    collectPackages();
  });
}
