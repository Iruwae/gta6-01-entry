// Ambient life for SOLMAR BAY: traffic sedans cruising the road grid
// (they brake when the player is right in front of them) and gulls
// circling over the harbour and the beach. Traffic is sedans only and
// is kept out of S.cars so it never confuses the police or the garage.
export function init(ctx) {
  const { THREE, state: S } = ctx;

  const traffic = [];
  const sedanColors = [0x8a93a8, 0xc9b48a, 0x7a8a6a, 0xa88a9a, 0x5a7a8a];
  const bodyGeo = new THREE.BoxGeometry(1.9, 0.7, 4.2);
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.0);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10);
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: sedanColors[i % sedanColors.length] });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1426 });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(cabinGeo, dark);
    cabin.position.y = 1.15;
    group.add(cabin);
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.34, wz);
      group.add(wheel);
    }
    const vertical = i % 2 === 0;
    const lane = (Math.floor(i / 2) - 1) * 60;
    const start = -180 + i * 55;
    group.position.set(vertical ? lane + 3 : start, 0, vertical ? start : lane + 3);
    ctx.scene.add(group);
    traffic.push({ mesh: group, vertical, lane, pos: start, speed: 9 + (i % 3) * 2 });
  }

  // Gulls over the harbour and the beach.
  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xf2f2e8 });
  for (let i = 0; i < 8; i++) {
    const gull = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 4), gullMat);
    gull.rotation.z = Math.PI / 2;
    ctx.scene.add(gull);
    gulls.push({
      mesh: gull,
      cx: i < 4 ? 120 : 0,
      cz: i < 4 ? 120 : 165,
      r: 12 + (i % 4) * 5,
      h: 26 + (i % 3) * 6,
      a: (i / 8) * Math.PI * 2,
      sp: 0.25 + (i % 3) * 0.07,
    });
  }

  ctx.updates.push((dt) => {
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    for (const t of traffic) {
      // Brake when the player is right in front of the car.
      const blocked = Math.abs(t.mesh.position.x - px) < 4 && Math.abs(t.mesh.position.z - pz) < 4;
      const speed = blocked ? 0 : t.speed;
      t.pos += speed * dt;
      if (t.pos > 190) t.pos = -190;
      if (t.vertical) {
        t.mesh.position.set(t.lane + 3, 0, t.pos);
        t.mesh.rotation.y = 0;
      } else {
        t.mesh.position.set(t.pos, 0, t.lane + 3);
        t.mesh.rotation.y = Math.PI / 2;
      }
    }
    for (const g of gulls) {
      g.a += g.sp * dt;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(g.a * 2.3) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}
