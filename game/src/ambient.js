// SOLMAR BAY — ambient life: traffic sedans cruising the road grid and
// gulls circling over the harbour and the beach.
import * as THREE from '../vendor/three.module.min.js';

function makeSedanMesh(colorHex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.8, 4.4),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.4 }),
  );
  body.position.y = 0.6;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.55, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.2, metalness: 0.5 }),
  );
  cabin.position.y = 1.2;
  g.add(cabin);
  return g;
}

export function init(ctx) {
  const { scene, state: S } = ctx;
  const colors = [0x8a8a9e, 0xc9a13d, 0x5f8ac9, 0x9e5f8a, 0x6e8a5f, 0xc95f5f];
  const traffic = [];
  // Six sedans looping the grid roads.
  const routes = [
    { axis: 'z', fixed: -120, from: -170, to: 170, speed: 9 },
    { axis: 'z', fixed: -60, from: 170, to: -170, speed: 11 },
    { axis: 'z', fixed: 0, from: -170, to: 170, speed: 8 },
    { axis: 'z', fixed: 60, from: 170, to: -170, speed: 10 },
    { axis: 'x', fixed: -60, from: -170, to: 170, speed: 9 },
    { axis: 'x', fixed: 120, from: 170, to: -170, speed: 10 },
  ];
  routes.forEach((r, i) => {
    const mesh = makeSedanMesh(colors[i % colors.length]);
    mesh.position.set(r.axis === 'z' ? r.fixed : r.from, 0, r.axis === 'z' ? r.from : r.fixed);
    scene.add(mesh);
    traffic.push({ ...r, t: r.from, mesh, color: colors[i % colors.length] });
  });

  // Gulls over the harbour and the beach.
  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (let i = 0; i < 6; i++) {
    const gull = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), gullMat);
    gull.rotation.x = Math.PI / 2;
    scene.add(gull);
    gulls.push({
      mesh: gull,
      cx: i < 3 ? 120 : 0,
      cz: i < 3 ? 120 : 165,
      r: 14 + i * 3,
      h: 26 + i * 2,
      a: i * 1.1,
      speed: 0.35 + i * 0.05,
    });
  }

  ctx.updates.push((dt) => {
    if (S.mode === 'paused') return;
    const pp = S.player.pos;
    for (const t of traffic) {
      // Brake when the player is right in front of the car.
      const dx = pp.x - t.mesh.position.x;
      const dz = pp.z - t.mesh.position.z;
      const ahead = t.axis === 'z'
        ? (t.to > t.from ? dz > 0 && dz < 9 && Math.abs(dx) < 4 : dz < 0 && dz > -9 && Math.abs(dx) < 4)
        : (t.to > t.from ? dx > 0 && dx < 9 && Math.abs(dz) < 4 : dx < 0 && dx > -9 && Math.abs(dz) < 4);
      const v = ahead ? 0 : t.speed;
      t.t += Math.sign(t.to - t.from) * v * dt;
      if (t.to > t.from && t.t > t.to) t.t = t.from;
      if (t.to < t.from && t.t < t.to) t.t = t.from;
      if (t.axis === 'z') {
        t.mesh.position.set(t.fixed, 0, t.t);
        t.mesh.rotation.y = t.to > t.from ? 0 : Math.PI;
      } else {
        t.mesh.position.set(t.t, 0, t.fixed);
        t.mesh.rotation.y = t.to > t.from ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    for (const g of gulls) {
      g.a += g.speed * dt;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(g.a * 2) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.z = -g.a;
    }
  });
  ctx.ambientReady = true;
}
