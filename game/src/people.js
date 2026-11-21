// SOLMAR BAY — pedestrians (round 9 rebuild, builder B / world).
// Fourteen walkers wander the streets with swinging legs and a little
// bob, picking a new destination whenever they arrive; two of them stand
// around instead — one by the MART, one down on the beach. They are
// pure street life: no collisions, no gameplay hooks, just a city that
// feels lived in. Written fresh from the build contract; no other game
// module is imported.
import * as THREE from '../vendor/three.module.min.js';

const WALKERS = 14;
const BOUND = 175;
const SHIRTS = [0xd86a5a, 0x5a8ad8, 0x6ab06a, 0xd8c25a, 0x9a6ad8, 0xe8e2d4, 0x3a3f4a, 0xd88a4a];
const SKINS = [0xc98d64, 0x8a5a3a, 0xe8b88a, 0x6a4a2a, 0xdb9a6a];

function randomTarget() {
  return {
    x: -BOUND + Math.random() * BOUND * 2,
    z: -BOUND + Math.random() * BOUND * 2,
  };
}

function makeWalker(idle) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({
    color: SHIRTS[(Math.random() * SHIRTS.length) | 0],
  });
  const skin = new THREE.MeshLambertMaterial({
    color: SKINS[(Math.random() * SKINS.length) | 0],
  });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3242 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirt);
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.62;
  g.add(head);

  // Legs pivot at the hip: geometry translated so rotation swings them.
  const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.22);
  legGeo.translate(0, -0.35, 0);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.14, 0.7, 0);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.14, 0.7, 0);
  g.add(legL);
  g.add(legR);

  const start = randomTarget();
  g.position.set(start.x, 0, start.z);
  return {
    mesh: g,
    legL,
    legR,
    pos: g.position,
    target: idle ? { x: start.x, z: start.z } : randomTarget(),
    speed: idle ? 0 : 1.2 + Math.random() * 1.0,
    phase: Math.random() * Math.PI * 2,
    heading: Math.random() * Math.PI * 2,
    idle: !!idle,
  };
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;

  const walkers = [];
  for (let i = 0; i < WALKERS; i++) {
    const w = makeWalker(i < 2);
    if (i === 0) w.pos.set(-68, 0, -54); // loitering by the MART
    if (i === 1) w.pos.set(8, 0, 158); // standing on the beach
    w.mesh.position.copy(w.pos);
    walkers.push(w);
    scene.add(w.mesh);
  }
  S.pedestrians = walkers;
  ctx.api.people = { walkers };

  ctx.updates.push((dt, t) => {
    for (const w of walkers) {
      if (w.idle) {
        // Just breathing: a slow sway, feet planted.
        w.mesh.rotation.z = Math.sin(t * 0.8 + w.phase) * 0.03;
        continue;
      }
      const dx = w.target.x - w.pos.x;
      const dz = w.target.z - w.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        w.target = randomTarget();
        continue;
      }
      const step = Math.min(dist, w.speed * dt);
      w.pos.x += (dx / dist) * step;
      w.pos.z += (dz / dist) * step;
      w.heading = Math.atan2(dx, dz);
      w.mesh.rotation.y = w.heading;
      w.phase += dt * w.speed * 4;
      const swing = Math.sin(w.phase) * 0.55;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.mesh.position.y = Math.abs(Math.sin(w.phase)) * 0.05;
    }
  });
}
