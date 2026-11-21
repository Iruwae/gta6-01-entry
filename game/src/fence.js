// SOLMAR BAY — Vic's fence yard at (110,138): the yard itself, plus the
// quote logic lives in the fenceDirector (see side.js for the sale action).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, state: S } = ctx;
  const yard = CONFIG.fenceYard;
  // Yard pad.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 22),
    new THREE.MeshStandardMaterial({ color: 0x2a2030, roughness: 0.95 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(yard.x, 0.05, yard.z);
  scene.add(pad);
  // Fence posts around the yard.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.6, metalness: 0.6 });
  for (let i = 0; i <= 8; i++) {
    for (const [x, z] of [[yard.x - 13 + i * 3.25, yard.z - 11], [yard.x - 13 + i * 3.25, yard.z + 11]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), postMat);
      post.position.set(x, 1.2, z);
      scene.add(post);
    }
  }
  // Vic's sign board.
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.6, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  sign.position.set(yard.x, 3.2, yard.z - 11);
  scene.add(sign);
  ctx.updates.push(() => {
    // Quote preview: keep a live quote on the state for the HUD/debug.
    if (S.car) S.fenceQuote = S.fenceDirector.priceFor(S.car) + S.fenceDirector.wantedBonus(S.car);
    else S.fenceQuote = 0;
  });
  ctx.fenceReady = true;
}
