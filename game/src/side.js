// Collectible packages + the fence sale (V in Vic's yard).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;
  const pkgMat = new THREE.MeshStandardMaterial({ color: 0xffd34c, roughness: 0.5, emissive: 0xffd34c, emissiveIntensity: 0.5 });
  S.packages = CONFIG.packages.map((p) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), pkgMat);
    mesh.position.set(p.x, 0.6, p.z);
    scene.add(mesh);
    return { x: p.x, z: p.z, taken: false, mesh };
  });

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    // Packages: walk or drive onto one, it pays $50 at once.
    for (const pkg of S.packages) {
      if (pkg.taken) continue;
      const dx = px - pkg.x;
      const dz = pz - pkg.z;
      if (Math.sqrt(dx * dx + dz * dz) < 4) {
        pkg.taken = true;
        if (pkg.mesh) pkg.mesh.visible = false;
        S.stats.packages += 1;
        S.cash += CONFIG.packageReward;
        if (ctx.api.toast) ctx.api.toast(`Package collected! +$${CONFIG.packageReward}`);
        if (S.banterDirector) S.banterDirector.pickup();
      }
    }
    // Fence sale: V while driving inside Vic's yard.
    if (input.wasPressed('KeyV') && S.car) {
      const dx = S.car.pos.x - CONFIG.fenceYard.x;
      const dz = S.car.pos.z - CONFIG.fenceYard.z;
      if (Math.sqrt(dx * dx + dz * dz) < CONFIG.fenceYard.radius) {
        const car = S.car;
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
        if (car.mesh) scene.remove(car.mesh);
        S.car = null;
        if (ctx.api.toast) ctx.api.toast(`Sold to Vic's fence for $${price}`);
      }
    }
  });
}

export default init;
