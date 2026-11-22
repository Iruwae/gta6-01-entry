// Pedestrians: 14 walkers wandering the streets (swinging legs, little
// bob, new destination on arrival) + 2 standing still (MART, beach).
export function init(ctx) {
  const { THREE, scene } = ctx;
  const walkers = [];

  function makePerson(x, z, color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.0, 0.35),
      new THREE.MeshStandardMaterial({ color }),
    );
    body.position.y = 0.8;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf2c89b }),
    );
    head.position.y = 1.5;
    g.add(head);
    g.position.set(x, 0, z);
    scene.add(g);
    return g;
  }

  const colors = [0xff7a9e, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xb48ce8, 0xe8a34c];
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 300 - 150;
    const z = Math.random() * 300 - 150;
    walkers.push({
      mesh: makePerson(x, z, colors[i % colors.length]),
      tx: x, tz: z, speed: 1.5 + Math.random() * 1.5, bob: Math.random() * 10,
    });
  }
  makePerson(-70, -58, 0xffffff); // standing by the MART
  makePerson(4, 163, 0xffffff); // standing on the beach

  ctx.updates.push((dt) => {
    for (const w of walkers) {
      const dx = w.tx - w.mesh.position.x;
      const dz = w.tz - w.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) {
        w.tx = Math.random() * 300 - 150;
        w.tz = Math.random() * 300 - 150;
        continue;
      }
      const step = Math.min(d, w.speed * dt);
      w.mesh.position.x += (dx / d) * step;
      w.mesh.position.z += (dz / d) * step;
      w.mesh.rotation.y = Math.atan2(dx, dz);
      w.bob += dt * 8;
      w.mesh.position.y = Math.abs(Math.sin(w.bob)) * 0.08;
    }
  });
}
