// SOLMAR BAY — Vic's fence yard. The yard itself (walls, office, a
// hand-painted sign) plus the quote logic through fenceDirector — the
// sale action itself lives in side.js (press V while driving in the yard).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const yard = CONFIG.fenceYard;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d4a2e, roughness: 0.9 });
  for (const [w, d, x, z] of [
    [26, 1, yard.x, yard.z - 13],
    [26, 1, yard.x, yard.z + 13],
    [1, 26, yard.x - 13, yard.z],
    [1, 26, yard.x + 13, yard.z],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), wallMat);
    wall.position.set(x, 1.2, z);
    scene.add(wall);
  }
  const office = new THREE.Mesh(
    new THREE.BoxGeometry(8, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x54406a, roughness: 0.85 }),
  );
  office.position.set(yard.x - 7, 2, yard.z - 8);
  scene.add(office);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1.4, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff7a9e, emissiveIntensity: 0.8 }),
  );
  sign.position.set(yard.x, 4.6, yard.z - 13);
  scene.add(sign);

  ctx.api.fenceQuote = (car) => S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
}
