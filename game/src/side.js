// SOLMAR BAY — collectible packages + the fence sale. Twelve package
// spots pay $50 the moment the player walks or drives onto one. Pressing
// V while driving inside Vic's yard sells the car for the fence quote
// plus the wanted bonus.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const { input, scene } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  // Glowing package meshes, one per spot.
  const pkgMeshes = [];
  for (const p of S.packages) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd24a })
    );
    mesh.position.set(p.x, 0.8, p.z);
    scene.add(mesh);
    pkgMeshes.push(mesh);
  }

  ctx.updates.push(() => {
    // Keep package meshes in sync with the taken flags (also after reset).
    for (let i = 0; i < S.packages.length; i++) {
      if (pkgMeshes[i]) pkgMeshes[i].visible = !S.packages[i].taken;
    }
    if (S.mode !== 'playing' || S.cutscene) return;

    // Package pickup: on foot or in the car.
    const refs = [S.player.pos];
    if (S.car) refs.push(S.car.pos);
    for (let i = 0; i < S.packages.length; i++) {
      const p = S.packages[i];
      if (p.taken) continue;
      for (const ref of refs) {
        if (Math.hypot(ref.x - p.x, ref.z - p.z) < 6) {
          p.taken = true;
          S.stats.packages += 1;
          S.cash += CONFIG.packageValue;
          toast(`Package found! +$${CONFIG.packageValue}`);
          if (S.banterDirector) S.banterDirector.pickup();
          break;
        }
      }
    }

    // Fence sale: V while driving inside Vic's yard.
    if (input.justPressed('KeyV') && S.car) {
      const yard = CONFIG.locations.fenceYard;
      const d = Math.hypot(S.car.pos.x - yard.x, S.car.pos.z - yard.z);
      if (d < yard.radius) {
        const car = S.car;
        const quote = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += quote;
        S.stats.fencesSold += 1;
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
        if (car.mesh) scene.remove(car.mesh);
        S.car = null;
        toast(`Sold to Vic's fence for $${quote}`);
      }
    }
  });

  ctx.flags.side = true;
}
