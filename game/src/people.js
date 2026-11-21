// SOLMAR BAY — pedestrians. 14 walkers wander the streets (swinging
// legs, a little bob, a new destination on arrival); 2 stand still —
// one by the MART, one on the beach.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  function makePerson(x, z, shirt) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.4),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }),
    );
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }),
    );
    head.position.y = 1.8;
    g.add(head);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.9 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), legMat);
    legL.position.set(-0.18, 0.4, 0);
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), legMat);
    legR.position.set(0.18, 0.4, 0);
    g.add(legR);
    g.position.set(x, 0, z);
    scene.add(g);
    return { mesh: g, legL, legR };
  }

  const shirts = [0xe85d75, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xb48ce8, 0xe8a34c, 0xdddddd];
  const walkers = [];
  for (let i = 0; i < 14; i++) {
    const p = makePerson(-140 + Math.random() * 280, -140 + Math.random() * 280, shirts[i % shirts.length]);
    walkers.push({
      ...p,
      dest: { x: -140 + Math.random() * 280, z: -140 + Math.random() * 280 },
      speed: 1.6 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  // Two stand still: one by the MART, one on the beach.
  makePerson(-70, -58, 0xff7a9e);
  makePerson(5, 160, 0x5fb4c9);

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    for (const w of walkers) {
      const dx = w.dest.x - w.mesh.position.x;
      const dz = w.dest.z - w.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        w.dest = { x: -140 + Math.random() * 280, z: -140 + Math.random() * 280 };
        continue;
      }
      const step = Math.min(w.speed * dt, d);
      w.mesh.position.x += (dx / d) * step;
      w.mesh.position.z += (dz / d) * step;
      w.mesh.rotation.y = Math.atan2(dx, dz);
      w.phase += dt * 7;
      const swing = Math.sin(w.phase) * 0.5;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.mesh.position.y = Math.abs(Math.sin(w.phase)) * 0.06;
    }
  });
}
