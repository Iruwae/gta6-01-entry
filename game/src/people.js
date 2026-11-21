// SOLMAR BAY — pedestrians: 14 walkers + 2 standing by the MART and beach.
import * as THREE from '../vendor/three.module.min.js';

const SHIRT_COLORS = [0xff7a9e, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xb48ce8, 0xe8a34c, 0xffb347];

function makePerson(THREE, shirtColor) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.32), shirt);
  body.position.y = 1.15;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.75;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), pants);
  legL.position.set(-0.14, 0.38, 0);
  legL.geometry.translate(0, -0.35, 0);
  legL.position.y = 0.75;
  const legR = legL.clone();
  legR.position.x = 0.14;
  g.add(legL);
  g.add(legR);
  g.userData.legs = [legL, legR];
  return g;
}

function randomDest() {
  // Wander the street grid.
  const gx = -160 + Math.floor(Math.random() * 9) * 40;
  const gz = -160 + Math.floor(Math.random() * 9) * 40;
  return { x: gx + (Math.random() * 10 - 5), z: gz + (Math.random() * 10 - 5) };
}

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;

  const walkers = [];
  for (let i = 0; i < 14; i++) {
    const mesh = makePerson(T, SHIRT_COLORS[i % SHIRT_COLORS.length]);
    const start = randomDest();
    mesh.position.set(start.x, 0, start.z);
    scene.add(mesh);
    walkers.push({
      mesh,
      dest: randomDest(),
      speed: 1.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  // Two stand still: one by the MART, one on the beach.
  const still = [];
  for (const [x, z, c] of [[-70, -58, 0xe8a34c], [2, 160, 0x5fb4c9]]) {
    const mesh = makePerson(T, c);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    still.push({ mesh });
  }

  ctx.updates.push((dt, t) => {
    for (const w of walkers) {
      const dx = w.dest.x - w.mesh.position.x;
      const dz = w.dest.z - w.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        w.dest = randomDest();
        continue;
      }
      const step = (w.speed * dt) / d;
      w.mesh.position.x += dx * step;
      w.mesh.position.z += dz * step;
      w.mesh.rotation.y = Math.atan2(dx, dz);
      const swing = Math.sin(t * 5 + w.phase) * 0.55;
      w.mesh.userData.legs[0].rotation.x = swing;
      w.mesh.userData.legs[1].rotation.x = -swing;
      w.mesh.position.y = Math.abs(Math.sin(t * 5 + w.phase)) * 0.06;
    }
    void S;
  });

  return { walkers, still };
}

export default init;
