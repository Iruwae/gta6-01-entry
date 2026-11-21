// Pedestrians for SOLMAR BAY: 14 walkers wandering the streets with
// swinging legs and a little bob, plus 2 who stand still — one by the
// MART, one on the beach.
export function init(ctx) {
  const { THREE, state: S } = ctx;

  const walkers = [];
  const shirtColors = [0xff7a9e, 0x5fb4c9, 0xf2d492, 0x7ec98a, 0xb48ce8, 0xe8a34c, 0xc98a5f];

  function makeWalker(x, z, standing) {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: shirtColors[walkers.length % shirtColors.length] });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1426 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), shirt);
    torso.position.y = 1.15;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
    head.position.y = 1.85;
    group.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), dark);
    legL.position.set(-0.16, 0.4, 0);
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), dark);
    legR.position.set(0.16, 0.4, 0);
    group.add(legR);
    group.position.set(x, 0, z);
    ctx.scene.add(group);
    return { mesh: group, legL, legR, standing, tx: x, tz: z, speed: 1.6 + Math.random() * 1.2, phase: Math.random() * 6 };
  }

  for (let i = 0; i < 14; i++) {
    const x = -150 + Math.random() * 300;
    const z = -150 + Math.random() * 300;
    walkers.push(makeWalker(x, z, false));
  }
  walkers.push(makeWalker(-66, -54, true)); // by the MART
  walkers.push(makeWalker(6, 158, true)); // on the beach

  ctx.updates.push((dt) => {
    for (const w of walkers) {
      if (w.standing) continue;
      const dx = w.tx - w.mesh.position.x;
      const dz = w.tz - w.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) {
        w.tx = -170 + Math.random() * 340;
        w.tz = -170 + Math.random() * 340;
        continue;
      }
      w.mesh.position.x += (dx / dist) * w.speed * dt;
      w.mesh.position.z += (dz / dist) * w.speed * dt;
      w.mesh.rotation.y = Math.atan2(dx, dz);
      // Swinging legs and a little bob.
      w.phase += dt * 7;
      const swing = Math.sin(w.phase) * 0.5;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.mesh.position.y = Math.abs(Math.sin(w.phase)) * 0.06;
    }
  });
}
