// SOLMAR BAY — ambient life. Traffic sedans cruise the road grid (they
// brake when the player is right in front of them) and gulls circle over
// the harbour and the beach. Traffic is sedans only, and lives outside
// S.cars so it can never be stolen or counted as a parked ride.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const traffic = [];
  const lanes = [-120, -60, 0, 60, 120];
  const colors = [0x8a8f9a, 0x5e6b7a, 0x9a7a5e, 0x6e5e7a];
  for (let i = 0; i < 6; i++) {
    const horizontal = i % 2 === 0;
    const lane = lanes[i % lanes.length];
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.7, 4.4),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], metalness: 0.4, roughness: 0.5 }),
    );
    body.position.y = 0.55;
    mesh.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x14142a, metalness: 0.6, roughness: 0.3 }),
    );
    cabin.position.set(0, 1.15, -0.2);
    mesh.add(cabin);
    mesh.position.set(horizontal ? -160 + i * 55 : lane, 0, horizontal ? lane : -160 + i * 55);
    scene.add(mesh);
    traffic.push({ mesh, horizontal, lane, pos: mesh.position, speed: 9 + (i % 3) * 2, dir: i % 4 < 2 ? 1 : -1 });
  }

  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 8; i++) {
    const gull = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), gullMat);
    gull.rotation.x = Math.PI / 2;
    scene.add(gull);
    gulls.push({ mesh: gull, cx: i < 4 ? 120 : 0, cz: i < 4 ? 120 : 165, r: 14 + i * 3, a: i * 0.8, h: 26 + i * 2 });
  }

  ctx.updates.push((dt) => {
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    for (const t of traffic) {
      // Brake when the player is right in front of the car.
      const ahead = t.horizontal
        ? Math.abs(t.pos.z - pz) < 4 && (t.pos.x - px) * t.dir > 0 && (t.pos.x - px) * t.dir < 12
        : Math.abs(t.pos.x - px) < 4 && (t.pos.z - pz) * t.dir > 0 && (t.pos.z - pz) * t.dir < 12;
      const v = ahead ? 0 : t.speed;
      if (t.horizontal) {
        t.pos.x += t.dir * v * dt;
        if (t.pos.x > 180) t.pos.x = -180;
        if (t.pos.x < -180) t.pos.x = 180;
        t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        t.pos.z += t.dir * v * dt;
        if (t.pos.z > 180) t.pos.z = -180;
        if (t.pos.z < -180) t.pos.z = 180;
        t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI;
      }
    }
    for (const g of gulls) {
      g.a += dt * 0.25;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(g.a * 2) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}
