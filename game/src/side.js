// SOLMAR BAY — collectible packages and the fence sale (V in Vic's yard).
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S, input, config, api } = ctx;
  const spots = config.packageSpots.map((p) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xffd24d, emissive: 0xffb347, emissiveIntensity: 0.9 })
    );
    mesh.position.set(p.x, 0.8, p.z);
    scene.add(mesh);
    return { x: p.x, z: p.z, taken: false, mesh };
  });
  S.packages = spots;
  ctx.updates.push((dt) => {
    for (const s of spots) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt * 1.5;
      s.mesh.position.y = 0.8 + Math.sin(S.time * 2 + s.x) * 0.15;
      const pd = Math.hypot(S.player.pos.x - s.x, S.player.pos.z - s.z);
      const cd = S.car ? Math.hypot(S.car.pos.x - s.x, S.car.pos.z - s.z) : Infinity;
      if (pd < 3.5 || cd < 3.5) {
        s.taken = true;
        s.mesh.visible = false;
        S.cash += config.packageReward;
        S.stats.packages += 1;
        api.toast(`Package found! +$${config.packageReward}`);
        if (S.banterDirector) S.banterDirector.pickup();
      }
    }
    // Fence sale: V while driving inside Vic's yard.
    if (input.wasPressed('KeyV') && S.car) {
      const d = Math.hypot(S.car.pos.x - config.fenceYard.x, S.car.pos.z - config.fenceYard.z);
      if (d < config.fenceYard.radius) {
        const car = S.car;
        const quote = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += quote;
        S.stats.fencesSold += 1;
        const idx = S.cars.indexOf(car);
        if (idx >= 0) S.cars.splice(idx, 1);
        if (car.mesh) scene.remove(car.mesh);
        S.car = null;
        api.toast(`Vic's fence bought the ${car.kind} for $${quote}.`);
      }
    }
  });
}

export default { init };
