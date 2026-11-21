// Side hustles for SOLMAR BAY: the 12 collectible packages ($50 each,
// walk or drive onto one) and the fence sale — press V while driving
// inside Vic's yard to sell the car for its quote plus a wanted bonus.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, state: S, input, api } = ctx;
  const markers = [];

  for (const pkg of S.packages) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd97a }),
    );
    marker.position.set(pkg.x, 0.8, pkg.z);
    ctx.scene.add(marker);
    markers.push(marker);
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;

    // Package pickup: the player or the car walks onto a spot.
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    for (let i = 0; i < S.packages.length; i++) {
      const pkg = S.packages[i];
      if (pkg.taken) continue;
      const dx = px - pkg.x;
      const dz = pz - pkg.z;
      if (dx * dx + dz * dz < 3.5 * 3.5) {
        pkg.taken = true;
        S.stats.packages += 1;
        S.cash += CONFIG.packageValue;
        if (markers[i]) markers[i].visible = false;
        api.toast(`Package found! +$${CONFIG.packageValue}`);
        S.banterDirector.pickup();
      }
    }

    // Fence sale: V while driving inside Vic's yard.
    if (input.wasPressed('KeyV') && S.car) {
      const yard = CONFIG.fenceYard;
      const dx = S.car.pos.x - yard.x;
      const dz = S.car.pos.z - yard.z;
      if (dx * dx + dz * dz < yard.radius * yard.radius) {
        const car = S.car;
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        const idx = S.cars.indexOf(car);
        if (idx >= 0) S.cars.splice(idx, 1);
        if (car.mesh) ctx.scene.remove(car.mesh);
        S.car = null;
        api.toast(`Sold the ${car.kind} to Vic's fence for $${price}`);
      }
    }
  });
}
