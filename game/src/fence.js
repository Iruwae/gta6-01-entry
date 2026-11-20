// SOLMAR BAY — Vic's fence yard (round 8, written fresh from the spec).
// A marked yard near the harbor where the player (key V) sells the
// current car for a quoted price: cash rises by exactly the quote, the
// car is removed, and S.stats.fencesSold counts up. The quote depends
// on the car kind and its condition, with a small bonus for a wanted car.
import * as THREE from '../vendor/three.module.min.js';

const YARD = { x: 110, z: 138, radius: 18 };
const BASE_PRICE = { bike: 180, sedan: 240, pickup: 320, sport: 650 };

export function init(ctx) {
  const T = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;

  // ---- the yard: dirt patch, fence posts, a sign board, crates ----
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(YARD.radius, 24),
    new THREE.MeshLambertMaterial({ color: 0x6a5232 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(YARD.x, 0.015, YARD.z);
  scene.add(dirt);

  const postMat = new THREE.MeshLambertMaterial({ color: 0x4a3a26 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0x5e4a30 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = YARD.x + Math.cos(a) * YARD.radius;
    const pz = YARD.z + Math.sin(a) * YARD.radius;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.5), postMat);
    post.position.set(px, 1.2, pz);
    scene.add(post);
  }
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    const mx = YARD.x + (Math.cos(a0) + Math.cos(a1)) / 2 * YARD.radius;
    const mz = YARD.z + (Math.sin(a0) + Math.sin(a1)) / 2 * YARD.radius;
    const len = Math.hypot(Math.cos(a1) - Math.cos(a0), Math.sin(a1) - Math.sin(a0)) * YARD.radius;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.18), railMat);
    rail.position.set(mx, 1.9, mz);
    rail.rotation.y = -Math.atan2(Math.sin(a1) - Math.sin(a0), Math.cos(a1) - Math.cos(a0));
    scene.add(rail);
  }
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(7, 2.2, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xc9a03a, emissive: 0x8a6a1a, emissiveIntensity: 0.4 })
  );
  signBoard.position.set(YARD.x, 3.4, YARD.z - YARD.radius + 1);
  scene.add(signBoard);
  for (const [dx, dz] of [[-9, -6], [8, 7], [-6, 9]]) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x7a5a38 })
    );
    crate.position.set(YARD.x + dx, 1.2, YARD.z + dz);
    crate.rotation.y = dx * 0.2;
    scene.add(crate);
  }

  function toastEl() {
    if (ctx.dom && ctx.dom.toast) return ctx.dom.toast;
    try { return document.getElementById('toast'); } catch (e) { return null; }
  }

  function conditionOf(car) {
    if (!car) return 1;
    const max = car.maxHealth || car.maxHp || 100;
    const hp = (typeof car.health === 'number') ? car.health : max;
    return Math.max(0, Math.min(1, hp / max));
  }

  const director = {
    yard: YARD,
    priceFor(car) {
      if (!car) return 0;
      const base = BASE_PRICE[car.kind] || 200;
      const factor = 0.55 + 0.45 * conditionOf(car);
      return Math.round(base * factor);
    },
    wantedBonus(car) {
      if (!car || !S) return 0;
      const stars = S.wanted || 0;
      return stars > 0 ? 25 * stars : 0;
    },
    quoteFor(car) {
      return this.priceFor(car) + this.wantedBonus(car);
    },
    inYard(pos) {
      if (!pos) return false;
      const dx = pos.x - YARD.x, dz = pos.z - YARD.z;
      return dx * dx + dz * dz <= YARD.radius * YARD.radius;
    },
    sell(car) {
      if (!car || !S) return false;
      const quote = this.quoteFor(car);
      S.cash = (S.cash || 0) + quote;
      if (S.stats) S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
      // Pull the car out of the world.
      try {
        if (S.cars) {
          const i = S.cars.indexOf(car);
          if (i >= 0) S.cars.splice(i, 1);
        }
      } catch (e) { /* world list is best-effort */ }
      try {
        const mesh = car.mesh || car.group || car.model || null;
        if (mesh) scene.remove(mesh);
      } catch (e) { /* mesh removal is best-effort */ }
      if (S.car === car) S.car = null;
      if (S.player && S.player.pos && car.pos) {
        S.player.pos.set(car.pos.x, 0, car.pos.z);
      }
      const el = toastEl();
      if (el) {
        el.textContent = 'Sold the ' + (car.kind || 'car') + ' for $' + quote + '.';
        el.classList.remove('hidden');
      }
      return true;
    },
  };

  if (S) S.fenceDirector = director;
  ctx.api.fence = director;
  ctx.api.fenceDirector = director;

  function trySell() {
    if (!S) return;
    if (S.mode && S.mode !== 'playing') return;
    if (S.cutscene) return;
    if (!S.car) return;
    if (!director.inYard(S.car.pos)) return;
    director.sell(S.car);
  }

  // Primary trigger: a real keydown for V. The smoke test holds the key,
  // and a listener fires on the first press regardless of how the input
  // module tracks held keys.
  try {
    window.addEventListener('keydown', function fenceKey(e) {
      if (e && e.code === 'KeyV' && !e.repeat) trySell();
    });
  } catch (e) { /* no window (unit context): the poll below still works */ }

  // Backup trigger: poll the shared input state, edge-triggered so a
  // held key sells exactly once (the car is gone after the first sale).
  let vWasDown = false;
  function vIsDown() {
    try {
      const input = ctx.input;
      if (!input) return false;
      if (input.keys instanceof Set) return input.keys.has('KeyV');
      if (input.keys && typeof input.keys === 'object') return !!input.keys.KeyV;
      if (input.pressed && typeof input.pressed === 'object') return !!input.pressed.KeyV;
      if (typeof input.isDown === 'function') return !!input.isDown('KeyV');
    } catch (e) { /* input shape unknown: treat as up */ }
    return false;
  }

  ctx.updates.push(function fenceUpdate() {
    const down = vIsDown();
    if (down && !vWasDown) trySell();
    vWasDown = down;
  });
}
