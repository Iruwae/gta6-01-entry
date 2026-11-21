// SOLMAR BAY — collectible packages ($50 each) and the fence sale:
// press V while driving inside Vic's yard to sell the car.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, state: S, input } = ctx;

  // 12 package spots, fixed positions.
  for (const spot of CONFIG.packageSpots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffb347 }),
    );
    mesh.position.set(spot.x, 0.7, spot.z);
    scene.add(mesh);
    S.packages.push({ x: spot.x, z: spot.z, taken: false, mesh });
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const pp = S.player.pos;
    const cp = S.car ? S.car.pos : null;
    for (const pkg of S.packages) {
      if (pkg.taken) continue;
      const dFoot = Math.hypot(pp.x - pkg.x, pp.z - pkg.z);
      const dCar = cp ? Math.hypot(cp.x - pkg.x, cp.z - pkg.z) : Infinity;
      if (Math.min(dFoot, dCar) <= 4) {
        pkg.taken = true;
        pkg.mesh.visible = false;
        S.stats.packages += 1;
        S.cash += CONFIG.packageValue;
        ctx.api.toast(`Package found! +$${CONFIG.packageValue}`);
        if (S.banterDirector) S.banterDirector.pickup();
      }
    }
    // Fence sale: V while driving inside Vic's yard.
    if (S.car && input.wasPressed('KeyV')) {
      const car = S.car;
      const d = Math.hypot(car.pos.x - CONFIG.fenceYard.x, car.pos.z - CONFIG.fenceYard.z);
      if (d <= CONFIG.fenceYard.radius) {
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
        if (car.mesh) scene.remove(car.mesh);
        S.car = null;
        ctx.api.toast(`Vic's fence bought the ${car.kind} for $${price}.`);
      }
    }
  });
  ctx.sideReady = true;
}
