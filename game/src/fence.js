// SOLMAR BAY — Vic's fence yard at (110,138). The yard itself plus the
// quote logic through fenceDirector; the sale action lives in side.js.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S, config } = ctx;
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe8a34c, emissive: 0xe8a34c, emissiveIntensity: 0.35 })
  );
  sign.position.set(config.fenceYard.x, 3.4, config.fenceYard.z - 8);
  scene.add(sign);
  const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  post1.position.set(config.fenceYard.x - 2.8, 1.7, config.fenceYard.z - 8);
  scene.add(post1);
  const post2 = post1.clone();
  post2.position.x = config.fenceYard.x + 2.8;
  scene.add(post2);
  ctx.api.fenceQuote = (car) => S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
  ctx.api.fenceLoaded = true;
}

export default { init };
