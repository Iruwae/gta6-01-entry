// SOLMAR BAY — people: 14 walkers wandering the streets (swinging legs,
// little bob, new destination on arrival) and 2 who stand still — one by
// the MART, one on the beach.
import * as THREE from '../vendor/three.module.min.js';
import { rand, randInt, pick } from './random.js';

const SHIRT_COLORS = [0xff7a9e, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xe8a34c, 0xb48ce8, 0xffe9c9];

function makeWalker(shirtColor) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), shirt);
  torso.position.y = 1.1;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 }));
  head.position.y = 1.75;
  group.add(head);
  const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
  const legL = new THREE.Mesh(legGeo, dark);
  legL.position.set(-0.15, 0.32, 0);
  const legR = new THREE.Mesh(legGeo, dark);
  legR.position.set(0.15, 0.32, 0);
  group.add(legL);
  group.add(legR);
  return { group, legL, legR };
}

export function init(ctx) {
  const { scene } = ctx;
  const walkers = [];

  for (let i = 0; i < 14; i++) {
    const w = makeWalker(pick(SHIRT_COLORS));
    const x = rand(-150, 150);
    const z = rand(-150, 150);
    w.group.position.set(x, 0, z);
    scene.add(w.group);
    walkers.push({
      ...w,
      x, z,
      tx: rand(-150, 150),
      tz: rand(-150, 150),
      speed: rand(1.2, 2.0),
      phase: rand(0, Math.PI * 2),
      standing: false,
    });
  }
  // Two stand still: one by the MART, one on the beach.
  for (const [sx, sz] of [[-72, -54], [0, 160]]) {
    const w = makeWalker(pick(SHIRT_COLORS));
    w.group.position.set(sx, 0, sz);
    w.group.rotation.y = rand(0, Math.PI * 2);
    scene.add(w.group);
    walkers.push({ ...w, x: sx, z: sz, tx: sx, tz: sz, speed: 0, phase: 0, standing: true });
  }

  ctx.updates.push((dt) => {
    for (const w of walkers) {
      if (w.standing) continue;
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        w.tx = rand(-150, 150);
        w.tz = rand(-150, 150);
        continue;
      }
      const step = (w.speed * dt) / d;
      w.x += dx * step;
      w.z += dz * step;
      w.phase += dt * w.speed * 3.2;
      w.group.position.set(w.x, Math.abs(Math.sin(w.phase)) * 0.06, w.z);
      w.group.rotation.y = Math.atan2(dx, dz);
      w.legL.rotation.x = Math.sin(w.phase) * 0.55;
      w.legR.rotation.x = -Math.sin(w.phase) * 0.55;
    }
  });
}
