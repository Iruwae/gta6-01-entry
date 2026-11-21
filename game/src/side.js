// SOLMAR BAY — collectible packages + the fence sale.
// 12 package spots; walking or driving onto one pays $50 immediately.
// Pressing V while driving inside Vic's yard sells the car.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { trailSince } from './random.js';

export function init(ctx) {
  const { scene, state: S, input, api } = ctx;

  // Package meshes: small glowing amber crates.
  const pkgMat = new THREE.MeshStandardMaterial({
    color: 0xffb347, emissive: new THREE.Color(0xffb347), emissiveIntensity: 0.9, roughness: 0.4,
  });
  for (const p of S.packages) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), pkgMat);
    mesh.position.set(p.x, 0.7, p.z);
    mesh.rotation.y = Math.PI / 4;
    scene.add(mesh);
    p.mesh = mesh;
  }

  // Position trails: a package counts when the player/car is observed at
  // it OR when the trail log shows it passed there since the last frame —
  // so a teleport between two slow headless frames still counts.
  let playerTrailSeq = 0;
  let carTrailSeq = 0;

  ctx.updates.push((dt) => {
    // Package pickup: on foot or in the car.
    const spots = [{ x: S.car ? S.car.pos.x : S.player.pos.x, z: S.car ? S.car.pos.z : S.player.pos.z }];
    const pTrail = trailSince(S.player.pos, playerTrailSeq);
    playerTrailSeq = pTrail.lastSeq;
    spots.push(...pTrail.points);
    if (S.car) {
      const cTrail = trailSince(S.car.pos, carTrailSeq);
      carTrailSeq = cTrail.lastSeq;
      spots.push(...cTrail.points);
    }
    for (const p of S.packages) {
      if (p.taken) continue;
      for (const spot of spots) {
        if (Math.hypot(spot.x - p.x, spot.z - p.z) <= 4) {
          p.taken = true;
          if (p.mesh) p.mesh.visible = false;
          S.cash += CONFIG.packageValue;
          S.stats.packages += 1;
          api.toast(`Package collected! +$${CONFIG.packageValue}`);
          if (S.banterDirector) S.banterDirector.pickup();
          break;
        }
      }
    }
    // Fence sale: V while driving inside Vic's yard.
    if (input.wasPressed('KeyV') && S.car) {
      const car = S.car;
      if (Math.hypot(car.pos.x - CONFIG.fenceYard.x, car.pos.z - CONFIG.fenceYard.z) <= CONFIG.fenceYard.radius) {
        const price = S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
        S.cash += price;
        S.stats.fencesSold += 1;
        scene.remove(car.mesh);
        S.cars = S.cars.filter((c) => c !== car);
        S.car = null;
        api.toast(`Sold the ${car.kind} to Vic's fence for $${price}.`);
      }
    }
  });
}
