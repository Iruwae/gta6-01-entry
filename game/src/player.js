// player.js — on-foot movement + getting in and out of cars (key E).
// Owns the pedestrian: WASD walking, heading, and the enter/exit toggle.
// Driving itself lives in vehicles.js; this module only hands the car over.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const held = new Set();

  const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    if (codes.includes(e.code)) held.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) tryToggleCar();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  function playing() {
    return S && (S.mode === 'playing' || S.mode === undefined) && !S.cutscene;
  }

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of S.cars || []) {
      if (!c || c.aiPolice || !c.pos) continue;
      const dx = c.pos.x - S.player.pos.x;
      const dz = c.pos.z - S.player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function tryToggleCar() {
    if (!playing() || !S.player) return;
    if (S.car) {
      // Step out beside the car.
      const car = S.car;
      S.car = null;
      S.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
      if (car.speed !== undefined) car.speed = 0;
      return;
    }
    const car = nearestCar(5);
    if (!car) return;
    S.car = car;
    S.player.heading = car.heading || 0;
    S.player.pos.set(car.pos.x, 0, car.pos.z);
    if (typeof ctx.api === 'object' && ctx.api && typeof ctx.api.toast === 'function') {
      // keep quiet on entry; the HUD speedo shows the car name
    }
  }

  // Expose the toggle for other modules (garage spawn etc. can reuse it).
  if (ctx.api) ctx.api.toggleCar = tryToggleCar;

  (ctx.updates || []).push((dt) => {
    if (!S || !S.player || !S.player.pos) return;
    if (typeof S.health === 'number' && typeof S.player.health === 'number') {
      S.health = S.player.health;
    }
    if (S.car) {
      // Ride along: the pedestrian sits where the car is.
      if (S.car.pos) S.player.pos.set(S.car.pos.x, 0, S.car.pos.z);
      if (typeof S.car.heading === 'number') S.player.heading = S.car.heading;
      return;
    }
    if (!playing()) return;
    let mx = 0;
    let mz = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) mz -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) mz += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) mx -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) mx += 1;
    if (mx === 0 && mz === 0) return;
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    const speed = 7;
    S.player.pos.x += mx * speed * dt;
    S.player.pos.z += mz * speed * dt;
    S.player.pos.y = 0;
    S.player.heading = Math.atan2(mx, mz);
  });
}
