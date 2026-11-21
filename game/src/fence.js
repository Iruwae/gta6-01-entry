// SOLMAR BAY — Vic's fence yard: the place, the quote, the sale lives in side.js.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const yard = CONFIG.fenceYard;

  // A small office booth at the yard's edge.
  const booth = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a6d2f, roughness: 0.85 }),
  );
  booth.position.set(yard.x - 8, 1.75, yard.z - 6);
  scene.add(booth);
  // Fence posts around the yard.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.7, metalness: 0.5 });
  for (let i = 0; i <= 6; i++) {
    for (const [px, pz] of [
      [yard.x - 10 + i * 3.4, yard.z - 8],
      [yard.x - 10 + i * 3.4, yard.z + 8],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), postMat);
      post.position.set(px, 1.1, pz);
      scene.add(post);
    }
  }

  ctx.fenceQuote = (car) => S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
  return { yard };
}

export default init;
