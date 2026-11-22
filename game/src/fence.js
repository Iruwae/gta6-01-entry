// Vic's fence yard at (110,138) — the yard itself plus the quote logic
// through fenceDirector (the sale action lives in side.js).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const yard = CONFIG.fenceYard;
  // A few stacked rides waiting for a buyer, purely decorative.
  const colors = [0x8a5a2a, 0x4a6b8a, 0x7a3a4a];
  colors.forEach((color, i) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 4.2),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    car.position.set(yard.x - 6 + i * 6, 0.5, yard.z - 4);
    car.rotation.y = 0.3;
    scene.add(car);
  });
  // Quote helper on the context for any module that wants it.
  ctx.fenceQuote = (car) => S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
}

export default init;
