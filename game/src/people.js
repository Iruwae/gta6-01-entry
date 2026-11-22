// Pedestrians: 14 walkers wandering the streets + 2 standing still.
import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './random.js';

export function init(ctx) {
  const { THREE, scene } = ctx;
  const rng = makeRng(4242);
  const jacketColors = [0xe8a34c, 0x5fb4c9, 0xff7a9e, 0x7ec98a, 0xb48ce8, 0xc98a5f, 0xf2d492];
  const walkers = [];
  function makePerson(color) {
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 });
    const legs = new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.38), jacket);
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.68;
    g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.3), legs);
    legL.position.set(-0.16, 0.3, 0);
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.3), legs);
    legR.position.set(0.16, 0.3, 0);
    g.add(legR);
    return { group: g, legL, legR };
  }
  function newTarget() {
    return { x: (rng() - 0.5) * 320, z: (rng() - 0.5) * 320 };
  }
  for (let i = 0; i < 14; i++) {
    const p = makePerson(jacketColors[i % jacketColors.length]);
    const start = newTarget();
    p.group.position.set(start.x, 0, start.z);
    scene.add(p.group);
    walkers.push({ ...p, target: newTarget(), speed: 1.6 + rng() * 1.4, phase: rng() * Math.PI * 2 });
  }
  // Two stand still: one by the MART, one on the beach.
  const s1 = makePerson(0xff7a9e);
  s1.group.position.set(-68, 0, -58);
  scene.add(s1.group);
  const s2 = makePerson(0x5fb4c9);
  s2.group.position.set(6, 0, 168);
  scene.add(s2.group);
  ctx.updates.push((dt) => {
    for (const w of walkers) {
      const dx = w.target.x - w.group.position.x;
      const dz = w.target.z - w.group.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1.5) {
        w.target = newTarget();
        continue;
      }
      const step = (w.speed * dt) / d;
      w.group.position.x += dx * step;
      w.group.position.z += dz * step;
      w.group.rotation.y = Math.atan2(dx, dz);
      // Little bob + swinging legs.
      w.phase += dt * 6;
      w.group.position.y = Math.abs(Math.sin(w.phase)) * 0.06;
      w.legL.rotation.x = Math.sin(w.phase) * 0.5;
      w.legR.rotation.x = -Math.sin(w.phase) * 0.5;
    }
  });
}

export default init;
