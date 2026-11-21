// SOLMAR BAY — Vic's fence yard (round 9 rebuild, builder B / world).
// Press V while driving inside the yard at (110, 138) and Vic buys the
// car for its quoted price: base value by kind, scaled by condition,
// plus tuning value, plus a small wanted bonus when the heat is up.
// The sale is deterministic — priceFor + wantedBonus read a moment
// earlier always equals the cash that lands. Written fresh from the
// build contract; no other game module is imported.
import * as THREE from '../vendor/three.module.min.js';

const YARD = { x: 110, z: 138, r: 14 };
const BASE_PRICE = { bike: 350, sedan: 420, pickup: 620, sport: 1150 };

function round5(n) {
  return Math.round(n / 5) * 5;
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;

  // Yard dressing: dark lot, a ring of posts, crates and a barrel.
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 20),
    new THREE.MeshLambertMaterial({ color: 0x2e2a26 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(YARD.x, 0.03, YARD.z);
  scene.add(lot);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    if (Math.abs(a - Math.PI) < 0.5) continue; // west gap: the way in
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(YARD.x + Math.cos(a) * 12, 0.7, YARD.z + Math.sin(a) * 9);
    scene.add(post);
  }
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x9a7a4a });
  for (const [cx, cz, s] of [
    [YARD.x - 8, YARD.z - 6, 1.6],
    [YARD.x - 6.4, YARD.z - 6, 1.2],
    [YARD.x + 8, YARD.z + 6, 1.8],
  ]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, s / 2, cz);
    scene.add(crate);
  }
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10),
    new THREE.MeshLambertMaterial({ color: 0x4a6a8a }),
  );
  barrel.position.set(YARD.x + 6, 0.55, YARD.z - 6);
  scene.add(barrel);

  function priceFor(car) {
    if (!car) return 0;
    const base = BASE_PRICE[car.kind] || 300;
    const max = car.maxHealth || 1;
    const hp = typeof car.health === 'number' ? car.health : max;
    const cond = Math.max(0.15, Math.min(1, hp / max));
    const tune = car.tune
      ? (car.tune.engine || 0) * 60 + (car.tune.armor || 0) * 40 + (car.tune.nos ? 150 : 0)
      : 0;
    return round5(base * (0.55 + 0.45 * cond) + tune);
  }

  function wantedBonus(car) {
    const w = S.wanted || 0;
    if (!w || !car) return 0;
    return round5((BASE_PRICE[car.kind] || 300) * 0.05 * w);
  }

  function showToast(msg) {
    // Prefer the shared toast helper (juice owns it); fall back to the
    // DOM directly, and only ever hide a toast we set ourselves.
    if (ctx.api && typeof ctx.api.toast === 'function') {
      ctx.api.toast(msg);
      return;
    }
    const el =
      (ctx.dom && ctx.dom.toast) || document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => {
      if (el.textContent === msg) el.classList.add('hidden');
    }, 3000);
  }

  function trySell() {
    if (S.mode && S.mode !== 'playing') return false;
    if (S.cutscene) return false;
    const car = S.car;
    if (!car || car.aiPolice) return false;
    const dx = car.pos.x - YARD.x;
    const dz = car.pos.z - YARD.z;
    if (dx * dx + dz * dz > YARD.r * YARD.r) return false;
    const total = priceFor(car) + wantedBonus(car);
    S.cash = (S.cash || 0) + total;
    const idx = (S.cars || []).indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    if (car.mesh) scene.remove(car.mesh);
    S.car = null;
    if (S.stats) S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
    showToast('Sold the ' + car.kind + " to Vic's fence for $" + total + '.');
    if (ctx.api && ctx.api.juice) ctx.api.juice.shake(2);
    return true;
  }

  S.fenceDirector = { priceFor, wantedBonus, sell: trySell, yard: YARD };

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyV' || e.repeat) return;
    trySell();
  });
}
