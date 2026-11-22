// Collectible packages + the fence sale (V in Vic's yard).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;

  for (const spot of CONFIG.packageSpots) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 0.5 }),
    );
    mesh.position.set(spot.x, 0.6, spot.z);
    scene.add(mesh);
    S.packages.push({ x: spot.x, z: spot.z, taken: false, mesh });
  }

  ctx.updates.push(() => {
    const ref = S.car || S.player;
    for (const p of S.packages) {
      if (p.taken) continue;
      const dx = ref.pos.x - p.x;
      const dz = ref.pos.z - p.z;
      if (dx * dx + dz * dz < 9) { // 3 m
        p.taken = true;
        if (p.mesh) p.mesh.visible = false;
        S.cash += 50;
        S.stats.packages += 1;
        ctx.api.toast('Package collected (+$50).');
        if (S.banterDirector) S.banterDirector.pickup();
      }
    }
    // Fence sale: V while driving inside Vic's yard.
    if (input.wasPressed('KeyV') && S.car) {
      const dx = S.car.pos.x - CONFIG.fenceYard.x;
      const dz = S.car.pos.z - CONFIG.fenceYard.z;
      if (dx * dx + dz * dz < CONFIG.fenceYard.radius * CONFIG.fenceYard.radius) {
        const car = S.car;
        const quote = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += quote;
        S.stats.fencesSold += 1;
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
        if (car.mesh) scene.remove(car.mesh);
        S.car = null;
        ctx.api.toast(`Sold to Vic's fence for $${quote}.`);
      }
    }
  });
}
