// Ambient life: traffic sedans cruising the road grid + harbour gulls.
import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './random.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const rng = makeRng(777);
  const traffic = [];
  const sedanMat = new THREE.MeshStandardMaterial({ color: 0x5a5a6e, roughness: 0.6, metalness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });
  const lanes = [-150, -90, -30, 30, 90, 150];
  for (let i = 0; i < 8; i++) {
    const alongRoad = i % 2 === 0;
    const lane = lanes[Math.floor(rng() * lanes.length)];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), sedanMat);
    body.position.y = 0.55;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), darkMat);
    cabin.position.set(0, 1.15, -0.2);
    g.add(cabin);
    const start = (rng() - 0.5) * 380;
    const dir = rng() > 0.5 ? 1 : -1;
    g.position.set(alongRoad ? start : lane, 0, alongRoad ? lane : start);
    // Face along the road we drive on: east-west roads face ±x, the rest ±z.
    g.rotation.y = alongRoad ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    scene.add(g);
    traffic.push({ mesh: g, speed: 7 + rng() * 5, dir });
  }
  // Gulls circling over the harbour and the beach.
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const gulls = [];
  for (let i = 0; i < 7; i++) {
    const gull = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), gullMat);
    gull.rotation.x = Math.PI / 2;
    scene.add(gull);
    gulls.push({
      mesh: gull,
      cx: i < 4 ? 120 : 0,
      cz: i < 4 ? 120 : 165,
      r: 12 + rng() * 14,
      a: rng() * Math.PI * 2,
      speed: 0.25 + rng() * 0.2,
      y: 22 + rng() * 10,
    });
  }
  ctx.updates.push((dt) => {
    for (const t of traffic) {
      // Brake when the player is right in front of us.
      const fx = Math.sin(t.mesh.rotation.y);
      const fz = Math.cos(t.mesh.rotation.y);
      const dx = S.player.pos.x - t.mesh.position.x;
      const dz = S.player.pos.z - t.mesh.position.z;
      const ahead = dx * fx + dz * fz;
      const lateral = Math.abs(dx * fz - dz * fx);
      const blocked = ahead > 0 && ahead < 9 && lateral < 3;
      const v = blocked ? 0 : t.speed;
      t.mesh.position.x += fx * v * dt;
      t.mesh.position.z += fz * v * dt;
      if (t.mesh.position.x > 210) t.mesh.position.x = -210;
      if (t.mesh.position.x < -210) t.mesh.position.x = 210;
      if (t.mesh.position.z > 210) t.mesh.position.z = -210;
      if (t.mesh.position.z < -210) t.mesh.position.z = 210;
    }
    for (const g of gulls) {
      g.a += g.speed * dt;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.y + Math.sin(g.a * 2) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}

export default init;
