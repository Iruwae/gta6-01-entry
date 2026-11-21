// SOLMAR BAY — pedestrians: 14 walkers wandering the streets, plus 2
// who stand still (one by the MART, one on the beach).
import * as THREE from '../vendor/three.module.min.js';

function makeWalker(colorHex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.1, 0.35),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 }),
  );
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }),
  );
  head.position.y = 1.8;
  g.add(head);
  const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.15, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.15, 0.35, 0);
  g.add(legL);
  g.add(legR);
  return { group: g, legL, legR };
}

export function init(ctx) {
  const { scene, state: S } = ctx;
  const rng = (() => { let s = 4242; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const colors = [0xff7a9e, 0xffb347, 0x5fb4c9, 0x7ec98a, 0xb48ce8, 0xe8a34c, 0xf2d492];
  const walkers = [];

  function newDest() {
    return { x: -160 + rng() * 320, z: -160 + rng() * 320 };
  }
  for (let i = 0; i < 14; i++) {
    const w = makeWalker(colors[i % colors.length]);
    const x = -150 + rng() * 300;
    const z = -150 + rng() * 300;
    w.group.position.set(x, 0, z);
    scene.add(w.group);
    walkers.push({ ...w, dest: newDest(), speed: 1.6 + rng() * 1.4, phase: rng() * 6 });
  }
  // Two stand still: one by the MART, one on the beach.
  const stillSpots = [[-66, -56], [6, 168]];
  for (const [x, z] of stillSpots) {
    const w = makeWalker(0xf2f2f2);
    w.group.position.set(x, 0, z);
    scene.add(w.group);
    walkers.push({ ...w, dest: { x, z }, speed: 0, phase: 0, still: true });
  }

  ctx.updates.push((dt) => {
    if (S.mode === 'paused') return;
    const t = performance.now() / 1000;
    for (const w of walkers) {
      if (w.still) continue;
      const dx = w.dest.x - w.group.position.x;
      const dz = w.dest.z - w.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) { w.dest = newDest(); continue; }
      const step = Math.min(d, w.speed * dt);
      w.group.position.x += (dx / d) * step;
      w.group.position.z += (dz / d) * step;
      w.group.rotation.y = Math.atan2(dx, dz);
      const swing = Math.sin(t * 6 + w.phase) * 0.5;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.group.position.y = Math.abs(Math.sin(t * 6 + w.phase)) * 0.06;
    }
  });
  ctx.peopleReady = true;
}
