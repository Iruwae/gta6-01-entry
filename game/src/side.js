// SOLMAR BAY — collectible packages + the fence sale. 12 package spots
// (fixed positions); walking or driving onto one pays $50 immediately.
// The fence sale: press V while driving inside Vic's yard to sell the
// car for fenceDirector.priceFor(car) + fenceDirector.wantedBonus(car).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;

  const markers = [];
  for (const p of S.packages) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffd24a }),
    );
    m.position.set(p.x, 1, p.z);
    scene.add(m);
    markers.push(m);
  }

  // The watchdog in the boot hub also calls this update on a timer
  // (rAF can stall for seconds under headless SwiftShader), so the
  // function is stashed on ctx.api. Double-running is safe: packages
  // are guarded by their taken flag and the fence sale by S.car.
  const update = (dt) => {
    if (S.mode !== 'playing') return;
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;

    for (let i = 0; i < S.packages.length; i++) {
      const p = S.packages[i];
      if (p.taken) continue;
      const dx = px - p.x;
      const dz = pz - p.z;
      if (dx * dx + dz * dz <= 16) {
        p.taken = true;
        S.stats.packages += 1;
        S.cash += CONFIG.packageValue;
        if (markers[i]) markers[i].visible = false;
        ctx.api.toast(`Package found! +$${CONFIG.packageValue}`);
        S.banterDirector.pickup();
      }
    }

    if (input.wasPressed('KeyV') && S.car) {
      const dx = S.car.pos.x - CONFIG.fenceYard.x;
      const dz = S.car.pos.z - CONFIG.fenceYard.z;
      if (dx * dx + dz * dz <= CONFIG.fenceYard.radius * CONFIG.fenceYard.radius) {
        const car = S.car;
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        const idx = S.cars.indexOf(car);
        if (idx >= 0) S.cars.splice(idx, 1);
        if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
        S.car = null;
        ctx.api.toast(`Sold to Vic's fence for $${price}.`);
      }
    }
  };
  ctx.updates.push(update);
  ctx.api.sideUpdate = update;
}
