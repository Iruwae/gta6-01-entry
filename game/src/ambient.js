// SOLMAR BAY — ambient life: traffic sedans cruising the road grid
// (they brake when the player is right in front of them) and gulls
// circling over the harbour and the beach. Traffic is sedans only and
// never joins S.cars, so it can never be stolen or counted as police.
import * as THREE from '../vendor/three.module.min.js';
import { clamp } from './random.js';

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state;
  const traffic = [];
  const sedanMat = new THREE.MeshLambertMaterial({ color: 0x5a6a7a });

  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), sedanMat);
    body.position.y = 0.6;
    mesh.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x1a2433 })
    );
    cabin.position.set(0, 1.2, -0.2);
    mesh.add(cabin);
    const lane = (i % 5) * 30 - 60;
    const horizontal = i % 2 === 0;
    const t = {
      mesh,
      horizontal,
      lane,
      pos: horizontal ? (Math.random() - 0.5) * 300 : lane,
      z: horizontal ? lane : (Math.random() - 0.5) * 300,
      speed: 9 + Math.random() * 5,
      dir: Math.random() < 0.5 ? 1 : -1,
    };
    mesh.position.set(t.pos, 0, t.z);
    scene.add(mesh);
    traffic.push(t);
  }

  // Gulls over the harbour and the beach.
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  const gulls = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), gullMat);
    g.rotation.x = Math.PI / 2;
    const centre = i < 3 ? { x: 120, z: 120 } : { x: 0, z: 165 };
    g.userData = { cx: centre.x, cz: centre.z, a: Math.random() * Math.PI * 2, r: 12 + Math.random() * 14, h: 26 + Math.random() * 14 };
    scene.add(g);
    gulls.push(g);
  }

  ctx.updates.push((dt) => {
    for (const t of traffic) {
      // Brake when the player is right in front of the car.
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      let blocked = false;
      if (t.horizontal) {
        const aheadX = t.pos + t.dir * 8;
        if (Math.abs(pz - t.lane) < 4 && Math.abs(px - aheadX) < 8) blocked = true;
      } else {
        const aheadZ = t.z + t.dir * 8;
        if (Math.abs(px - t.lane) < 4 && Math.abs(pz - aheadZ) < 8) blocked = true;
      }
      const v = blocked ? 0 : t.speed;
      if (t.horizontal) {
        t.pos += t.dir * v * dt;
        if (t.pos > 170) t.pos = -170;
        if (t.pos < -170) t.pos = 170;
        t.mesh.position.set(t.pos, 0, t.lane);
        t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        t.z += t.dir * v * dt;
        if (t.z > 170) t.z = -170;
        if (t.z < -170) t.z = 170;
        t.mesh.position.set(t.lane, 0, t.z);
        t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI;
      }
    }
    for (const g of gulls) {
      g.userData.a += dt * 0.4;
      g.position.set(
        g.userData.cx + Math.cos(g.userData.a) * g.userData.r,
        g.userData.h + Math.sin(g.userData.a * 2.3) * 1.5,
        g.userData.cz + Math.sin(g.userData.a) * g.userData.r
      );
      g.rotation.y = -g.userData.a;
    }
  });

  ctx.traffic = traffic;
  ctx.flags.ambient = true;
}
