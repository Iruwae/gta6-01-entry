// SOLMAR BAY — Vic's fence yard at (110,138): the yard itself plus the
// quote logic through fenceDirector (the sale action lives in side.js).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, state: S } = ctx;
  const yard = CONFIG.fenceYard;

  // Chain-link yard: low fence posts around the plot, a gate gap on the west.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.6, metalness: 0.6 });
  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6);
  for (let i = -5; i <= 5; i++) {
    for (const [px, pz] of [
      [yard.x + i * 2, yard.z - 10],
      [yard.x + i * 2, yard.z + 10],
      [yard.x - 10, yard.z + i * 2],
      [yard.x + 10, yard.z + i * 2],
    ]) {
      if (px === yard.x - 10 && Math.abs(pz - yard.z) < 3) continue; // gate gap
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 1.1, pz);
      scene.add(post);
    }
  }
  // A stack of crates and a "VIC'S YARD" sign board.
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  for (const [cx, cz, s] of [[118, 132, 2], [120, 134, 1.4], [104, 144, 1.8]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, s / 2, cz);
    scene.add(crate);
  }
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: new THREE.Color(0xffb347), emissiveIntensity: 1.0,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(9, 1.4, 0.4), signMat);
  sign.position.set(yard.x, 4.5, yard.z - 10);
  scene.add(sign);

  ctx.api.fence = {
    quote(car) {
      return S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
    },
  };
}
