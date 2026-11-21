// SOLMAR BAY — ambient life: traffic sedans on the road grid and gulls
// circling over the harbour and the beach. Traffic is sedans only.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const traffic = [];
  const sedanGeo = new THREE.BoxGeometry(2.0, 0.7, 4.0);
  const cabinGeo = new THREE.BoxGeometry(1.7, 0.6, 2.0);
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: [0x8a8f98, 0xc9a06a, 0x6a8a9a, 0x9a6a7a, 0x7a9a6a, 0xb0b4bc][i], metalness: 0.3, roughness: 0.5 });
    const body = new THREE.Mesh(sedanGeo, mat);
    body.position.y = 0.6;
    group.add(body);
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({ color: 0x18202e, metalness: 0.6, roughness: 0.25 }));
    cabin.position.set(0, 1.2, -0.2);
    group.add(cabin);
    const axis = i % 2 === 0 ? 'x' : 'z';
    const lane = (i - 2) * 60 + 6;
    const start = -170 + i * 55;
    group.position.set(axis === 'x' ? start : lane, 0, axis === 'x' ? lane : start);
    group.rotation.y = axis === 'x' ? Math.PI / 2 : 0;
    scene.add(group);
    traffic.push({ mesh: group, axis, lane, pos: start, dir: i % 4 < 2 ? 1 : -1, speed: 8 + (i % 3) });
  }
  // Gulls.
  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), gullMat);
    g.rotation.z = Math.PI / 2;
    scene.add(g);
    gulls.push({ mesh: g, cx: i < 4 ? 120 : 0, cz: i < 4 ? 120 : 165, r: 12 + i * 2, a: (i / 8) * Math.PI * 2, h: 26 + i * 2 });
  }
  ctx.updates.push((dt) => {
    for (const t of traffic) {
      // Brake when the player is right in front of the car.
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      const mx = t.mesh.position.x;
      const mz = t.mesh.position.z;
      const ahead = t.axis === 'x' ? (pz - mz) * 0 + (px - mx) * t.dir : (pz - mz) * t.dir;
      const lateral = t.axis === 'x' ? Math.abs(pz - mz) : Math.abs(px - mx);
      let v = t.speed;
      if (ahead > 0 && ahead < 9 && lateral < 4) v = 0;
      t.pos += v * t.dir * dt;
      if (t.pos > 190) t.pos = -190;
      if (t.pos < -190) t.pos = 190;
      if (t.axis === 'x') {
        t.mesh.position.set(t.pos, 0, t.lane);
        t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        t.mesh.position.set(t.lane, 0, t.pos);
        t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI;
      }
    }
    for (const g of gulls) {
      g.a += dt * 0.35;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(g.a * 2) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}

export default { init };
