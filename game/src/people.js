// SOLMAR BAY — pedestrians: 14 walkers wandering the streets, plus two
// who stand still, one by the MART and one on the beach.
import * as THREE from '../vendor/three.module.min.js';

function makeWalker(THREE, scene, x, z, color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.1, 0.35),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 1.0;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xf2c89b })
  );
  head.position.y = 1.8;
  group.add(head);
  const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2438 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.16, 0.3, 0);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.16, 0.3, 0);
  group.add(legL);
  group.add(legR);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, legL, legR, x, z, dest: null, phase: Math.random() * 6, speed: 1.2 + Math.random() * 0.8 };
}

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const colors = [0xff7a9e, 0x7ec98a, 0x5fb4c9, 0xe8a34c, 0xb48ce8, 0xf2d492, 0xc98a5f];
  const walkers = [];
  for (let i = 0; i < 14; i++) {
    const w = makeWalker(THREE, scene, -140 + Math.random() * 280, -140 + Math.random() * 280, colors[i % colors.length]);
    w.dest = { x: -140 + Math.random() * 280, z: -140 + Math.random() * 280 };
    walkers.push(w);
  }
  // Two stand still: one by the MART, one on the beach.
  const still1 = makeWalker(THREE, scene, -68, -56, 0xffb347);
  const still2 = makeWalker(THREE, scene, 4, 162, 0x5fb4c9);
  ctx.updates.push((dt) => {
    for (const w of walkers) {
      const dx = w.dest.x - w.x;
      const dz = w.dest.z - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        w.dest = { x: -150 + Math.random() * 300, z: -150 + Math.random() * 300 };
        continue;
      }
      w.x += (dx / d) * w.speed * dt;
      w.z += (dz / d) * w.speed * dt;
      w.phase += dt * 6;
      const swing = Math.sin(w.phase) * 0.5;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.mesh.position.set(w.x, Math.abs(Math.sin(w.phase)) * 0.06, w.z);
      w.mesh.rotation.y = Math.atan2(dx, dz);
    }
    void S;
  });
}

export default { init };
