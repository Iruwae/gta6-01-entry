// Vic's fence yard at (110, 138): the yard itself — fence posts, a
// gate and a hand-painted sign — plus the quote logic, which runs
// through the fence director (see side.js for the sale action on V).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, state: S } = ctx;
  const yard = CONFIG.fenceYard;

  // A ring of fence posts around the yard.
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6a5a3a });
  const postGeo = new THREE.BoxGeometry(0.3, 2.4, 0.3);
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(yard.x + Math.cos(ang) * yard.radius, 1.2, yard.z + Math.sin(ang) * yard.radius);
    ctx.scene.add(post);
  }
  // The yard floor: packed dirt, a different shade from the streets.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(yard.radius * 2, yard.radius * 2),
    new THREE.MeshLambertMaterial({ color: 0x4a3a28 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(yard.x, 0.01, yard.z);
  ctx.scene.add(floor);
  // A leaning sign board.
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2.4, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xb48ce8 }),
  );
  sign.position.set(yard.x, 1.6, yard.z - yard.radius - 1);
  ctx.scene.add(sign);

  ctx.api.fenceQuote = (car) => S.fenceDirector.priceFor(car) + S.fenceDirector.wantedBonus(car);
}
