// Ambient life: traffic sedans cruising the road grid (they brake when the
// player is right in front of them) and gulls circling the harbour/beach.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const traffic = [];
  const paint = [0x888888, 0xaa6644, 0x446688, 0x668866, 0x996666, 0x777777];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 4.4),
      new THREE.MeshStandardMaterial({ color: paint[i] }),
    );
    const axis = i % 2 === 0 ? 'x' : 'z';
    const lane = (i - 2.5) * 24;
    const t = { mesh: m, axis, lane, pos: Math.random() * 400 - 200, speed: 8 + Math.random() * 6 };
    m.position.set(axis === 'x' ? t.pos : lane, 0.5, axis === 'x' ? lane : t.pos);
    scene.add(m);
    traffic.push(t);
  }

  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 4), gullMat);
    scene.add(g);
    gulls.push({
      mesh: g, a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 30,
      cx: i < 3 ? 120 : 0, cz: i < 3 ? 120 : 165, h: 40 + Math.random() * 15,
    });
  }

  ctx.updates.push((dt) => {
    for (const t of traffic) {
      let blocked = false;
      const pp = S.player.pos;
      if (t.axis === 'x') {
        const dx = pp.x - t.pos;
        if (Math.abs(pp.z - t.lane) < 5 && dx > 0 && dx < 9) blocked = true;
      } else {
        const dz = pp.z - t.pos;
        if (Math.abs(pp.x - t.lane) < 5 && dz > 0 && dz < 9) blocked = true;
      }
      if (!blocked) {
        t.pos += t.speed * dt;
        if (t.pos > 210) t.pos = -210;
      }
      if (t.axis === 'x') {
        t.mesh.position.set(t.pos, 0.5, t.lane);
        t.mesh.rotation.y = Math.PI / 2;
      } else {
        t.mesh.position.set(t.lane, 0.5, t.pos);
        t.mesh.rotation.y = 0;
      }
    }
    for (const g of gulls) {
      g.a += dt * 0.25;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.z = Math.PI / 2;
    }
  });
}
