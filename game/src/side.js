// SOLMAR BAY — collectible packages + the fence sale (V in Vic's yard).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const input = ctx.input;

  // Glowing package markers.
  const pkgGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const pkgMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffb347, emissiveIntensity: 0.9 });
  const markers = new Map();
  for (const pkg of S.packages) {
    const m = new THREE.Mesh(pkgGeo, pkgMat);
    m.position.set(pkg.x, 0.7, pkg.z);
    scene.add(m);
    markers.set(pkg, m);
  }

  ctx.updates.push((_dt, t) => {
    const pos = S.car ? S.car.pos : S.player.pos;
    for (const pkg of S.packages) {
      const m = markers.get(pkg);
      if (m) m.visible = !pkg.taken; // re-show after a fresh-game reset
      if (!pkg.taken) {
        if (m) {
          m.position.y = 0.7 + Math.sin(t * 2 + pkg.x) * 0.25;
          m.rotation.y = t * 0.8;
        }
        if (Math.hypot(pos.x - pkg.x, pos.z - pkg.z) < 3.5) {
          pkg.taken = true;
          if (m) m.visible = false;
          S.stats.packages += 1;
          S.cash += CONFIG.packageValue;
          ctx.api.toast(`PACKAGE FOUND: +$${CONFIG.packageValue}`);
          if (S.banterDirector) S.banterDirector.pickup();
        }
      }
    }

    // V: sell the car to Vic's fence while driving inside his yard.
    if (input.wasPressed('KeyV') && S.car) {
      const yard = CONFIG.fenceYard;
      if (Math.hypot(S.car.pos.x - yard.x, S.car.pos.z - yard.z) <= yard.radius + 2) {
        const car = S.car;
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
        if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
        S.car = null;
        ctx.api.toast(`FENCED the ${car.kind} for $${price}. Vic sends his regards.`);
      }
    }
  });

  return { markers };
}

export default init;
