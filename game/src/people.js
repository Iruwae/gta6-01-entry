// SOLMAR BAY — pedestrians. Fourteen walkers wander the streets with
// swinging legs and a little bob, picking a new destination on arrival.
// Two stand still: one by the MART, one on the beach.
import * as THREE from '../vendor/three.module.min.js';
import { rand } from './random.js';

const SHIRT_COLORS = [0xe86a7a, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xb48ce8, 0xe8a34c];

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state;
  const people = [];

  function makeWalker(x, z, still) {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({
      color: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35), shirt);
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshLambertMaterial({ color: 0xd9a986 })
    );
    head.position.y = 1.85;
    group.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), legMat);
    legL.position.set(-0.16, 0.3, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.16;
    group.add(legR);
    group.position.set(x, 0, z);
    scene.add(group);
    const w = {
      mesh: group,
      legL,
      legR,
      x,
      z,
      tx: x,
      tz: z,
      speed: 1.6 + Math.random() * 1.2,
      still: !!still,
      bob: Math.random() * Math.PI * 2,
    };
    people.push(w);
    return w;
  }

  for (let i = 0; i < 14; i++) {
    makeWalker(rand(-140, 140), rand(-140, 140), false);
  }
  makeWalker(-70, -58, true); // by the MART
  makeWalker(2, 163, true); // on the beach

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    for (const w of people) {
      if (w.still) continue;
      const dx = w.tx - w.x;
      const dz = w.tz - w.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) {
        w.tx = rand(-140, 140);
        w.tz = rand(-140, 140);
        continue;
      }
      w.x += (dx / d) * w.speed * dt;
      w.z += (dz / d) * w.speed * dt;
      w.bob += dt * 7;
      w.mesh.position.set(w.x, Math.abs(Math.sin(w.bob)) * 0.06, w.z);
      w.mesh.rotation.y = Math.atan2(dx, dz);
      w.legL.rotation.x = Math.sin(w.bob) * 0.5;
      w.legR.rotation.x = -Math.sin(w.bob) * 0.5;
    }
  });

  ctx.people = people;
  ctx.flags.people = true;
}
